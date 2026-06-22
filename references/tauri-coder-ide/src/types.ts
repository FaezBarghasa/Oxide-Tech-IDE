export interface FileItem {
  name: string;
  path: string;
  language: string;
  content: string;
  astOutline: { name: string; type: string; line: number }[];
}

export interface AgentTask {
  id: string;
  name: string;
  status: 'planning' | 'writing' | 'verifying' | 'completed' | 'queued' | 'failed';
  progress: number;
  description: string;
  targetFile: string;
  timestamp: string;
  suggestedCode?: string;
  originalCode?: string;
}

export interface Breakpoint {
  line: number;
  file: string;
}

export interface DebugVariable {
  name: string;
  value: string;
  type: string;
}

export interface SerialLog {
  type: 'rx' | 'tx' | 'sys';
  text: string;
  timestamp: string;
}
