# StreamTTS

Text-to-speech application for streamers. Reads Twitch and YouTube chat messages aloud during streams.

[Download Latest](https://github.com/MananJK/StreamTTS/releases) · [Report Bug](https://github.com/MananJK/StreamTTS/issues) · [Request Feature](https://github.com/MananJK/StreamTTS/issues)

## Features

- Twitch and YouTube Live chat integration via OAuth
- Browser-based TTS (free) or ElevenLabs API (premium)
- Cross-platform: Windows, macOS, Linux
- OBS Studio integration via Browser Source
- Lightweight (~5MB idle memory usage)
- Russian voice optimization with `!г` command prefix

## Requirements

| Platform | Minimum Version |
|----------|-----------------|
| Windows | 10 or later |
| macOS | 10.14 (Mojave) or later |
| Linux | Modern distribution |

## Installation

### Download Pre-built Release

Download the latest release for your platform from [GitHub Releases](https://github.com/MananJK/StreamTTS/releases).

### Build from Source

```bash
# Clone repository
git clone https://github.com/MananJK/StreamTTS.git
cd StreamTTS

# Install dependencies
npm install

# Build production executable
npm run tauri:build
```

The built application will be in `src-tauri/target/release/bundle/`.

## Quick Start

1. **Launch StreamTTS** - Run the executable
2. **Login** - Connect your Twitch or YouTube account via OAuth
3. **Connect** - Select your channel or active live stream
4. **Stream** - Messages with `!г` prefix or containing Cyrillic text will be read aloud

### Usage Examples

| Command | Result |
|---------|--------|
| `!г Привет!` | Read "Привет!" aloud |
| `Привет, как дела?` | Read aloud (contains Cyrillic) |
| `Hello everyone!` | Not read (no `!г` prefix, no Cyrillic) |

## OBS Integration

Add StreamTTS audio to your OBS stream:

1. Open OBS Studio → Sources → Click **+**
2. Select **Browser Source**
3. Set URL to `http://localhost:8080`
4. Set Width: `100`, Height: `50`
5. Check **"Control audio via OBS"**
6. Click OK

StreamTTS will now appear in your OBS Audio Mixer.

For detailed setup including alternative methods and troubleshooting, see [OBS_INTEGRATION_GUIDE.md](OBS_INTEGRATION_GUIDE.md).

## Development

### Prerequisites

- Node.js 18 or later
- Rust 1.77 or later
- Platform-specific build tools:
  - **Windows**: Microsoft Visual Studio C++ Build Tools
  - **macOS**: Xcode Command Line Tools (`xcode-select --install`)
  - **Linux**: `build-essential`, `libwebkit2gtk-4.1-dev`, etc.

### Setup

```bash
# Clone repository
git clone https://github.com/MananJK/StreamTTS.git
cd StreamTTS

# Install dependencies
npm install

# Start development server
npm run tauri:dev
```

### OAuth Configuration

For development, register your own OAuth applications:

**Twitch:**
1. Go to [Twitch Developer Console](https://dev.twitch.tv/console)
2. Create a new application
3. Set OAuth Redirect URL: `http://localhost:3000/callback`
4. Update `TWITCH_CLIENT_ID` in `src/components/TwitchOAuthButton.tsx`

**YouTube:**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create OAuth 2.0 Client ID
3. Set Authorized redirect URI: `http://localhost:3000/callback`
4. Add required scopes: `youtube.readonly`, `youtube`, `youtube.force-ssl`
5. Update `YOUTUBE_CLIENT_ID` in `src/components/YouTubeOAuthButton.tsx`

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite development server |
| `npm run build` | Build frontend for production |
| `npm run tauri:dev` | Start Tauri in development mode |
| `npm run tauri:build` | Build production executable |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview production build |

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   StreamTTS                          │
├─────────────────────────────────────────────────────┤
│  Frontend (React + TypeScript + Tailwind CSS)       │
│    ├── Pages: Login, Index, NotFound                │
│    ├── Components: Chat, Connections, Settings      │
│    └── Services: twitchService, youtubeService, tts │
├─────────────────────────────────────────────────────┤
│  Backend (Rust + Tauri v2 + Axum)                   │
│    ├── OAuth server (localhost:3000)                │
│    ├── Event emission to frontend                   │
│    └── Alert processing (Twitch EventSub, YouTube)  │
├─────────────────────────────────────────────────────┤
│  External Services                                   │
│    ├── Twitch IRC via tmi.js                        │
│    ├── YouTube Data API v3 (polling)                │
│    └── TTS: Web Speech API / ElevenLabs             │
└─────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Tailwind CSS |
| Desktop Framework | Tauri v2 |
| Backend | Rust, Axum |
| Twitch Chat | tmi.js |
| YouTube Chat | YouTube Data API v3 |
| Text-to-Speech | Web Speech API, ElevenLabs API |
| State Management | React Query, React State |

## Project Structure

```
StreamTTS/
├── src/                        # React frontend
│   ├── components/             # UI components
│   │   ├── ui/                 # shadcn/ui components
│   │   ├── ChatConnections.tsx # Connection management
│   │   ├── MessageHistory.tsx  # Chat message display
│   │   └── ...
│   ├── pages/                  # Route pages
│   │   ├── Index.tsx           # Main application
│   │   ├── Login.tsx           # OAuth login
│   │   └── NotFound.tsx        # 404 page
│   ├── services/               # API services
│   │   ├── twitchService.ts    # Twitch integration
│   │   ├── youtubeService.ts   # YouTube integration
│   │   └── ttsService.ts       # Text-to-speech
│   ├── lib/                    # Utilities
│   ├── hooks/                  # React hooks
│   └── types/                  # TypeScript types
├── src-tauri/                  # Rust backend
│   ├── src/
│   │   ├── main.rs             # Entry point
│   │   ├── lib.rs              # App initialization
│   │   ├── oauth.rs            # OAuth server
│   │   └── alerts.rs           # Alert handling
│   ├── tauri.conf.json         # Tauri configuration
│   └── Cargo.toml              # Rust dependencies
├── package.json
└── README.md
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## Privacy

See [PRIVACY.md](PRIVACY.md) for details on data handling.

- All OAuth tokens stored locally
- No analytics or tracking
- No data transmitted to external servers

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [Tauri](https://tauri.app/) - smaller, faster Electron alternative
- Twitch integration via [tmi.js](https://tmijs.com/)
- YouTube integration via [YouTube Data API v3](https://developers.google.com/youtube/v3)
