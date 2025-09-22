/**
 * Interface for asset loading implementations
 * Abstracts the source of contexts, manifests, and configuration data
 */

import type { SilenceDetectionConfig } from '../services/SilenceHandler.js';

/**
 * Configuration type for asset loader selection
 */
export type AssetLoaderConfig = 'sync' | 'file' | 'j2';

/**
 * UsedConfig structure for determining default assets
 */
export interface UsedConfig {
    context: string;
    manifest: string;
    configuration?: string;
    assetLoaderType?: AssetLoaderConfig;
    silenceDetection?: SilenceDetectionConfig;
    listenMode?: {
        enabled: boolean;
    };
}

/**
 * Asset loader interface for abstracting asset loading from different sources
 */
export interface AssetLoader {
    /**
     * Initializes the asset loader (creates services/maps/documents for sync loader)
     * @returns Promise that resolves when initialization is complete
     */
    initialize?(): Promise<void>;

    /**
     * Loads the used configuration that determines default context and manifest
     * @returns Promise resolving to the used configuration object
     */
    loadUsedConfig(): Promise<UsedConfig>;

    /**
     * Loads all available contexts
     * @returns Promise resolving to a Map of context keys to context content
     */
    loadContexts(): Promise<Map<string, string>>;

    /**
     * Loads all available manifests
     * @returns Promise resolving to a Map of manifest keys to manifest objects
     */
    loadManifests(): Promise<Map<string, object>>;

    /**
     * Loads ConversationRelay configuration settings
     * @returns Promise resolving to a Map of configuration keys to configuration values
     */
    loadConversationRelayConfig(): Promise<Map<string, any>>;

    /**
     * Loads language configuration settings
     * @returns Promise resolving to a Map of language codes to language configuration objects
     */
    loadLanguages(): Promise<Map<string, any>>;
}