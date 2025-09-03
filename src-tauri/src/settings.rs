#[cfg(not(any(target_os = "ios", target_os = "android")))]
use tauri::{window::Color, Manager};

#[tauri::command]
pub async fn settings(app: tauri::AppHandle) {
    #[cfg(any(target_os = "ios", target_os = "android"))]
    {
        let _ = app.emit("navigate", "/settings");
    }

    #[cfg(not(any(target_os = "ios", target_os = "android")))]
    {
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
        .background_color(Color(65, 65, 65, 255))
        .center()
        .focused(true)
        .decorations(false)
        .build()
        .unwrap();
    }
}
