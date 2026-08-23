export interface Position {
  line: number;
  column: number;
}

export interface Diagnostic {
  level: 'error' | 'warning' | 'note';
  message: string;
  filePath: string;
  line: number;
  column: number;
}

export interface FileTreeNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileTreeNode[];
}

export interface ASTNode {
  type: string;
  startPosition: Position;
  endPosition: Position;
  children?: ASTNode[];
  text?: string;
}

export interface LintSuggestion {
  message: string;
  filePath: string;
  line: number;
  column: number;
  replacement?: string;
}

// New Types
export type MessageRole = 'user' | 'assistant';
export type MessageType = 'chat' | 'plan' | 'diff';

export interface AIChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  type: MessageType;
  metadata?: any;
}

export interface Skill {
  id: string;
  name: string;
  command: string;
}

export interface MCPTool {
  id: string;
  name: string;
  description: string;
}

export interface GitFileStatus {
  path: string;
  status: 'modified' | 'added' | 'deleted' | 'untracked';
}
