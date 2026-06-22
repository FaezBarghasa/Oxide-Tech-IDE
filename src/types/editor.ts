import { Position } from './ast';

export interface FileState {
  content: string;
  unsaved: boolean;
  cursor: Position;
  breakpoints?: number[];
}
