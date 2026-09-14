export interface CargoTargetInfo {
  name: string;
  kind: 'bin' | 'lib' | 'test' | 'bench' | 'example' | string;
  src_path: string;
}

export interface CargoCrateInfo {
  name: string;
  version: string;
  manifest_path: string;
  targets: CargoTargetInfo[];
  dependencies: string[];
}

export interface CargoWorkspaceMetadata {
  workspace_root: string;
  packages: CargoCrateInfo[];
}

export interface GitFileStatusDetail {
  path: string;
  status: 'untracked' | 'modified' | 'added' | 'deleted' | 'renamed' | 'conflict' | 'ignored';
  staged: boolean;
}

export interface LineDiffDetail {
  line_number: number;
  kind: 'added' | 'modified' | 'deleted';
  old_content?: string;
  new_content?: string;
}

export interface MacroExpansionResult {
  original: string;
  expanded: string;
  steps: string[];
}

export interface SystemMemoryProfile {
  rss_bytes: number;
  heap_allocated_bytes: number;
  vram_free_mb?: number;
}
