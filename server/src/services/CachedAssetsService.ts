/**
 * CachedAssetsService - High-performance in-memory cache for contexts and manifests
 *
 * This service provides fast access to conversation contexts and tool manifests
 * without runtime Sync API calls. It's designed to:
 *
 * 1. Cache Management:
 *    - Loads all contexts and manifests from Sync at startup
 *    - Maintains in-memory cache for instant access
 *    - Serves fresh copies for each ConversationRelay session
 *
 * 2. Performance Optimization:
 *    - Eliminates per-session service creation overhead
 *    - Avoids runtime Sync API latency
 *    - Provides stateless context switching
 *
 * 3. Session Independence:
 *    - Each CRelay session gets independent context/manifest copies
 *    - Context switching doesn't affect other sessions
 *    - Supports multiple simultaneous conversations
 *
 * 4. Default Configuration:
 *    - Uses UsedConfig to determine default context/manifest
 *    - Fallback to hardcoded defaults if UsedConfig unavailable
 *    - Maintains consistency with existing patterns
 */

import { logOut, logError } from '../utils/logger.js';
import { TwilioSyncService } from './TwilioSyncService.js';
import type { SilenceDetectionConfig } from './SilenceHandler.js';

interface CachedAssets {
    contexts: Map<string, string>;
    manifests: Map<string, object>;
    usedConfig: {
        context: string;
        manifest: string;
        configuration?: string;
        silenceDetection?: SilenceDetectionConfig;
    };
}

class CachedAssetsService {
    private cache: CachedAssets | null = null;
    private isInitialized: boolean = false;

    constructor(private syncService: TwilioSyncService) {}

    /**
     * Initializes the cache by loading all contexts and manifests from Sync
     * Should be called once at server startup after Sync service is ready
     */
    async initialize(): Promise<void> {
        try {
            logOut('CachedAssetsService', 'Initializing cache from Sync...');

            // Load used config to determine defaults
            const usedConfig = await this.syncService.getDocument('ConversationRelay', 'UsedConfig') || {
                context: 'defaultContext',
                manifest: 'defaultToolManifest',
                configuration: 'defaultConfiguration'
            };

            // Load all contexts
            const allContexts = await this.syncService.getMapItem('ConversationRelay', 'Context');
            const contexts = new Map<string, string>();

            if (allContexts && typeof allContexts === 'object') {
                Object.entries(allContexts).forEach(([key, value]) => {
                    contexts.set(key, typeof value === 'object' && value && 'content' in value
                        ? (value as any).content
                        : String(value || ''));
                });
            }

            // Load all manifests
            const allManifests = await this.syncService.getMapItem('ConversationRelay', 'ToolManifest');
            const manifests = new Map<string, object>();

            if (allManifests && typeof allManifests === 'object') {
                Object.entries(allManifests).forEach(([key, value]) => {
                    manifests.set(key, value || {});
                });
            }

            this.cache = {
                contexts,
                manifests,
                usedConfig
            };

            this.isInitialized = true;
            logOut('CachedAssetsService', `Cache initialized: ${contexts.size} contexts, ${manifests.size} manifests`);

        } catch (error) {
            logError('CachedAssetsService', `Failed to initialize cache: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }

    /**
     * Gets the currently used context and manifest based on UsedConfig
     * Returns fresh copies for each session
     */
    getUsedAssets(): { context: string; manifest: object; silenceDetection: SilenceDetectionConfig } {
        this.ensureInitialized();

        const defaultContextKey = this.cache!.usedConfig.context;
        const defaultManifestKey = this.cache!.usedConfig.manifest;

        const context = this.cache!.contexts.get(defaultContextKey) || '';
        const manifest = this.cache!.manifests.get(defaultManifestKey) || {};

        // Default silence detection config if not provided
        const defaultSilenceConfig: SilenceDetectionConfig = {
            enabled: true,
            secondsThreshold: 20,
            messages: ["Still there?", "Just checking you are still there?"]
        };

        // Return deep copies to ensure session independence
        return {
            context: context,
            manifest: JSON.parse(JSON.stringify(manifest)),
            silenceDetection: this.cache!.usedConfig.silenceDetection ?? defaultSilenceConfig
        };
    }

    /**
     * Gets a specific context by key
     * Returns a fresh copy for the session
     */
    getContext(contextKey: string): string | null {
        this.ensureInitialized();

        const context = this.cache!.contexts.get(contextKey);
        return context !== undefined ? context : null;
    }

    /**
     * Gets a specific manifest by key
     * Returns a fresh copy for the session
     */
    getManifest(manifestKey: string): object | null {
        this.ensureInitialized();

        const manifest = this.cache!.manifests.get(manifestKey);
        return manifest !== undefined ? JSON.parse(JSON.stringify(manifest)) : null;
    }

    /**
     * Gets assets for context switching - validates context exists
     * Returns null if context doesn't exist to prevent invalid switches
     */
    getAssetsForContextSwitch(contextKey: string): { context: string; manifest: object } | null {
        this.ensureInitialized();

        const context = this.getContext(contextKey);
        if (!context) {
            logError('CachedAssetsService', `Context '${contextKey}' not found in cache`);
            return null;
        }

        // Use currently used manifest for context switches
        const usedManifest = this.cache!.manifests.get(this.cache!.usedConfig.manifest) || {};

        return {
            context,
            manifest: JSON.parse(JSON.stringify(usedManifest))
        };
    }

    /**
     * Lists all available context keys
     */
    getAvailableContexts(): string[] {
        this.ensureInitialized();
        return Array.from(this.cache!.contexts.keys());
    }

    /**
     * Lists all available manifest keys
     */
    getAvailableManifests(): string[] {
        this.ensureInitialized();
        return Array.from(this.cache!.manifests.keys());
    }

    /**
     * Refreshes the cache from Sync
     * Useful for updating cache when Sync data changes
     */
    async refresh(): Promise<void> {
        logOut('CachedAssetsService', 'Refreshing cache...');
        this.isInitialized = false;
        await this.initialize();
    }

    /**
     * Gets cache statistics for monitoring
     */
    getCacheStats(): { contexts: number; manifests: number; initialized: boolean } {
        if (!this.isInitialized || !this.cache) {
            return { contexts: 0, manifests: 0, initialized: false };
        }

        return {
            contexts: this.cache.contexts.size,
            manifests: this.cache.manifests.size,
            initialized: this.isInitialized
        };
    }

    private ensureInitialized(): void {
        if (!this.isInitialized || !this.cache) {
            throw new Error('CachedAssetsService not initialized. Call initialize() first.');
        }
    }
}

export { CachedAssetsService };