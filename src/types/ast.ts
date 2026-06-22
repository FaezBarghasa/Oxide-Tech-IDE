export interface Position {
  line: number;
  column: number;
}

export interface ASTNode {
  type: string;
  startPosition: Position;
  endPosition: Position;
  children?: ASTNode[];
  text?: string;
}
