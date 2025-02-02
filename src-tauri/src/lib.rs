use std::env;

use tauri::{Emitter, Manager};

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
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            let window = app.get_window("main").unwrap();
            window.show().unwrap();
            window.set_focus().unwrap();
            let mut arg_list = vec![];
            for arg in args {
                println!("{}", arg);
                arg_list.push(arg);
            }
            println!("it's running!");
            window.emit("file-open", arg_list).unwrap();
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
