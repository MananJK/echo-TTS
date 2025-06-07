const { app, BrowserWindow, Menu, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const url = require('url');
const { URL } = require('url');
const http = require('http');

// Load performance optimizer
const performanceOptimizer = require('./performance-optimizer');

// ==============================
// PERFORMANCE OPTIMIZATIONS
// ==============================

// Set app user model ID for Windows
app.setAppUserModelId('com.nerve.rusecho');

// Critical performance flags for faster startup
app.commandLine.appendSwitch('disable-web-security');
app.commandLine.appendSwitch('disable-features', 'VizDisplayCompositor');
app.commandLine.appendSwitch('enable-lazy-image-loading');
app.commandLine.appendSwitch('enable-aggressive-domstorage-flushing');

// Memory and performance optimizations
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=512 --expose-gc');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');

// GPU optimizations
app.commandLine.appendSwitch('disable-gpu-vsync');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');

// Network optimizations
app.commandLine.appendSwitch('disable-http-cache');
app.commandLine.appendSwitch('aggressive-cache-discard');

// Disable unnecessary features for performance
app.commandLine.appendSwitch('disable-component-extensions-with-background-pages');
app.commandLine.appendSwitch('disable-default-apps');
app.commandLine.appendSwitch('disable-background-networking');

// Process priority optimization
if (process.platform === 'win32') {
  try {
    const { spawn } = require('child_process');
    // Set high priority for faster startup
    spawn('wmic', ['process', 'where', `processid=${process.pid}`, 'CALL', 'setpriority', '128'], { 
      stdio: 'ignore',
      detached: true 
    }).unref();
  } catch (e) {
    console.log('Could not set process priority:', e.message);
  }
}

// ==============================
// EXISTING CODE CONTINUES
// ==============================

// Keep a global reference of the window object
let mainWindow;
let authServer = null;
let AUTH_SERVER_PORT = 3000;

