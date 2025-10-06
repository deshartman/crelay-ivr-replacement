import { logOut, logError } from '../utils/logger.js';
import fs from 'fs/promises';
import path from 'path';

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

/**
 * Interface for the function arguments
 */
interface ReadLegsArguments {
    filterStatus?: 'COMPLETED' | 'IN_PROGRESS' | 'FAILED' | 'ALL';
    targetPath?: string;
    inMemoryData?: MenuStepData[];
    [key: string]: any;
}

/**
 * Interface for the response object
 */
interface ReadLegsResponse {
    success: boolean;
    message: string;
    totalSteps: number;
    steps: MenuStepData[];
    completedPaths?: string[];
    nextSuggestedPath?: string;
}

/**
 * Loads previously documented IVR exploration data to identify completed paths
 * and determine next exploration targets
 *
 * @param functionArguments - The arguments for the read legs function
 * @returns Response with exploration data and analysis
 */
export default async function (functionArguments: ReadLegsArguments): Promise<ReadLegsResponse> {
    logOut('ReadLegsTool', `Read legs function called with arguments: ${JSON.stringify(functionArguments)}`);

    try {
        // Set default filter
        const filterStatus = functionArguments.filterStatus || 'ALL';

        let allSteps: MenuStepData[] = [];

        // Check if in-memory data is provided
        if (functionArguments.inMemoryData && Array.isArray(functionArguments.inMemoryData)) {
            logOut('ReadLegsTool', 'Using in-memory data');
            allSteps = functionArguments.inMemoryData;
        } else {
            // Read from file
            const dataDir = path.join(process.cwd(), 'assets', 'legs');
            const dataFilePath = path.join(dataDir, 'IvrMapping.json');

            try {
                const fileContent = await fs.readFile(dataFilePath, 'utf-8');
                allSteps = JSON.parse(fileContent);
                logOut('ReadLegsTool', `Loaded ${allSteps.length} steps from file`);
            } catch (error) {
                // File doesn't exist or is invalid
                logOut('ReadLegsTool', 'No existing exploration file found');
                return {
                    success: true,
                    message: 'No exploration data found. This appears to be a fresh exploration session.',
                    totalSteps: 0,
                    steps: [],
                    completedPaths: [],
                    nextSuggestedPath: 'root'
                };
            }
        }

        // Filter by status if specified
        let filteredSteps = allSteps;
        if (filterStatus !== 'ALL') {
            filteredSteps = allSteps.filter(step => step.status === filterStatus);
        }

        // Filter by specific path if requested
        if (functionArguments.targetPath) {
            filteredSteps = filteredSteps.filter(step => step.menuPath === functionArguments.targetPath);
        }

        // Sort by menuPath for consistent ordering
        filteredSteps.sort((a, b) => a.menuPath.localeCompare(b.menuPath));

        // Generate analysis for navigation assistance
        const completedPaths = allSteps
            .filter(step => step.status === 'COMPLETED')
            .map(step => step.menuPath);

        // Find next suggested path based on systematic exploration
        let nextSuggestedPath: string | undefined;
        const inProgressStep = allSteps.find(step => step.status === 'IN_PROGRESS');

        if (inProgressStep) {
            nextSuggestedPath = inProgressStep.menuPath;
        } else {
            // Generate next path based on completed paths using depth-first strategy
            nextSuggestedPath = generateNextPath(completedPaths);
        }

        const response: ReadLegsResponse = {
            success: true,
            message: `Successfully loaded ${filteredSteps.length} menu steps (${completedPaths.length} completed paths)`,
            totalSteps: filteredSteps.length,
            steps: filteredSteps,
            completedPaths,
            nextSuggestedPath
        };

        logOut('ReadLegsTool', `Read legs response: ${JSON.stringify(response)}`);
        return response;

    } catch (error) {
        const errorResponse: ReadLegsResponse = {
            success: false,
            message: `Failed to load exploration data: ${error instanceof Error ? error.message : String(error)}`,
            totalSteps: 0,
            steps: []
        };
        logError('ReadLegsTool', `Read legs error: ${JSON.stringify(errorResponse)}`);
        return errorResponse;
    }
}

/**
 * Generates the next path to explore based on depth-first traversal strategy
 * Always explores root first, then numeric paths (1, 2, 3..., then 1-1, 1-2, etc.)
 */
function generateNextPath(completedPaths: string[]): string {
    if (completedPaths.length === 0) {
        return 'root'; // Start with root
    }

    // Check if root is completed
    if (!completedPaths.includes('root')) {
        return 'root';
    }

    // Find the next logical path using depth-first strategy
    // Start with single digit paths (1, 2, 3...)
    for (let i = 1; i <= 9; i++) {
        const singlePath = i.toString();
        if (!completedPaths.includes(singlePath)) {
            return singlePath;
        }
    }

    // Then check two-digit paths (1-1, 1-2, etc.)
    for (let first = 1; first <= 9; first++) {
        for (let second = 1; second <= 9; second++) {
            const twoPath = `${first}-${second}`;
            if (!completedPaths.includes(twoPath)) {
                return twoPath;
            }
        }
    }

    // Then check three-digit paths (1-1-1, 1-1-2, etc.)
    for (let first = 1; first <= 9; first++) {
        for (let second = 1; second <= 9; second++) {
            for (let third = 1; third <= 9; third++) {
                const threePath = `${first}-${second}-${third}`;
                if (!completedPaths.includes(threePath)) {
                    return threePath;
                }
            }
        }
    }

    // If we get here, we've explored a lot - suggest a four-digit path
    return '1-1-1-1';
}