export type AgentMode = 'Plan' | 'Yolo' | 'Ask';

export type AgentStatus = 'Idle' | 'Planning' | 'WaitingApproval' | 'Executing' | 'Completed' | 'Failed' | 'Cancelled';

export interface DiffHunk {
  old_start: number;
  old_lines: number;
  new_start: number;
  new_lines: number;
  lines: string[];
}

export interface PendingDiff {
  file_path: string;
  original_content: string;
  modified_content: string;
  hunks: DiffHunk[];
  applied: boolean;
}

export interface AgentAction {
  id: string;
  tool_name: string;
  description: string;
  parameters: Record<string, unknown>;
  requires_approval: boolean;
  status: string;
}

export interface AgentTask {
  id: string;
  title: string;
  prompt: string;
  mode: AgentMode;
  workspace_path: string;
  target_files: string[];
  max_iterations: number;
  max_budget_tokens: number;
}

export interface AgentResult {
  task_id: string;
  status: AgentStatus;
  summary: string;
  diffs: PendingDiff[];
  actions_taken: AgentAction[];
  tokens_used: number;
  execution_time_ms: number;
  error?: string;
}

export interface AgentEvent {
  event_id: string;
  task_id: string;
  timestamp_ms: number;
  event_type: 'Thought' | 'ToolCall' | 'ToolResult' | 'PlanGenerated' | 'DiffStaged' | 'PlanApproved' | 'PlanRejected' | 'StatusChange' | 'Error';
  payload: Record<string, unknown>;
}

export interface ParallelAgentInfo {
  agent_id: string;
  title: string;
  status: AgentStatus;
  mode: AgentMode;
  workspace_path: string;
  runtime: 'InProcess' | 'DockerContainer' | 'SSHRemote';
  locked_files: string[];
  tokens_used: number;
  elapsed_ms: number;
}

export interface AppliedFix {
  file_path: string;
  description: string;
  hunks_applied: number;
}

export interface HardFaultDiagnosis {
  cause: string;
  faulting_address?: string;
  fault_status_register: string;
  call_stack_reconstructed: string[];
  recommended_fix: string;
  mitigation_patch?: string;
}

export interface GeneratedHalDriver {
  chip: string;
  peripheral: string;
  features: string[];
  driver_source: string;
  example_source: string;
  cargo_deps: string;
}

export interface EvolutionEvent {
  commit_hash: string;
  author: string;
  timestamp: number;
  message: string;
  files_changed: string[];
  summary: string;
}

export interface BugIntroductionCandidate {
  commit_hash: string;
  score: number;
  reason: string;
  author: string;
  date: string;
}
