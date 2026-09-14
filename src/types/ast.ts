export interface Position {
  line: number;
  column: number;
}

export interface ASTNode {
  type: string;
  node_type?: string;
  span?: [number, number];
  file_path?: string;
  startPosition: Position;
  endPosition: Position;
  children?: ASTNode[];
  text?: string;
}

export interface SymbolChunk {
  symbol_name: string;
  kind: string;
  start_line: number;
  end_line: number;
  content: string;
}

export interface SlicedContext {
  target_symbol: string;
  sliced_code: string;
  original_tokens_estimate: number;
  compressed_tokens_estimate: number;
  compression_ratio_pct: number;
}

export type AgentRole = 'Frontend' | 'Backend' | 'Embedded' | 'DevOps' | 'Critic' | 'Testing';

export type TaskStatus = 'Pending' | 'Running' | 'Completed' | 'Failed' | 'PausedForHitl';

export interface DagTaskNode {
  id: string;
  description: string;
  agent_type: AgentRole;
  status: TaskStatus;
  dependencies: string[];
  estimated_tokens: number;
  actual_tokens: number;
  iteration_count?: number;
  is_oscillating?: boolean;
}

export interface GhostBranchHypothesis {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'evaluating' | 'passed' | 'rejected';
  diffStats: { added: number; deleted: number };
  previewDiff: string;
  estimatedAccuracy: number;
}

export interface HarnessEvidence {
  verifier: 'Format' | 'Check' | 'Lint' | 'Test' | 'Nextest' | 'Custom';
  command: string;
  exit_code: number;
  stdout: string;
  stderr: string;
  duration_ms: number;
  passed: boolean;
}

export interface LocalSkill {
  id: string;
  name: string;
  version: number;
  error_patterns: string[];
  prompt_template: string;
  verification_command: string;
  risk_level: string;
  success_count: number;
  failure_count: number;
}

export interface InferenceRequestMetadata {
  worker_id: string;
  project_id: string;
  namespace: string;
  retention: string;
  no_train: boolean;
  no_global_memory: boolean;
}

export interface ToolManifest {
  name: string;
  description: string;
  version: string;
  input_schema: Record<string, unknown>;
  output_schema?: Record<string, unknown>;
  usage_count: number;
  deprecated: boolean;
}

export interface ForgedToolSummary {
  name: string;
  path: string;
  manifest: ToolManifest;
  wasm_exists: boolean;
  documentation_exists: boolean;
}

export interface ForgeSynthesisRequest {
  tool_name: string;
  description: string;
  input_schema: Record<string, unknown>;
  cargo_toml: string;
  lib_rs: string;
  integration_test_rs: string;
}

export interface ForgeSynthesisResult {
  tool_name: string;
  success: boolean;
  attempts: number;
  output_wasm_path?: string;
  compiler_diagnostics: string[];
  test_diagnostics: string[];
  logs: string[];
}

export interface ClaudeConvention {
  category: string;
  rule: string;
  context_pattern?: string;
}

export interface ClaudeSlashCommand {
  name: string;
  description: string;
  prompt_template: string;
  source_path: string;
}

export interface OxReadResult {
  file_path: string;
  content: string;
  line_count: number;
  ast_symbols: string[];
}

export interface OxEditResult {
  file_path: string;
  occurrences_replaced: number;
  diff_preview: string;
  graph_invalidated: boolean;
}

export interface OxGrepMatch {
  file_path: string;
  line_number: number;
  line_content: string;
  symbol_context?: string;
}

export interface OxGrepResult {
  pattern: string;
  matches: OxGrepMatch[];
  total_matches: number;
}

export interface OxBashResult {
  command: string;
  exit_code: number;
  stdout: string;
  stderr: string;
  duration_ms: number;
  compiler_error_count: number;
}

export type CortexBackend = 'Cuda' | 'Metal' | 'Rocm' | 'Cpu';

export interface DeviceCapabilities {
  backend: CortexBackend;
  device_name: string;
  total_vram_mb: number;
  supports_fp16: boolean;
  supports_bf16: boolean;
  max_batch_size: number;
  vector_dimension: number;
}

export interface CortexQueryResult {
  chunk_id: string;
  file_path: string;
  symbol_name?: string;
  content: string;
  similarity_score: number;
}


