use axum::{
    extract::{Query, State},
    http::{StatusCode, HeaderMap},
    response::{Html, IntoResponse},
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::net::TcpListener;
use tokio::sync::broadcast;

use crate::alerts::{AlertPayload, TwitchEventSubPayload, process_twitch_event, process_youtube_alert};

fn get_youtube_client_id() -> String {
    std::env::var("YOUTUBE_CLIENT_ID")
        .unwrap_or_else(|_| "311952405738-1cd4o0irnc5b7maihbm3f68qatns9764.apps.googleusercontent.com".to_string())
}

fn get_youtube_client_secret() -> String {
    std::env::var("YOUTUBE_CLIENT_SECRET")
        .expect("YOUTUBE_CLIENT_SECRET environment variable must be set")
}

const REDIRECT_URI: &str = "http://localhost:3000/callback";

#[derive(Debug, Clone, Deserialize)]
pub struct OAuthCallback {
    pub token: String,
    pub service: String,
    pub error: Option<String>,
    pub refresh_token: Option<String>,
    pub expires_in: Option<i64>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct TokenExchangeRequest {
    pub code: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct RefreshTokenRequest {
    pub refresh_token: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenResponse {
    pub access_token: String,
    pub refresh_token: Option<String>,
    pub expires_in: i64,
    pub token_type: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct ErrorResponse {
    pub error: String,
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
        .route("/auth-exchange", post(handle_auth_exchange))
        .route("/auth-refresh", post(handle_auth_refresh))
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
    let refresh_token = params.get("refresh_token").cloned();
    let expires_in = params.get("expires_in").and_then(|s| s.parse::<i64>().ok());
    
    log::info!("Received auth complete for service: {}", service);
    log::debug!("Token present: {}", token.is_some());
    
    if let Some(token) = token {
        let callback = OAuthCallback {
            token,
            service,
            error: None,
            refresh_token,
            expires_in,
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

async fn handle_auth_exchange(
    State(state): State<Arc<OAuthServerState>>,
    axum::extract::Json(payload): axum::extract::Json<TokenExchangeRequest>,
) -> impl IntoResponse {
    log::info!("Received auth exchange request for YouTube");
    
    let client = reqwest::Client::new();
    let client_id = get_youtube_client_id();
    let client_secret = get_youtube_client_secret();
    
    let params = [
        ("code", payload.code.as_str()),
        ("client_id", &client_id),
        ("client_secret", &client_secret),
        ("redirect_uri", REDIRECT_URI),
        ("grant_type", "authorization_code"),
    ];
    
    let response = match client
        .post("https://oauth2.googleapis.com/token")
        .form(&params)
        .send()
        .await
    {
        Ok(resp) => resp,
        Err(e) => {
            log::error!("Failed to send token exchange request: {}", e);
            return (StatusCode::BAD_GATEWAY, axum::Json(ErrorResponse {
                error: format!("Failed to connect to Google: {}", e),
            })).into_response();
        }
    };
    
    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
        log::error!("Token exchange failed: {}", error_text);
        return (StatusCode::BAD_REQUEST, axum::Json(ErrorResponse {
            error: format!("Token exchange failed: {}", error_text),
        })).into_response();
    }
    
    let token_response: GoogleTokenResponse = match response.json().await {
        Ok(resp) => resp,
        Err(e) => {
            log::error!("Failed to parse token response: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, axum::Json(ErrorResponse {
                error: format!("Failed to parse token response: {}", e),
            })).into_response();
        }
    };
    
    log::info!("Successfully exchanged code for tokens");
    
    let callback = OAuthCallback {
        token: token_response.access_token.clone(),
        service: "youtube".to_string(),
        error: None,
        refresh_token: token_response.refresh_token.clone(),
        expires_in: Some(token_response.expires_in),
    };
    
    if let Err(e) = state.sender.send(callback) {
        log::error!("Failed to send OAuth callback: {}", e);
    }
    
    axum::Json(TokenResponse {
        access_token: token_response.access_token,
        refresh_token: token_response.refresh_token,
        expires_in: token_response.expires_in,
        token_type: token_response.token_type,
    }).into_response()
}

async fn handle_auth_refresh(
    axum::extract::Json(payload): axum::extract::Json<RefreshTokenRequest>,
) -> impl IntoResponse {
    log::info!("Received token refresh request for YouTube");
    
    let client = reqwest::Client::new();
    let client_id = get_youtube_client_id();
    let client_secret = get_youtube_client_secret();
    
    let params = [
        ("refresh_token", payload.refresh_token.as_str()),
        ("client_id", &client_id),
        ("client_secret", &client_secret),
        ("grant_type", "refresh_token"),
    ];
    
    let response = match client
        .post("https://oauth2.googleapis.com/token")
        .form(&params)
        .send()
        .await
    {
        Ok(resp) => resp,
        Err(e) => {
            log::error!("Failed to send token refresh request: {}", e);
            return (StatusCode::BAD_GATEWAY, axum::Json(ErrorResponse {
                error: format!("Failed to connect to Google: {}", e),
            })).into_response();
        }
    };
    
    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
        log::error!("Token refresh failed: {}", error_text);
        return (StatusCode::BAD_REQUEST, axum::Json(ErrorResponse {
            error: format!("Token refresh failed: {}", error_text),
        })).into_response();
    }
    
    let token_response: GoogleTokenResponse = match response.json().await {
        Ok(resp) => resp,
        Err(e) => {
            log::error!("Failed to parse refresh token response: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, axum::Json(ErrorResponse {
                error: format!("Failed to parse token response: {}", e),
            })).into_response();
        }
    };
    
    log::info!("Successfully refreshed access token");
    
    axum::Json(TokenResponse {
        access_token: token_response.access_token,
        refresh_token: token_response.refresh_token,
        expires_in: token_response.expires_in,
        token_type: token_response.token_type,
    }).into_response()
}

#[derive(Debug, Clone, Deserialize)]
struct GoogleTokenResponse {
    access_token: String,
    refresh_token: Option<String>,
    expires_in: i64,
    token_type: String,
}
