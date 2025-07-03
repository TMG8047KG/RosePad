use std::env;

use tauri::{Emitter, Manager};
use tauri_plugin_updater::UpdaterExt;

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

#[tauri::command]
fn is_hyprland() -> bool {
    std::env::var("XDG_CURRENT_DESKTOP").map_or(false, |v| v == "Hyprland")
    || std::env::var("XDG_SESSION_DESKTOP").map_or(false, |v| v == "Hyprland")
}


#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let _ = discord_rpc::connect_rpc();
    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
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
            is_hyprland,
            discord_rpc::update_activity,
            discord_rpc::clear_activity,
            settings::settings
        ])
        .setup(|app| {
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                update(handle).await.unwrap();
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

async fn update(app: tauri::AppHandle) -> tauri_plugin_updater::Result<()> {
    if let Some(update) = app.updater()?.check().await? {
        let mut downloaded = 0;

        // alternatively we could also call update.download() and update.install() separately
        update
            .download_and_install(
                |chunk_length, content_length| {
                    downloaded += chunk_length;
                    println!("downloaded {downloaded} from {content_length:?}");
                },
                || {
                    println!("download finished");
                },
            )
            .await?;

        println!("update installed");
        app.restart();
    }
    Ok(())
}
