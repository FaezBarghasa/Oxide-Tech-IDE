export interface Position {
  line: number;
  column: number;
}

export interface FileState {
  content: string;
  unsaved: boolean;
  cursor: Position;
  breakpoints: number[];
}
