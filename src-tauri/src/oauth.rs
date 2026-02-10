use axum::{
    extract::{Query, State},
    http::{StatusCode, HeaderMap},
    response::{Html, IntoResponse},
    routing::{get, post},
    Router,
};
use serde::Deserialize;
use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::net::TcpListener;
use tokio::sync::broadcast;

use crate::alerts::{AlertPayload, TwitchEventSubPayload, process_twitch_event, process_youtube_alert};

#[derive(Debug, Clone, Deserialize)]
pub struct OAuthCallback {
    pub token: String,
    pub service: String,
    pub error: Option<String>,
}

#[derive(Clone)]
struct OAuthServerState {
    sender: broadcast::Sender<OAuthCallback>,
    alert_sender: broadcast::Sender<AlertPayload>,
}

pub async fn start_oauth_server(
    sender: broadcast::Sender<OAuthCallback>,
    alert_sender: broadcast::Sender<AlertPayload>,
) -> anyhow::Result<()> {
    let state = Arc::new(OAuthServerState { sender, alert_sender });
    let app = Router::new()
        .route("/callback", get(handle_callback))
        .route("/auth-complete", get(handle_auth_complete))
        .route("/twitch-alerts", post(handle_twitch_alerts))
        .route("/youtube-alerts", get(handle_youtube_challenge).post(handle_youtube_alerts))
        .with_state(state);

    let addr = SocketAddr::from(([127, 0, 0, 1], 3000));
    let listener = TcpListener::bind(addr).await?;
    log::info!("OAuth server listening on {}", addr);

    axum::serve(listener, app).await?;
    Ok(())
}

async fn handle_callback(Query(_params): Query<HashMap<String, String>>) -> Html<&'static str> {
    Html(include_str!("../oauth_callback.html"))
}

async fn handle_auth_complete(
    Query(params): Query<HashMap<String, String>>,
    State(state): State<Arc<OAuthServerState>>,
) -> impl IntoResponse {
    let token = params.get("token").cloned();
    let service = params.get("service").cloned().unwrap_or_else(|| "twitch".to_string());
    
    log::info!("Received auth complete for service: {}", service);
    log::debug!("Token present: {}", token.is_some());
    
    if let Some(token) = token {
        let callback = OAuthCallback {
            token,
            service,
            error: None,
        };
        
        if let Err(e) = state.sender.send(callback) {
            log::error!("Failed to send OAuth callback: {}", e);
            return StatusCode::INTERNAL_SERVER_ERROR.into_response();
        }
        
        log::info!("OAuth callback sent successfully");
        return "OK".into_response();
    } else {
        log::error!("Missing token in auth complete");
        return StatusCode::BAD_REQUEST.into_response();
    }
}

async fn handle_twitch_alerts(
    headers: HeaderMap,
    State(state): State<Arc<OAuthServerState>>,
    axum::extract::Json(payload): axum::extract::Json<serde_json::Value>,
) -> impl IntoResponse {
    let message_type = headers.get("Twitch-Eventsub-Message-Type")
        .and_then(|h| h.to_str().ok())
        .unwrap_or("");

    match message_type {
        "webhook_callback_verification" => {
            let challenge = payload["challenge"].as_str().unwrap_or("");
            log::info!("Twitch EventSub verification challenge received");
            challenge.to_string().into_response()
        }
        "notification" => {
            if let Ok(twitch_payload) = serde_json::from_value::<TwitchEventSubPayload>(payload) {
                if let Some(alert) = process_twitch_event(twitch_payload) {
                    log::info!("Twitch alert processed: {} - {}", alert.alert_type, alert.user_name);
                    let _ = state.alert_sender.send(alert);
                }
            }
            StatusCode::OK.into_response()
        }
        _ => StatusCode::OK.into_response(),
    }
}

async fn handle_youtube_challenge(
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    if let Some(challenge) = params.get("hub.challenge") {
        log::info!("YouTube PubSubHubbub verification challenge received");
        challenge.clone().into_response()
    } else {
        StatusCode::BAD_REQUEST.into_response()
    }
}

async fn handle_youtube_alerts(
    State(state): State<Arc<OAuthServerState>>,
    body: String,
) -> impl IntoResponse {
    log::info!("Received YouTube alert notification");
    if let Some(alert) = process_youtube_alert(&body) {
        let _ = state.alert_sender.send(alert);
    }
    StatusCode::OK.into_response()
}
