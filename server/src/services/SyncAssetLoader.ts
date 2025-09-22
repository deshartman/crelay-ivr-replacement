/**
 * SyncAssetLoader - Loads assets from Twilio Sync service
 *
 * This implementation directly uses Twilio Sync API to load contexts and manifests
 * from Twilio Sync services without any wrapper dependencies.
 */

import twilio from 'twilio';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { logOut, logError } from '../utils/logger.js';
import type { AssetLoader, UsedConfig } from '../interfaces/AssetLoader.js';

interface SyncServiceMap {
    name: string;
    maps: string[];
    documents?: string[];
}

export class SyncAssetLoader implements AssetLoader {
    private twilioClient: twilio.Twilio;
    private assetsPath: string;

    private readonly SERVICE_DEFINITIONS: SyncServiceMap[] = [
        {
            name: 'ConversationRelay',
            maps: ['Configuration', 'Languages', 'Context', 'ToolManifest'],
            documents: ['UsedConfig']
        }
    ];

    constructor() {
        this.twilioClient = twilio(process.env.ACCOUNT_SID || '', process.env.AUTH_TOKEN || '');

        // Get the assets path
        const currentModuleFile = fileURLToPath(import.meta.url);
        const serverSrcDir = dirname(dirname(currentModuleFile)); // Go up from services to src
        const serverDir = dirname(serverSrcDir); // Go up from src to server
        this.assetsPath = join(serverDir, 'assets');
    }

