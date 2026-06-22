import { tauriCommands } from './tauri';
import { useExtensionStore, ExtensionManifest } from '../state/extensionStore';

export const extensionLoader = {
  loadExtension: async (dirPath: string): Promise<ExtensionManifest> => {
    // VS Code extensions must contain a package.json manifest
    const manifestPath = dirPath.endsWith('/') || dirPath.endsWith('\\')
      ? `${dirPath}package.json`
      : `${dirPath}/package.json`;

    try {
      const manifestStr = await tauriCommands.readFile(manifestPath);
      const manifest: ExtensionManifest = JSON.parse(manifestStr);

      if (!manifest.name || !manifest.version) {
        throw new Error("Invalid manifest file: Missing 'name' or 'version'");
      }

      // Register the extension in Zustand store
      useExtensionStore.getState().registerExtension(manifest, dirPath);

      // Map contributions to console / Monaco Editor if applicable
      if (manifest.contributes) {
        console.log(`Loaded VS Code Extension: ${manifest.displayName || manifest.name}`);
        if (manifest.contributes.commands) {
          console.log(`Registered ${manifest.contributes.commands.length} contribution commands.`);
        }
        if (manifest.contributes.themes) {
          console.log(`Registered ${manifest.contributes.themes.length} UI themes.`);
        }
      }

      return manifest;
    } catch (err) {
      console.error(`Failed to load VS Code extension from ${dirPath}:`, err);
      throw err;
    }
  }
};
