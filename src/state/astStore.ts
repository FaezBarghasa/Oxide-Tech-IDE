import { create } from 'zustand';
import { ASTNode } from '../types/ast';

interface ASTStoreState {
  astRoot: ASTNode | null;
  selectedNode: ASTNode | null;
  
  setAstRoot: (ast: ASTNode) => void;
  setSelectedNode: (node: ASTNode | null) => void;
}

export const useASTStore = create<ASTStoreState>((set) => ({
  astRoot: null,
  selectedNode: null,
  
  setAstRoot: (astRoot) => set({ astRoot }),
  setSelectedNode: (selectedNode) => set({ selectedNode })
}));
