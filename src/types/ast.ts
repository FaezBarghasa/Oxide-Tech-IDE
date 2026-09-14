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