    /**
     * Loads the used configuration from Sync document
     */
    async loadUsedConfig(): Promise<UsedConfig> {
        try {
            const usedConfigData = await this.getDocument('ConversationRelay', 'UsedConfig');

            // Provide defaults if no config found
            return usedConfigData || {
                context: 'defaultContext',
                manifest: 'defaultToolManifest',
                configuration: 'defaultConfiguration'
            };
        } catch (error) {
            logError('SyncAssetLoader', `Failed to load UsedConfig: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }

    /**
     * Loads all contexts from Sync map
     */
    async loadContexts(): Promise<Map<string, string>> {
        try {
            const contextData = await this.getMapItem('ConversationRelay', 'Context');
            const contexts = new Map<string, string>();

            if (contextData) {
                Object.entries(contextData).forEach(([key, value]) => {
                    contexts.set(key, typeof value === 'object' && value && 'content' in value
                        ? (value as any).content
                        : String(value || ''));
                });
            }

            logOut('SyncAssetLoader', `Loaded ${contexts.size} contexts from Sync`);
            return contexts;
        } catch (error) {
            logError('SyncAssetLoader', `Failed to load contexts: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }

    /**
     * Loads all manifests from Sync map
     */
    async loadManifests(): Promise<Map<string, object>> {
        try {
            const manifestData = await this.getMapItem('ConversationRelay', 'ToolManifest');
            const manifests = new Map<string, object>();

            if (manifestData) {
                Object.entries(manifestData).forEach(([key, value]) => {
                    manifests.set(key, value || {});
                });
            }

            logOut('SyncAssetLoader', `Loaded ${manifests.size} manifests from Sync`);
            return manifests;
        } catch (error) {
            logError('SyncAssetLoader', `Failed to load manifests: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }

    /**
     * Loads ConversationRelay configuration from Sync map
     */
    async loadConversationRelayConfig(): Promise<Map<string, any>> {
        try {
            const configData = await this.getMapItem('ConversationRelay', 'Configuration');
            const conversationRelayConfig = new Map<string, any>();

            if (configData) {
                Object.entries(configData).forEach(([key, value]) => {
                    conversationRelayConfig.set(key, value);
                });
            }

            logOut('SyncAssetLoader', `Loaded ${conversationRelayConfig.size} ConversationRelay configuration items from Sync`);
            return conversationRelayConfig;
        } catch (error) {
            logError('SyncAssetLoader', `Failed to load ConversationRelay configuration: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }

    /**
     * Loads language configuration from Sync map
     */
    async loadLanguages(): Promise<Map<string, any>> {
        try {
            const languageData = await this.getMapItem('ConversationRelay', 'Languages');
            const languages = new Map<string, any>();

            if (languageData) {
                Object.entries(languageData).forEach(([key, value]) => {
                    languages.set(key, value);
                });
            }

            logOut('SyncAssetLoader', `Loaded ${languages.size} language configurations from Sync`);
            return languages;
        } catch (error) {
            logError('SyncAssetLoader', `Failed to load language configurations: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }

    /**
     * Ensures a Sync Service exists, creates if it doesn't
     * @returns boolean indicating if a new service was created
     */
    private async ensureService(serviceName: string): Promise<boolean> {
        try {
            // List all services and find by friendly name
            const services = await this.twilioClient.sync.v1.services.list();
            const existingService = services.find(service => service.friendlyName === serviceName);

            if (existingService) {
                logOut('SyncAssetLoader', `Found existing service: ${serviceName}`);
                return false; // Service existed
            } else {
                // Service doesn't exist, create it
                await this.twilioClient.sync.v1.services.create({
                    friendlyName: serviceName
                });
                logOut('SyncAssetLoader', `Created new service: ${serviceName}`);
                return true; // New service was created
            }
        } catch (error) {
            logError('SyncAssetLoader', `Failed to ensure service ${serviceName}: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }

    /**
     * Ensures a Sync Map exists within a service, creates if it doesn't
     */
    private async ensureMap(serviceName: string, mapName: string): Promise<any> {
        try {
            // Find service by friendly name
            const services = await this.twilioClient.sync.v1.services.list();
            const service = services.find(s => s.friendlyName === serviceName);

            if (!service) {
                throw new Error(`Service ${serviceName} not found`);
            }

            // List all maps in the service and find by unique name
            const maps = await this.twilioClient.sync.v1.services(service.sid).syncMaps.list();
            const existingMap = maps.find(map => map.uniqueName === mapName);

            if (existingMap) {
                logOut('SyncAssetLoader', `Found existing map: ${serviceName}:${mapName}`);
                return existingMap;
            } else {
                // Map doesn't exist, create it
                const map = await this.twilioClient.sync.v1.services(service.sid).syncMaps.create({
                    uniqueName: mapName
                });
                logOut('SyncAssetLoader', `Created new map: ${serviceName}:${mapName}`);
                return map;
            }
        } catch (error) {
            logError('SyncAssetLoader', `Failed to ensure map ${serviceName}:${mapName}: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }

    /**
     * Ensures a Sync Document exists for the specified service
     */
    private async ensureDocument(serviceName: string, documentName: string): Promise<boolean> {
        try {
            // Find service by friendly name
            const services = await this.twilioClient.sync.v1.services.list();
            const service = services.find(s => s.friendlyName === serviceName);
            if (!service) {
                throw new Error(`Service ${serviceName} not found`);
            }

            // Check if document exists
            try {
                await this.twilioClient.sync.v1.services(service.sid)
                    .documents(documentName)
                    .fetch();
                logOut('SyncAssetLoader', `Found existing document: ${serviceName}:${documentName}`);
                return false; // Document existed
            } catch (error: any) {
                if (error.code === 20404) {
                    // Document doesn't exist, create it
                    await this.twilioClient.sync.v1.services(service.sid)
                        .documents
                        .create({
                            uniqueName: documentName,
                            data: {}
                        });
                    logOut('SyncAssetLoader', `Created new document: ${serviceName}:${documentName}`);
                    return true; // Document was created
                } else {
                    throw error;
                }
            }
        } catch (error) {
            logError('SyncAssetLoader', `Failed to ensure document ${serviceName}:${documentName}: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }

    /**
     * Set item in a Sync Map - updates existing or creates new (try-update-then-create pattern)
     */
    private async setMapItem(serviceName: string, mapName: string, key: string, data: any): Promise<void> {
        // Find service by friendly name
        const services = await this.twilioClient.sync.v1.services.list();
        const service = services.find(s => s.friendlyName === serviceName);

        if (!service) {
            throw new Error(`Service ${serviceName} not found`);
        }

        // Try to update first (most common case on restart)
        try {
            await this.twilioClient.sync.v1.services(service.sid)
                .syncMaps(mapName)
                .syncMapItems(key)
                .update({
                    data: data
                });
            logOut('SyncAssetLoader', `Updated map item ${serviceName}:${mapName}:${key}`);
        } catch (error: any) {
            // Item does not exist, create it
            try {
                await this.twilioClient.sync.v1.services(service.sid)
                    .syncMaps(mapName)
                    .syncMapItems
                    .create({
                        key: key,
                        data: data
                    });
                logOut('SyncAssetLoader', `Created map item ${serviceName}:${mapName}:${key}`);
            } catch (createError: any) {
                logError('SyncAssetLoader', `Failed to create map item ${serviceName}:${mapName}:${key}: ${createError instanceof Error ? createError.message : String(createError)}`);
                throw createError;
            }
        }
    }

    /**
     * Set/Update document data in a Sync Document
     */
    private async setDocument(serviceName: string, documentName: string, data: any): Promise<void> {
        try {
            // Find service by friendly name
            const services = await this.twilioClient.sync.v1.services.list();
            const service = services.find(s => s.friendlyName === serviceName);
            if (!service) {
                throw new Error(`Service ${serviceName} not found`);
            }

            await this.twilioClient.sync.v1.services(service.sid)
                .documents(documentName)
                .update({
                    data: data
                });
            logOut('SyncAssetLoader', `Updated document ${serviceName}:${documentName}`);
        } catch (error) {
            logError('SyncAssetLoader', `Failed to set document ${serviceName}:${documentName}: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }

    /**
     * Loads an asset file from the assets directory
     */
    private async loadAssetFile(filename: string): Promise<string | object | null> {
        try {
            const assetPath = join(this.assetsPath, filename);
            const content = await fs.readFile(assetPath, 'utf-8');

            // If it's a JSON file, parse it
            if (filename.endsWith('.json')) {
                return JSON.parse(content);
            }

            logOut('SyncAssetLoader', `Loaded asset file: ${filename}`);
            return content;
        } catch (error) {
            logError('SyncAssetLoader', `Failed to load asset file ${filename}: ${error instanceof Error ? error.message : String(error)}`);
            return null;
        }
    }

    /**
     * Get document data from a Sync Document (copied from TwilioSyncService)
     */
    private async getDocument(serviceName: string, documentName: string): Promise<any> {
        try {
            // Find service by friendly name
            const services = await this.twilioClient.sync.v1.services.list();
            const service = services.find(s => s.friendlyName === serviceName);
            if (!service) {
                throw new Error(`Service ${serviceName} not found`);
            }

            const document = await this.twilioClient.sync.v1.services(service.sid)
                .documents(documentName)
                .fetch();
            return document.data;
        } catch (error: any) {
            if (error.code === 20404) {
                return null; // Document doesn't exist
            }
            logError('SyncAssetLoader', `Failed to get document ${serviceName}:${documentName}: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }

    /**
     * Get item(s) from a Sync Map (copied from TwilioSyncService)
     */
    private async getMapItem(serviceName: string, mapName: string, key?: string): Promise<any> {
        try {
            // Find service by friendly name
            const services = await this.twilioClient.sync.v1.services.list();
            const service = services.find(s => s.friendlyName === serviceName);

            if (!service) {
                throw new Error(`Service ${serviceName} not found`);
            }

            if (key) {
                // Get specific item
                try {
                    const item = await this.twilioClient.sync.v1.services(service.sid)
                        .syncMaps(mapName)
                        .syncMapItems(key)
                        .fetch();
                    return item.data;
                } catch (error: any) {
                    if (error.code === 20404) {
                        return null; // Item doesn't exist
                    }
                    throw error;
                }
            } else {
                // Get all items
                const items = await this.twilioClient.sync.v1.services(service.sid)
                    .syncMaps(mapName)
                    .syncMapItems
                    .list();

                const result: Record<string, any> = {};
                items.forEach(item => {
                    result[item.key] = item.data;
                });
                return result;
            }
        } catch (error) {
            logError('SyncAssetLoader', `Failed to get map item ${serviceName}:${mapName}:${key || 'all'}: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }

    /**
     * Initializes Sync services, maps, documents and loads default assets
     * Should be called before loading assets to ensure Sync infrastructure exists
     */
    async initialize(): Promise<void> {
        try {
            logOut('SyncAssetLoader', 'Initializing Sync Services and Maps');

            // Phase 1: Ensure all services exist first
            let isFirstTimeConversationRelay = false;
            for (const serviceDef of this.SERVICE_DEFINITIONS) {
                const isNewService = await this.ensureService(serviceDef.name);
                if (serviceDef.name === 'ConversationRelay' && isNewService) {
                    isFirstTimeConversationRelay = true;
                }
            }

            // Phase 2: Ensure all maps exist
            for (const serviceDef of this.SERVICE_DEFINITIONS) {
                for (const mapName of serviceDef.maps) {
                    await this.ensureMap(serviceDef.name, mapName);
                }
            }

            // Phase 3: Ensure all documents exist
            for (const serviceDef of this.SERVICE_DEFINITIONS) {
                if (serviceDef.documents) {
                    for (const docName of serviceDef.documents) {
                        await this.ensureDocument(serviceDef.name, docName);
                    }
                }
            }

            // Phase 4: Load assets based on first-time vs restart
            if (isFirstTimeConversationRelay) {
                await this.loadDefaultAssets(true); // Load all assets including defaults
                logOut('SyncAssetLoader', 'First-time setup complete - all services, maps, and default assets initialized');
            } else {
                await this.loadDefaultAssets(false); // Load only config assets, skip defaults
                logOut('SyncAssetLoader', 'Existing setup loaded - services, maps reconnected, and config assets reloaded');
            }
        } catch (error) {
            logError('SyncAssetLoader', `Failed to initialize: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }

    /**
     * Loads assets into ConversationRelay service from defaultConfig.json
     * @param loadDefaults - If true, loads default context and manifest. If false, only loads config assets.
     */
    private async loadDefaultAssets(loadDefaults: boolean = true): Promise<void> {
        try {
            if (loadDefaults) {
                logOut('SyncAssetLoader', 'Loading all default assets for first-time setup');
            } else {
                logOut('SyncAssetLoader', 'Reloading configuration assets');
            }

            // Always load/reload configuration assets
            const defaultConfig = await this.loadAssetFile('defaultConfig.json');
            if (defaultConfig) {
                const configObj = defaultConfig as any;

                // Load ConversationRelay section into Configuration map
                if (configObj.ConversationRelay) {
                    await this.setMapItem('ConversationRelay', 'Configuration', 'defaultConfig', configObj.ConversationRelay);
                    logOut('SyncAssetLoader', 'Loaded ConversationRelay section into Configuration map');
                }

                // Load Languages section into Languages map
                if (configObj.Languages && Array.isArray(configObj.Languages)) {
                    for (const language of configObj.Languages) {
                        if (language.code) {
                            await this.setMapItem('ConversationRelay', 'Languages', language.code, language);
                            logOut('SyncAssetLoader', `Loaded language ${language.code} into Languages map`);
                        }
                    }
                }

                // Load UsedConfig section into UsedConfig document (always update from defaultConfig.json)
                if (configObj.UsedConfig) {
                    await this.setDocument('ConversationRelay', 'UsedConfig', configObj.UsedConfig);
                    logOut('SyncAssetLoader', 'Loaded UsedConfig section into UsedConfig document');
                }
            }

            // Only load default context and manifest on first-time setup
            if (loadDefaults) {
                const defaultContext = await this.loadAssetFile('defaultContext.md');
                const defaultManifest = await this.loadAssetFile('defaultToolManifest.json');

                if (defaultContext) {
                    // Wrap string content in JSON object for Sync compatibility
                    await this.setMapItem('ConversationRelay', 'Context', 'defaultContext', { content: defaultContext });
                    logOut('SyncAssetLoader', 'Loaded defaultContext into Context map');
                }

                if (defaultManifest) {
                    await this.setMapItem('ConversationRelay', 'ToolManifest', 'defaultToolManifest', defaultManifest as object);
                    logOut('SyncAssetLoader', 'Loaded defaultToolManifest into ToolManifest map');
                }
            } else {
                logOut('SyncAssetLoader', 'Skipping defaultContext and defaultManifest reload (preserving existing)');
            }
        } catch (error) {
            logError('SyncAssetLoader', `Failed to load assets: ${error instanceof Error ? error.message : String(error)}`);
            // Don't throw - service creation should still succeed even if asset loading fails
        }
    }
}