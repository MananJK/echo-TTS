// Preload script for Electron
const { contextBridge, ipcRenderer } = require('electron');

// Expose specific IPC APIs to the renderer process
contextBridge.exposeInMainWorld('electron', {
  // Send messages from renderer to main
  openExternalAuth: (url, redirectUrl) => {
    console.log(`Preload: Requesting auth for URL: ${url}`);
    console.log(`Preload: Redirect URL: ${redirectUrl}`);
    return ipcRenderer.send('auth-request', { url, redirectUrl });
  },
  
  // Listen for callbacks from main process
  onAuthCallback: (callback) => {
    ipcRenderer.on('auth-callback', (_event, data) => {
      console.log('Preload: Auth callback received for:', data.type);
      console.log('Preload: Token present:', !!data.token);
      
      // Also trigger a global message event for components listening directly
      window.postMessage(data, '*');
      
      // Call the callback function passed from the renderer
      callback(data);
    });
  }
});

window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector);
    if (element) element.innerText = text;
  };

  for (const type of ['chrome', 'node', 'electron']) {
    replaceText(`${type}-version`, process.versions[type]);
  }
});
