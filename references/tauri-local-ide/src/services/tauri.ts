import { invoke } from '@tauri-apps/api/core';

// Check if we are running in the browser rather than a true Tauri context
const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

/**
 * Read a file's content
 * @param path File path to read
 * @returns File contents as string
 */
export async function readFile(path: string): Promise<string> {
  if (!isTauri) {
    if (path.includes('main.rs')) {
      return `fn main() {\n    println!("Hello, World!");\n}\n`;
    }
    return `// Mocked file content for ${path}\npub fn sample() {}\n`;
  }
  return invoke('read_file', { path });
}

/**
 * Write to a file
 * @param path File path to write
 * @param content String content to write
 */
export async function writeFile(path: string, content: string): Promise<void> {
  if (!isTauri) {
    console.log(`[Mock] Wrote to ${path}`, content);
    return;
  }
  return invoke('write_file', { path, content });
}

/**
 * Spawn a cargo check process
 * @param workspacePath Path to workspace
 * @returns Serialized JSON string of rustc output
 */
export async function spawnCargoCheck(workspacePath: string): Promise<string> {
  if (!isTauri) {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(JSON.stringify({ success: true, message: "Mock cargo check" }));
      }, 1000);
    });
  }
  return invoke('spawn_cargo_check', { workspacePath });
}
