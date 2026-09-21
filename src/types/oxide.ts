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

export interface LocalHistoryRevision {
  id: string;
  file_path: string;
  timestamp: number;
  trigger_tag: string;
  content: string;
  byte_size: number;
}

export interface WorkspaceTestItem {
  id: string;
  name: string;
  package: string;
  module_path: string;
  status: 'idle' | 'running' | 'passed' | 'failed';
  duration_ms?: number;
  output?: string;
}

export interface TestRunResult {
  test_id: string;
  passed: boolean;
  duration_ms: number;
  stdout: string;
  stderr: string;
  failure_message?: string;
}

/** Phase 4: llvm-cov per-file coverage report */
export interface CoverageFileReport {
  file_path: string;
  covered_percent: number;
  covered_lines: number;
  total_lines: number;
  covered_line_numbers: number[];
  uncovered_line_numbers: number[];
}

/** Phase 6: structured git log entry */
export interface GitCommitEntry {
  hash: string;
  short_hash: string;
  author: string;
  date: string;
  message: string;
}

/** Phase 4: real-time test event from run_all_tests_streaming */
export interface TestStreamEvent {
  test_id: string;
  event: 'started' | 'passed' | 'failed';
  duration_ms?: number;
  message?: string;
}

/** Phase 7: Global Search types */
export interface SearchMatch {
  file_path: string;
  line_number: number;
  column_start: number;
  column_end: number;
  line_text: string;
  match_text: string;
}

export interface SearchFileGroup {
  file_path: string;
  matches: SearchMatch[];
}

export interface SearchOptions {
  case_sensitive?: boolean;
  whole_word?: boolean;
  use_regex?: boolean;
  include_glob?: string;
  exclude_glob?: string;
  max_results?: number;
}
