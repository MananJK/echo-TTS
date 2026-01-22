use tauri::{Emitter, Manager};
use tokio::sync::broadcast;

mod oauth;

use oauth::{OAuthCallback, start_oauth_server};

pub struct AppState {
    oauth_sender: broadcast::Sender<OAuthCallback>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let (oauth_sender, mut oauth_receiver) = broadcast::channel(32);
    
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(move |app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            
            let oauth_sender_clone = oauth_sender.clone();
            let app_handle = app.handle().clone();
            
            tauri::async_runtime::spawn(async move {
                if let Err(e) = start_oauth_server(oauth_sender_clone).await {
                    log::error!("OAuth server error: {}", e);
                }
            });
            
            app.manage(AppState {
                oauth_sender,
            });
            
            tauri::async_runtime::spawn(async move {
                loop {
                    match oauth_receiver.recv().await {
                        Ok(callback) => {
                            log::info!("Received OAuth callback, emitting to frontend: service={}", callback.service);
                            
                            let payload = serde_json::json!({
                                "type": format!("{}-oauth-callback", callback.service),
                                "token": callback.token,
                                "service": callback.service,
                                "error": callback.error
                            });
                            
                            app_handle.emit("auth-callback", payload)
                                .map_err(|e| log::error!("Failed to emit auth callback: {}", e))
                                .ok();
                        }
                        Err(e) => {
                            log::error!("OAuth receiver error: {}", e);
                            break;
                        }
                    }
                }
            });
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            open_oauth_url
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
async fn open_oauth_url(
    url: String,
) -> Result<(), String> {
    log::info!("Opening OAuth URL: {}", url);
    
    open::that(&url)
        .map_err(|e| format!("Failed to open URL: {}", e))?;
    
    Ok(())
}
