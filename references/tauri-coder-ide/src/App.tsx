import React, { useEffect } from 'react';
import { MainLayout } from './components/layout/MainLayout';
import { useEditorStore } from './state/editorStore';

const MOCK_FILES = [
  { path: 'src/main.rs', content: 'use std::io;\n\nfn main() {\n    println!("Hello, Tauri Coder IDE!");\n    \n    // Unused mutable variable warning \n    let mut unused = 42;\n}' },
  { path: 'src/lib.rs', content: 'pub fn add(a: i32, b: i32) -> i32 {\n    a + b\n}' },
  { path: 'Cargo.toml', content: '[package]\nname = "my-firmware"\nversion = "0.1.0"\nedition = "2021"\n\n[dependencies]\ntokio = "1.0"\n' }
];

function App() {
  const updateFileContent = useEditorStore(state => state.updateFileContent);
  const setCurrentFile = useEditorStore(state => state.setCurrentFile);

  useEffect(() => {
    MOCK_FILES.forEach(f => updateFileContent(f.path, f.content));
    setCurrentFile(MOCK_FILES[0].path);
  }, []);

  return (
    <MainLayout />
  );
}

export default App;
