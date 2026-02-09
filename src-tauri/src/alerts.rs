use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlertPayload {
    pub platform: String,
    pub alert_type: String,
    pub user_name: String,
    pub message: String,
    pub amount: Option<String>,
    pub currency: Option<String>,
    pub count: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TwitchEventSubPayload {
    pub subscription: TwitchSubscription,
    pub event: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TwitchSubscription {
    pub id: String,
    pub status: String,
    pub r#type: String,
    pub version: String,
    pub condition: serde_json::Value,
}

pub fn process_twitch_event(payload: TwitchEventSubPayload) -> Option<AlertPayload> {
    let event = &payload.event;
    let r#type = &payload.subscription.r#type;

    match r#type.as_str() {
        "channel.subscribe" => {
            let user_name = event["user_name"].as_str()?.to_string();
            Some(AlertPayload {
                platform: "twitch".to_string(),
                alert_type: "sub".to_string(),
                user_name: user_name.clone(),
                message: format!("{} just subscribed!", user_name),
                amount: None,
                currency: None,
                count: None,
            })
        }
        "channel.subscription.gift" => {
            let user_name = event["user_name"].as_str()?.to_string();
            let total = event["total"].as_u64()? as u32;
            Some(AlertPayload {
                platform: "twitch".to_string(),
                alert_type: "gift".to_string(),
                user_name: user_name.clone(),
                message: format!("{} gifted {} subscriptions!", user_name, total),
                amount: None,
                currency: None,
                count: Some(total),
            })
        }
        "channel.channel_points_custom_reward_redemption.add" => {
            let user_name = event["user_name"].as_str()?.to_string();
            let reward_title = event["reward"]["title"].as_str()?.to_string();
            Some(AlertPayload {
                platform: "twitch".to_string(),
                alert_type: "redemption".to_string(),
                user_name: user_name.clone(),
                message: format!("{} redeemed {}!", user_name, reward_title),
                amount: None,
                currency: None,
                count: None,
            })
        }
        _ => None,
    }
}

pub fn process_youtube_alert(xml_content: &str) -> Option<AlertPayload> {
    // Simple XML parsing for YouTube Atom feed
    // In a real scenario, we'd use a proper XML parser
    if xml_content.contains("<yt:videoId>") {
        // This is likely a video upload notification
        // We could extract details here
        return Some(AlertPayload {
            platform: "youtube".to_string(),
            alert_type: "live".to_string(),
            user_name: "Channel".to_string(),
            message: "A new stream or video is live!".to_string(),
            amount: None,
            currency: None,
            count: None,
        });
    }
    None
}
