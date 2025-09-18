import twilio from 'twilio';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logOut, logError } from '../utils/logger.js';
import { log } from 'console';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface SyncServiceMap {
    name: string;
    maps: string[];
    documents?: string[];
}

/**
 * Startup-only utility service for handling Twilio Sync operations.
 * Manages Sync Services and Maps for configuration storage during server initialization.
 *
 * Services Structure:
 * - "ConversationRelay": Configuration, Languages, UsedConfig, Context, ToolManifest
 *
 * This service is designed for:
 * 1. Startup-only operations - pushing default assets to Sync
 * 2. Loading all contexts/manifests into CachedAssetsService
 * 3. One-time initialization and setup
 *
 * Runtime operations should use CachedAssetsService for performance.
 */
class TwilioSyncService {
    private twilioClient: twilio.Twilio;

    private readonly SERVICE_DEFINITIONS: SyncServiceMap[] = [
        {
            name: 'ConversationRelay',
            maps: ['Configuration', 'Languages', 'Context', 'ToolManifest'],
            documents: ['UsedConfig']
        }
    ];

    constructor(twilioClient: twilio.Twilio) {
        this.twilioClient = twilioClient;
    }

    /**
     * Loads an asset file from the assets directory
     */
    private async loadAssetFile(filename: string): Promise<string | object | null> {
        try {
            const assetPath = path.join(__dirname, '..', '..', 'assets', filename);
            const content = await fs.readFile(assetPath, 'utf-8');

            // If it's a JSON file, parse it
            if (filename.endsWith('.json')) {
                return JSON.parse(content);
            }

            logOut('TwilioSyncService', `Loaded asset file: ${filename}`);
            return content;
        } catch (error) {
            logError('TwilioSyncService', `Failed to load asset file ${filename}: ${error instanceof Error ? error.message : String(error)}`);
            return null;
        }
    }

