use discord_ipc_rp::activity::Timestamps;
use discord_ipc_rp::{activity, DiscordIpc, DiscordIpcClient};
use lazy_static::lazy_static;
use std::env;
use std::sync::Mutex;
use std::thread;

lazy_static! {
    static ref DRPC_CLIENT: Mutex<Option<DiscordIpcClient>> =
        Mutex::new(Some(DiscordIpcClient::new("1309620291470626846")));
}

fn is_discord_rpc_disabled() -> bool {
    let value = env::var("disable_discord_rpc").unwrap_or_else(|_| "not set".to_string());
    value == "1"
}

#[tauri::command]
pub fn connect_rpc() -> Result<(), String> {
    if is_discord_rpc_disabled() {
        return Err("Discord RPC is disabled".to_string());
    }

    let mut drpc = DRPC_CLIENT.lock().map_err(|e| e.to_string())?;
    if let Some(ref mut client) = *drpc {
        match client.connect() {
            Ok(_) => Ok(()),
            Err(e) => Err(format!("Failed to connect to Discord IPC: {}", e)),
        }
    } else {
        Err("Discord IPC client not initialized".to_string())
    }
}

#[tauri::command]
pub fn clear_activity() -> Result<(), String> {
    if is_discord_rpc_disabled() {
        return Err("Discord RPC is disabled".to_string());
    }

    let mut drpc = DRPC_CLIENT.lock().map_err(|e| e.to_string())?;
    if let Some(ref mut client) = *drpc {
        match client.clear_activity() {
            Ok(_) => Ok(()),
            Err(e) => Err(e.to_string()),
        }
    } else {
        Err("Discord IPC client not initialized".to_string())
    }
}

#[tauri::command]
pub fn update_activity(
    state: String,
    details: String,
    large_image: String,
    large_image_text: String,
    start: i64,
) -> Result<(), String> {
    if is_discord_rpc_disabled() {
        return Err("Discord RPC is disabled".to_string());
    }

    thread::spawn(move || {
        let drpc = DRPC_CLIENT.lock().map_err(|e| e.to_string());
        if let Ok(mut drpc) = drpc {
            if let Some(ref mut client) = *drpc {
                let activity_builder = activity::Activity::new()
                    .state(&state)
                    .details(&details)
                    .assets(
                        activity::Assets::new()
                            .large_image(&large_image)
                            .large_text(&large_image_text),
                    )
                    .timestamps(Timestamps::new().start(start));
                match client.set_activity(activity_builder) {
                    Ok(_) => (),
                    Err(e) => panic!("Failed to set activity: {}", e),
                }
            }
        }
    });
    Ok(())
}
