export interface Diagnostic {
  level: 'error' | 'warning' | 'note' | 'help';
  message: string;
  filePath?: string;
  line?: number;
  column?: number;
}

export interface LintSuggestion {
  message: string;
  code: string;
  filePath: string;
  line: number;
}
