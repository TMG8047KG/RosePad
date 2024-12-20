use std::env;

mod discord_rpc;

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
        .invoke_handler(tauri::generate_handler![
            get_args,
            discord_rpc::update_activity,
            discord_rpc::clear_activity
        ])
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
