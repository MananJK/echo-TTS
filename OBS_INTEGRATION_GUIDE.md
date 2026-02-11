# StreamTTS - OBS Studio Integration Guide

Complete guide to integrate StreamTTS with OBS Studio for your streaming setup.

## 📋 Table of Contents

- [Quick Start (2 minutes)](#-quick-start-2-minutes)
- [Integration Methods](#-integration-methods)
- [Method 1: Browser Source (Recommended)](#-method-1-browser-source-recommended)
- [Method 2: Desktop Audio Capture](#-method-2-desktop-audio-capture)
- [Method 3: Virtual Audio Cable (Advanced)](#-method-3-virtual-audio-cable-advanced)
- [Audio Routing Best Practices](#-audio-routing-best-practices)
- [Troubleshooting](#-troubleshooting)
- [Platform-Specific Notes](#-platform-specific-notes)

---

## 🚀 Quick Start (2 minutes)

**For most users - Recommended Method 1:**

1. **Start StreamTTS** - Connect to Twitch/YouTube and ensure audio works
2. **Open OBS Studio** - Go to Sources panel
3. **Add Browser Source** - Click `+` → Select "Browser Source"
4. **Configure** - Name it "StreamTTS", set URL to `http://localhost:8080`, check "Control audio via OBS"
5. **Done!** StreamTTS audio now appears in OBS Audio Mixer

---

## 🔌 Integration Methods

| Method | Difficulty | Audio Quality | CPU Usage | Best For |
|--------|------------|----------------|-------------|-----------|
| **Browser Source** | ⭐ Easy | Good | Low | Most users, simple setup |
| **Desktop Audio Capture** | ⭐ Easy | Variable | Medium | Quick setup, captures all audio |
| **Virtual Audio Cable** | ⭐⭐⭐ Advanced | Best | Low | Professional setups, audio routing |

---

## Method 1: Browser Source (Recommended)

**Best for:** Most users, clean audio isolation, simple setup

### Step-by-Step Setup

#### 1. Add Browser Source
1. Open OBS Studio
2. Go to **Sources** panel (bottom of main window)
3. Click the **`+`** button
4. Select **Browser Source** from the menu
5. Enter a name: `StreamTTS Audio`
6. Click **OK**

#### 2. Configure Browser Source
1. **URL:** `http://localhost:8080`
   - This is where StreamTTS runs when using the Tauri desktop app
   - For the web development version, use: `http://localhost:5173` (or whatever Vite port is configured)
   - If you're using the built executable, the default is `http://localhost:8080`
2. **Width:** `100` (small, only needed for audio capture)
3. **Height:** `50` (tiny, just for audio capture)
4. **FPS:** `30` (default setting, not critical for audio-only usage)
5. **⚠️ CRITICAL:** Check the **"Control audio via OBS"** checkbox
   - **This is the most important setting!**
   - It routes audio through OBS instead of your system speakers
6. Click **OK**

#### 3. Verify Audio in OBS
1. Look at the **Audio Mixer** panel in OBS (usually on the right side)
2. You should see a new source: **"StreamTTS Audio"**
3. Click the speaker icon next to it
4. You should see a volume slider and audio level meter
5. Send a test message in StreamTTS or have someone type in your chat
6. You should see audio levels moving in the OBS mixer

#### 4. Adjust Volume
1. In the OBS Audio Mixer, locate the **"StreamTTS Audio"** slider
2. Adjust to an appropriate level (typically 60-80% is a good starting point)
3. You can also adjust volume from within the StreamTTS application itself
4. Both volume controls work together

#### 5. Optional: Hide Visual Source
Since the Browser Source displays a small browser window, you may want to hide it visually:

1. Right-click on **"StreamTTS Audio"** in the Sources panel
2. Select **Transform** → **Edit Transform...**
3. Set **Position X:** `1920` (or another off-screen position)
4. Set **Position Y:** `1080` (or another off-screen position)
5. Click **OK** to apply
6. This keeps the audio working but hides the browser window

**Alternative hiding method:**
1. Right-click **"StreamTTS Audio"** in Sources panel
2. Uncheck **Visible** from the context menu
3. Audio will continue playing but won't be visible

---

## Method 2: Desktop Audio Capture

**Best for:** Quick setup, users comfortable with system audio routing

### Step-by-Step Setup

#### Option A: Audio Output Capture (StreamTTS Only)
This method captures only StreamTTS audio:

1. Click `+` in the OBS Sources panel
2. Select **Audio Output Capture**
3. Name it: `StreamTTS Audio`
4. **Device:** Select your StreamTTS application from the dropdown
5. Click **OK**

#### Option B: Desktop Audio (All System Audio)
This method captures all audio from your system:

1. Click `+` in the OBS Sources panel
2. Select **Audio Output Capture**
3. Name it: `Desktop Audio`
4. **Device:** Select your default audio output device
5. Click **OK**

### Important Notes

⚠️ **Desktop Audio Capture captures ALL audio from your system** (Option B)
- Use **Option A** (Audio Output Capture) to capture only StreamTTS
- You may need to adjust your Windows/macOS audio settings to prevent StreamTTS from playing through your speakers
- You might need to mute StreamTTS in your system volume mixer
- This ensures only OBS hears the audio, not your viewers

### Windows Setup for Audio Routing
1. Open the **Volume Mixer** (right-click speaker icon → "Open Volume Mixer")
2. Find the **StreamTTS** application in the list
3. Mute it to prevent audio from playing through your speakers
4. OBS will still capture the audio via Audio Output Capture

### macOS Setup for Audio Routing
1. Open **Audio MIDI Setup** (Applications → Utilities → Audio MIDI Setup)
2. Create a new **Multi-Output Device** if needed
3. Set StreamTTS to use a specific output device
4. Configure OBS to capture that specific output device

---

## Method 3: Virtual Audio Cable (Advanced)

**Best for:** Professional setups, complete audio isolation, multiple audio sources

### Prerequisites
You'll need to install a virtual audio cable:

- **Windows:** Install **VB-Cable** (Virtual Audio Cable)
- **macOS:** Install **BlackHole** or **Loopback**

Download links:
- Windows VB-Cable: https://vb-audio.com/Cable/
- macOS BlackHole: https://github.com/existentialaudio/BlackHole

**Important:** Restart your computer after installing virtual audio drivers!

### Step-by-Step Setup

#### 1. Install Virtual Audio Cable
- **Windows:**
  1. Download VB-Cable driver installer
  2. Run installer with Administrator privileges
  3. Restart your computer after installation
  4. Verify installation: Open Sound settings, you should see "CABLE Input" and "CABLE Output"

- **macOS:**
  1. Download BlackHole or Loopback
  2. Install the package
  3. Restart your computer
  4. Verify installation: Open Sound settings, look for "BlackHole 2ch"

#### 2. Configure StreamTTS Audio Output
You need to route StreamTTS audio to the virtual cable instead of your speakers:

- **Windows:**
  1. Right-click on the speaker icon in your system tray
  2. Select "Sound Settings" or "Playback devices"
  3. Find the StreamTTS application in the App volume and device preferences
  4. Set the output device to **"CABLE Output"**
  5. Apply the settings

- **macOS:**
  1. Open **System Settings** → Sound
  2. Look for StreamTTS in the applications list
  3. Set the output to **"BlackHole 2ch"** (or "Loopback")
  4. This routes audio through the virtual cable

#### 3. Configure OBS to Capture Virtual Cable
1. Open OBS Studio
2. Click the `+` in the Sources panel
3. Select **Audio Output Capture**
4. Name it: `StreamTTS Virtual Audio`
5. **Device:** Select the virtual cable input
   - **Windows:** Select **"CABLE Input"**
   - **macOS:** Select **"BlackHole 2ch"** or **"Loopback"**
6. Click **OK**

#### 4. Verify Your Setup
1. Send a test message in StreamTTS
2. Check that audio doesn't play through your speakers (routed to virtual cable)
3. Verify that OBS Audio Mixer shows audio levels moving
4. Adjust the volume as needed

### Advanced Routing with Multiple Cables
For professional setups with multiple audio sources, you can use multiple virtual cables:

1. **StreamTTS → Cable Output A**
2. **Game Audio → Cable Output B**
3. **Music → Cable Output C**
4. **OBS Captures:** Cable Input A, B, and C separately
5. You can then mix the audio levels independently in OBS

This gives you complete control over your audio mix!

---

## 🔊 Audio Routing Best Practices

### Recommended Configuration (Simple)

```
StreamTTS App → [Browser Source] → OBS → [Your Stream Mix]
```

### Recommended Configuration (Advanced)

```
StreamTTS App → [Virtual Cable A] → OBS Audio Input A
Game Audio → [Virtual Cable B] → OBS Audio Input B
Music → [Virtual Cable C] → OBS Audio Input C
                                   ↓
                              [OBS Audio Mixer]
                                   ↓
                              [Your Stream Mix]
```

### Volume Guidelines

| Source | Recommended Level | Notes |
|---------|-------------------|--------|
| StreamTTS | 60-80% | Avoid clipping, ensure intelligibility |
| Game Audio | 40-60% | Don't overpower TTS voice |
| Music | 20-40% | Keep as background, not distracting |
| Microphone | 70-100% | Your voice should be the clearest element |

### Avoid Common Issues

1. **Audio Desync**
   - Ensure OBS and StreamTTS are on the same computer
   - Use the Browser Source method for the lowest latency
   - Avoid using multiple audio capture sources that might cause conflicts

2. **Echo/Feedback Loops**
   - Don't capture Desktop Audio if you're already using Browser Source
   - Mute StreamTTS in system audio when using Virtual Cable method
   - Check for echo filters in OBS and remove them if not needed

3. **Poor Audio Quality**
   - Use the Browser Source method for cleaner audio
   - Adjust your System TTS voice settings in StreamTTS
   - Use a high-quality Russian voice (e.g., Microsoft Pavel on Windows)
   - Check for audio enhancements in your OS that might be degrading quality

4. **CPU Overload**
   - Browser Source is generally light on CPU resources
   - Desktop Audio Capture is moderate CPU usage
   - Virtual Cable is light, but requires proper setup
   - If you experience CPU issues, try the Browser Source method

---

## 🔧 Troubleshooting

### Problem: No audio in OBS

#### Step 1: Verify StreamTTS is Running
1. Check that the StreamTTS application is actually open and running
2. Test audio by clicking "Test TTS" or typing a message in the StreamTTS chat
3. Ensure you can hear it through your system speakers (if not using virtual cable)

#### Step 2: Check Browser Source URL
1. Right-click on **"StreamTTS Audio"** source in OBS
2. Select **Properties** from the context menu
3. Verify that the URL is correct:
   - **Tauri Desktop App:** `http://localhost:8080`
   - **Web Dev Server:** `http://localhost:5173` (or your Vite port)
   - **Built Executable:** `http://localhost:8080` (default)
4. Click **OK** to save the settings

#### Step 3: Verify "Control audio via OBS" is Checked
1. Right-click on the source in OBS and select **Properties**
2. Ensure that **"Control audio via OBS"** is checked
3. **This is critical** for audio to route through OBS instead of playing through speakers

#### Step 4: Check OBS Audio Mixer
1. Look at the Audio Mixer panel in OBS
2. Verify that the **"StreamTTS Audio"** source actually appears in the list
3. Click the speaker icon next to it to unmute if it's muted
4. Ensure the volume slider isn't set to 0%

### Problem: Audio plays through speakers, not OBS

#### Solution: Audio Routing Issues
1. **If using Browser Source method:**
   - Right-click on the source → **Properties**
   - Ensure that **"Control audio via OBS"** is checked
   - This prevents audio from playing through your system speakers

2. **If using Audio Output Capture method:**
   - Open the Volume Mixer (Windows) or Sound settings (macOS)
   - Find the StreamTTS application
   - Mute it to prevent audio from playing through speakers
   - OBS will still be able to capture the audio

3. **If using Virtual Cable method:**
   - Verify that StreamTTS output is set to the Cable Output device
   - Verify that OBS is capturing from the Cable Input device
   - Don't use Browser Source "Control audio via OBS" with this method

### Problem: Audio is too quiet or too loud

#### Solution: Adjust Volumes
1. Adjust volume in the StreamTTS app (Settings tab → Volume slider)
2. Adjust volume in the OBS Audio Mixer (StreamTTS Audio slider)
3. Find the right balance for your setup (start with 60-80% in both)

### Problem: Echo or feedback loop

#### Solution: Isolate Audio Sources
1. **If capturing Desktop Audio:**
   - Switch to Audio Output Capture (StreamTTS only) instead
   - Or use the Browser Source method instead

2. **If using multiple audio sources:**
   - Check for overlapping or redundant audio capture sources
   - Remove any unnecessary audio capture sources

3. **If using speakers for monitoring:**
   - Use OBS monitoring to a separate device instead of speakers
   - Don't route OBS audio back into OBS

### Problem: OBS shows black screen for Browser Source

#### Solution: Expected Behavior
1. **This is normal and expected!** The browser source is tiny (100x50 pixels)
2. It's positioned off-screen or minimized intentionally to hide it
3. Only the audio matters, not the video display
4. You can hide it completely via Transform → Edit Transform

---

## 💻 Platform-Specific Notes

### Windows

#### Recommended Setup: Browser Source
- **Why:** Cleanest audio, no extra drivers needed
- **Best Voice:** Microsoft Pavel (built into Windows 10/11)
- **Performance:** Excellent, low CPU usage

#### Troubleshooting Windows

**Issue: StreamTTS not appearing in Volume Mixer**
- Play a test message in StreamTTS
- The application will appear in the Volume Mixer after the first audio output

**Issue: Audio quality problems**
- Update your Windows audio drivers
- Set StreamTTS voice to "Microsoft Pavel" in the Settings tab
- Disable any audio enhancements in Windows Sound settings

**Issue: OBS audio problems**
- Run OBS as Administrator
- Check Windows audio privacy settings
- Ensure "Allow desktop apps to access your microphone" is enabled (even though we're not using mic)
- Check that StreamTTS is not blocked by Windows Firewall

### macOS

#### Recommended Setup: Browser Source
- **Why:** Best integration with macOS audio system
- **Best Voice:** System Russian voices (Siri voices)
- **Performance:** Good, slightly higher CPU than Windows

#### Troubleshooting macOS

**Issue: Audio capture problems**
- Grant OBS microphone/audio permissions in System Settings
- Check macOS security settings for OBS access
- You may need to restart OBS after granting permissions

**Issue: StreamTTS audio problems**
- Ensure StreamTTS has audio/microphone access in System Settings
- Note that StreamTTS doesn't have separate output device selection (uses system default)
- Use Audio MIDI Setup to configure audio routing

**Issue: Browser Source shows black screen**
- This is normal, see "OBS shows black screen" above

### Linux

#### Recommended Setup: Virtual Audio Cable
- **Why:** Best audio routing on Linux
- **Best Voice:** espeak-ng Russian voices
- **Performance:** Excellent, similar to Windows

#### Troubleshooting Linux

**Issue: Install dependencies**
```bash
# Ubuntu/Debian
sudo apt install obs-studio pulseaudio

# Arch
sudo pacman -S obs-studio pipewire

# Fedora
sudo dnf install obs-studio pipewire
```

**Issue: Setup audio routing**
- Use PulseAudio Volume Control (pavucontrol)
- Create a virtual sink for StreamTTS output
- Configure OBS to capture the virtual sink

**Issue: Audio quality**
- Install espeak-ng with Russian voices
- Configure espeak-ng voice settings for better quality
- Test the setup before going live

---

## 🎯 Best Practices Summary

### For Beginners
✅ Use **Method 1: Browser Source** (simplest setup)
✅ Set StreamTTS volume to 60-80%
✅ Keep StreamTTS running while streaming
✅ Test with a friend before going live
✅ Use Microsoft Pavel (Windows) or system Russian voices
✅ Check "Control audio via OBS" is enabled

### For Advanced Users
✅ Use **Method 3: Virtual Audio Cable** for professional routing
✅ Set up separate audio sources for game, music, and TTS
✅ Use OBS monitoring for audio feedback
✅ Configure filters for noise reduction and audio cleanup
✅ Use multiple virtual cables for complete audio control

### For Everyone
✅ Restart OBS after making major configuration changes
✅ Update StreamTTS regularly for bug fixes and improvements
✅ Keep your audio drivers up to date
✅ Test your setup before every stream
✅ Have a backup configuration ready

---

## 📚 Additional Resources

### Official Documentation
- **[StreamTTS README](README.md)** - Main application documentation
- **[OBS Studio Documentation](https://obsproject.com/wiki)** - Official OBS guide
- **[Tauri Documentation](https://tauri.app/)** - Desktop app framework documentation

### Community Support
- **[GitHub Issues](https://github.com/MananJK/StreamTTS/issues)** - Report bugs
- **[GitHub Discussions](https://github.com/MananJK/StreamTTS/discussions)** - Ask questions
- **[Discord](#)** - Community support (if available)

---

## ❓ FAQ

### Can I use StreamTTS without OBS?
Yes! StreamTTS is a standalone application that works independently. It just plays audio through your system speakers. OBS is only needed if you want to include the TTS audio in your stream.

### Will StreamTTS audio delay my stream?
The Browser Source method has minimal delay (usually less than 50ms). Desktop Audio Capture might have slightly additional latency depending on your system.

### Can I use StreamTTS with other streaming software?
Yes! StreamTTS works with Streamlabs OBS, vMix, XSplit, and any other streaming software that can capture browser audio or desktop audio.

### Does StreamTTS capture my microphone?
No! StreamTTS only plays audio (text-to-speech). It doesn't capture any audio or video from your system.

### Can I have multiple StreamTTS instances running?
Not recommended, but technically possible. Each instance would need different browser sources and possibly different ports if running locally.

### What if StreamTTS updates while I'm streaming?
StreamTTS will restart automatically after updates. The OBS Browser Source should reconnect automatically. If it doesn't, right-click on the source and select "Refresh".

### How do I make Russian messages sound better?
1. Go to Settings in StreamTTS
2. Select "Browser TTS" provider
3. Choose a high-quality Russian voice:
   - Windows: "Microsoft Pavel" is the best
   - macOS: Any system voice with Russian language
4. Test with: `!г Привет, как дела?`

---

## 🎉 You're Ready!

**Final Checklist:**
- [ ] StreamTTS is installed and connected to Twitch/YouTube
- [ ] OBS is running with Browser Source added
- [ ] "Control audio via OBS" is checked
- [ ] StreamTTS audio appears in the OBS Audio Mixer
- [ ] Volume is adjusted (60-80%)
- [ ] You've tested with a message
- [ ] Audio quality is verified
- [ ] You're ready to go live!

**Estimated Setup Time:** 2-5 minutes (depending on method chosen)

---

## 📋 Summary

This guide covered three main methods for integrating StreamTTS with OBS Studio:

1. **Browser Source** - Recommended for most users
2. **Desktop Audio Capture** - Quick alternative setup
3. **Virtual Audio Cable** - Professional audio routing

Choose the method that best fits your needs and technical comfort level!

---

**Happy Streaming!** 🚀🎤

*StreamTTS uses your operating system's built-in text-to-speech capabilities. No external APIs, no costs, no limits.*
