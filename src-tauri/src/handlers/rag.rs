use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use syn::visit::Visit;
use syn::{Item, ItemEnum, ItemFn, ItemImpl, ItemStruct, ItemTrait, Type};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SymbolInfo {
    pub name: String,
    pub symbol_type: String,
    pub line_number: usize,
    pub end_line_number: usize,
    pub file_path: String,
    pub breadcrumbs: Vec<String>,
    pub doc_comment: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct AstNodeDto {
    pub name: String,
    pub kind: String,
    pub line_number: usize,
    pub end_line_number: usize,
    pub signature: String,
    pub doc_comment: Option<String>,
    pub children: Vec<AstNodeDto>,
}

pub struct ASTIndexState {
    pub files: Mutex<HashMap<String, String>>, // File path -> File Content
    pub symbols: Mutex<Vec<SymbolInfo>>,
}

impl Default for ASTIndexState {
    fn default() -> Self {
        Self::new()
    }
}

impl ASTIndexState {
    pub fn new() -> Self {
        Self {
            files: Mutex::new(HashMap::new()),
            symbols: Mutex::new(Vec::new()),
        }
    }
}

struct RustAstVisitor<'a> {
    file_path: &'a str,
    symbols: Vec<SymbolInfo>,
    current_breadcrumbs: Vec<String>,
}

impl<'a> RustAstVisitor<'a> {
    fn new(file_path: &'a str) -> Self {
        Self {
            file_path,
            symbols: Vec::new(),
            current_breadcrumbs: Vec::new(),
        }
    }

    fn extract_doc_comments(attrs: &[syn::Attribute]) -> Option<String> {
        let mut docs = Vec::new();
        for attr in attrs {
            if attr.path().is_ident("doc") {
                if let syn::Meta::NameValue(meta) = &attr.meta {
                    if let syn::Expr::Lit(expr_lit) = &meta.value {
                        if let syn::Lit::Str(lit_str) = &expr_lit.lit {
                            docs.push(lit_str.value().trim().to_string());
                        }
                    }
                }
            }
        }
        if docs.is_empty() {
            None
        } else {
            Some(docs.join("\n"))
        }
    }
}

impl<'a, 'ast> Visit<'ast> for RustAstVisitor<'a> {
    fn visit_item_fn(&mut self, node: &'ast ItemFn) {
        let name = node.sig.ident.to_string();
        let doc_comment = Self::extract_doc_comments(&node.attrs);
        let start_line = 1;
        let end_line = 1;

        let mut breadcrumbs = self.current_breadcrumbs.clone();
        breadcrumbs.push(format!("fn {}", name));

        self.symbols.push(SymbolInfo {
            name: name.clone(),
            symbol_type: "function".to_string(),
            line_number: start_line,
            end_line_number: end_line,
            file_path: self.file_path.to_string(),
            breadcrumbs,
            doc_comment,
        });

        syn::visit::visit_item_fn(self, node);
    }

    fn visit_item_struct(&mut self, node: &'ast ItemStruct) {
        let name = node.ident.to_string();
        let doc_comment = Self::extract_doc_comments(&node.attrs);
        let mut breadcrumbs = self.current_breadcrumbs.clone();
        breadcrumbs.push(format!("struct {}", name));

        self.symbols.push(SymbolInfo {
            name: name.clone(),
            symbol_type: "struct".to_string(),
            line_number: 1,
            end_line_number: 1,
            file_path: self.file_path.to_string(),
            breadcrumbs,
            doc_comment,
        });

        syn::visit::visit_item_struct(self, node);
    }

    fn visit_item_enum(&mut self, node: &'ast ItemEnum) {
        let name = node.ident.to_string();
        let doc_comment = Self::extract_doc_comments(&node.attrs);
        let mut breadcrumbs = self.current_breadcrumbs.clone();
        breadcrumbs.push(format!("enum {}", name));

        self.symbols.push(SymbolInfo {
            name: name.clone(),
            symbol_type: "enum".to_string(),
            line_number: 1,
            end_line_number: 1,
            file_path: self.file_path.to_string(),
            breadcrumbs,
            doc_comment,
        });

        syn::visit::visit_item_enum(self, node);
    }