    /**
     * Loads all converted context files (from J2 templates) into Sync Context map
     */
    private async loadAllContextFiles(): Promise<void> {
        try {
            logOut('TwilioSyncService', 'Loading all converted context files...');

            const assetsDir = path.join(__dirname, '..', '..', 'assets');
            const files = await fs.readdir(assetsDir);

            // Filter for context files (ending with Context.md)
            const contextFiles = files.filter(file =>
                file.endsWith('Context.md') &&
                file !== 'defaultContext.md' // Skip default context as it's loaded separately
            );

            logOut('TwilioSyncService', `Found ${contextFiles.length} context files to load`);

            for (const file of contextFiles) {
                try {
                    // Extract context name (remove Context.md suffix)
                    const contextName = file.replace('Context.md', '');

                    // Check if context already exists to avoid overwriting
                    const existingContext = await this.getMapItem('ConversationRelay', 'Context', contextName);
                    if (!existingContext) {
                        // Load file content
                        const content = await fs.readFile(path.join(assetsDir, file), 'utf-8');

                        // Store in Sync with content wrapper for compatibility
                        await this.setMapItem('ConversationRelay', 'Context', contextName, { content: content });
                        logOut('TwilioSyncService', `✓ Loaded ${contextName} context (${content.length} chars)`);
                    } else {
                        logOut('TwilioSyncService', `- ${contextName} context already exists, skipping`);
                    }
                } catch (error) {
                    logError('TwilioSyncService', `Failed to load context file ${file}: ${error instanceof Error ? error.message : String(error)}`);
                }
            }

            logOut('TwilioSyncService', 'Completed loading context files');
        } catch (error) {
            logError('TwilioSyncService', `Failed to load context files: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Initializes all required Sync Services and Maps
     */
    async initialize(): Promise<void> {
        try {
            logOut('TwilioSyncService', 'Initializing Sync Services and Maps');

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

            // Phase 2.5: Ensure all documents exist
            for (const serviceDef of this.SERVICE_DEFINITIONS) {
                if (serviceDef.documents) {
                    for (const docName of serviceDef.documents) {
                        await this.ensureDocument(serviceDef.name, docName);
                    }
                }
            }

            // Phase 3: Load assets based on first-time vs restart
            if (isFirstTimeConversationRelay) {
                await this.loadDefaultAssets(true); // Load all assets including defaults
                logOut('TwilioSyncService', 'First-time setup complete - all services, maps, and default assets initialized');
            } else {
                await this.loadDefaultAssets(false); // Load only config assets, skip defaults
                logOut('TwilioSyncService', 'Existing setup loaded - services, maps reconnected, and config assets reloaded');
            }
        } catch (error) {
            logError('TwilioSyncService', `Failed to initialize: ${error instanceof Error ? error.message : String(error)}`);
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
                logOut('TwilioSyncService', `Found existing service: ${serviceName}`);
                return false; // Service existed
            } else {
                // Service doesn't exist, create it
                const service = await this.twilioClient.sync.v1.services.create({
                    friendlyName: serviceName
                });
                logOut('TwilioSyncService', `Created new service: ${serviceName}`);
                return true; // New service was created
            }
        } catch (error) {
            logError('TwilioSyncService', `Failed to ensure service ${serviceName}: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }

    /**
     * Loads assets into ConversationRelay service
     * @param loadDefaults - If true, loads default context and manifest. If false, only loads config assets.
     */
    private async loadDefaultAssets(loadDefaults: boolean = true): Promise<void> {
        try {
            if (loadDefaults) {
                logOut('TwilioSyncService', 'Loading all default assets for first-time setup');
            } else {
                logOut('TwilioSyncService', 'Reloading configuration assets');
            }

            // Always load/reload configuration assets
            const defaultConfig = await this.loadAssetFile('defaultConfig.json');
            if (defaultConfig) {
                const configObj = defaultConfig as any;

                // Load ConversationRelay section into Configuration map
                if (configObj.ConversationRelay) {
                    await this.setMapItem('ConversationRelay', 'Configuration', 'defaultConfig', configObj.ConversationRelay);
                    logOut('TwilioSyncService', 'Loaded ConversationRelay section into Configuration map');
                }

                // Load Languages section into Languages map
                if (configObj.Languages && Array.isArray(configObj.Languages)) {
                    for (const language of configObj.Languages) {
                        if (language.code) {
                            await this.setMapItem('ConversationRelay', 'Languages', language.code, language);
                            logOut('TwilioSyncService', `Loaded language ${language.code} into Languages map`);
                        }
                    }
                }

                // Load UsedConfig section into UsedConfig document (always update from defaultConfig.json)
                if (configObj.UsedConfig) {
                    await this.setDocument('ConversationRelay', 'UsedConfig', configObj.UsedConfig);
                    logOut('TwilioSyncService', 'Loaded UsedConfig section into UsedConfig document');
                }
            }

            // All configuration sections (ConversationRelay, Languages, UsedConfig) are now loaded from defaultConfig.json

            // Only load default context and manifest on first-time setup
            if (loadDefaults) {
                const defaultContext = await this.loadAssetFile('defaultContext.md');
                const defaultManifest = await this.loadAssetFile('defaultToolManifest.json');

                if (defaultContext) {
                    // Check if defaultContext already exists to avoid overwriting
                    const existingContext = await this.getMapItem('ConversationRelay', 'Context', 'defaultContext');
                    if (!existingContext) {
                        // Wrap string content in JSON object for Sync compatibility
                        await this.setMapItem('ConversationRelay', 'Context', 'defaultContext', { content: defaultContext });
                        logOut('TwilioSyncService', 'Loaded defaultContext into Context map');
                    } else {
                        logOut('TwilioSyncService', 'defaultContext already exists, skipping');
                    }
                }

                // Load all converted context files from J2 templates
                // await this.loadAllContextFiles();

                if (defaultManifest) {
                    // Check if defaultToolManifest already exists to avoid overwriting
                    const existingManifest = await this.getMapItem('ConversationRelay', 'ToolManifest', 'defaultToolManifest');
                    if (!existingManifest) {
                        await this.setMapItem('ConversationRelay', 'ToolManifest', 'defaultToolManifest', defaultManifest as object);
                        logOut('TwilioSyncService', 'Loaded defaultToolManifest into ToolManifest map');
                    } else {
                        logOut('TwilioSyncService', 'defaultToolManifest already exists, skipping');
                    }
                }
            } else {
                logOut('TwilioSyncService', 'Skipping defaultContext and defaultManifest reload (preserving existing)');
            }
        } catch (error) {
            logError('TwilioSyncService', `Failed to load assets: ${error instanceof Error ? error.message : String(error)}`);
            // Don't throw - service creation should still succeed even if asset loading fails
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
                logOut('TwilioSyncService', `Found existing map: ${serviceName}:${mapName}`);
                return existingMap;
            } else {
                // Map doesn't exist, create it
                const map = await this.twilioClient.sync.v1.services(service.sid).syncMaps.create({
                    uniqueName: mapName
                });
                logOut('TwilioSyncService', `Created new map: ${serviceName}:${mapName}`);
                return map;
            }
        } catch (error) {
            logError('TwilioSyncService', `Failed to ensure map ${serviceName}:${mapName}: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }

    /**
     * Get item(s) from a Sync Map
     */
    async getMapItem(serviceName: string, mapName: string, key?: string): Promise<any> {
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
            logError('TwilioSyncService', `Failed to get map item ${serviceName}:${mapName}:${key || 'all'}: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }

    /**
     * Set item in a Sync Map - updates existing or creates new
     */
    async setMapItem(serviceName: string, mapName: string, key: string, data: any): Promise<void> {
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
            logOut('TwilioSyncService', `Updated map item ${serviceName}:${mapName}:${key}`);
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
                logOut('TwilioSyncService', `Created map item ${serviceName}:${mapName}:${key}`);
            } catch (createError: any) {
                logError('TwilioSyncService', `Failed to create map item ${serviceName}:${mapName}:${key}: ${createError instanceof Error ? createError.message : String(createError)}`);
                throw createError;
            }
        }
    }

    /**
     * Delete item from a Sync Map
     */
    async deleteMapItem(serviceName: string, mapName: string, key: string): Promise<void> {
        try {
            // Find service by friendly name
            const services = await this.twilioClient.sync.v1.services.list();
            const service = services.find(s => s.friendlyName === serviceName);

            if (!service) {
                throw new Error(`Service ${serviceName} not found`);
            }

            await this.twilioClient.sync.v1.services(service.sid)
                .syncMaps(mapName)
                .syncMapItems(key)
                .remove();

            logOut('TwilioSyncService', `Deleted map item ${serviceName}:${mapName}:${key}`);
        } catch (error: any) {
            if (error.code === 20404) {
                logOut('TwilioSyncService', `Map item ${serviceName}:${mapName}:${key} already doesn't exist`);
                return; // Item already doesn't exist
            }
            logError('TwilioSyncService', `Failed to delete map item ${serviceName}:${mapName}:${key}: ${error instanceof Error ? error.message : String(error)}`);
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
                logOut('TwilioSyncService', `Found existing document: ${serviceName}:${documentName}`);
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
                    logOut('TwilioSyncService', `Created new document: ${serviceName}:${documentName}`);
                    return true; // Document was created
                } else {
                    throw error;
                }
            }
        } catch (error) {
            logError('TwilioSyncService', `Failed to ensure document ${serviceName}:${documentName}: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }

    /**
     * Get document data from a Sync Document
     */
    async getDocument(serviceName: string, documentName: string): Promise<any> {
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
            logError('TwilioSyncService', `Failed to get document ${serviceName}:${documentName}: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }

    /**
     * Set/Update document data in a Sync Document
     */
    async setDocument(serviceName: string, documentName: string, data: any): Promise<void> {
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
            logOut('TwilioSyncService', `Updated document ${serviceName}:${documentName}`);
        } catch (error) {
            logError('TwilioSyncService', `Failed to set document ${serviceName}:${documentName}: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }

    /**
     * Pushes only default assets to Sync for quickstart
     * Called during first-time setup to populate Sync with defaults
     * Developers should manually manage their own contexts/manifests in Sync
     */
    async pushDefaultsToSync(): Promise<void> {
        try {
            logOut('TwilioSyncService', 'Pushing default assets to Sync for quickstart...');

            // Load and push only the core defaults
            const defaultContext = await this.loadAssetFile('defaultContext.md');
            const defaultManifest = await this.loadAssetFile('defaultToolManifest.json');

            if (defaultContext) {
                const existingContext = await this.getMapItem('ConversationRelay', 'Context', 'defaultContext');
                if (!existingContext) {
                    await this.setMapItem('ConversationRelay', 'Context', 'defaultContext', { content: defaultContext });
                    logOut('TwilioSyncService', 'Pushed defaultContext to Sync');
                }
            }

            if (defaultManifest) {
                const existingManifest = await this.getMapItem('ConversationRelay', 'ToolManifest', 'defaultToolManifest');
                if (!existingManifest) {
                    await this.setMapItem('ConversationRelay', 'ToolManifest', 'defaultToolManifest', defaultManifest);
                    logOut('TwilioSyncService', 'Pushed defaultToolManifest to Sync');
                }
            }

            logOut('TwilioSyncService', 'Default assets push completed');
        } catch (error) {
            logError('TwilioSyncService', `Failed to push defaults to Sync: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }
}

export { TwilioSyncService };