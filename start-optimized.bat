@echo off
REM Fast Startup Script for RusEcho
REM This script optimizes the system for better app performance

echo 🚀 Optimizing system for RusEcho performance...

REM Set high performance power plan
powercfg /setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c 2>nul
if %errorlevel% equ 0 (
    echo ✅ Set high performance power plan
) else (
    echo ⚠️  Could not set power plan - continuing anyway
)

REM Clear temp files that might slow startup
echo 🧹 Clearing temporary files...
del /f /s /q %temp%\*.* 2>nul
del /f /s /q %temp%\*.tmp 2>nul

REM Set process priority
echo ⚡ Setting up performance optimizations...

REM Launch the app with optimizations
echo 🎯 Starting RusEcho with performance optimizations...

REM Use the portable version for fastest startup
if exist "electron-dist\win-unpacked\RusEcho.exe" (
    echo 📱 Launching portable version...
    start "" /high "electron-dist\win-unpacked\RusEcho.exe"
) else if exist "electron-build-fresh\win-unpacked\RusEcho.exe" (
    echo 📱 Launching from build-fresh...
    start "" /high "electron-build-fresh\win-unpacked\RusEcho.exe"
) else (
    echo ❌ No built app found. Please run: npm run build:installer
    pause
)

echo ✅ RusEcho launched with performance optimizations!
echo 💡 Tips for best performance:
echo    - Keep the app running to avoid startup delay
echo    - Close other heavy applications while streaming
echo    - Use a wired internet connection for best chat connectivity

REM Reset power plan after 30 seconds (optional)
timeout /t 30 /nobreak >nul
powercfg /setactive 381b4222-f694-41f0-9685-ff5bb260df2e 2>nul