    fn visit_item_trait(&mut self, node: &'ast ItemTrait) {
        let name = node.ident.to_string();
        let doc_comment = Self::extract_doc_comments(&node.attrs);
        let mut breadcrumbs = self.current_breadcrumbs.clone();
        breadcrumbs.push(format!("trait {}", name));

        self.symbols.push(SymbolInfo {
            name: name.clone(),
            symbol_type: "trait".to_string(),
            line_number: 1,
            end_line_number: 1,
            file_path: self.file_path.to_string(),
            breadcrumbs,
            doc_comment,
        });

        self.current_breadcrumbs.push(format!("trait {}", name));
        syn::visit::visit_item_trait(self, node);
        self.current_breadcrumbs.pop();
    }

    fn visit_item_impl(&mut self, node: &'ast ItemImpl) {
        let self_ty_str = match &*node.self_ty {
            Type::Path(tp) => tp
                .path
                .segments
                .last()
                .map(|s| s.ident.to_string())
                .unwrap_or_else(|| "Self".to_string()),
            _ => "Self".to_string(),
        };

        let impl_label = if let Some((_, trait_path, _)) = &node.trait_ {
            let trait_name = trait_path
                .segments
                .last()
                .map(|s| s.ident.to_string())
                .unwrap_or_else(|| "Trait".to_string());
            format!("impl {} for {}", trait_name, self_ty_str)
        } else {
            format!("impl {}", self_ty_str)
        };

        self.current_breadcrumbs.push(impl_label);
        syn::visit::visit_item_impl(self, node);
        self.current_breadcrumbs.pop();
    }
}

