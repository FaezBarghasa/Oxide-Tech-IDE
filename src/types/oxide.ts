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
  timestamp: string;
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

export interface GitBlameLine {
  line_number: number;
  commit_hash: string;
  author: string;
  date: string;
  summary: string;
}

export interface DisassemblyInstruction {
  address: number;
  mnemonic: string;
  operands: string;
  raw_bytes: string;
}

export interface AstNodeDto {
  name: string;
  kind: string;
  line_number: number;
  end_line_number: number;
  signature: string;
  doc_comment?: string;
  children: AstNodeDto[];
}

export interface SymbolInfo {
  name: string;
  symbol_type: string;
  line_number: number;
  end_line_number: number;
  file_path: string;
  breadcrumbs: string[];
  doc_comment?: string;
}

export interface ContextFile {
  path: string;
  content: string;
  score: number;
  matched_symbols: string[];
}

/** STAIR (Structure-Aware Information Retriever) Hierarchy Types */
export interface StairHit {
  breadcrumbs: string[];
  leaf_symbol: string;
  signature?: string;
  file_path: string;
  start_line: number;
  end_line: number;
  code_body: string;
  confidence: number;
  macro_parent?: string;
}

/** GraphRAG Knowledge Graph & Blast Radius Types */
export interface SubgraphContext {
  target_symbol: string;
  symbol_kind: string;
  file_path: string;
  signature?: string;
  callers: string[];
  callees: string[];
  doc_references: string[];
}

export interface BlastRadiusSummary {
  symbol: string;
  file_path: string;
  inbound_callers_count: number;
  outbound_callees_count: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  details: SubgraphContext;
}

/** Memanto Typed Semantic Memory Types */
export type MemoryKindType =
  | 'instruction'
  | 'decision'
  | 'fact'
  | 'goal'
  | 'commitment'
  | 'preference'
  | 'relationship'
  | 'context'
  | 'event'
  | 'learning'
  | 'observation'
  | 'artifact'
  | 'error';

export interface MemoryRecordItem {
  id: string;
  project_id: string;
  session_id?: string;
  kind: MemoryKindType;
  title: string;
  content: string;
  tags: string[];
  symbol_ref?: string;
  status: 'active' | 'superseded' | 'expired' | 'archived';
  confidence: number;
  created_at: string;
}

export interface MemoryConflictItem {
  record_a: MemoryRecordItem;
  record_b: MemoryRecordItem;
  conflict_reason: string;
  similarity_score: number;
}

export interface TokenBudgetStatus {
  total_used_tokens: number;
  budget_ceiling: number;
  cached_tokens: number;
  reasoning_tokens: number;
  estimated_cost_usd: number;
  cache_hit_rate: number;
}
