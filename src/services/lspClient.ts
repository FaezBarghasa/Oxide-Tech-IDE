import * as monaco from 'monaco-editor';
import { listen } from '@tauri-apps/api/event';
import { tauriCommands } from './tauri';

interface LspDiagnostic {
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  severity?: number;
  code?: string | number;
  message: string;
  source?: string;
}

interface LspPublishDiagnosticsParams {
  uri: string;
  diagnostics: LspDiagnostic[];
}

interface LspCompletionItem {
  label: string;
  kind?: number;
  detail?: string;
  documentation?: string | { value: string };
  insertText?: string;
  insertTextFormat?: number;
}

interface LspInlayHint {
  position: { line: number; character: number };
  label: string | { value: string }[];
  kind?: number;
  paddingLeft?: boolean;
  paddingRight?: boolean;
}

let isLspInitialized = false;
let providersRegistered = false;

function mapLspKindToMonaco(kind?: number): monaco.languages.CompletionItemKind {
  switch (kind) {
    case 1: return monaco.languages.CompletionItemKind.Text;
    case 2: return monaco.languages.CompletionItemKind.Method;
    case 3: return monaco.languages.CompletionItemKind.Function;
    case 4: return monaco.languages.CompletionItemKind.Constructor;
    case 5: return monaco.languages.CompletionItemKind.Field;
    case 6: return monaco.languages.CompletionItemKind.Variable;
    case 7: return monaco.languages.CompletionItemKind.Class;
    case 8: return monaco.languages.CompletionItemKind.Interface;
    case 9: return monaco.languages.CompletionItemKind.Module;
    case 10: return monaco.languages.CompletionItemKind.Property;
    case 14: return monaco.languages.CompletionItemKind.Keyword;
    case 15: return monaco.languages.CompletionItemKind.Snippet;
    default: return monaco.languages.CompletionItemKind.Property;
  }
}

