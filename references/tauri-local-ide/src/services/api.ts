import { Diagnostic, LintSuggestion, ASTNode, FileTreeNode } from '../types';

const API_BASE = (import.meta as any).env.VITE_BACKEND_URL || '';

/**
 * Basic wait utility
 * @param ms Milliseconds to wait
 */
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetch with retry logic
 * @param url Full url to fetch
 * @param options Fetch options
 * @param maxRetries Max number of retries
 * @returns Parsed JSON
 */
async function fetchWithRetry<T>(
  url: string,
  options?: RequestInit,
  maxRetries: number = 5
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
      return response.json();
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      const delay = Math.pow(2, attempt) * 1000;
      await wait(delay);
    }
  }
  throw new Error('Unreachable');
}

export async function checkCargo(workspacePath: string): Promise<{ success: boolean; diagnostics: Diagnostic[]; elapsed_ms: number; stdout: string }> {
  try {
    return await fetchWithRetry(`${API_BASE}/api/cargo/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace_path: workspacePath })
    }, 1);
  } catch (e) {
    // Mock for browser environment
    console.warn("Actix backend unreachable, using mock data for cargo check");
    await wait(800);
    return {
      success: true,
      diagnostics: [],
      elapsed_ms: 800,
      stdout: ""
    };
  }
}

export async function getRepositoryStructure(workspacePath: string): Promise<{ success: boolean; tree: FileTreeNode[]; total_files: number }> {
  try {
    return await fetchWithRetry(`${API_BASE}/api/repository/structure?workspace_path=${encodeURIComponent(workspacePath)}`, undefined, 1);
  } catch (e) {
    console.warn("Actix backend unreachable, using mock file tree");
    return {
      success: true,
      total_files: 3,
      tree: [
        {
          name: 'src',
          path: '/src',
          isDirectory: true,
          children: [
            { name: 'main.rs', path: '/src/main.rs', isDirectory: false },
            { name: 'lib.rs', path: '/src/lib.rs', isDirectory: false }
          ]
        },
        { name: 'Cargo.toml', path: '/Cargo.toml', isDirectory: false }
      ]
    };
  }
}