pub fn parse_file_ast_outline(content: &str, file_path: &str) -> Vec<AstNodeDto> {
    if file_path.ends_with(".rs") {
        if let Ok(syntax_file) = syn::parse_file(content) {
            let mut nodes = Vec::new();
            for item in syntax_file.items {
                match item {
                    Item::Fn(f) => {
                        let name = f.sig.ident.to_string();
                        nodes.push(AstNodeDto {
                            name: name.clone(),
                            kind: "function".to_string(),
                            line_number: 1,
                            end_line_number: 1,
                            signature: format!("fn {}(...)", name),
                            doc_comment: RustAstVisitor::extract_doc_comments(&f.attrs),
                            children: Vec::new(),
                        });
                    }
                    Item::Struct(s) => {
                        let name = s.ident.to_string();
                        nodes.push(AstNodeDto {
                            name: name.clone(),
                            kind: "struct".to_string(),
                            line_number: 1,
                            end_line_number: 1,
                            signature: format!("struct {}", name),
                            doc_comment: RustAstVisitor::extract_doc_comments(&s.attrs),
                            children: Vec::new(),
                        });
                    }
                    Item::Enum(e) => {
                        let name = e.ident.to_string();
                        nodes.push(AstNodeDto {
                            name: name.clone(),
                            kind: "enum".to_string(),
                            line_number: 1,
                            end_line_number: 1,
                            signature: format!("enum {}", name),
                            doc_comment: RustAstVisitor::extract_doc_comments(&e.attrs),
                            children: Vec::new(),
                        });
                    }
                    Item::Trait(t) => {
                        let name = t.ident.to_string();
                        nodes.push(AstNodeDto {
                            name: name.clone(),
                            kind: "trait".to_string(),
                            line_number: 1,
                            end_line_number: 1,
                            signature: format!("trait {}", name),
                            doc_comment: RustAstVisitor::extract_doc_comments(&t.attrs),
                            children: Vec::new(),
                        });
                    }
                    Item::Impl(i) => {
                        let self_ty_str = match &*i.self_ty {
                            Type::Path(tp) => tp
                                .path
                                .segments
                                .last()
                                .map(|s| s.ident.to_string())
                                .unwrap_or_else(|| "Self".to_string()),
                            _ => "Self".to_string(),
                        };
                        let signature = if let Some((_, trait_path, _)) = &i.trait_ {
                            let trait_name = trait_path
                                .segments
                                .last()
                                .map(|s| s.ident.to_string())
                                .unwrap_or_else(|| "Trait".to_string());
                            format!("impl {} for {}", trait_name, self_ty_str)
                        } else {
                            format!("impl {}", self_ty_str)
                        };

                        let mut methods = Vec::new();
                        for impl_item in &i.items {
                            if let syn::ImplItem::Fn(method) = impl_item {
                                let m_name = method.sig.ident.to_string();
                                methods.push(AstNodeDto {
                                    name: m_name.clone(),
                                    kind: "method".to_string(),
                                    line_number: 1,
                                    end_line_number: 1,
                                    signature: format!("fn {}(...)", m_name),
                                    doc_comment: RustAstVisitor::extract_doc_comments(&method.attrs),
                                    children: Vec::new(),
                                });
                            }
                        }

                        nodes.push(AstNodeDto {
                            name: self_ty_str,
                            kind: "impl".to_string(),
                            line_number: 1,
                            end_line_number: 1,
                            signature,
                            doc_comment: None,
                            children: methods,
                        });
                    }
                    _ => {}
                }
            }
            return nodes;
        }
    }

    // Generic line-based fallback for TypeScript, Python, etc.
    let mut fallback_nodes = Vec::new();
    for (idx, line) in content.lines().enumerate() {
        let trimmed = line.trim();
        if trimmed.starts_with("fn ") || trimmed.starts_with("pub fn ") || trimmed.starts_with("function ") || trimmed.starts_with("export function ") {
            let name = extract_generic_name(trimmed, "fn ");
            fallback_nodes.push(AstNodeDto {
                name: if name == "unknown" { extract_generic_name(trimmed, "function ") } else { name },
                kind: "function".to_string(),
                line_number: idx + 1,
                end_line_number: idx + 1,
                signature: trimmed.to_string(),
                doc_comment: None,
                children: Vec::new(),
            });
        } else if trimmed.starts_with("struct ") || trimmed.starts_with("pub struct ") || trimmed.starts_with("class ") || trimmed.starts_with("export class ") {
            let name = extract_generic_name(trimmed, "struct ");
            fallback_nodes.push(AstNodeDto {
                name: if name == "unknown" { extract_generic_name(trimmed, "class ") } else { name },
                kind: "struct".to_string(),
                line_number: idx + 1,
                end_line_number: idx + 1,
                signature: trimmed.to_string(),
                doc_comment: None,
                children: Vec::new(),
            });
        } else if trimmed.starts_with("interface ") || trimmed.starts_with("export interface ") {
            let name = extract_generic_name(trimmed, "interface ");
            fallback_nodes.push(AstNodeDto {
                name,
                kind: "interface".to_string(),
                line_number: idx + 1,
                end_line_number: idx + 1,
                signature: trimmed.to_string(),
                doc_comment: None,
                children: Vec::new(),
            });
        }
    }

    fallback_nodes
}

fn extract_generic_name(line: &str, keyword: &str) -> String {
    if let Some(idx) = line.find(keyword) {
        let after = &line[idx + keyword.len()..];
        let end = after
            .find(|c: char| !c.is_alphanumeric() && c != '_')
            .unwrap_or(after.len());
        after[..end].to_string()
    } else {
        "unknown".to_string()
    }
}

// Scans the workspace and parses AST syntax nodes
fn index_workspace_dir(
    dir: &Path,
    files: &mut HashMap<String, String>,
    symbols: &mut Vec<SymbolInfo>,
) {
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                let name = path
                    .file_name()
                    .map(|n| n.to_string_lossy())
                    .unwrap_or_default();
                if name != "node_modules"
                    && name != "target"
                    && name != "dist"
                    && !name.starts_with('.')
                {
                    index_workspace_dir(&path, files, symbols);
                }
            } else if path.is_file() {
                let ext = path
                    .extension()
                    .map(|e| e.to_string_lossy())
                    .unwrap_or_default();
                let is_supported = matches!(ext.as_ref(), "rs" | "ts" | "tsx" | "json" | "toml" | "c" | "cpp" | "h" | "py");
                if !is_supported {
                    continue;
                }
                if let Ok(content) = fs::read_to_string(&path) {
                    let path_str = path.to_string_lossy().into_owned();

                    if path_str.ends_with(".rs") {
                        if let Ok(syntax_file) = syn::parse_file(&content) {
                            let mut visitor = RustAstVisitor::new(&path_str);
                            visitor.visit_file(&syntax_file);
                            symbols.extend(visitor.symbols);
                        }
                    } else {
                        // Generic fallback
                        let outline = parse_file_ast_outline(&content, &path_str);
                        for node in outline {
                            symbols.push(SymbolInfo {
                                name: node.name,
                                symbol_type: node.kind,
                                line_number: node.line_number,
                                end_line_number: node.end_line_number,
                                file_path: path_str.clone(),
                                breadcrumbs: vec![node.signature],
                                doc_comment: node.doc_comment,
                            });
                        }
                    }

                    files.insert(path_str, content);
                }
            }
        }
    }
}

