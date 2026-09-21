pub mod handlers {
    pub mod cargo_ops;
    pub mod core_ops;
    pub mod file_ops;
    pub mod fs_watcher;
    pub mod git_async;
    pub mod hardware_daemon;
    pub mod http_proxy;
    pub mod local_history_ops;
    pub mod lsp_daemon;
    pub mod mcu_debugger_ops;
    pub mod process;
    pub mod pty_ops;
    pub mod rag;
    pub mod search_ops;
    pub mod settings_storage;
    pub mod system;
    pub mod test_runner_ops;
    pub mod vcs_ops;
    pub mod visual_workstation_ops;
}
pub mod utils;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(handlers::rag::ASTIndexState::new())
        .invoke_handler(tauri::generate_handler![
            // ── Core / AI ────────────────────────────────────────────────────────────
            handlers::core_ops::discover_cuda_devices,
            handlers::core_ops::parse_source_symbols,
            handlers::core_ops::slice_differential_context,
            handlers::core_ops::create_task_worktree,
            handlers::core_ops::validate_swarm_dag_tasks,
            handlers::core_ops::run_local_harness_check,
            handlers::core_ops::match_diagnostic_skills,
            handlers::core_ops::sanitize_prompt_for_remote,
            handlers::core_ops::discover_forged_tools,
            handlers::core_ops::synthesize_forged_tool,
            handlers::core_ops::record_forged_tool_usage,
            handlers::core_ops::deprecate_forged_tool,
            handlers::core_ops::parse_claude_conventions,
            handlers::core_ops::discover_claude_slash_commands,
            handlers::core_ops::execute_ox_read,
            handlers::core_ops::execute_ox_edit,
            handlers::core_ops::execute_ox_write,
            handlers::core_ops::execute_ox_grep,
            handlers::core_ops::execute_ox_bash,
            handlers::core_ops::get_cortex_device_capabilities,
            handlers::core_ops::generate_cortex_embedding,
            handlers::core_ops::search_cortex_knowledge_graph,
            // ── File System ──────────────────────────────────────────────────────────
            handlers::file_ops::read_workspace_file,
            handlers::file_ops::save_workspace_file,
            handlers::file_ops::list_directory_tree,
            handlers::file_ops::read_file,
            handlers::file_ops::write_file,
            handlers::file_ops::read_dir,
            handlers::file_ops::create_file,
            handlers::file_ops::create_dir,
            handlers::file_ops::delete_file,
            handlers::file_ops::rename_file,
            // ── Cargo & Build ────────────────────────────────────────────────────────
            handlers::process::spawn_cargo_check,
            handlers::process::spawn_cargo_clippy,
            handlers::process::execute_terminal_command,
            handlers::cargo_ops::cargo_get_workspace_metadata,
            handlers::cargo_ops::rust_expand_macro,
            handlers::cargo_ops::cargo_add_dependency,
            // ── System ───────────────────────────────────────────────────────────────
            handlers::system::get_system_stats,
            handlers::system::get_git_status,
            // ── RAG / AST Index ──────────────────────────────────────────────────────
            handlers::rag::trigger_workspace_indexing,
            handlers::rag::get_predictive_context,
            // ── Git Async ────────────────────────────────────────────────────────────
            handlers::git_async::git_status_async,
            handlers::git_async::git_add_async,
            handlers::git_async::git_commit_async,
            handlers::git_async::git_create_pr_async,
            // ── VCS (Phase 6 complete) ────────────────────────────────────────────────
            handlers::vcs_ops::vcs_get_detailed_status,
            handlers::vcs_ops::vcs_get_line_diffs,
            handlers::vcs_ops::vcs_git_diff_content,
            handlers::vcs_ops::vcs_git_push,
            handlers::vcs_ops::vcs_git_stash,
            handlers::vcs_ops::vcs_git_stash_pop,
            handlers::vcs_ops::vcs_git_log,
            handlers::vcs_ops::vcs_git_blame,
            handlers::vcs_ops::vcs_git_cherry_pick,
            // ── Hardware / Serial / MQTT ─────────────────────────────────────────────
            handlers::hardware_daemon::connect_serial_port_daemon,
            handlers::hardware_daemon::connect_mqtt_daemon,
            handlers::hardware_daemon::publish_mqtt_message_daemon,
            handlers::hardware_daemon::get_hardware_logs,
            handlers::hardware_daemon::clear_hardware_buffers_daemon,
            handlers::hardware_daemon::disconnect_hardware_daemons,
            // ── HTTP Proxy ────────────────────────────────────────────────────────────
            handlers::http_proxy::proxy_request,
            // ── Settings ─────────────────────────────────────────────────────────────
            handlers::settings_storage::save_ide_layout,
            handlers::settings_storage::load_ide_layout,
            handlers::settings_storage::save_user_keymap,
            handlers::settings_storage::load_user_keymap,
            // ── Visual Workstation (Playwright / Slint / Iced) ───────────────────────
            handlers::visual_workstation_ops::playwright_discover_tests,
            handlers::visual_workstation_ops::playwright_run_test,
            handlers::visual_workstation_ops::playwright_compare_visual_baselines,
            handlers::visual_workstation_ops::slint_compile_preview,
            handlers::visual_workstation_ops::slint_dispatch_canvas_event,
            handlers::visual_workstation_ops::embedded_sim_get_profiles,
            handlers::visual_workstation_ops::embedded_sim_render_sample,
            handlers::visual_workstation_ops::embedded_sim_inject_input,
            handlers::visual_workstation_ops::iced_fetch_widget_tree,
            handlers::visual_workstation_ops::iced_trigger_hot_reload,
            // ── MCU Debugger / Embedded (Phase 5 complete) ───────────────────────────
            handlers::mcu_debugger_ops::mcu_discover_probes,
            handlers::mcu_debugger_ops::mcu_get_supported_chips,
            handlers::mcu_debugger_ops::mcu_flash_firmware,
            handlers::mcu_debugger_ops::mcu_poll_defmt_rtt,
            handlers::mcu_debugger_ops::mcu_launch_qemu,
            handlers::mcu_debugger_ops::mcu_read_peripheral_registers,
            handlers::mcu_debugger_ops::run_klipp_workflow,
            handlers::mcu_debugger_ops::mcp_get_server_configs,
            handlers::mcu_debugger_ops::mcp_toggle_server,
            handlers::mcu_debugger_ops::mcu_halt,
            handlers::mcu_debugger_ops::mcu_reset,
            handlers::mcu_debugger_ops::mcu_memory_read,
            handlers::mcu_debugger_ops::mcu_memory_write,
            handlers::mcu_debugger_ops::mcu_disassemble,
            // ── PTY / Terminal ────────────────────────────────────────────────────────
            handlers::pty_ops::pty_spawn,
            handlers::pty_ops::pty_write,
            handlers::pty_ops::pty_resize,
            handlers::pty_ops::pty_kill,
            // ── LSP Daemon (Phase 2 complete) ─────────────────────────────────────────
            handlers::lsp_daemon::lsp_start,
            handlers::lsp_daemon::lsp_did_open,
            handlers::lsp_daemon::lsp_did_change,
            handlers::lsp_daemon::lsp_did_save,
            handlers::lsp_daemon::lsp_did_close,
            handlers::lsp_daemon::lsp_completion,
            handlers::lsp_daemon::lsp_hover,
            handlers::lsp_daemon::lsp_definition,
            handlers::lsp_daemon::lsp_inlay_hints,
            handlers::lsp_daemon::lsp_code_actions,
            handlers::lsp_daemon::lsp_status,
            handlers::lsp_daemon::lsp_references,
            handlers::lsp_daemon::lsp_rename,
            handlers::lsp_daemon::lsp_workspace_symbols,
            handlers::lsp_daemon::lsp_format_document,
            // ── FS Watcher ────────────────────────────────────────────────────────────
            handlers::fs_watcher::fs_watch_start,
            handlers::fs_watcher::fs_watch_stop,
            // ── Local History ─────────────────────────────────────────────────────────
            handlers::local_history_ops::local_history_record_snapshot,
            handlers::local_history_ops::local_history_get_revisions,
            handlers::local_history_ops::local_history_get_revision_content,
            // ── Test Runner (Phase 4 complete) ────────────────────────────────────────
            handlers::test_runner_ops::discover_workspace_tests,
            handlers::test_runner_ops::run_single_test,
            handlers::test_runner_ops::run_all_tests_streaming,
            handlers::test_runner_ops::llvm_cov_report,
            // ── Global Search (Phase 7 complete) ──────────────────────────────────────
            handlers::search_ops::search_workspace_text,
            handlers::search_ops::search_workspace_symbols,
            handlers::search_ops::search_replace_in_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
