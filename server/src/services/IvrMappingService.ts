/**
 * IvrMappingService - Orchestrates IVR mapping through iterative exploration
 *
 * This service manages the 8-step IVR mapping workflow:
 * 1. Receive IVR mapping request data
 * 2. Initialize/reference CachedAssetsService
 * 3. Read/create IVR mapping file (via read_legs tool)
 * 4. Update activeAssets context/manifest for current iteration
 * 5. Make outbound call via TwilioService (creates CRelay with walk ResponseService)
 * 6. Evaluate outcome → Loop to step 3 or continue
 * 7. Analyze IVR mapping file and build final context using ResponseService
 * 8. Return IVR mapping details + generated context
 *
 * Architecture:
 * - Uses ONE OpenAI ResponseService for orchestration and analysis
 * - Separate ResponseService instances created per CRelay session during outbound calls
 * - Async job pattern with status polling and optional webhook callbacks
 * - In-memory job state management (Map)
 */

import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { logOut, logError } from '../utils/logger.js';
import { OpenAIResponseService } from './OpenAIResponseService.js';
import { TwilioService } from './TwilioService.js';
import { CachedAssetsService } from './CachedAssetsService.js';
import readLegs from '../tools/read_legs.js';
import type {
    IvrMappingRequest,
    IvrMappingJobResponse,
    IvrMappingJobState,
    IvrMappingJobStatusResponse,
    IvrMappingResult,
    JobStatus
} from '../interfaces/IvrMappingService.js';

/**
 * Interface for menu step data structure
 */
interface MenuStepData {
    menuPath: string;
    timestamp: string;
    audioTranscript: string;
    availableOptions: string[];
    dtmfSent?: string;
    outcome: string;
    status: 'COMPLETED' | 'IN_PROGRESS' | 'FAILED';
}

class IvrMappingService {
    private jobId: string;
    private status: JobStatus;
    private createdAt: Date;
    private updatedAt: Date;
    private expiresAt: Date;
    private request: IvrMappingRequest;
    private result?: IvrMappingResult;
    private error?: string;
    private callbackUrl?: string;
    private twilioService: TwilioService;
    private cachedAssetsService: CachedAssetsService;
    private serverBaseUrl: string;
    private callCompletionResolve?: (sessionData: any) => void;
    private callCompletionReject?: (error: any) => void;
    private ivrMappingData: MenuStepData[] = [];

    constructor(jobId: string, twilioService: TwilioService, cachedAssetsService: CachedAssetsService, serverBaseUrl: string) {
        this.jobId = jobId;
        this.status = 'pending';
        this.createdAt = new Date();
        this.updatedAt = new Date();
        this.expiresAt = new Date(this.createdAt.getTime() + 24 * 60 * 60 * 1000); // 24 hours
        this.request = { phoneNumber: '' }; // Will be set in startMapping
        this.twilioService = twilioService;
        this.cachedAssetsService = cachedAssetsService;
        this.serverBaseUrl = serverBaseUrl;

        logOut('IvrMappingService', `Service initialized for job ${jobId}`);
    }

