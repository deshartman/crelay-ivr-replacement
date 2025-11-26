import { logOut, logError } from '../utils/logger.js';

/**
 * Interface for the function arguments
 */
interface SetSilenceDetectionArguments {
    enabled: boolean;
    [key: string]: any;
}

/**
 * Interface for the response object
 */
interface SetSilenceDetectionResponse {
    success: boolean;
    message: string;
    silenceDetectionEnabled: boolean;
    outgoingMessage?: {
        type: string;
        enabled: boolean;
    };
}

/**
 * Enables or disables silence detection monitoring during the call.
 * When enabled, the system monitors for periods of silence and sends reminder messages.
 * When disabled, no silence monitoring occurs.
 *
 * @param functionArguments - The arguments for the set silence detection function
 * @returns Response indicating success/failure with outgoingMessage to trigger the change
 */
export default async function (functionArguments: SetSilenceDetectionArguments): Promise<SetSilenceDetectionResponse> {
    logOut('SetSilenceDetection', `Function called with arguments: ${JSON.stringify(functionArguments)}`);

    try {
        // Validate required parameters
        if (typeof functionArguments.enabled !== 'boolean') {
            throw new Error('enabled parameter is required and must be boolean');
        }

        const modeDescription = functionArguments.enabled
            ? 'enabled (will monitor for silence and send reminders)'
            : 'disabled (no silence monitoring)';

        const response: SetSilenceDetectionResponse = {
            success: true,
            message: `Silence detection ${modeDescription}`,
            silenceDetectionEnabled: functionArguments.enabled,
            outgoingMessage: {
                type: 'setSilenceDetection',
                enabled: functionArguments.enabled
            }
        };

        logOut('SetSilenceDetection', `Response: ${JSON.stringify(response)}`);
        return response;

    } catch (error) {
        const errorResponse: SetSilenceDetectionResponse = {
            success: false,
            message: `Failed to set silence detection: ${error instanceof Error ? error.message : String(error)}`,
            silenceDetectionEnabled: false
        };
        logError('SetSilenceDetection', `Error: ${JSON.stringify(errorResponse)}`);
        return errorResponse;
    }
}
