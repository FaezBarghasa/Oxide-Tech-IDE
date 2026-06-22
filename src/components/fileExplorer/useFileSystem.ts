import { useFileSystemStore } from '../../state/fileSystemStore';
import { tauriCommands } from '../../services/tauri';

export function useFileSystem() {
  const { reloadTree } = useFileSystemStore();

  const createFile = async (path: string) => {
    try {
      await tauriCommands.createFile(path);
      await reloadTree();
    } catch (err) {
      console.error("Failed to create file:", err);
      throw err;
    }
  };

  const createDir = async (path: string) => {
    try {
      await tauriCommands.createDir(path);
      await reloadTree();
    } catch (err) {
      console.error("Failed to create directory:", err);
      throw err;
    }
  };

  const deleteFile = async (path: string) => {
    try {
      await tauriCommands.deleteFile(path);
      await reloadTree();
    } catch (err) {
      console.error("Failed to delete file/dir:", err);
      throw err;
    }
  };

  const renameFile = async (oldPath: string, newPath: string) => {
    try {
      await tauriCommands.renameFile(oldPath, newPath);
      await reloadTree();
    } catch (err) {
      console.error("Failed to rename file/dir:", err);
      throw err;
    }
  };

  return {
    createFile,
    createDir,
    deleteFile,
    renameFile,
  };
}
