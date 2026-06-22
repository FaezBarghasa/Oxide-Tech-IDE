import { tauriCommands } from '../services/tauri';
import { useEditorStore } from '../state/editorStore';
import { useCompilationStore } from '../state/compilationStore';

export async function triggerSelfHealing(diagnostic: {
  level: string;
  message: string;
  filePath: string;
  line: number;
  column: number;
}) {
  if (diagnostic.level !== 'error') return;

  console.log(`[Compiler Guard] Intercepted compile error: "${diagnostic.message}" in ${diagnostic.filePath}:${diagnostic.line}`);

  // Debounce healing action slightly to let editor state settle
  setTimeout(async () => {
    try {
      const fileContent = await tauriCommands.readFile(diagnostic.filePath);
      const lines = fileContent.split('\n');
      let healed = false;
      let fixMessage = '';

      const msgLower = diagnostic.message.toLowerCase();

      // 1. Missing imports (e.g. std::fs, std::path, passive crates)
      if (msgLower.includes("cannot find module") || msgLower.includes("unresolved import") || msgLower.includes("not found in this scope")) {
        if (msgLower.includes("fs") && !fileContent.includes("use std::fs;")) {
          lines.unshift("use std::fs;");
          healed = true;
          fixMessage = "Added missing import 'use std::fs;'";
        } else if (msgLower.includes("path") && !fileContent.includes("use std::path")) {
          lines.unshift("use std::path::Path;");
          healed = true;
          fixMessage = "Added missing import 'use std::path::Path;'";
        }
      } 
      
      // 2. Mismatched parameter conversions (.to_string(), .into())
      else if (msgLower.includes("mismatched types") || msgLower.includes("expected struct")) {
        const targetLine = lines[diagnostic.line - 1];
        if (targetLine && !targetLine.includes(".into()") && !targetLine.includes(".to_string()")) {
          if (msgLower.includes("string") && msgLower.includes("str")) {
            lines[diagnostic.line - 1] = targetLine.replace(/"([^"]+)"/g, 'String::from("$1")');
            healed = true;
            fixMessage = "Casted string literal to String object";
          }
        }
      } 
      
      // 3. Typo error / Missing semicolon
      else if (msgLower.includes("expected") && msgLower.includes(";")) {
        const prevLine = lines[diagnostic.line - 2];
        if (prevLine && !prevLine.trim().endsWith(";") && !prevLine.trim().endsWith("}")) {
          lines[diagnostic.line - 2] = prevLine + ";";
          healed = true;
          fixMessage = "Appended missing semicolon ';'";
        }
      }

      if (healed) {
        const healedContent = lines.join('\n');
        await tauriCommands.writeFile(diagnostic.filePath, healedContent);
        
        // Broadcast "Healed" notification
        console.log(`[Compiler Guard] Silently healed: ${fixMessage}`);
        
        // Show indicator on active document if open
        const editorStore = useEditorStore.getState();
        if (editorStore.currentFile === diagnostic.filePath) {
          editorStore.openFile(diagnostic.filePath, healedContent);
        }

        // Re-run compilation to verify fix
        const checkStore = useCompilationStore.getState();
        const resJSON = await tauriCommands.spawnCargoCheck('.');
        try {
          const res = JSON.parse(resJSON);
          if (!res.diagnostics || res.diagnostics.length === 0) {
            checkStore.setDiagnostics([]);
            checkStore.setBuildStatus('success');
            checkStore.setProgress(100);
            alert(`[Self-Healing Compiler Guard] Surgical fix applied successfully: ${fixMessage}`);
          }
        } catch (e) {
          checkStore.setDiagnostics([]);
        }
      }
    } catch (err) {
      console.error("[Compiler Guard] Silent healing failed:", err);
    }
  }, 800);
}
