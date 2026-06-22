import { create } from 'zustand';
import { FileState } from '../types/editor';

export interface ReviewComment {
  id: string;
  filePath: string;
  line: number;
  message: string;
  originalText: string;
  replacementText: string;
}

interface EditorStoreState {
  currentFile: string | null;
  files: Map<string, FileState>;
  openTabs: string[];
  recentFiles: string[];
  reviewComments: ReviewComment[];
  
  setCurrentFile: (path: string) => void;
  updateFileContent: (path: string, content: string) => void;
  markSaved: (path: string) => void;
  openFile: (path: string, content: string) => void;
  closeTab: (path: string) => void;
  addReviewComment: (comment: ReviewComment) => void;
  clearReviewComments: (filePath: string) => void;
  acceptReviewComment: (commentId: string) => void;
  dismissReviewComment: (commentId: string) => void;
}

export const useEditorStore = create<EditorStoreState>((set) => ({
  currentFile: null,
  files: new Map(),
  openTabs: [],
  recentFiles: [],
  reviewComments: [],
  
  setCurrentFile: (path) => set((state) => {
    const recent = state.recentFiles.filter(f => f !== path);
    return {
      currentFile: path,
      recentFiles: [path, ...recent]
    };
  }),
  
  updateFileContent: (path, content) => set((state) => {
    const files = new Map(state.files);
    const file = files.get(path) || { content: '', unsaved: false, cursor: { line: 1, column: 1 } };
    files.set(path, { ...file, content, unsaved: true });
    return { files };
  }),
  
  markSaved: (path) => set((state) => {
    const files = new Map(state.files);
    const file = files.get(path);
    if (file) files.set(path, { ...file, unsaved: false });
    return { files };
  }),
  
  openFile: (path, content) => set((state) => {
    const files = new Map(state.files);
    if (!files.has(path)) {
      files.set(path, { content, unsaved: false, cursor: { line: 1, column: 1 } });
    }
    const openTabs = state.openTabs.includes(path) ? state.openTabs : [...state.openTabs, path];
    const recent = state.recentFiles.filter(f => f !== path);
    return {
      files,
      openTabs,
      currentFile: path,
      recentFiles: [path, ...recent]
    };
  }),
  
  closeTab: (path) => set((state) => {
    const openTabs = state.openTabs.filter(t => t !== path);
    const currentFile = state.currentFile === path 
      ? (openTabs.length > 0 ? openTabs[openTabs.length - 1] : null) 
      : state.currentFile;
    const recentFiles = state.recentFiles.filter(t => t !== path);
    const reviewComments = state.reviewComments.filter(c => c.filePath !== path);
    return { openTabs, currentFile, recentFiles, reviewComments };
  }),

  addReviewComment: (comment) => set((state) => ({
    reviewComments: [...state.reviewComments.filter(c => c.id !== comment.id), comment]
  })),

  clearReviewComments: (filePath) => set((state) => ({
    reviewComments: state.reviewComments.filter(c => c.filePath !== filePath)
  })),

  acceptReviewComment: (commentId) => set((state) => {
    const comment = state.reviewComments.find(c => c.id === commentId);
    if (!comment || !state.currentFile) return {};
    const file = state.files.get(state.currentFile);
    if (!file) return {};
    const lines = file.content.split('\n');
    if (comment.line > 0 && comment.line <= lines.length) {
      lines[comment.line - 1] = comment.replacementText;
    }
    const updatedContent = lines.join('\n');
    const files = new Map(state.files);
    files.set(state.currentFile, { ...file, content: updatedContent, unsaved: true });
    return {
      files,
      reviewComments: state.reviewComments.filter(c => c.id !== commentId)
    };
  }),

  dismissReviewComment: (commentId) => set((state) => ({
    reviewComments: state.reviewComments.filter(c => c.id !== commentId)
  }))
}));
