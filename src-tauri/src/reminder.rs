//! The small always-on-top reminder window shown in the bottom-right corner.

use std::sync::Mutex;
use tauri::{
    AppHandle, Emitter, LogicalPosition, LogicalSize, Manager, Runtime, WebviewUrl, WebviewWindow,
    WebviewWindowBuilder,
};

pub const LABEL: &str = "reminder";
const WIDTH: f64 = 360.0;
const MARGIN: f64 = 16.0;

/// Latest payload (JSON from the frontend) so a freshly created window can fetch it.
#[derive(Default)]
pub struct ReminderPayload(pub Mutex<Option<String>>);

/// Bottom-right corner of the primary monitor's work area (excludes the taskbar).
fn corner_position<R: Runtime>(app: &AppHandle<R>, height: f64) -> LogicalPosition<f64> {
    if let Ok(Some(monitor)) = app.primary_monitor() {
        let scale = monitor.scale_factor();
        let area = monitor.work_area();
        let pos = area.position.to_logical::<f64>(scale);
        let size = area.size.to_logical::<f64>(scale);
        return LogicalPosition::new(
            pos.x + size.width - WIDTH - MARGIN,
            pos.y + size.height - height - MARGIN,
        );
    }
    LogicalPosition::new(MARGIN, MARGIN)
}

fn place<R: Runtime>(app: &AppHandle<R>, win: &WebviewWindow<R>, height: f64) {
    let _ = win.set_size(LogicalSize::new(WIDTH, height));
    let _ = win.set_position(corner_position(app, height));
}

// Async on purpose: creating a webview window from a sync command deadlocks on Windows.
#[tauri::command]
pub async fn show_reminder<R: Runtime>(
    app: AppHandle<R>,
    state: tauri::State<'_, ReminderPayload>,
    payload: String,
    height: f64,
) -> Result<(), String> {
    *state.0.lock().map_err(|e| e.to_string())? = Some(payload.clone());

    if let Some(win) = app.get_webview_window(LABEL) {
        app.emit_to(LABEL, "reminder-update", payload)
            .map_err(|e| e.to_string())?;
        place(&app, &win, height);
        win.show().map_err(|e| e.to_string())?;
        return Ok(());
    }

    let pos = corner_position(&app, height);
    WebviewWindowBuilder::new(&app, LABEL, WebviewUrl::App("index.html".into()))
        .title("FlowBreak Reminder")
        .inner_size(WIDTH, height)
        .position(pos.x, pos.y)
        .resizable(false)
        .maximizable(false)
        .minimizable(false)
        .decorations(false)
        .always_on_top(true)
        .skip_taskbar(true)
        .focused(false)
        .shadow(true)
        .build()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn resize_reminder<R: Runtime>(app: AppHandle<R>, height: f64) {
    if let Some(win) = app.get_webview_window(LABEL) {
        place(&app, &win, height.clamp(120.0, 640.0));
    }
}

#[tauri::command]
pub fn hide_reminder<R: Runtime>(app: AppHandle<R>, state: tauri::State<'_, ReminderPayload>) {
    if let Ok(mut p) = state.0.lock() {
        *p = None;
    }
    if let Some(win) = app.get_webview_window(LABEL) {
        let _ = win.hide();
    }
}

#[tauri::command]
pub fn get_reminder_payload(state: tauri::State<'_, ReminderPayload>) -> Option<String> {
    state.0.lock().ok().and_then(|p| p.clone())
}
