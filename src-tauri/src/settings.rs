use serde::{Deserialize, Serialize};
use std::fs::{self, File};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::{Emitter, Manager};

use crate::discord_rpc::{DiscordCustomRPC, DiscordCustomRPCPatch};

const SETTINGS_FILE: &str = "settings.json";
const SETTINGS_TMP_FILE: &str = "settings.json.tmp";
const SETTINGS_BACKUP_FILE: &str = "settings.json.bak";
const SETTINGS_EVENT: &str = "settings:changed";

static SETTINGS_IO_LOCK: Mutex<()> = Mutex::new(());


#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AutoSaveSettings {
    pub enabled: bool,
    pub interval: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub workspace_dir: Option<String>,
    pub watched: Vec<String>,
    pub autosave: AutoSaveSettings,
    pub theme: String,
    pub discord_rpc: bool,
    pub discord_ctm_rpc: DiscordCustomRPC,
    pub initialized: bool,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AutoSaveSettingsPatch {
    pub enabled: Option<bool>,
    pub interval: Option<i64>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SettingsPatch {
    pub workspace_dir: Option<Option<String>>,
    pub watched: Option<Vec<String>>,
    pub autosave: Option<AutoSaveSettingsPatch>,
    pub theme: Option<String>,
    pub discord_rpc: Option<bool>,
    pub discord_ctm_rpc: Option<DiscordCustomRPCPatch>,
    pub initialized: Option<bool>,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            workspace_dir: None,
            watched: vec![],
            theme: "dark".to_string(),
            autosave: AutoSaveSettings {
                enabled: true,
                interval: 2,
            },
            discord_rpc: true,
            discord_ctm_rpc: DiscordCustomRPC {
                details: None,
                state: None,
            },
            initialized: false,
        }
    }
}

fn normalize(mut s: Settings) -> Settings {
    s.autosave.interval = s.autosave.interval.clamp(1, 60);

    if s.theme.trim().is_empty() {
        s.theme = "dark".to_string();
    }

    s
}

fn merge_patch(mut current: Settings, patch: SettingsPatch) -> Settings {
    if let Some(workspace_dir) = patch.workspace_dir {
        current.workspace_dir = workspace_dir;
    }
    if let Some(watched) = patch.watched {
        current.watched = watched;
    }
    if let Some(autosave_patch) = patch.autosave {
        if let Some(enabled) = autosave_patch.enabled {
            current.autosave.enabled = enabled;
        }
        if let Some(interval) = autosave_patch.interval {
            current.autosave.interval = interval;
        }
    }
    if let Some(theme) = patch.theme {
        current.theme = theme;
    }
    if let Some(discord_rpc) = patch.discord_rpc {
        current.discord_rpc = discord_rpc;
    }
    if let Some(discord_patch) = patch.discord_ctm_rpc {
        if let Some(details) = discord_patch.details {
            current.discord_ctm_rpc.details = details;
        }
        if let Some(state) = discord_patch.state {
            current.discord_ctm_rpc.state = state;
        }
    }
    if let Some(initialized) = patch.initialized {
        current.initialized = initialized;
    }

    normalize(current)
}

fn settings_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let base = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("failed to resolve app config dir: {e}"))?;
    fs::create_dir_all(&base).map_err(|e| format!("failed to create app config dir: {e}"))?;
    Ok(base)
}

fn settings_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(settings_dir(app)?.join(SETTINGS_FILE))
}

fn settings_backup_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(settings_dir(app)?.join(SETTINGS_BACKUP_FILE))
}

fn settings_tmp_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(settings_dir(app)?.join(SETTINGS_TMP_FILE))
}

fn parse_settings_file(path: &Path) -> Result<Settings, String> {
    let text = fs::read_to_string(path)
        .map_err(|e| format!("failed to read settings file {}: {e}", path.display()))?;
    let parsed: Settings = serde_json::from_str(&text)
        .map_err(|e| format!("failed to parse settings json at {}: {e}", path.display()))?;
    Ok(normalize(parsed))
}

fn read_settings(app: &tauri::AppHandle) -> Result<Settings, String> {
    let _guard = SETTINGS_IO_LOCK
        .lock()
        .map_err(|_| "settings lock poisoned".to_string())?;

    let path = settings_path(app)?;
    if !path.exists() {
        return Ok(Settings::default());
    }

    match parse_settings_file(&path) {
        Ok(settings) => Ok(settings),
        Err(main_err) => {
            let backup = settings_backup_path(app)?;
            if backup.exists() {
                parse_settings_file(&backup).map_err(|backup_err| {
                    format!("{main_err}; backup read also failed: {backup_err}")
                })
            } else {
                Err(main_err)
            }
        }
    }
}

