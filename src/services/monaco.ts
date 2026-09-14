import * as monaco from 'monaco-editor';

export function setupMonacoRust() {
  // Register rust language if not already registered
  const isRegistered = monaco.languages.getLanguages().some((l) => l.id === 'rust');
  if (!isRegistered) {
    monaco.languages.register({ id: 'rust' });
  }

  // 1:1 JetBrains RustRover Dark / Darcula Color Theme
  monaco.editor.defineTheme('rustrover-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: 'CC7832', fontStyle: 'bold' },
      { token: 'keyword.control', foreground: 'CC7832', fontStyle: 'bold' },
      { token: 'keyword.unsafe', foreground: 'FF6B68', fontStyle: 'bold' },
      { token: 'string', foreground: '6A8759' },
      { token: 'string.escape', foreground: 'CC7832' },
      { token: 'comment', foreground: '808080', fontStyle: 'italic' },
      { token: 'comment.doc', foreground: '629755', fontStyle: 'italic' },
      { token: 'type', foreground: 'A9B7C6', fontStyle: 'bold' },
      { token: 'type.primitive', foreground: 'CC7832' },
      { token: 'function', foreground: 'FFC66D' },
      { token: 'macro', foreground: '6897BB', fontStyle: 'bold' },
      { token: 'number', foreground: '6897BB' },
      { token: 'lifetime', foreground: '20999D', fontStyle: 'italic' },
      { token: 'attribute', foreground: 'BBB529' },
    ],
    colors: {
      'editor.background': '#1e1f22',
      'editor.foreground': '#bcbec4',
      'editor.lineHighlightBackground': '#26282e',
      'editorLineNumber.foreground': '#4e5157',
      'editorLineNumber.activeForeground': '#a4a8b0',
      'editorGutter.background': '#1e1f22',
      'editorCursor.foreground': '#ffffff',
      'editor.selectionBackground': '#2e436e',
      'editor.inactiveSelectionBackground': '#26344d',
      'editorOverviewRuler.border': '#2b2d30',
      'editorOverviewRuler.errorForeground': '#e06c75',
      'editorOverviewRuler.warningForeground': '#e5c07b',
      'editorOverviewRuler.infoForeground': '#61afef',
      'editorInlayHint.background': '#2b2d3080',
      'editorInlayHint.foreground': '#868a91',
    },
  });

  // Comprehensive Rust syntax tokens
  monaco.languages.setMonarchTokensProvider('rust', {
    keywords: [
      'as', 'async', 'await', 'break', 'const', 'continue', 'crate', 'dyn', 'else',
      'enum', 'extern', 'false', 'fn', 'for', 'if', 'impl', 'in', 'let', 'loop',
      'match', 'mod', 'move', 'mut', 'pub', 'ref', 'return', 'self', 'Self',
      'static', 'struct', 'super', 'trait', 'true', 'type', 'unsafe', 'use',
      'where', 'while'
    ],
    typeKeywords: [
      'bool', 'u8', 'u16', 'u32', 'u64', 'u128', 'usize',
      'i8', 'i16', 'i32', 'i64', 'i128', 'isize',
      'f32', 'f64', 'char', 'str', 'String', 'Vec', 'Option', 'Result',
      'Box', 'Rc', 'Arc', 'RefCell', 'Mutex', 'HashMap', 'HashSet'
    ],
    tokenizer: {
      root: [
        // Lifetime
        [/'[a-zA-Z_]\w*/, 'lifetime'],
        // Doc comments
        [/\/\/\/.*$/, 'comment.doc'],
        [/\/\/!.*$/, 'comment.doc'],
        [/\/\/.*$/, 'comment'],
        [/\/\*/, 'comment', '@comment'],
        // Strings
        [/"([^"\\]|\\.)*$/, 'string.invalid'],
        [/"/, { token: 'string.quote', bracket: '@open', next: '@string' }],
        [/'[^\\']'/, 'string'],
        // Attributes & derives e.g. #[derive(...)]
        [/#!?\[.*?\]/, 'attribute'],
        // Macro invocations e.g. println!, vec!
        [/[a-zA-Z_]\w*!/, 'macro'],
        // Numbers
        [/\b0x[0-9a-fA-F_]+/, 'number'],
        [/\b0b[01_]+/, 'number'],
        [/\b\d[\d_]*(\.[\d_]+)?([eE][+-]?[\d_]+)?(f32|f64|u8|u16|u32|u64|u128|usize|i8|i16|i32|i64|i128|isize)?/, 'number'],
        // Function definitions
        [/fn\s+([a-zA-Z_]\w*)/, ['keyword', 'function']],
        // Keywords & Identifiers
        [/[a-zA-Z_]\w*/, {
          cases: {
            'unsafe': 'keyword.unsafe',
            '@typeKeywords': 'type',
            '@keywords': 'keyword',
            '@default': 'identifier'
          }
        }],
      ],
      comment: [
        [/[^\/*]+/, 'comment'],
        [/\*\//, 'comment', '@pop'],
        [/[\/*]/, 'comment']
      ],
      string: [
        [/[^\\"]+/, 'string'],
        [/\\./, 'string.escape'],
        [/"/, { token: 'string.quote', bracket: '@close', next: '@pop' }]
      ],
    }
  });

  // Register RustRover Inlay Hints Provider (Type Hints, Parameter Hints, Chaining Hints)
  monaco.languages.registerInlayHintsProvider('rust', {
    provideInlayHints: (model, _range, _token) => {
      const hints: monaco.languages.InlayHint[] = [];
      const lineCount = model.getLineCount();

      for (let line = 1; line <= lineCount; line++) {
        const text = model.getLineContent(line);
        const trimmed = text.trim();

        // 1. Type Inlay Hints for let bindings
        // e.g. `let count = 42;` -> `let count: i32 = 42;`
        const letMatch = text.match(/let\s+(?:mut\s+)?([a-zA-Z_]\w*)\s*=\s*(.+);/);
        if (letMatch && !text.includes(':')) {
          const varName = letMatch[1];
          const valExpr = letMatch[2].trim();
          const col = text.indexOf(varName) + varName.length + 1;

          let inferredType = 'impl Any';
          if (/^\d+$/.test(valExpr)) inferredType = 'i32';
          else if (/^\d+\.\d+$/.test(valExpr)) inferredType = 'f64';
          else if (valExpr.startsWith('"') || valExpr.startsWith('String::')) inferredType = 'String';
          else if (valExpr.startsWith('Vec::') || valExpr.startsWith('vec!')) inferredType = 'Vec<T>';
          else if (valExpr.startsWith('HashMap::')) inferredType = 'HashMap<K, V>';
          else if (valExpr.startsWith('Ok(') || valExpr.startsWith('Err(')) inferredType = 'Result<T, E>';
          else if (valExpr.startsWith('Some(') || valExpr === 'None') inferredType = 'Option<T>';

          hints.push({
            position: { lineNumber: line, column: col },
            label: `: ${inferredType}`,
            kind: monaco.languages.InlayHintKind.Type,
            paddingLeft: true,
            paddingRight: true,
          });
        }

        // 2. Chaining Hints at method ends
        // e.g. `.iter()` -> `: Iter<...>`
        if (trimmed.endsWith('.iter()') || trimmed.endsWith('.map(|x| x)') || trimmed.endsWith('.collect();')) {
          hints.push({
            position: { lineNumber: line, column: text.length + 1 },
            label: ' /*: Iterator*/',
            kind: monaco.languages.InlayHintKind.Type,
            paddingLeft: true,
          });
        }
      }

      return {
        hints,
        dispose: () => {},
      };
    },
  });
}