export async function initializeLspClient(workspaceRoot: string) {
  if (!isLspInitialized) {
    try {
      await tauriCommands.lspStart(workspaceRoot);
      isLspInitialized = true;
      console.log('[LSP Client] rust-analyzer initialized for:', workspaceRoot);
    } catch (e) {
      console.warn('[LSP Client] Failed to start rust-analyzer:', e);
    }
  }

  // Listen for real-time diagnostics from rust-analyzer
  await listen<LspPublishDiagnosticsParams>('lsp:diagnostics', (event) => {
    const { uri, diagnostics } = event.payload;
    const cleanPath = uri.replace(/^file:\/\//, '');

    // Find matching Monaco model
    const models = monaco.editor.getModels();
    const targetModel = models.find((m) => {
      const uriStr = m.uri.toString();
      return uriStr.includes(cleanPath) || m.uri.fsPath.includes(cleanPath);
    });

    if (targetModel) {
      const markers: monaco.editor.IMarkerData[] = diagnostics.map((diag) => ({
        severity: diag.severity === 1 ? monaco.MarkerSeverity.Error :
                  diag.severity === 2 ? monaco.MarkerSeverity.Warning :
                  monaco.MarkerSeverity.Info,
        startLineNumber: diag.range.start.line + 1,
        startColumn: diag.range.start.character + 1,
        endLineNumber: diag.range.end.line + 1,
        endColumn: diag.range.end.character + 1,
        message: diag.message,
        source: diag.source || 'rust-analyzer',
      }));

      monaco.editor.setModelMarkers(targetModel, 'rust-analyzer', markers);
    }
  });

  if (providersRegistered) return;
  providersRegistered = true;

  // 1. Semantic Auto-Completion Provider
  monaco.languages.registerCompletionItemProvider('rust', {
    triggerCharacters: ['.', ':', '<', '"', '/', ' '],
    provideCompletionItems: async (model, position) => {
      const path = model.uri.fsPath || model.uri.path;
      try {
        const result = await tauriCommands.lspCompletion(path, position.lineNumber - 1, position.column - 1);
        const items: LspCompletionItem[] = Array.isArray(result) ? result : (result as { items?: LspCompletionItem[] })?.items || [];

        const suggestions: monaco.languages.CompletionItem[] = items.map((item) => {
          const doc = typeof item.documentation === 'object' ? item.documentation.value : item.documentation;
          return {
            label: item.label,
            kind: mapLspKindToMonaco(item.kind),
            detail: item.detail,
            documentation: doc ? { value: doc } : undefined,
            insertText: item.insertText || item.label,
            insertTextRules: item.insertTextFormat === 2 ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet : undefined,
            range: {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: position.column,
              endColumn: position.column,
            },
          };
        });

        return { suggestions };
      } catch {
        return { suggestions: [] };
      }
    },
  });

  // 2. Hover Tooltip Documentation Provider
  monaco.languages.registerHoverProvider('rust', {
    provideHover: async (model, position) => {
      const path = model.uri.fsPath || model.uri.path;
      try {
        const result = await tauriCommands.lspHover(path, position.lineNumber - 1, position.column - 1) as { contents?: unknown } | null;
        if (!result || !result.contents) return null;

        const contents = result.contents;
        let markdownValue = '';
        if (typeof contents === 'string') {
          markdownValue = contents;
        } else if (Array.isArray(contents)) {
          markdownValue = contents.map((c) => (typeof c === 'string' ? c : (c as { value: string }).value || '')).join('\n\n');
        } else if (typeof contents === 'object' && 'value' in (contents as { value: string })) {
          markdownValue = (contents as { value: string }).value;
        }

        if (!markdownValue) return null;

        return {
          range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
          contents: [{ value: markdownValue }],
        };
      } catch {
        return null;
      }
    },
  });

  // 3. Go to Definition Provider
  monaco.languages.registerDefinitionProvider('rust', {
    provideDefinition: async (model, position) => {
      const path = model.uri.fsPath || model.uri.path;
      try {
        const result = await tauriCommands.lspDefinition(path, position.lineNumber - 1, position.column - 1) as { uri?: string; range?: LspDiagnostic['range'] } | null;
        if (!result || !result.uri || !result.range) return null;

        const targetUri = monaco.Uri.parse(result.uri);
        return {
          uri: targetUri,
          range: new monaco.Range(
            result.range.start.line + 1,
            result.range.start.character + 1,
            result.range.end.line + 1,
            result.range.end.character + 1
          ),
        };
      } catch {
        return null;
      }
    },
  });

  // 4. Inlay Hints Provider
  monaco.languages.registerInlayHintsProvider('rust', {
    provideInlayHints: async (model, range) => {
      const path = model.uri.fsPath || model.uri.path;
      try {
        const result = await tauriCommands.lspInlayHints(path, range.startLineNumber - 1, range.endLineNumber - 1) as LspInlayHint[] | null;
        if (!result || !Array.isArray(result)) return { hints: [], dispose: () => {} };

        const hints: monaco.languages.InlayHint[] = result.map((hint) => {
          const labelStr = typeof hint.label === 'string' ? hint.label : (Array.isArray(hint.label) ? hint.label.map(l => l.value).join('') : '');
          return {
            position: {
              lineNumber: hint.position.line + 1,
              column: hint.position.character + 1,
            },
            label: labelStr,
            kind: hint.kind === 1 ? monaco.languages.InlayHintKind.Type : monaco.languages.InlayHintKind.Parameter,
            paddingLeft: hint.paddingLeft,
            paddingRight: hint.paddingRight,
          };
        });

        return { hints, dispose: () => {} };
      } catch {
        return { hints: [], dispose: () => {} };
      }
    },
  });

  // 5. Code Action / Intentions Provider (Alt+Enter)
  monaco.languages.registerCodeActionProvider('rust', {
    provideCodeActions: async (model, range) => {
      const path = model.uri.fsPath || model.uri.path;
      try {
        const result = await tauriCommands.lspCodeActions(
          path,
          range.startLineNumber - 1,
          range.startColumn - 1,
          range.endLineNumber - 1,
          range.endColumn - 1
        ) as { title: string; kind?: string }[] | null;

        if (!result || !Array.isArray(result)) return { actions: [], dispose: () => {} };

        const actions: monaco.languages.CodeAction[] = result.map((action) => ({
          title: action.title,
          kind: action.kind || 'quickfix',
          run: () => {
            console.log('[LSP CodeAction] Executed:', action.title);
          },
        }));

        return { actions, dispose: () => {} };
      } catch {
        return { actions: [], dispose: () => {} };
      }
    },
  });
}

export function syncDocumentOpen(path: string, content: string, version: number = 1) {
  tauriCommands.lspDidOpen(path, content, version).catch(() => {});
}

export function syncDocumentChange(path: string, content: string, version: number) {
  tauriCommands.lspDidChange(path, content, version).catch(() => {});
}

export function syncDocumentSave(path: string) {
  tauriCommands.lspDidSave(path).catch(() => {});
}

export function syncDocumentClose(path: string) {
  tauriCommands.lspDidClose(path).catch(() => {});
}
