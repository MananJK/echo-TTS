// This file serves as the entry point for the Electron app
const { app } = require('electron');

// Advanced performance optimizations for faster startup
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors,VizDisplayCompositor');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=256 --optimize-for-size');
app.commandLine.appendSwitch('force-cpu-draw');
app.commandLine.appendSwitch('disable-gpu-vsync');

// Lower process priority during startup to improve perceived speed
try {
  process.setProcessPriority && process.setProcessPriority('normal');
} catch (e) { /* Ignore if not supported */ }

// Preload critical modules to reduce startup time
process.nextTick(() => {
  // Cache frequently used modules
  require('path');
  require('url');
  require('fs');
});

// Load main process script immediately to reduce startup time
require('./electron/main');