// Create the auth server to handle OAuth redirects
function createAuthServer() {
  if (authServer) return; // Server already exists
  
  authServer = http.createServer((req, res) => {
    console.log('Auth server received request:', req.url);
    
    // Send a simple HTML page that will extract the token and close itself
    const processingHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authorization Processing</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background-color: #f5f5f5; }
          .processing { color: #ff9900; font-size: 20px; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .spinner { display: inline-block; width: 40px; height: 40px; border: 4px solid rgba(0,0,0,.1); border-radius: 50%; border-top-color: #09f; animation: spin 1s ease-in-out infinite; }
          @keyframes spin { to { transform: rotate(360deg); } }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Authorization Processing</h2>
          <div class="spinner"></div>
          <p class="processing">Please wait while we complete your authorization...</p>
          <p>This window will automatically process your authorization and close when complete.</p>
        </div>
        
        <script>
          // Handle both URL hash (Twitch) and query params (YouTube)
          let token = null;
          let error = null;
          let service = null;
          
          // Detect token in URL hash (both Twitch and YouTube use implicit flow with token in fragment)
          const hash = window.location.hash.substring(1);
          if (hash) {
            console.log("Processing URL hash for OAuth callback");
            const hashParams = new URLSearchParams(hash);
            token = hashParams.get('access_token');
            error = hashParams.get('error');
            
            // Check the state parameter to determine which service this is for
            const state = hashParams.get('state');
            if (state && state.startsWith('youtube_auth_')) {
              service = 'youtube';
              console.log("Found YouTube token in hash fragment:", !!token);
            } else {
              service = 'twitch';
              console.log("Found Twitch token:", !!token);
            }
          }
          
          // Check if we have URL query params (for any service using authorization code flow)
          const queryParams = new URLSearchParams(window.location.search);
          const code = queryParams.get('code');
          if (code) {
            console.log("Processing URL query for OAuth code flow");
            token = code;
            // Check the state parameter to determine which service this is for
            const state = queryParams.get('state');
            if (state && state.startsWith('youtube_auth_')) {
              service = 'youtube';
            } else {
              // Default to twitch if state parameter is missing or doesn't match youtube format
              service = service || 'twitch';
            }
            
            // Make absolutely sure service has a value before logging
            if (!service) service = 'unknown';
            console.log("Found OAuth code for " + service + ":", !!code);
          }
          
          // Extract error from query params if present
          if (!error) {
            error = queryParams.get('error');
          }
          
          if (token) {
            console.log("Token found, sending to main process for service:", service);
            // Send the token back to the main process
            fetch('/auth-complete?token=' + encodeURIComponent(token) + '&service=' + service, { method: 'GET' })
              .then(response => {
                // Replace the content with success message
                document.body.innerHTML = \`
                  <div class="container">
                    <h2>Authorization Successful</h2>
                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                      <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                    <p style="color: #22c55e; font-size: 20px;">You have been successfully authenticated!</p>
                    <p>You can now close this window and return to the application.</p>
                    <p>This window will automatically close in 3 seconds...</p>
                  </div>
                \`;
                
                // Change background color for success
                document.body.style.backgroundColor = '#f0fff4';
                
                // Window will close automatically after a short delay
                setTimeout(() => window.close(), 3000);
              });
          } else if (error) {
            // Replace the content with error message
            const errorMessage = error || 'Unknown error';
            document.body.innerHTML = \`
              <div class="container">
                <h2>Authentication Failed</h2>
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="15" y1="9" x2="9" y2="15"></line>
                  <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
                <p style="color: #ef4444; font-size: 20px;">Authentication failed: \${errorMessage}</p>
                <p>Please close this window and try again.</p>
              </div>
            \`;
            
            // Change background color for error
            document.body.style.backgroundColor = '#fff5f5';
          }
        </script>
      </body>
      </html>
    `;
    
    // Check if this is the callback path used for OAuth (both YouTube and Twitch)
    if (req.url.startsWith('/callback')) {
      console.log('Received OAuth callback');
      // For OAuth authentication - extract token from fragment
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(processingHtml);
      return;
    }
    
    // Check if this is the auth completion endpoint
    if (req.url.startsWith('/auth-complete')) {
      const requestUrl = new URL('http://localhost' + req.url);
      const token = requestUrl.searchParams.get('token');
      const service = requestUrl.searchParams.get('service');
      
      console.log("Auth complete received for service: " + service);
      console.log("Token present: " + !!token);
      
      if (token && mainWindow && !mainWindow.isDestroyed()) {
        // Determine auth type based on the service parameter
        const authType = service === 'twitch' ? 'twitch-oauth-callback' : 'youtube-oauth-callback';
        
        console.log("Sending " + authType + " token to renderer");
        mainWindow.webContents.send('auth-callback', {
          type: authType,
          token: token
        });
      } else {
        console.error('Auth complete: Missing token or main window');
      }
      
      // Acknowledge the request
      res.writeHead(200);
      res.end('OK');
      return;
    }
    
    
    // For all other requests, send the HTML page
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(processingHtml);
  });
  
  // Start the server
  authServer.listen(AUTH_SERVER_PORT, () => {
    console.log("Auth server listening on port " + AUTH_SERVER_PORT);
  });
  
  // Handle server errors
  authServer.on('error', (err) => {
    console.error('Auth server error:', err);
    
    // If the port is in use, try a different port
    if (err.code === 'EADDRINUSE') {
      console.log("Port " + AUTH_SERVER_PORT + " is in use, trying a different port");
      authServer.close();
      AUTH_SERVER_PORT++;
      setTimeout(createAuthServer, 100);
    }
  });
}

// Create the app window
function createWindow() {
  // Create the browser window with performance optimizations
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    show: false, // Don't show until ready to avoid flashing
    title: "RusEcho",
    backgroundColor: '#1a1a1a', // Set a background color to reduce flash
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true, // Protect against prototype pollution
      enableRemoteModule: false, // Disable remote to improve security
      preload: path.join(__dirname, 'preload.js'), // Use a preload script
      webSecurity: false, // Disable for development
      backgroundThrottling: false, // Prevent throttling for better performance
      offscreen: false, // Use GPU acceleration when available
      spellcheck: false, // Disable spellcheck for better performance
      enableWebSQL: false, // Disable deprecated WebSQL
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
      enableBlinkFeatures: 'CSSColorSchemeUARendering', // Enable modern CSS features
      disableBlinkFeatures: 'Auxclick', // Disable unnecessary features
      
      // Additional performance optimizations
      v8CacheOptions: 'code',
      zoomFactor: 1.0,
      enablePreferredSizeMode: false,
      disableDialogs: false,
      safeDialogs: true,
      
      // Memory optimizations
      additionalArguments: [
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection',
        '--max-old-space-size=512'
      ]
    },
    icon: path.join(__dirname, '../public/app-icon-512.png'),
    autoHideMenuBar: true,
    // Additional window performance optimizations
    paintWhenInitiallyHidden: false,
    enableLargerThanScreen: false,
    thickFrame: true,
    skipTaskbar: false,
    
    // Faster window creation
    titleBarStyle: 'default',
    frame: true,
    transparent: false,
    hasShadow: true,
    acceptFirstMouse: true,
    disableAutoHideCursor: false,
    
    // Window state optimizations
    minimizable: true,
    maximizable: true,
    resizable: true,
    alwaysOnTop: false,
    fullscreenable: true,
    kiosk: false
  });

  // Remove menu for cleaner interface and better performance
  Menu.setApplicationMenu(null);
  
  // Optimize window performance
  mainWindow.webContents.on('dom-ready', () => {
    // Execute performance optimizations after DOM is ready
    mainWindow.webContents.executeJavaScript(`
      // Disable smooth scrolling for better performance
      document.documentElement.style.scrollBehavior = 'auto';
      
      // Optimize rendering
      if (window.requestIdleCallback) {
        window.requestIdleCallback(() => {
          // Force garbage collection if available
          if (window.gc) {
            window.gc();
          }
        });
      }
      
      // Preload critical resources
      const preloadLinks = document.querySelectorAll('link[rel="preload"]');
      console.log('Preloading', preloadLinks.length, 'resources');
    `).catch(err => console.log('Performance optimization error:', err));
  });
  
  // Log app paths for debugging
  console.log('App path:', app.getAppPath());
  console.log('__dirname:', __dirname);
  console.log('Resources path:', process.resourcesPath);

  // Create a direct file URL to index.html
  const indexPath = path.join(app.getAppPath(), 'dist', 'index.html');
  let mainUrl;
  
  // Windows requires file URLs in this format: file:///C:/path/to/file.html (no leading slash before drive letter)
  if (process.platform === 'win32') {
    // Windows requires file URLs in this format: file:///C:/path/to/file.html (no leading slash before drive letter)
    mainUrl = 'file:///' + indexPath.replace(/\\/g, '/');
  } else {
    mainUrl = 'file://' + indexPath;
  }
  
  console.log('Loading URL:', mainUrl);
  console.log('File exists:', fs.existsSync(indexPath));
  
  // Show the window when it's ready - prevents white flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });
  
  // Load the URL directly
  mainWindow.loadURL(mainUrl)
    .then(() => console.log('Application loaded successfully'))
    .catch(err => {
      console.error('Error loading main URL:', err);
      
      // Try fallback with loadFile
      mainWindow.loadFile(indexPath)
        .catch(finalErr => {
          console.error('All loading attempts failed:', finalErr);
          mainWindow.webContents.loadURL('data:text/html,<html><body><h1>Error Loading Application</h1><p>Try running as administrator or reinstalling the application.</p></body></html>');
        });
    });

  // Handle window closure
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  
  // Handle external links
  if (mainWindow.webContents) {
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });
  }
}

// Handle OAuth authentication in a secure way
function handleOAuth() {
  // Listen for auth requests from renderer
  ipcMain.on('auth-request', (event, { url, redirectUrl }) => {
    console.log('Auth request received:', url);
    console.log('Redirect URL:', redirectUrl);
    
    // Make sure the local auth server is running
    createAuthServer();
    
    // Open the OAuth URL in default browser
    shell.openExternal(url);
  });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  createWindow();
  handleOAuth();
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  // Close the auth server if it's running
  if (authServer) {
    authServer.close(() => {
      console.log('Auth server closed');
    });
    authServer = null;
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Re-create window on activation (macOS)
app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
