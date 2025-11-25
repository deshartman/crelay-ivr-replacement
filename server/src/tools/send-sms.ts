/**
 * Send SMS function - returns standard responses for conversation context.
 * This is a generic LLM tool that OpenAI processes normally.
 */
import twilio from 'twilio';
import { logOut, logError } from '../utils/logger.js';

/**
 * Interface for the function arguments
 */
interface SendSMSFunctionArguments {
    to: string;
    message: string;
    [key: string]: any;
}


/**
 * Interface for the response object - simplified
 */
interface SendSMSResponse {
    success: boolean;
    message: string;
    recipient?: string;
}

/**
 * Sends an SMS message using the Twilio service
 * Now returns a simple response that gets inserted into conversation context
 * 
 * @param functionArguments - The arguments for the send SMS function
 * @returns A simple response object for conversation context
 */
export default async function (functionArguments: SendSMSFunctionArguments): Promise<SendSMSResponse> {
    const log = (msg: string) => logOut('SendSMS', msg);
    const logError_ = (msg: string) => logError('SendSMS', msg);

    log(`Send SMS function called with arguments: ${JSON.stringify(functionArguments)}`);

    try {
        // Initialize Twilio client directly
        const accountSid = process.env.ACCOUNT_SID || '';
        const authToken = process.env.AUTH_TOKEN || '';
        const fromNumber = process.env.FROM_NUMBER || '';

        const client = twilio(accountSid, authToken);

        // Send SMS directly via Twilio API
        const result = await client.messages.create({
            body: functionArguments.message,
            from: fromNumber,
            to: functionArguments.to
        });

        const response: SendSMSResponse = {
            success: true,
            message: `SMS sent successfully`,
            recipient: functionArguments.to
        };

        log(`SMS sent successfully: SID=${result.sid}`);
        return response;

    } catch (error) {
        const errorMessage = `SMS send failed: ${error instanceof Error ? error.message : String(error)}`;
        logError_(errorMessage);

        return {
            success: false,
            message: errorMessage
        };
    }
}