/**
 * Interface for asset loading implementations
 * Abstracts the source of contexts, manifests, and configuration data
 */

import type { SilenceDetectionConfig } from '../services/SilenceHandler.js';
import type { ConversationRelayConfig } from './ConversationRelay.js';

/**
 * Configuration type for asset loader selection
 */
export type AssetLoaderConfig = 'sync' | 'file' | 'j2';

/**
 * ServerConfig structure for server configuration
 */
export interface ServerConfig {
    ConversationRelay: {
        Configuration: ConversationRelayConfig;
        SilenceDetection: SilenceDetectionConfig;
    };
    AssetLoader: {
        context: string;
        manifest: string;
        assetLoaderType: AssetLoaderConfig;
    };
    Server: {
        ListenMode: {
            enabled: boolean;
        };
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
     * Loads the server configuration that determines default context and manifest
     * @returns Promise resolving to the server configuration object
     */
    loadServerConfig(): Promise<ServerConfig>;

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

}