use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    AppHandle, Manager, WebviewWindow, WindowEvent,
};
use tauri_plugin_autostart::ManagerExt as AutostartManagerExt;
use tauri_plugin_global_shortcut::{
    Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState,
};

fn toggle_main_window(app: &AppHandle) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };

    if window.is_visible().unwrap_or(false) {
        let _ = window.hide();
    } else {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

fn toggle_always_on_top(app: &AppHandle) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };

    let enabled = window.is_always_on_top().unwrap_or(false);
    let _ = window.set_always_on_top(!enabled);
}

fn toggle_autostart(app: &AppHandle) {
    let manager = app.autolaunch();
    if manager.is_enabled().unwrap_or(false) {
        let _ = manager.disable();
    } else {
        let _ = manager.enable();
    }
}

#[tauri::command]
fn set_always_on_top(window: WebviewWindow, enabled: bool) -> Result<bool, String> {
    window
        .set_always_on_top(enabled)
        .map_err(|error| error.to_string())?;
    Ok(enabled)
}

#[tauri::command]
fn get_always_on_top(window: WebviewWindow) -> Result<bool, String> {
    window
        .is_always_on_top()
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn set_autostart(app: AppHandle, enabled: bool) -> Result<bool, String> {
    let manager = app.autolaunch();
    if enabled {
        manager.enable().map_err(|error| error.to_string())?;
    } else {
        manager.disable().map_err(|error| error.to_string())?;
    }
    manager.is_enabled().map_err(|error| error.to_string())
}

#[tauri::command]
fn get_autostart_enabled(app: AppHandle) -> Result<bool, String> {
    app.autolaunch()
        .is_enabled()
        .map_err(|error| error.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let shortcut = Shortcut::new(
        Some(Modifiers::CONTROL | Modifiers::SHIFT),
        Code::Space,
    );

    tauri::Builder::default()
        .plugin(
            tauri_plugin_autostart::Builder::new()
                .app_name("Sen")
                .build(),
        )
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(move |app, registered, event| {
                    if registered == &shortcut && event.state() == ShortcutState::Pressed {
                        toggle_main_window(app);
                    }
                })
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            set_always_on_top,
            get_always_on_top,
            set_autostart,
            get_autostart_enabled,
        ])
        .setup(move |app| {
            let show_hide =
                MenuItem::with_id(app, "show_hide", "Show / Hide Sen", true, None::<&str>)?;
            let pin =
                MenuItem::with_id(app, "toggle_top", "Toggle always on top", true, None::<&str>)?;
            let startup =
                MenuItem::with_id(app, "toggle_autostart", "Toggle start with Windows", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit Sen", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_hide, &pin, &startup, &quit])?;

            TrayIconBuilder::new()
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show_hide" => toggle_main_window(app),
                    "toggle_top" => toggle_always_on_top(app),
                    "toggle_autostart" => toggle_autostart(app),
                    "quit" => app.exit(0),
                    _ => {}
                })
                .build(app)?;

            app.global_shortcut().register(shortcut)?;

            if let Some(window) = app.get_webview_window("main") {
                let window_on_close = window.clone();
                window.on_window_event(move |event| {
                    if let WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = window_on_close.hide();
                    }
                });
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Sen desktop");
}
