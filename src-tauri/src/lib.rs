use std::env;
use std::sync::Mutex;

use lazy_static::lazy_static;
use tauri::{Emitter, Manager};

use tauri_plugin_sql::{Migration, MigrationKind};
use tauri_plugin_updater::UpdaterExt;

mod discord_rpc;

mod settings;
mod workspace;

lazy_static! {
    static ref PENDING_OPEN_PATHS: Mutex<Vec<String>> = Mutex::new(Vec::new());
}

fn enqueue_open_paths(args: &[String]) {
    if args.is_empty() {
        return;
    }
    let mut guard = match PENDING_OPEN_PATHS.lock() {
        Ok(g) => g,
        Err(poisoned) => poisoned.into_inner(),
    };
    // Skip the executable path and only keep meaningful payload
    guard.extend(
        args.iter()
            .skip(1)
            .filter(|s| !s.is_empty())
            .cloned(),
    );
}

#[tauri::command]
async fn get_args() -> Vec<String> {
    let mut arg_list = vec![];
    for arg in env::args() {
        arg_list.push(arg);
    }
    arg_list
}

#[tauri::command]
fn is_hyprland() -> bool {
    std::env::var("XDG_CURRENT_DESKTOP").is_ok_and(|v| v == "Hyprland")
        || std::env::var("XDG_SESSION_DESKTOP").is_ok_and(|v| v == "Hyprland")
}

#[tauri::command]
async fn take_pending_open_paths() -> Vec<String> {
    let mut guard = match PENDING_OPEN_PATHS.lock() {
        Ok(g) => g,
        Err(poisoned) => poisoned.into_inner(),
    };
    guard.drain(..).collect()
}

pub fn run() {
    enqueue_open_paths(&env::args().collect::<Vec<_>>());

    let migrations = vec![Migration {
        version: 1,
        description: "init",
        sql: include_str!("schema_v1.sql"),
        kind: MigrationKind::Up,
    }];
    let _ = discord_rpc::connect_rpc();
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_sql::Builder::new()
                .add_migrations("sqlite:rosepad.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            enqueue_open_paths(&args);
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
        }));

    builder = builder
        .invoke_handler(tauri::generate_handler![
            get_args,
            is_hyprland,
            workspace::scan_workspace,
            workspace::analyze_paths,
            workspace::rename_project,
            workspace::delete_project,
            workspace::move_project,
            workspace::rename_physical_folder,
            workspace::delete_physical_folder,
            workspace::create_physical_folder,
            workspace::watch_physical_folders,
            workspace::read_rpad_data,
            workspace::write_rpad_html,
            workspace::write_text_atomic,
            workspace::import_project,
            workspace::create_rpad_project,
            discord_rpc::update_activity,
            discord_rpc::clear_activity,
            settings::settings,
            take_pending_open_paths
        ])
        .setup(|app| {
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                update(handle).await.unwrap();
            });
            Ok(())
        });

    builder
        .run(tauri::generate_context!())
        .expect("RosePad is kaput while trying to run!");
}

async fn update(app: tauri::AppHandle) -> tauri_plugin_updater::Result<()> {
    if let Some(update) = app.updater()?.check().await? {
        let mut downloaded = 0;
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
