import { ASTNode } from '../types/ast';

const defaultPos = { startPosition: { line: 1, column: 1 }, endPosition: { line: 1, column: 1 } };

export function parseAST(code: string, filepath: string): ASTNode {
  const filename = filepath.split('/').pop() || filepath;
  const isRust = filepath.endsWith('.rs') || filepath.endsWith('.toml');
  
  const root: ASTNode = {
    type: isRust ? 'SourceFile (Rust)' : 'SourceFile (JS/TS)',
    text: filename,
    ...defaultPos,
    children: []
  };

  const lines = code.split('\n');
  
  if (isRust) {
    // Parse Rust-like constructs
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Use statement
      if (line.startsWith('use ')) {
        root.children?.push({
          type: 'UseDeclaration',
          text: line.replace('use ', '').replace(';', ''),
          ...defaultPos
        });
      }
      // Struct definition
      else if (line.startsWith('struct ') || line.includes(' struct ')) {
        const match = line.match(/(?:pub\s+)?struct\s+(\w+)/);
        if (match) {
          root.children?.push({
            type: 'StructDefinition',
            text: match[1],
            ...defaultPos
          });
        }
      }
      // Enum definition
      else if (line.startsWith('enum ') || line.includes(' enum ')) {
        const match = line.match(/(?:pub\s+)?enum\s+(\w+)/);
        if (match) {
          root.children?.push({
            type: 'EnumDefinition',
            text: match[1],
            ...defaultPos
          });
        }
      }
      // Function definition
      else if (line.includes('fn ') || line.startsWith('fn ')) {
        const match = line.match(/(?:pub\s+)?(?:async\s+)?fn\s+(\w+)/);
        if (match) {
          root.children?.push({
            type: 'FunctionDefinition',
            text: match[1],
            ...defaultPos
          });
        }
      }
    }
  } else {
    // Parse JS/TS-like constructs
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Import statement
      if (line.startsWith('import ')) {
        const match = line.match(/import\s+(?:.*from\s+)?['"](.*)['"]/);
        root.children?.push({
          type: 'ImportDeclaration',
          text: match ? match[1] : line,
          ...defaultPos
        });
      }
      // Interface/Type/Class
      else if (line.startsWith('interface ') || line.includes(' interface ')) {
        const match = line.match(/(?:export\s+)?interface\s+(\w+)/);
        if (match) {
          root.children?.push({
            type: 'InterfaceDeclaration',
            text: match[1],
            ...defaultPos
          });
        }
      }
      else if (line.startsWith('class ') || line.includes(' class ')) {
        const match = line.match(/(?:export\s+)?class\s+(\w+)/);
        if (match) {
          root.children?.push({
            type: 'ClassDeclaration',
            text: match[1],
            ...defaultPos
          });
        }
      }
      // Functions
      else if (line.includes('function ') || line.startsWith('function ')) {
        const match = line.match(/(?:export\s+)?(?:async\s+)?function\s+(\w+)/);
        if (match) {
          root.children?.push({
            type: 'FunctionDeclaration',
            text: match[1],
            ...defaultPos
          });
        }
      }
      // Const arrow functions
      else if (line.includes('const ') && line.includes('=>')) {
        const match = line.match(/(?:export\s+)?const\s+(\w+)\s*=\s*/);
        if (match) {
          root.children?.push({
            type: 'ArrowFunction',
            text: match[1],
            ...defaultPos
          });
        }
      }
    }
  }

  // Fallback if no children parsed
  if (root.children?.length === 0) {
    root.children?.push({
      type: 'EmptyModule',
      text: 'No structured declarations found',
      ...defaultPos
    });
  }

  return root;
}
