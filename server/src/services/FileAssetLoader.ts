/**
 * FileAssetLoader - Loads assets from local file system
 *
 * This implementation loads contexts and manifests directly from the assets folder
 * without any interaction with Twilio Sync service.
 */

import { promises as fs } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import { logOut, logError } from '../utils/logger.js';
import type { AssetLoader, ServerConfig } from '../interfaces/AssetLoader.js';

export class FileAssetLoader implements AssetLoader {
    private assetsPath: string;

    constructor() {
        // Get the current module's directory and navigate to assets
        const currentModuleFile = fileURLToPath(import.meta.url);
        const serverSrcDir = dirname(dirname(currentModuleFile)); // Go up from services to src
        const serverDir = dirname(serverSrcDir); // Go up from src to server
        this.assetsPath = join(serverDir, 'assets');
    }

    /**
     * Loads the server configuration from serverConfig.json
     */
    async loadServerConfig(): Promise<ServerConfig> {
        try {
            const configPath = join(this.assetsPath, 'serverConfig.json');
            const configContent = await fs.readFile(configPath, 'utf-8');
            const config = JSON.parse(configContent);

            logOut('FileAssetLoader', `Loaded ServerConfig from ${configPath}`);
            return config;
        } catch (error) {
            logError('FileAssetLoader', `Failed to load ServerConfig: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }

    /**
     * Loads all contexts from .md files in the assets folder
     */
    async loadContexts(): Promise<Map<string, string>> {
        try {
            const contexts = new Map<string, string>();
            const files = await fs.readdir(this.assetsPath);

            // Find all .md files that could be contexts
            const contextFiles = files.filter(file =>
                file.endsWith('.md') || file.toLowerCase().includes('context')
            );

            for (const file of contextFiles) {
                const filePath = join(this.assetsPath, file);
                const content = await fs.readFile(filePath, 'utf-8');

                // Extract context key from filename (remove .md extension)
                const contextKey = basename(file, '.md');
                contexts.set(contextKey, content);
            }

            logOut('FileAssetLoader', `Loaded ${contexts.size} contexts from assets folder`);
            return contexts;
        } catch (error) {
            logError('FileAssetLoader', `Failed to load contexts: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }

    /**
     * Loads all manifests from .json files in the assets folder
     */
    async loadManifests(): Promise<Map<string, object>> {
        try {
            const manifests = new Map<string, object>();
            const files = await fs.readdir(this.assetsPath);

            // Find all .json files that could be manifests (exclude serverConfig.json)
            const manifestFiles = files.filter(file =>
                file.endsWith('.json') &&
                file !== 'serverConfig.json' &&
                (file.toLowerCase().includes('manifest') || file.toLowerCase().includes('tool'))
            );

            for (const file of manifestFiles) {
                const filePath = join(this.assetsPath, file);
                const content = await fs.readFile(filePath, 'utf-8');
                const manifestData = JSON.parse(content);

                // Extract manifest key from filename (remove .json extension)
                const manifestKey = basename(file, '.json');
                manifests.set(manifestKey, manifestData);
            }

            logOut('FileAssetLoader', `Loaded ${manifests.size} manifests from assets folder`);
            return manifests;
        } catch (error) {
            logError('FileAssetLoader', `Failed to load manifests: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }

}