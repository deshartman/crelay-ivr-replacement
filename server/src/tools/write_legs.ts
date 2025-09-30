import { logOut, logError } from '../utils/logger.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * Interface for the function arguments - matches MenuStepData format
 */
interface WriteLegsArguments {
    menuPath: string;
    audioTranscript: string;
    availableOptions: string[];
    dtmfSent?: string;
    outcome: string;
    status: 'COMPLETED' | 'IN_PROGRESS' | 'FAILED';
    [key: string]: any;
}

/**
 * Interface for the response object
 */
interface WriteLegsResponse {
    success: boolean;
    message: string;
    menuPath: string;
    filePath?: string;
}

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
 * Documents individual IVR menu steps with path details, transcripts, and DTMF actions
 * for step-by-step navigation tracking
 *
 * @param functionArguments - The arguments for the write legs function
 * @returns Response indicating success/failure of documentation
 */
export default async function (functionArguments: WriteLegsArguments): Promise<WriteLegsResponse> {
    console.log('🔧 WriteLegsTool: Function called with arguments:', JSON.stringify(functionArguments, null, 2));
    logOut('WriteLegsTool', `Write legs function called with arguments: ${JSON.stringify(functionArguments)}`);

    try {
        // Validate required parameters
        if (!functionArguments.menuPath) {
            throw new Error('menuPath parameter is required');
        }
        if (!functionArguments.audioTranscript) {
            throw new Error('audioTranscript parameter is required');
        }
        if (!functionArguments.availableOptions || !Array.isArray(functionArguments.availableOptions)) {
            throw new Error('availableOptions parameter is required and must be an array');
        }
        if (!functionArguments.outcome) {
            throw new Error('outcome parameter is required');
        }
        if (!functionArguments.status) {
            throw new Error('status parameter is required');
        }

        // Create legs data directory if it doesn't exist
        const dataDir = path.join(process.cwd(), 'assets', 'legs');
        console.log('📁 WriteLegsTool: Creating directory at:', dataDir);
        await fs.mkdir(dataDir, { recursive: true });
        console.log('✅ WriteLegsTool: Directory created/verified');

        // Prepare menu step data
        const stepData: MenuStepData = {
            menuPath: functionArguments.menuPath,
            timestamp: new Date().toISOString(),
            audioTranscript: functionArguments.audioTranscript,
            availableOptions: functionArguments.availableOptions,
            dtmfSent: functionArguments.dtmfSent,
            outcome: functionArguments.outcome,
            status: functionArguments.status
        };

        // Read existing data or create new array
        const dataFilePath = path.join(dataDir, 'menu_steps.json');
        console.log('📖 WriteLegsTool: Reading existing data from:', dataFilePath);
        let existingData: MenuStepData[] = [];

        try {
            const existingContent = await fs.readFile(dataFilePath, 'utf-8');
            existingData = JSON.parse(existingContent);
            console.log('📚 WriteLegsTool: Loaded existing data with', existingData.length, 'steps');
        } catch (error) {
            // File doesn't exist or is invalid, start with empty array
            console.log('🆕 WriteLegsTool: Creating new menu steps file');
            logOut('WriteLegsTool', 'Creating new menu steps file');
        }

        // Check if step already exists and update, otherwise add new
        const existingStepIndex = existingData.findIndex(step => step.menuPath === functionArguments.menuPath);
        if (existingStepIndex >= 0) {
            console.log('🔄 WriteLegsTool: Updating existing step at path:', functionArguments.menuPath);
            existingData[existingStepIndex] = stepData;
            logOut('WriteLegsTool', `Updated existing step at path ${functionArguments.menuPath}`);
        } else {
            console.log('➕ WriteLegsTool: Adding new step at path:', functionArguments.menuPath);
            existingData.push(stepData);
            logOut('WriteLegsTool', `Added new step at path ${functionArguments.menuPath}`);
        }

        // Preserve natural navigation order - do not sort by timestamp
        console.log('🗂️ WriteLegsTool: Total steps after update:', existingData.length);

        // Write updated data back to file
        console.log('💾 WriteLegsTool: Writing data to file:', dataFilePath);
        await fs.writeFile(dataFilePath, JSON.stringify(existingData, null, 2), 'utf-8');
        console.log('✅ WriteLegsTool: Data successfully written to file');

        const response: WriteLegsResponse = {
            success: true,
            message: `Successfully documented menu step at path ${functionArguments.menuPath}`,
            menuPath: functionArguments.menuPath,
            filePath: dataFilePath
        };

        console.log('🎉 WriteLegsTool: Success! Response:', JSON.stringify(response, null, 2));
        logOut('WriteLegsTool', `Write legs response: ${JSON.stringify(response)}`);
        return response;

    } catch (error) {
        const errorResponse: WriteLegsResponse = {
            success: false,
            message: `Failed to document menu step: ${error instanceof Error ? error.message : String(error)}`,
            menuPath: functionArguments.menuPath || 'unknown'
        };
        console.error('❌ WriteLegsTool: Error occurred:', error);
        console.error('💥 WriteLegsTool: Error response:', JSON.stringify(errorResponse, null, 2));
        logError('WriteLegsTool', `Write legs error: ${JSON.stringify(errorResponse)}`);
        return errorResponse;
    }
}