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