fn sync_parent_dir(path: &Path) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        let dir_file = File::open(parent)
            .map_err(|e| format!("failed to open settings dir {}: {e}", parent.display()))?;
        dir_file
            .sync_all()
            .map_err(|e| format!("failed to sync settings dir {}: {e}", parent.display()))?;
    }
    Ok(())
}

fn replace_file(tmp_path: &Path, final_path: &Path) -> Result<(), String> {
    match fs::rename(tmp_path, final_path) {
        Ok(_) => Ok(()),
        Err(rename_err) => {
            if final_path.exists() {
                fs::remove_file(final_path).map_err(|e| {
                    format!(
                        "failed to replace settings file {} after rename error ({rename_err}): {e}",
                        final_path.display()
                    )
                })?;
                fs::rename(tmp_path, final_path).map_err(|e| {
                    format!(
                        "failed to rename tmp settings {} to {}: {e}",
                        tmp_path.display(),
                        final_path.display()
                    )
                })
            } else {
                Err(format!(
                    "failed to rename tmp settings {} to {}: {rename_err}",
                    tmp_path.display(),
                    final_path.display()
                ))
            }
        }
    }
}

fn write_settings(app: &tauri::AppHandle, settings: &Settings) -> Result<(), String> {
    let _guard = SETTINGS_IO_LOCK
        .lock()
        .map_err(|_| "settings lock poisoned".to_string())?;

    let final_path = settings_path(app)?;
    let backup_path = settings_backup_path(app)?;
    let tmp_path = settings_tmp_path(app)?;

    let payload = serde_json::to_vec_pretty(settings)
        .map_err(|e| format!("failed to serialize settings json: {e}"))?;

    if final_path.exists() {
        fs::copy(&final_path, &backup_path).map_err(|e| {
            format!(
                "failed to create settings backup {} from {}: {e}",
                backup_path.display(),
                final_path.display()
            )
        })?;
    }

    let mut tmp_file = File::create(&tmp_path).map_err(|e| {
        format!(
            "failed to create settings tmp file {}: {e}",
            tmp_path.display()
        )
    })?;
    tmp_file.write_all(&payload).map_err(|e| {
        format!(
            "failed to write settings tmp file {}: {e}",
            tmp_path.display()
        )
    })?;
    tmp_file.sync_all().map_err(|e| {
        format!(
            "failed to sync settings tmp file {}: {e}",
            tmp_path.display()
        )
    })?;
    drop(tmp_file);

    replace_file(&tmp_path, &final_path)?;
    sync_parent_dir(&final_path)?;

    Ok(())
}

#[tauri::command]
pub async fn get_settings(app: tauri::AppHandle) -> Result<Settings, String> {
    read_settings(&app)
}

#[tauri::command]
pub async fn update_settings(
    app: tauri::AppHandle,
    patch: SettingsPatch,
) -> Result<Settings, String> {
    let current = read_settings(&app)?;
    let next = merge_patch(current, patch);
    write_settings(&app, &next)?;
    let _ = app.emit(SETTINGS_EVENT, &next);
    Ok(next)
}

#[tauri::command]
pub async fn reset_settings(app: tauri::AppHandle) -> Result<Settings, String> {
    let next = Settings::default();
    write_settings(&app, &next)?;
    let _ = app.emit(SETTINGS_EVENT, &next);
    Ok(next)
}

//==================
//      Window
//==================

#[tauri::command]
pub async fn settings(app: tauri::AppHandle) {
    if let Some(win) = app.get_webview_window("settings") {
        let _ = win.unminimize();
        let _ = win.show();
        let _ = win.set_focus();
        return;
    }

    tauri::WebviewWindowBuilder::new(
        &app,
        "settings",
        tauri::WebviewUrl::App("/#/settings".into()),
    )
    .parent(&app.get_webview_window("main").unwrap())
    .expect("No parent found")
    .title("RosePad Settings")
    .inner_size(400.0, 600.0)
    .min_inner_size(400.0, 500.0)
    .center()
    .focused(true)
    .decorations(false)
    .build()
    .unwrap();
}
