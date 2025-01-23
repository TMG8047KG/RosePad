use tauri::Manager;

#[tauri::command]
pub async fn settings(app: tauri::AppHandle) {
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
