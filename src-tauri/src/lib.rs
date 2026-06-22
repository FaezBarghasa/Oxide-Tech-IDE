pub mod handlers {
    pub mod file_ops;
    pub mod process;
    pub mod system;
    pub mod rag;
    pub mod git_async;
    pub mod hardware_daemon;
    pub mod http_proxy;
}
pub mod utils;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(handlers::rag::ASTIndexState::new())
        .invoke_handler(tauri::generate_handler![
            handlers::file_ops::read_file,
            handlers::file_ops::write_file,
            handlers::file_ops::read_dir,
            handlers::file_ops::create_file,
            handlers::file_ops::create_dir,
            handlers::file_ops::delete_file,
            handlers::file_ops::rename_file,
            handlers::process::spawn_cargo_check,
            handlers::process::spawn_cargo_clippy,
            handlers::process::execute_terminal_command,
            handlers::system::get_system_stats,
            handlers::system::get_git_status,
            handlers::rag::trigger_workspace_indexing,
            handlers::rag::get_predictive_context,
            handlers::git_async::git_status_async,
            handlers::git_async::git_add_async,
            handlers::git_async::git_commit_async,
            handlers::git_async::git_create_pr_async,
            handlers::hardware_daemon::connect_serial_port_daemon,
            handlers::hardware_daemon::connect_mqtt_daemon,
            handlers::hardware_daemon::publish_mqtt_message_daemon,
            handlers::hardware_daemon::get_hardware_logs,
            handlers::hardware_daemon::clear_hardware_buffers_daemon,
            handlers::hardware_daemon::disconnect_hardware_daemons,
            handlers::http_proxy::proxy_request,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
