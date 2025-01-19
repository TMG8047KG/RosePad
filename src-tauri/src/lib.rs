use std::env;

use tauri::Manager;

mod discord_rpc;
mod settings;

#[tauri::command]
async fn get_args() -> Vec<String> {
    let mut arg_list = vec![];
    for arg in env::args() {
        arg_list.push(arg);
    }
    return arg_list;
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let _ = discord_rpc::connect_rpc();

    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            let _ = app.get_webview_window("main")
            .expect("no main window")
            .set_focus();
        }))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            get_args,
            discord_rpc::update_activity,
            discord_rpc::clear_activity,
            settings::settings
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
