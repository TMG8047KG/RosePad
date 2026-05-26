//TODO:
//- Create global db file in config
//- Connect it with the settings and workspaces to be the defining start of the app
//- Add tauri commands for the frontend to be able to invoke

use std::path::PathBuf;

use tauri::Manager;

use rusqlite::Connection;

const GLOBAL_DATABASE: &str = "global.db";
const GLOBAL_SCHEMA: &str = include_str!("global_schema_v1.sql");

pub fn create(app: &tauri::AppHandle) -> Result<(), String> {
    println!("Creating globals...");
    let config = get_config_path(app)?;
    let db_path = config.join(GLOBAL_DATABASE);

    let conn = Connection::open(db_path.as_path())
        .map_err(|e| format!("Failed to create/open global db. {e}"))?;

    migrate(&conn)?;

    println!("Successfully created globals!");
    Ok(())
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
