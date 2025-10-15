#[cfg(not(any(target_os = "ios", target_os = "android")))]
use tauri::Manager;

#[tauri::command]
pub async fn settings(app: tauri::AppHandle) {
    #[cfg(any(target_os = "ios", target_os = "android"))]
    {
        let _ = app.emit("navigate", "/settings");
    }

    #[cfg(any(target_os = "windows", target_os = "linux", target_os = "macos"))]
    {
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
}