#[tauri::command]
pub async fn trigger_workspace_indexing(
    workspace_path: String,
    state: tauri::State<'_, ASTIndexState>,
) -> Result<String, String> {
    let path = PathBuf::from(&workspace_path);
    if !path.exists() {
        return Err("Workspace path does not exist".to_string());
    }

    let mut files = HashMap::new();
    let mut symbols = Vec::new();

    index_workspace_dir(&path, &mut files, &mut symbols);

    let files_len = files.len();
    let symbols_len = symbols.len();

    let mut state_files = state.files.lock().map_err(|e| e.to_string())?;
    let mut state_symbols = state.symbols.lock().map_err(|e| e.to_string())?;

    *state_files = files;
    *state_symbols = symbols;

    Ok(format!(
        "Indexed {} files, extracted {} AST symbols",
        files_len, symbols_len
    ))
}

#[tauri::command]
pub fn get_file_ast_outline(
    file_path: String,
    content: Option<String>,
) -> Result<Vec<AstNodeDto>, String> {
    let text = if let Some(c) = content {
        c
    } else {
        fs::read_to_string(&file_path).map_err(|e| format!("Failed to read file: {}", e))?
    };

    Ok(parse_file_ast_outline(&text, &file_path))
}

#[derive(Serialize)]
pub struct ContextFile {
    pub path: String,
    pub content: String,
    pub score: usize,
    pub matched_symbols: Vec<String>,
}

#[tauri::command]
pub fn get_predictive_context(
    prompt: String,
    state: tauri::State<'_, ASTIndexState>,
) -> Result<Vec<ContextFile>, String> {
    let prompt_lower = prompt.to_lowercase();
    let words: Vec<&str> = prompt_lower
        .split(|c: char| !c.is_alphanumeric())
        .filter(|w| w.len() > 3)
        .collect();

    let symbols = state.symbols.lock().map_err(|e| e.to_string())?;
    let files = state.files.lock().map_err(|e| e.to_string())?;

    let mut file_scores: HashMap<String, usize> = HashMap::new();
    let mut file_matched_symbols: HashMap<String, Vec<String>> = HashMap::new();

    // Check symbol overlap
    for symbol in symbols.iter() {
        let sym_name_lower = symbol.name.to_lowercase();
        for word in &words {
            if sym_name_lower.contains(word) {
                *file_scores.entry(symbol.file_path.clone()).or_insert(0) += 8;
                file_matched_symbols
                    .entry(symbol.file_path.clone())
                    .or_default()
                    .push(symbol.name.clone());
            }
        }
    }

    // Check content overlap
    for (path, content) in files.iter() {
        let content_lower = content.to_lowercase();
        for word in &words {
            if content_lower.contains(word) {
                *file_scores.entry(path.clone()).or_insert(0) += 1;
            }
        }
    }

    let mut ranked: Vec<(String, usize)> = file_scores.into_iter().collect();
    ranked.sort_by_key(|b| std::cmp::Reverse(b.1));

    let mut results = Vec::new();
    for (path, score) in ranked.into_iter().take(5) {
        if let Some(content) = files.get(&path) {
            let matched = file_matched_symbols.remove(&path).unwrap_or_default();
            results.push(ContextFile {
                path,
                content: content.clone(),
                score,
                matched_symbols: matched,
            });
        }
    }

    Ok(results)
}

