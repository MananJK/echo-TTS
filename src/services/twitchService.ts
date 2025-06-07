import { Client } from 'tmi.js';

type MessageCallback = (username: string, message: string) => void;
type ConnectionCallback = (connected: boolean, error?: string) => void;

// Track active Twitch client connections
let twitchClients: { [channelName: string]: Client } = {};

// Track recent connection errors to prevent duplicate notifications
const recentErrors: { [channelName: string]: { message: string, timestamp: number } } = {};

// Twitch OAuth and API integration
const TWITCH_TOKEN_KEY = 'twitchOAuthToken';
const DEMO_MODE_KEY = 'demoModeEnabled';

export const saveTwitchOAuthToken = (token: string): void => {
  console.log("TwitchService: Saving OAuth token to localStorage");
  try {
    localStorage.setItem(TWITCH_TOKEN_KEY, token);
    console.log("TwitchService: Token saved successfully");
  } catch (error) {
    console.error("TwitchService: Error saving token:", error);
  }
};

export const hasTwitchOAuthToken = (): boolean => {
  try {
    const token = localStorage.getItem(TWITCH_TOKEN_KEY);
    console.log(`TwitchService: Token ${token ? 'exists' : 'does not exist'} in localStorage`);
    return !!token;
  } catch (error) {
    console.error("TwitchService: Error checking token:", error);
    return false;
  }
};

export const clearTwitchOAuthToken = (): void => {
  console.log("TwitchService: Clearing OAuth token from localStorage");
  try {
    localStorage.removeItem(TWITCH_TOKEN_KEY);
    console.log("TwitchService: Token cleared successfully");
  } catch (error) {
    console.error("TwitchService: Error clearing token:", error);
  }
};

// Set demo mode flag to bypass authentication
export const enableDemoMode = (): void => {
  localStorage.setItem(DEMO_MODE_KEY, 'true');
};

// Check if demo mode is enabled
export const isDemoModeEnabled = (): boolean => {
  return localStorage.getItem(DEMO_MODE_KEY) === 'true';
};

// Clear demo mode flag
export const disableDemoMode = (): void => {
  localStorage.removeItem(DEMO_MODE_KEY);
};

// Helper function to check if we should report an error
// This prevents duplicate error notifications for the same channel/error
const shouldReportError = (channelName: string, errorMessage: string): boolean => {
  const now = Date.now();
  const errorKey = `${channelName}:${errorMessage}`;
  const recentError = recentErrors[errorKey];
  
  // If we've shown this same error recently (within 10 seconds), don't show it again
  if (recentError && now - recentError.timestamp < 10000) {
    return false;
  }
  
  // Store this error and timestamp
  recentErrors[errorKey] = { message: errorMessage, timestamp: now };
  return true;
};