    /**
     * Initiates an IVR mapping job
     * Starts async processing immediately
     */
    startMapping(request: IvrMappingRequest): void {
        try {
            // Validate required parameters
            if (!request.phoneNumber) {
                throw new Error('phoneNumber is required');
            }

            // Store request
            this.request = request;
            this.callbackUrl = request.callbackUrl;

            logOut('IvrMappingService', `Created IVR mapping job ${this.jobId} for phone number ${request.phoneNumber}`);

            // Send initial webhook
            this.sendProgressWebhook('job_created', { phoneNumber: request.phoneNumber });

            // Start processing asynchronously (don't await)
            this.processMapping().catch(error => {
                logError('IvrMappingService', `Job ${this.jobId} failed: ${error instanceof Error ? error.message : String(error)}`);
            });

        } catch (error) {
            logError('IvrMappingService', `Failed to start mapping: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }

    /**
     * Gets the status and results of this job
     */
    getJobStatus(): IvrMappingJobStatusResponse {
        return {
            success: true,
            jobId: this.jobId,
            status: this.status,
            result: this.result,
            error: this.error,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    /**
     * Gets just the generated context for this job
     */
    getJobContext(): string | null {
        return this.result?.context || null;
    }

    /**
     * Gets just the IVR mapping data for this job
     */
    getJobMapping(): any | null {
        return this.result?.ivrMapping || null;
    }

    /**
     * Cancels this running job
     */
    cancelJob(): boolean {
        if (this.status === 'completed' || this.status === 'failed' || this.status === 'cancelled') {
            return false; // Can't cancel already finished jobs
        }

        this.status = 'cancelled';
        this.updatedAt = new Date();

        logOut('IvrMappingService', `Job ${this.jobId} cancelled by user`);

        // Send cancellation webhook
        this.sendProgressWebhook('cancelled', { reason: 'User requested cancellation' });

        // Reject pending call completion if any
        if (this.callCompletionReject) {
            this.callCompletionReject(new Error('Job cancelled by user'));
            this.callCompletionReject = undefined;
            this.callCompletionResolve = undefined;
        }

        return true;
    }

    /**
     * Main processing logic for IVR mapping
     * Implements the 8-step workflow
     */
    private async processMapping(): Promise<void> {
        try {
            // Update status to in-progress
            this.updateJobStatus('in-progress');

            logOut('IvrMappingService', `[Job ${this.jobId}] Starting IVR mapping workflow`);

            // Step 1: Request data already received
            const { phoneNumber } = this.request;

            // Step 2: CachedAssetsService already initialized (passed in constructor)
            logOut('IvrMappingService', `[Job ${this.jobId}] Step 2: CachedAssetsService available`);

            // Create orchestration ResponseService for this job
            // This will be used for reading legs and building final context
            const activeAssets = this.cachedAssetsService.getActiveAssets();
            const orchestrationResponseService = new OpenAIResponseService(
                activeAssets.context,
                activeAssets.manifest,
                activeAssets.loadedTools,
                activeAssets.listenMode.enabled
            );

            logOut('IvrMappingService', `[Job ${this.jobId}] Created orchestration ResponseService`);

            // Steps 3-6: Iterative IVR exploration loop
            let continueMapping = true;
            let iterationCount = 0;
            const maxIterations = 10; // Safety limit

            while (continueMapping && iterationCount < maxIterations) {
                // Check if job was cancelled
                if (this.status === 'cancelled') {
                    logOut('IvrMappingService', `[Job ${this.jobId}] Job cancelled, stopping iteration`);
                    return;
                }

                iterationCount++;
                logOut('IvrMappingService', `[Job ${this.jobId}] Starting iteration ${iterationCount}`);

                // Step 3: Read/create IVR mapping file via read_legs tool
                logOut('IvrMappingService', `[Job ${this.jobId}] Step 3: Reading IVR mapping via read_legs tool`);
                this.sendProgressWebhook('reading_mapping', { iteration: iterationCount });

                // Call read_legs with in-memory data to analyze current state
                const mappingAnalysis = await readLegs({ inMemoryData: this.ivrMappingData });
                logOut('IvrMappingService', `[Job ${this.jobId}] Mapping analysis: ${mappingAnalysis.totalSteps} steps, completed paths: [${mappingAnalysis.completedPaths?.join(', ')}], next suggested: ${mappingAnalysis.nextSuggestedPath}`);

                // TODO: Use mappingAnalysis.nextSuggestedPath to determine which path to explore
                // For now, we just log the analysis and proceed with the call

                // Step 4: Update activeAssets context/manifest for this iteration
                logOut('IvrMappingService', `[Job ${this.jobId}] Step 4: Updating activeAssets for iteration ${iterationCount}`);
                this.sendProgressWebhook('updating_context', { iteration: iterationCount });
                // TODO: Determine which context to use based on IVR mapping analysis

                // Step 5: Make outbound call via TwilioService
                logOut('IvrMappingService', `[Job ${this.jobId}] Step 5: Initiating outbound call`);
                this.sendProgressWebhook('making_call', { iteration: iterationCount });

                // Create Promise to wait for call completion
                const callCompletionPromise = new Promise<any>((resolve, reject) => {
                    this.callCompletionResolve = resolve;
                    this.callCompletionReject = reject;

                    // Add timeout (5 minutes per call)
                    setTimeout(() => {
                        if (this.callCompletionReject) {
                            this.callCompletionReject(new Error('Call completion timeout'));
                            this.callCompletionReject = undefined;
                            this.callCompletionResolve = undefined;
                        }
                    }, 5 * 60 * 1000);
                });

                const callResult = await this.twilioService.makeOutboundCall(
                    this.serverBaseUrl,
                    phoneNumber,
                    this.cachedAssetsService,
                    { jobId: this.jobId }
                );

                logOut('IvrMappingService', `[Job ${this.jobId}] Call initiated: ${callResult.sid}`);
                this.sendProgressWebhook('call_initiated', { iteration: iterationCount, callSid: callResult.sid });

                // Wait for call to complete
                logOut('IvrMappingService', `[Job ${this.jobId}] Waiting for call to complete...`);
                const sessionData = await callCompletionPromise;
                logOut('IvrMappingService', `[Job ${this.jobId}] Call completed, received session data`);

                // Sync in-memory data from file (call wrote to file via write_legs tool)
                await this.syncMappingDataFromFile();
                logOut('IvrMappingService', `[Job ${this.jobId}] Synced ${this.ivrMappingData.length} steps from file to memory`);

                // Step 6: Evaluate outcome
                logOut('IvrMappingService', `[Job ${this.jobId}] Step 6: Evaluating outcome`);
                this.sendProgressWebhook('evaluating_outcome', { iteration: iterationCount });
                // TODO: Implement outcome evaluation logic
                // Analyze sessionData and IvrMapping.json to determine if more exploration needed
                // For now, exit loop after first iteration (placeholder for loop-back logic)
                continueMapping = false;
            }

            // Step 7: Build final context from IVR mapping using orchestration ResponseService
            logOut('IvrMappingService', `[Job ${this.jobId}] Step 7: Building final context from IVR mapping`);
            this.sendProgressWebhook('building_context', {});
            const finalContext = await this.buildFinalContext(orchestrationResponseService);

            // Step 8: Load IVR mapping data and return results
            logOut('IvrMappingService', `[Job ${this.jobId}] Step 8: Loading IVR mapping data`);
            const ivrMapping = await this.loadIvrMapping();

            const result: IvrMappingResult = {
                context: finalContext,
                ivrMapping
            };

            // Update job with results
            this.updateJobResult(result);

            // Send completion webhook
            this.sendProgressWebhook('completed', { result });

            logOut('IvrMappingService', `[Job ${this.jobId}] IVR mapping completed successfully`);

        } catch (error) {
            logError('IvrMappingService', `[Job ${this.jobId}] Processing failed: ${error instanceof Error ? error.message : String(error)}`);
            this.updateJobError(error instanceof Error ? error.message : String(error));

            // Send error webhook
            this.sendProgressWebhook('failed', { error: error instanceof Error ? error.message : String(error) });
        }
    }

    /**
     * Syncs in-memory mapping data from file
     */
    private async syncMappingDataFromFile(): Promise<void> {
        try {
            const dataDir = path.join(process.cwd(), 'assets', 'legs');
            const dataFilePath = path.join(dataDir, 'IvrMapping.json');

            const fileContent = await fs.readFile(dataFilePath, 'utf-8');
            this.ivrMappingData = JSON.parse(fileContent);

            logOut('IvrMappingService', `[Job ${this.jobId}] Synced ${this.ivrMappingData.length} menu steps from file`);
        } catch (error) {
            // File doesn't exist or is invalid - keep existing in-memory data
            logOut('IvrMappingService', `[Job ${this.jobId}] No file to sync or error reading: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Builds final context by analyzing IVR mapping file using ResponseService
     */
    private async buildFinalContext(responseService: OpenAIResponseService): Promise<string> {
        try {
            logOut('IvrMappingService', `[Job ${this.jobId}] Analyzing IVR mapping to build context`);

            // Use in-memory data directly - no need for tool call
            if (this.ivrMappingData.length === 0) {
                logOut('IvrMappingService', `[Job ${this.jobId}] No IVR mapping data available`);
                return `# IVR Context\n\nNo IVR mapping data available for this job.`;
            }

            // Build a structured context from the menu steps
            let contextBuilder = `# IVR Menu Structure Context\n\n`;
            contextBuilder += `This context simulates the IVR menu structure explored during the mapping process.\n\n`;
            contextBuilder += `## Menu Navigation Map\n\n`;

            // Group steps by path level for better organization
            const rootStep = this.ivrMappingData.find(step => step.menuPath === 'root');
            if (rootStep) {
                contextBuilder += `### Root Menu\n`;
                contextBuilder += `**Audio**: "${rootStep.audioTranscript}"\n\n`;
                contextBuilder += `**Options**:\n`;
                rootStep.availableOptions.forEach(opt => {
                    contextBuilder += `- ${opt}\n`;
                });
                contextBuilder += `\n`;
            }

            // Add subsequent menu levels
            const otherSteps = this.ivrMappingData.filter(step => step.menuPath !== 'root');
            otherSteps.forEach(step => {
                contextBuilder += `### Menu Path: ${step.menuPath}\n`;
                if (step.dtmfSent) {
                    contextBuilder += `**Accessed by**: Pressing ${step.dtmfSent}\n`;
                }
                contextBuilder += `**Audio**: "${step.audioTranscript}"\n`;
                if (step.availableOptions.length > 0) {
                    contextBuilder += `**Options**:\n`;
                    step.availableOptions.forEach(opt => {
                        contextBuilder += `- ${opt}\n`;
                    });
                }
                contextBuilder += `**Outcome**: ${step.outcome}\n`;
                contextBuilder += `\n`;
            });

            contextBuilder += `## Summary\n\n`;
            contextBuilder += `Total menu steps explored: ${this.ivrMappingData.length}\n`;
            contextBuilder += `Paths documented: ${this.ivrMappingData.map(s => s.menuPath).join(', ')}\n`;

            logOut('IvrMappingService', `[Job ${this.jobId}] Built context with ${this.ivrMappingData.length} menu steps`);

            return contextBuilder;

        } catch (error) {
            logError('IvrMappingService', `[Job ${this.jobId}] Failed to build context: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }

    /**
     * Loads IVR mapping data from in-memory storage
     */
    private async loadIvrMapping(): Promise<any> {
        try {
            // Return in-memory data directly
            if (this.ivrMappingData.length > 0) {
                logOut('IvrMappingService', `[Job ${this.jobId}] Returning ${this.ivrMappingData.length} menu steps from memory`);
                return this.ivrMappingData;
            }

            // Fallback: try to read from file if in-memory is empty
            const dataDir = path.join(process.cwd(), 'assets', 'legs');
            const dataFilePath = path.join(dataDir, 'IvrMapping.json');

            const fileContent = await fs.readFile(dataFilePath, 'utf-8');
            const fileData = JSON.parse(fileContent);

            logOut('IvrMappingService', `[Job ${this.jobId}] Loaded ${fileData.length} menu steps from file (fallback)`);
            return fileData;

        } catch (error) {
            logError('IvrMappingService', `Failed to load IVR mapping: ${error instanceof Error ? error.message : String(error)}`);
            // Return empty array if no data available
            return [];
        }
    }

    /**
     * Sends progress webhook notification
     */
    private sendProgressWebhook(event: string, data: any): void {
        if (!this.callbackUrl) {
            return; // No webhook configured
        }

        const payload = {
            jobId: this.jobId,
            event,
            timestamp: new Date().toISOString(),
            data
        };

        // Fire and forget - don't await or block on webhook delivery
        fetch(this.callbackUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        }).then(response => {
            if (!response.ok) {
                logError('IvrMappingService', `Webhook failed for event ${event}: ${response.status} ${response.statusText}`);
            } else {
                logOut('IvrMappingService', `Webhook sent for event ${event} to ${this.callbackUrl}`);
            }
        }).catch(error => {
            logError('IvrMappingService', `Failed to send webhook for event ${event}: ${error instanceof Error ? error.message : String(error)}`);
        });
    }

    /**
     * Checks if this job is expired
     */
    isExpired(): boolean {
        return new Date() > this.expiresAt;
    }

    /**
     * Updates job status
     */
    private updateJobStatus(status: JobStatus): void {
        this.status = status;
        this.updatedAt = new Date();
    }

    /**
     * Updates job with result
     */
    private updateJobResult(result: IvrMappingResult): void {
        this.status = 'completed';
        this.result = result;
        this.updatedAt = new Date();
    }

    /**
     * Updates job with error
     */
    private updateJobError(error: string): void {
        this.status = 'failed';
        this.error = error;
        this.updatedAt = new Date();
    }

    /**
     * Notifies that the call has completed - called from WebSocket close handler
     */
    notifyCallComplete(sessionData: any): void {
        logOut('IvrMappingService', `[Job ${this.jobId}] Call completion notification received`);
        if (this.callCompletionResolve) {
            this.callCompletionResolve(sessionData);
            this.callCompletionResolve = undefined;
            this.callCompletionReject = undefined;
        }
    }
}

export { IvrMappingService };
