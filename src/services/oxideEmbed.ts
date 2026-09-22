import { invoke } from '@tauri-apps/api/core';
import type {
  StairHit,
  BlastRadiusSummary,
  MemoryRecordItem,
  MemoryConflictItem,
  MemoryKindType,
  AstNodeDto,
  ContextFile,
} from '../types/oxide';

export class OxideEmbedService {
  /**
   * Triggers STAIR (Structure-Aware Information Retriever) Code-ToC search
   * Sub-50 µs AST extraction returning leaf nodes with breadcrumbs
   */
  static async stairSearch(query: string, limit: number = 10): Promise<StairHit[]> {
    try {
      return await invoke<StairHit[]>('stair_code_toc_search', { query, limit });
    } catch (err) {
      console.error('[OxideEmbed] stairSearch error:', err);
      return [];
    }
  }

  /**
   * Retrieves GraphRAG callers for a target symbol
   */
  static async getCallers(symbol: string): Promise<string[]> {
    try {
      return await invoke<string[]>('graph_get_callers', { symbol });
    } catch (err) {
      console.error('[OxideEmbed] getCallers error:', err);
      return [];
    }
  }

  /**
   * Retrieves GraphRAG callees invoked by a target symbol
   */
  static async getCallees(symbol: string): Promise<string[]> {
    try {
      return await invoke<string[]>('graph_get_callees', { symbol });
    } catch (err) {
      console.error('[OxideEmbed] getCallees error:', err);
      return [];
    }
  }

  /**
   * Calculates bidirectional blast-radius and impact graph for refactoring safety
   */
  static async getImpact(symbol: string): Promise<BlastRadiusSummary | null> {
    try {
      return await invoke<BlastRadiusSummary>('graph_get_impact', { symbol });
    } catch (err) {
      console.error('[OxideEmbed] getImpact error:', err);
      return null;
    }
  }

  /**
   * Stores a typed semantic memory record in Memanto fabric
   */
  static async rememberMemory(
    content: string,
    kind: MemoryKindType = 'instruction',
    title: string = 'Memory Note',
    tags: string[] = [],
    symbolRef?: string
  ): Promise<string> {
    try {
      return await invoke<string>('oxide_memory_remember', {
        content,
        kind,
        title,
        tags,
        symbolRef,
      });
    } catch (err) {
      console.error('[OxideEmbed] rememberMemory error:', err);
      throw err;
    }
  }

  /**
   * Recalls relevant memories with optional semantic embedding and category filters
   */
  static async recallMemories(
    query: string,
    kind?: MemoryKindType,
    limit: number = 5
  ): Promise<MemoryRecordItem[]> {
    try {
      return await invoke<MemoryRecordItem[]>('oxide_memory_recall', {
        query,
        kind,
        limit,
      });
    } catch (err) {
      console.error('[OxideEmbed] recallMemories error:', err);
      return [];
    }
  }

  /**
   * Checks for contradictions and conflicting rules/decisions
   */
  static async getMemoryConflicts(): Promise<MemoryConflictItem[]> {
    try {
      return await invoke<MemoryConflictItem[]>('oxide_memory_conflicts');
    } catch (err) {
      console.error('[OxideEmbed] getMemoryConflicts error:', err);
      return [];
    }
  }

  /**
   * Synthesizes compact token-budgeted prompt context
   */
  static async getPredictiveContext(prompt: string): Promise<ContextFile[]> {
    try {
      return await invoke<ContextFile[]>('get_predictive_context', { prompt });
    } catch (err) {
      console.error('[OxideEmbed] getPredictiveContext error:', err);
      return [];
    }
  }

  /**
   * Parses AST outline for the active file
   */
  static async getFileAstOutline(filePath: string, content?: string): Promise<AstNodeDto[]> {
    try {
      return await invoke<AstNodeDto[]>('get_file_ast_outline', { filePath, content });
    } catch (err) {
      console.error('[OxideEmbed] getFileAstOutline error:', err);
      return [];
    }
  }
}
