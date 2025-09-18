import { logOut, logError } from '../utils/logger.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * Interface for menu sequence objects
 */
interface MenuInfo {
    menuId: string;
    audioTranscript: string;
    availableOptions: string[];
}

/**
 * Interface for the function arguments
 */
interface WriteLegsArguments {
    legNumber: number;
    path: string;
    menuSequence: MenuInfo[];
    finalOutcome: string;
    status: 'COMPLETED' | 'IN_PROGRESS' | 'FAILED';
    nextTarget?: string;
    [key: string]: any;
}

/**
 * Interface for the response object
 */
interface WriteLegsResponse {
    success: boolean;
    message: string;
    legNumber: number;
    filePath?: string;
}

/**
 * Interface for leg data structure
 */
interface LegData {
    legNumber: number;
    path: string;
    explorationDate: string;
    menuSequence: MenuInfo[];
    finalOutcome: string;
    status: 'COMPLETED' | 'IN_PROGRESS' | 'FAILED';
    nextTarget?: string;
}

/**
 * Documents completed IVR exploration legs with path details, menu transcripts,
 * and next targets for persistent cross-call state management
 *
 * @param functionArguments - The arguments for the write legs function
 * @returns Response indicating success/failure of documentation
 */
export default async function (functionArguments: WriteLegsArguments): Promise<WriteLegsResponse> {
    console.log('🔧 WriteLegsTool: Function called with arguments:', JSON.stringify(functionArguments, null, 2));
    logOut('WriteLegsTool', `Write legs function called with arguments: ${JSON.stringify(functionArguments)}`);

    try {
        // Validate required parameters
        if (!functionArguments.legNumber) {
            throw new Error('legNumber parameter is required');
        }
        if (!functionArguments.path) {
            throw new Error('path parameter is required');
        }
        if (!functionArguments.menuSequence || !Array.isArray(functionArguments.menuSequence)) {
            throw new Error('menuSequence parameter is required and must be an array');
        }
        if (!functionArguments.finalOutcome) {
            throw new Error('finalOutcome parameter is required');
        }
        if (!functionArguments.status) {
            throw new Error('status parameter is required');
        }

        // Create legs data directory if it doesn't exist
        const dataDir = path.join(process.cwd(), 'assets', 'legs');
        console.log('📁 WriteLegsTool: Creating directory at:', dataDir);
        await fs.mkdir(dataDir, { recursive: true });
        console.log('✅ WriteLegsTool: Directory created/verified');

        // Prepare leg data
        const legData: LegData = {
            legNumber: functionArguments.legNumber,
            path: functionArguments.path,
            explorationDate: new Date().toISOString(),
            menuSequence: functionArguments.menuSequence,
            finalOutcome: functionArguments.finalOutcome,
            status: functionArguments.status,
            nextTarget: functionArguments.nextTarget
        };

        // Read existing data or create new array
        const dataFilePath = path.join(dataDir, 'exploration_legs.json');
        console.log('📖 WriteLegsTool: Reading existing data from:', dataFilePath);
        let existingData: LegData[] = [];

        try {
            const existingContent = await fs.readFile(dataFilePath, 'utf-8');
            existingData = JSON.parse(existingContent);
            console.log('📚 WriteLegsTool: Loaded existing data with', existingData.length, 'legs');
        } catch (error) {
            // File doesn't exist or is invalid, start with empty array
            console.log('🆕 WriteLegsTool: Creating new exploration legs file');
            logOut('WriteLegsTool', 'Creating new exploration legs file');
        }

        // Check if leg already exists and update, otherwise add new
        const existingLegIndex = existingData.findIndex(leg => leg.legNumber === functionArguments.legNumber);
        if (existingLegIndex >= 0) {
            console.log('🔄 WriteLegsTool: Updating existing leg #' + functionArguments.legNumber);
            existingData[existingLegIndex] = legData;
            logOut('WriteLegsTool', `Updated existing leg #${functionArguments.legNumber}`);
        } else {
            console.log('➕ WriteLegsTool: Adding new leg #' + functionArguments.legNumber);
            existingData.push(legData);
            logOut('WriteLegsTool', `Added new leg #${functionArguments.legNumber}`);
        }

        // Sort by leg number for consistency
        existingData.sort((a, b) => a.legNumber - b.legNumber);
        console.log('🗂️ WriteLegsTool: Total legs after update:', existingData.length);

        // Write updated data back to file
        console.log('💾 WriteLegsTool: Writing data to file:', dataFilePath);
        await fs.writeFile(dataFilePath, JSON.stringify(existingData, null, 2), 'utf-8');
        console.log('✅ WriteLegsTool: Data successfully written to file');

        const response: WriteLegsResponse = {
            success: true,
            message: `Successfully documented exploration leg #${functionArguments.legNumber} with path ${functionArguments.path}`,
            legNumber: functionArguments.legNumber,
            filePath: dataFilePath
        };

        console.log('🎉 WriteLegsTool: Success! Response:', JSON.stringify(response, null, 2));
        logOut('WriteLegsTool', `Write legs response: ${JSON.stringify(response)}`);
        return response;

    } catch (error) {
        const errorResponse: WriteLegsResponse = {
            success: false,
            message: `Failed to document exploration leg: ${error instanceof Error ? error.message : String(error)}`,
            legNumber: functionArguments.legNumber || 0
        };
        console.error('❌ WriteLegsTool: Error occurred:', error);
        console.error('💥 WriteLegsTool: Error response:', JSON.stringify(errorResponse, null, 2));
        logError('WriteLegsTool', `Write legs error: ${JSON.stringify(errorResponse)}`);
        return errorResponse;
    }
}