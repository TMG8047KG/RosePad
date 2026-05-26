//TODO:
//- Create global db file in config
//- Connect it with the settings and workspaces to be the defining start of the app
//- Add tauri commands for the frontend to be able to invoke

use std::{path::PathBuf, sync::OnceLock};

use rusqlite::params;
use tauri::Manager;

use rusqlite::Connection;

pub struct GWorkspace {
    pub name: String,
    pub path: PathBuf,
    pub last_opened_at: i64,
    pub created_at: i64,
}

static GLOBAL_DATABASE_PATH: OnceLock<PathBuf> = OnceLock::new();

const GLOBAL_DATABASE: &str = "global.db";
const GLOBAL_SCHEMA: &str = include_str!("global_schema_v1.sql");

pub fn create(app: &tauri::AppHandle) -> Result<(), String> {
    println!("Creating globals...");

    let config = get_config_path(app)?;
    let db_path = config.join(GLOBAL_DATABASE);
    let _ = GLOBAL_DATABASE_PATH
        .set(db_path)
        .map_err(|_| "Global DB path is already initialized.".to_string());

    let conn = get_conn()?;

    migrate(&conn)?;

    println!("Successfully created globals!");
    Ok(())
}

fn get_conn() -> Result<Connection, String> {
    let conn = Connection::open(GLOBAL_DATABASE_PATH.get().unwrap().as_path())
        .map_err(|e| format!("Failed to create/open global db. {e}"))?;
    Ok(conn)
}

fn get_config_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let path = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("Unable to get app's config path: {e}"))?;

    Ok(path)
}

fn migrate(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(GLOBAL_SCHEMA)
        .map_err(|e| format!("Migration failed: {e}"))?;
    println!("Global migration successful!");
    Ok(())
}

pub fn add_workspace(workspace: GWorkspace) -> Result<(), String> {
    let conn = get_conn()?;
    conn.execute(
        "INSERT INTO workspaces (name, path, last_opened_at, created_at) VALUES (?1, ?2, ?3, ?4)",
        params![
            workspace.name,
            workspace.path.to_string_lossy(),
            workspace.last_opened_at,
            workspace.created_at
        ],
    )
    .map_err(|e| format!("Failed to insert workspace into globals: {e}"))?;

    Ok(())
}
