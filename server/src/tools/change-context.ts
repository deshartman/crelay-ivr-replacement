import { logOut, logError } from '../utils/logger.js';

/**
 * Interface for the function arguments
 */
interface ChangeContextFunctionArguments {
    newContext: string;
    handoffSummary: string;
    _openaiService?: any; // OpenAIResponseService instance for context switching
    _contextCacheService?: any; // CachedAssetsService instance for context access
    [key: string]: any;
}

/**
 * Interface for the response object - simple response for conversation
 */
interface ChangeContextResponse {
    success: boolean;
    message: string;
    newContext: string;
    handoffSummary: string;
    contextChangeRequested?: boolean;
}

/**
 * Changes the conversation context by switching to a different prompt template.
 * This function performs the complete context switching workflow:
 * 1. Updates usedConfig in Sync with new context
 * 2. Retrieves new context content from Sync
 * 3. Signals ConversationRelayService to reload OpenAI with new context + handoff summary
 *
 * @param functionArguments - The arguments for the change context function
 * @returns Response indicating context change success with metadata
 */
export default async function (functionArguments: ChangeContextFunctionArguments): Promise<ChangeContextResponse> {
    logOut('ChangeContext', `Change context function called with arguments: ${JSON.stringify(functionArguments)}`);

    // Validate required parameters
    if (!functionArguments.newContext) {
        const errorResponse: ChangeContextResponse = {
            success: false,
            message: 'newContext parameter is required',
            newContext: '',
            handoffSummary: ''
        };
        logOut('ChangeContext', `Change context validation failed: ${JSON.stringify(errorResponse)}`);
        return errorResponse;
    }

    if (!functionArguments.handoffSummary) {
        const errorResponse: ChangeContextResponse = {
            success: false,
            message: 'handoffSummary parameter is required',
            newContext: functionArguments.newContext,
            handoffSummary: ''
        };
        logOut('ChangeContext', `Change context validation failed: ${JSON.stringify(errorResponse)}`);
        return errorResponse;
    }

    try {
        logOut('ChangeContext', `Context switch requested: ${functionArguments.newContext}`);
        logOut('ChangeContext', `Handoff summary: ${functionArguments.handoffSummary}`);

        // Check if we have the required service instances for context switching
        if (!functionArguments._openaiService || !functionArguments._contextCacheService) {
            throw new Error('Service instances not available for context switching');
        }

        const openaiService = functionArguments._openaiService;
        const contextCacheService = functionArguments._contextCacheService;

        // Get the new context and manifest from cache
        const contextSwitchAssets = contextCacheService.getAssetsForContextSwitch(functionArguments.newContext);
        if (!contextSwitchAssets) {
            throw new Error(`Context '${functionArguments.newContext}' not found in cache`);
        }

        // Insert handoff summary into conversation before switching context
        await openaiService.insertMessage('system', `Context handoff summary: ${functionArguments.handoffSummary}`);

        // Update the OpenAI service with new context and manifest
        await openaiService.updateContext(contextSwitchAssets.context);
        await openaiService.updateTools(contextSwitchAssets.manifest);

        logOut('ChangeContext', `Successfully switched to context: ${functionArguments.newContext}`);

        const response: ChangeContextResponse = {
            success: true,
            message: `Successfully switched to context: ${functionArguments.newContext}`,
            newContext: functionArguments.newContext,
            handoffSummary: functionArguments.handoffSummary
        };

        logOut('ChangeContext', `Change context response: ${JSON.stringify(response)}`);
        return response;

    } catch (error) {
        const errorResponse: ChangeContextResponse = {
            success: false,
            message: `Context switch failed: ${error instanceof Error ? error.message : String(error)}`,
            newContext: functionArguments.newContext,
            handoffSummary: functionArguments.handoffSummary
        };
        logError('ChangeContext', `Context switch error: ${JSON.stringify(errorResponse)}`);
        return errorResponse;
    }
}