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
interface ReadLegsArguments {
    filterStatus?: 'COMPLETED' | 'IN_PROGRESS' | 'FAILED' | 'ALL';
    targetPath?: string;
    [key: string]: any;
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
 * Interface for the response object
 */
interface ReadLegsResponse {
    success: boolean;
    message: string;
    totalLegs: number;
    legs: LegData[];
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

        // Construct path to legs data file
        const dataDir = path.join(process.cwd(), 'server', 'assets', 'legs');
        const dataFilePath = path.join(dataDir, 'exploration_legs.json');

        let allLegs: LegData[] = [];

        try {
            const fileContent = await fs.readFile(dataFilePath, 'utf-8');
            allLegs = JSON.parse(fileContent);
        } catch (error) {
            // File doesn't exist or is invalid
            logOut('ReadLegsTool', 'No existing exploration legs file found');
            return {
                success: true,
                message: 'No exploration data found. This appears to be a fresh exploration session.',
                totalLegs: 0,
                legs: [],
                completedPaths: [],
                nextSuggestedPath: '1'
            };
        }

        // Filter by status if specified
        let filteredLegs = allLegs;
        if (filterStatus !== 'ALL') {
            filteredLegs = allLegs.filter(leg => leg.status === filterStatus);
        }

        // Filter by specific path if requested
        if (functionArguments.targetPath) {
            filteredLegs = filteredLegs.filter(leg => leg.path === functionArguments.targetPath);
        }

        // Sort by leg number for consistent ordering
        filteredLegs.sort((a, b) => a.legNumber - b.legNumber);

        // Generate analysis for navigation assistance
        const completedPaths = allLegs
            .filter(leg => leg.status === 'COMPLETED')
            .map(leg => leg.path);

        // Find next suggested path based on systematic exploration
        let nextSuggestedPath: string | undefined;
        const inProgressLeg = allLegs.find(leg => leg.status === 'IN_PROGRESS');

        if (inProgressLeg && inProgressLeg.nextTarget) {
            nextSuggestedPath = inProgressLeg.nextTarget;
        } else {
            // Generate next path based on completed paths using depth-first strategy
            nextSuggestedPath = generateNextPath(completedPaths);
        }

        const response: ReadLegsResponse = {
            success: true,
            message: `Successfully loaded ${filteredLegs.length} exploration legs (${completedPaths.length} completed paths)`,
            totalLegs: filteredLegs.length,
            legs: filteredLegs,
            completedPaths,
            nextSuggestedPath
        };

        logOut('ReadLegsTool', `Read legs response: ${JSON.stringify(response)}`);
        return response;

    } catch (error) {
        const errorResponse: ReadLegsResponse = {
            success: false,
            message: `Failed to load exploration data: ${error instanceof Error ? error.message : String(error)}`,
            totalLegs: 0,
            legs: []
        };
        logError('ReadLegsTool', `Read legs error: ${JSON.stringify(errorResponse)}`);
        return errorResponse;
    }
}

/**
 * Generates the next path to explore based on depth-first traversal strategy
 * Always explores option 1 first, then backtracks to explore option 2, etc.
 */
function generateNextPath(completedPaths: string[]): string {
    if (completedPaths.length === 0) {
        return '1'; // Start with option 1
    }

    // Sort paths to ensure consistent ordering
    const sortedPaths = completedPaths.sort();

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