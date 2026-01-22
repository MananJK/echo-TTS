use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::{Html, IntoResponse},
    routing::get,
    Router,
};
use serde::Deserialize;
use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::net::TcpListener;
use tokio::sync::broadcast;

#[derive(Debug, Clone, Deserialize)]
pub struct OAuthCallback {
    pub token: String,
    pub service: String,
    pub error: Option<String>,
}

#[derive(Clone)]
struct OAuthServerState {
    sender: broadcast::Sender<OAuthCallback>,
}

pub async fn start_oauth_server(sender: broadcast::Sender<OAuthCallback>) -> anyhow::Result<()> {
    let state = Arc::new(OAuthServerState { sender });
    let app = Router::new()
        .route("/callback", get(handle_callback))
        .route("/auth-complete", get(handle_auth_complete))
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