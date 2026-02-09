# StreamTTS Privacy Policy

**Last Updated:** February 2026

## Overview

StreamTTS is a free, open-source desktop application that reads chat messages from Twitch and YouTube during live streams using text-to-speech. This privacy policy explains how the app handles your data.

## Information We Collect

### OAuth Tokens
When you connect your Twitch or YouTube account, StreamTTS receives and stores an OAuth access token. This token is stored **locally on your device** and is never transmitted to any external servers.

### Chat Messages
StreamTTS reads chat messages from your connected Twitch and YouTube channels in real-time to convert them to speech. These messages are:
- Processed entirely on your local device
- **NOT stored** after being read
- **NOT transmitted** to any external servers

## Permissions We Request

### Twitch
- `chat:read` - Read chat messages from your channel
- `chat:edit` - Send messages to chat (for optional bot responses)

### YouTube
- `https://www.googleapis.com/auth/youtube.readonly` - Read live chat messages
- `https://www.googleapis.com/auth/youtube` - Access YouTube live chat functionality

## Data Storage

All data is stored locally on your device:
- OAuth tokens are stored in your operating system's secure credential storage
- App settings are stored in your user profile directory
- No data is uploaded to external servers

## Third-Party Services

StreamTTS communicates directly with:
- **Twitch API** - To read chat messages
- **YouTube Data API** - To read live chat messages
- **Text-to-Speech Engine** - Your system's built-in TTS or configured voice service

We do not use any analytics, tracking, or advertising services.

## Data Sharing

We do **NOT**:
- Sell your data
- Share your data with third parties
- Store your data on external servers
- Track your usage

## Account Disconnection

You can disconnect your accounts at any time from the Connections tab in the app. This will revoke the OAuth tokens and remove all stored credentials.

You can also revoke access directly from:
- [Twitch Connections Settings](https://www.twitch.tv/settings/connections)
- [Google Account Permissions](https://myaccount.google.com/permissions)

## Open Source

StreamTTS is open source. You can review the complete source code at:
https://github.com/YOUR_USERNAME/echo-TTS

## Changes to This Policy

We may update this privacy policy from time to time. Changes will be posted in this file with an updated date.

## Contact

For questions about this privacy policy, please open an issue on the GitHub repository.

---

## Summary

- Your data stays on your device
- We only request permissions needed to read chat
- No analytics, no tracking, no external servers
- Open source and auditable