export const connectToTwitchChat = (
  channelName: string,
  onMessageReceived: MessageCallback,
  onConnectionChanged: ConnectionCallback
): void => {
  // Disconnect existing client for this channel if any
  if (twitchClients[channelName]) {
    twitchClients[channelName].disconnect();
    delete twitchClients[channelName];
  }

  try {
    // First check if we're in demo mode
    if (isDemoModeEnabled()) {
      // Set up a simulated connection for demo mode
      onConnectionChanged(true);

      // Create a fake interval that generates demo messages
      const intervalId = setInterval(() => {
        const demoMessages = [
          "Привет, как дела?",
          "!г Это тестовое сообщение",
          "Отличный стрим!",
          "!г Привет, я русский",
          "!г Всем привет в чате",
          "Что нового?"
        ];

        const randomMessage = demoMessages[Math.floor(Math.random() * demoMessages.length)];
        const randomUsername = `Viewer${Math.floor(Math.random() * 1000)}`;

        onMessageReceived(randomUsername, randomMessage);
      }, 8000); // Send a message every 8 seconds

      // Store the interval as a "client" for clean-up purposes
      twitchClients[channelName] = {
        disconnect: () => clearInterval(intervalId)
      } as unknown as Client;

      return;
    }

    // Get token from localStorage
    const token = localStorage.getItem(TWITCH_TOKEN_KEY);
    if (!token) {
      onConnectionChanged(false, 'Not authenticated with Twitch');
      return;
    }

    // Create a new client with stable connection settings
    const client = new Client({
      options: { 
        debug: false, // Reduce debug noise
        clientId: 'udjuiavbj15nv9adih3dioaoj969ny' // Add client ID for better connection handling
      },
      connection: {
        secure: true,
        reconnect: false, // Disable auto-reconnect to prevent fighting with manual disconnects
        timeout: 30000, // 30 second connection timeout
        reconnectInterval: 2000 // If reconnecting is enabled later, use 2 second intervals
      },
      identity: {
        username: channelName, // Will be ignored if not the correct user
        password: `oauth:${token}` // Required format for Twitch OAuth
      },
      channels: [channelName]
    });

    // Set up event handlers with better error handling
    client.on('message', (channel, tags, message, self) => {
      // Ignore messages from the bot itself
      if (self) return;

      // Extract display name or fallback to username
      const username = tags['display-name'] || tags.username || 'Anonymous';

      // Process the message
      onMessageReceived(username, message);
    });

    client.on('connected', () => {
      console.log(`Connected to Twitch channel: ${channelName}`);
      onConnectionChanged(true);
    });

    client.on('disconnected', (reason) => {
      console.log(`Disconnected from Twitch: ${reason}`);
      // Only report disconnection if we haven't recently reported it
      const shouldReport = shouldReportError(channelName, `disconnect:${reason}`);
      if (shouldReport) {
        onConnectionChanged(false, reason);
      }
      // Clean up the client reference
      delete twitchClients[channelName];
    });

    // Handle connection errors
    client.on('error', (error) => {
      console.error(`Twitch client error for ${channelName}:`, error);
      // Only report critical errors that require user attention
      if (error.message && !error.message.includes('ping timeout')) {
        const shouldReport = shouldReportError(channelName, `error:${error.message}`);
        if (shouldReport) {
          onConnectionChanged(false, error.message);
        }
      }
      // Don't immediately clean up on ping timeouts - let the connection handler deal with it
      if (!error.message || !error.message.includes('ping timeout')) {
        delete twitchClients[channelName];
      }
    });

    // Handle reconnection events
    client.on('reconnect', () => {
      console.log(`Twitch client reconnecting to ${channelName}...`);
    });

    // Connect to Twitch with better error handling
    client.connect().then(() => {
      console.log(`Successfully initiated connection to Twitch channel: ${channelName}`);
      // Store the client for later reference only after successful connection initiation
      twitchClients[channelName] = client;
    }).catch(error => {
      console.error('Failed to connect to Twitch:', error);
      // Check if we've recently reported this same error to avoid duplicates
      const shouldReport = shouldReportError(channelName, `connect:${error.message}`);
      if (shouldReport) {
        onConnectionChanged(false, error.message);
      }
      // Don't store the client if connection failed
      delete twitchClients[channelName];
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const shouldReport = shouldReportError(channelName, `setup:${errorMessage}`);
    
    if (shouldReport) {
      onConnectionChanged(false, errorMessage);
      console.error('Error setting up Twitch client:', error);
    }
  }
};

export const disconnectFromTwitchChat = (channelName?: string): Promise<void> => {
  return new Promise((resolve) => {
    try {
      if (channelName && twitchClients[channelName]) {
        console.log(`Attempting to disconnect from Twitch channel: ${channelName}`);
        
        const client = twitchClients[channelName];
        
        // Set up timeout to prevent hanging
        const timeout = setTimeout(() => {
          console.warn(`Twitch disconnect timeout for ${channelName}, forcing cleanup`);
          delete twitchClients[channelName];
          resolve();
        }, 3000); // Reduced timeout to 3 seconds
        
        // Handle disconnect events
        const onDisconnect = () => {
          clearTimeout(timeout);
          delete twitchClients[channelName];
          console.log(`Successfully disconnected from Twitch channel: ${channelName}`);
          resolve();
        };
        
        const onError = (error: any) => {
          clearTimeout(timeout);
          delete twitchClients[channelName];
          console.error(`Error during Twitch disconnect for ${channelName}:`, error);
          resolve(); // Resolve anyway since we cleaned up
        };
        
        // Remove any existing listeners to prevent memory leaks
        client.removeAllListeners('disconnected');
        client.removeAllListeners('error');
        
        // Add event listeners for this disconnect operation
        client.once('disconnected', onDisconnect);
        client.once('error', onError);
        
        // Attempt to disconnect gracefully
        if (typeof client.disconnect === 'function') {
          client.disconnect().catch((error) => {
            clearTimeout(timeout);
            delete twitchClients[channelName];
            console.error(`Disconnect promise rejected for ${channelName}:`, error);
            resolve(); // Resolve anyway since we cleaned up
          });
        } else {
          // If disconnect method is not available, force cleanup
          clearTimeout(timeout);
          delete twitchClients[channelName];
          resolve();
        }
        
      } else if (!channelName) {
        // Disconnect all clients if no specific channel is provided
        console.log('Attempting to disconnect from all Twitch channels');
        const channelNames = Object.keys(twitchClients);
        
        if (channelNames.length === 0) {
          console.log('No Twitch channels to disconnect from');
          resolve();
          return;
        }
        
        const disconnectPromises = channelNames.map(channel => {
          return disconnectFromTwitchChat(channel).catch(error => {
            console.error(`Failed to disconnect from ${channel}:`, error);
            // Continue with other disconnections even if one fails
          });
        });
        
        Promise.allSettled(disconnectPromises).then(() => {
          console.log('Finished disconnecting from all Twitch channels');
          resolve();
        });
        
      } else {
        console.log(`No active connection found for channel: ${channelName || 'undefined'}`);
        resolve();
      }
    } catch (error) {
      console.error('Error in disconnectFromTwitchChat:', error);
      // Clean up the client reference even if there was an error
      if (channelName && twitchClients[channelName]) {
        delete twitchClients[channelName];
      }
      resolve(); // Resolve rather than reject to prevent hanging
    }
  });
};

export const isTwitchConnected = (channelName?: string): boolean => {
  if (channelName) {
    return !!twitchClients[channelName];
  }
  return Object.keys(twitchClients).length > 0;
};

// Get current user's Twitch username from token
export const getTwitchUsername = async (): Promise<string | null> => {
  try {
    const token = localStorage.getItem(TWITCH_TOKEN_KEY);
    if (!token) {
      console.log("TwitchService: No token available to get username");
      return null;
    }
    
    // Call Twitch API to get user info
    const response = await fetch('https://api.twitch.tv/helix/users', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Client-Id': 'udjuiavbj15nv9adih3dioaoj969ny'
      }
    });
    
    if (!response.ok) {
      console.error("TwitchService: Failed to get user info", await response.text());
      return null;
    }
    
    const data = await response.json();
    if (data && data.data && data.data.length > 0) {
      const username = data.data[0].login;
      console.log(`TwitchService: Got username: ${username}`);
      return username;
    }
    
    return null;
  } catch (error) {
    console.error("TwitchService: Error getting username:", error);
    return null;
  }
};
