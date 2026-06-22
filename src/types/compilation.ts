export interface Diagnostic {
  level: 'error' | 'warning' | 'note';
  message: string;
  filePath: string;
  line: number;
  column: number;
}

export interface LintSuggestion {
  message: string;
  filePath: string;
  line: number;
  column: number;
  replacement?: string;
}
