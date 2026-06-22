import * as monaco from 'monaco-editor';
import { COLORS } from '../constants/colors';

export function setupMonacoRust() {
  monaco.languages.register({ id: 'rust' });

  monaco.editor.defineTheme('oxide-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: COLORS.keyword.replace('#', '') },
      { token: 'string', foreground: COLORS.string.replace('#', '') },
      { token: 'comment', foreground: '808080' },
    ],
    colors: {
      'editor.background': COLORS.bg,
      'editor.lineHighlightBackground': COLORS.panel,
    }
  });

  // Basic syntax tokens for Rust
  monaco.languages.setMonarchTokensProvider('rust', {
    tokenizer: {
      root: [
        [/[a-z_$][\w$]*/, { cases: { '@keywords': 'keyword', '@default': 'identifier' } }],
        [/".*?"/, 'string'],
        [/\/\/.*/, 'comment'],
      ]
    },
    keywords: ['fn', 'let', 'mut', 'if', 'else', 'match', 'return', 'struct', 'enum', 'pub', 'use', 'impl', 'trait']
  });
}
