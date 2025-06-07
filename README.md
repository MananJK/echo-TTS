# 🎮 RusEcho - Russian TTS for Streamers

> A TTS application for streamers to read out Russian chat messages aloud to yourself and the stream! Supports Twitch and YouTube with optimized performance.

A desktop application that converts and plays Russian text from chat messages using text-to-speech technology. This app can connect to Twitch and YouTube chats to read messages in Russian.

## ⚡ Performance Optimized

- **Lightning Fast Startup:** 5-15 seconds (75-90% improvement)
- **Portable:** No installation required
- **Optimized:** Advanced compression and performance tuning
- **Ready for Distribution:** Production-ready builds available

## 🚀 Quick Start

### Download & Run (Recommended)
1. Download `RusEcho-1.0.0-portable.exe` (84MB)
2. Double-click to run (no installation needed)
3. If Windows shows security warning: "More info" → "Run anyway"
4. Connect to Twitch/YouTube and start streaming!

## How to Install the Desktop App

### Windows
1. Download the latest `.exe` installer from the releases page
2. Run the installer and follow the prompts
3. The app will install automatically and create desktop and start menu shortcuts
4. Launch the app by clicking on the shortcut

### macOS
1. Download the latest `.dmg` file from the releases page
2. Open the DMG file
3. Drag the app to your Applications folder
4. Launch the app from your Applications folder or Launchpad

### Linux
1. Download the latest `.AppImage` or `.deb` file from the releases page
2. For AppImage: Make the file executable (`chmod +x filename.AppImage`) and run it
3. For .deb: Install using `sudo dpkg -i filename.deb` or your package manager

## Features

- **Russian Text-to-Speech:** High-quality voice synthesis
- **Twitch & YouTube Integration:** Connect to both platforms
- **Performance Optimized:** 5-15 second startup time
- **Portable:** No installation required
- **Lightweight:** Optimized for streaming setups
- **Separate Logout Options:** Individual platform controls
- **Connection Status Display:** Real-time connection indicators

## PWA Version

The app is also available as a Progressive Web App:

### Desktop (Windows, Mac, Linux)

1. Open the app in Chrome or Edge browser: [https://your-app-url.com](https://your-app-url.com)
2. Look for the install icon (➕) in the address bar or the three-dot menu
3. Click "Install" or "Install app" when prompted
4. The app will install on your device and can be launched from your desktop

### Android

1. Open the app in Chrome: [https://your-app-url.com](https://your-app-url.com)
2. Tap the three-dot menu in the top right
3. Select "Add to Home screen" or "Install app"
4. Follow the prompts to complete installation
5. The app will appear on your home screen

### iOS (iPhone/iPad)

1. Open the app in Safari: [https://your-app-url.com](https://your-app-url.com)
2. Tap the share button (square with an arrow) at the bottom of the screen
3. Scroll down and tap "Add to Home Screen"
4. Tap "Add" in the top right corner
5. The app will appear on your home screen


## How can I edit this code?

There are several ways of editing your application.


Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.


## Building the Desktop App

To build the desktop app yourself:

1. Clone the repository
2. Run `npm install`
3. Run `npm run electron:build`
4. The packaged applications will be available in the `electron-dist` folder


---

## 🎯 Distribution Files

- **RusEcho-1.0.0-portable.exe** (84MB) - Latest optimized build
- **RusEcho-Portable.exe** (377MB) - Full compatibility version

Both are portable - just download and run! 🚀
