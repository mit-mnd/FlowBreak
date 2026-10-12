mod idle;
mod reminder;
mod tray;

use tauri::{AppHandle, WindowEvent};
use tauri_plugin_autostart::MacosLauncher;
use tauri_plugin_sql::{Migration, MigrationKind};

/// Passed by the autostart entry so login starts quietly in the tray.
const MINIMIZED_ARG: &str = "--minimized";

#[tauri::command]
fn get_idle_seconds() -> u64 {
    idle::idle_seconds()
}

#[tauri::command]
fn show_main_window(app: AppHandle) {
    tray::show_main(&app);
}

fn migrations() -> Vec<Migration> {
    // Never edit an existing migration; append a new one instead.
    vec![Migration {
        version: 1,
        description: "create_initial_tables",
        sql: include_str!("../../src/lib/db/migrations/0001_init.sql"),
        kind: MigrationKind::Up,
    }]
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Must be first: a second launch just focuses the running instance.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            tray::show_main(app);
        }))
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:flowbreak.db", migrations())
                .build(),
        )
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec![MINIMIZED_ARG]),
        ))
        .manage(reminder::ReminderPayload::default())
        .setup(|app| {
            tray::setup(app.handle())?;
            let start_hidden = std::env::args().any(|a| a == MINIMIZED_ARG);
            if !start_hidden {
                tray::show_main(app.handle());
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            // Closing the main window only hides it; the app keeps running in the tray.
            if let WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "main" {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_idle_seconds,
            show_main_window,
            reminder::show_reminder,
            reminder::resize_reminder,
            reminder::hide_reminder,
            reminder::get_reminder_payload,
            tray::set_tray_labels,
        ])
        .run(tauri::generate_context!())
        .expect("error while running FlowBreak");
}
