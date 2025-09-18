import { logOut, logError } from '../utils/logger.js';

/**
 * Interface for the function arguments
 */
interface SetListenModeArguments {
    enabled: boolean;
    [key: string]: any;
}

/**
 * Interface for the response object
 */
interface SetListenModeResponse {
    success: boolean;
    message: string;
    listenMode: boolean;
}

/**
 * Sets the listen mode configuration dynamically during conversation.
 * When enabled, CRelay listens but suppresses text responses (tool execution continues).
 * When disabled, normal text responses are enabled.
 *
 * @param functionArguments - The arguments for the set listen mode function
 * @returns Response indicating success/failure of mode change
 */
export default async function (functionArguments: SetListenModeArguments): Promise<SetListenModeResponse> {
    console.log('🎧 SetListenModeTool: Function called with arguments:', JSON.stringify(functionArguments, null, 2));
    logOut('SetListenModeTool', `Set listen mode function called with arguments: ${JSON.stringify(functionArguments)}`);

    try {
        // Validate required parameters
        if (typeof functionArguments.enabled !== 'boolean') {
            throw new Error('enabled parameter is required and must be boolean');
        }

        const modeDescription = functionArguments.enabled ? 'listen-only mode (text responses suppressed)' : 'normal mode (text responses enabled)';

        const response: SetListenModeResponse = {
            success: true,
            message: `Listen mode set to ${functionArguments.enabled ? 'enabled' : 'disabled'}. ${modeDescription}`,
            listenMode: functionArguments.enabled
        };

        console.log('✅ SetListenModeTool: Success! Response:', JSON.stringify(response, null, 2));
        logOut('SetListenModeTool', `Set listen mode response: ${JSON.stringify(response)}`);
        return response;

    } catch (error) {
        const errorResponse: SetListenModeResponse = {
            success: false,
            message: `Failed to set listen mode: ${error instanceof Error ? error.message : String(error)}`,
            listenMode: false
        };
        console.error('❌ SetListenModeTool: Error occurred:', error);
        console.error('💥 SetListenModeTool: Error response:', JSON.stringify(errorResponse, null, 2));
        logError('SetListenModeTool', `Set listen mode error: ${JSON.stringify(errorResponse)}`);
        return errorResponse;
    }
}