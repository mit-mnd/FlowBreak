//! System tray icon and menu. Labels start in Vietnamese and are replaced by the
//! frontend (`set_tray_labels`) once the user's language is known.

use serde::Deserialize;
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, Wry,
};

pub struct TrayItems {
    show: MenuItem<Wry>,
    water: MenuItem<Wry>,
    pause: MenuItem<Wry>,
    quit: MenuItem<Wry>,
}

#[derive(Deserialize)]
pub struct TrayLabels {
    show: String,
    water: String,
    pause: String,
    quit: String,
}

pub fn show_main(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.unminimize();
        let _ = w.show();
        let _ = w.set_focus();
    }
}

pub fn setup(app: &AppHandle) -> tauri::Result<()> {
    let show = MenuItem::with_id(app, "show", "Mở FlowBreak", true, None::<&str>)?;
    let water = MenuItem::with_id(app, "log_water", "Uống nước (+250 ml)", true, None::<&str>)?;
    let pause = MenuItem::with_id(app, "pause", "Tạm dừng nhắc 1 giờ", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Thoát FlowBreak", true, None::<&str>)?;
    let sep = PredefinedMenuItem::separator(app)?;
    let menu = Menu::with_items(app, &[&show, &water, &pause, &sep, &quit])?;

    let mut builder = TrayIconBuilder::with_id("main")
        .tooltip("FlowBreak")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => show_main(app),
            "quit" => app.exit(0),
            other => {
                let _ = app.emit_to("main", "tray-action", other.to_string());
            }
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                show_main(tray.app_handle());
            }
        });
    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }
    builder.build(app)?;

    app.manage(TrayItems {
        show,
        water,
        pause,
        quit,
    });
    Ok(())
}

#[tauri::command]
pub fn set_tray_labels(
    items: tauri::State<'_, TrayItems>,
    labels: TrayLabels,
) -> Result<(), String> {
    items
        .show
        .set_text(labels.show)
        .map_err(|e| e.to_string())?;
    items
        .water
        .set_text(labels.water)
        .map_err(|e| e.to_string())?;
    items
        .pause
        .set_text(labels.pause)
        .map_err(|e| e.to_string())?;
    items
        .quit
        .set_text(labels.quit)
        .map_err(|e| e.to_string())?;
    Ok(())
}
