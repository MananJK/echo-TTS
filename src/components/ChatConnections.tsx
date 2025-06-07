import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Twitch, Youtube, X, LogIn, CheckCircle, LogOut, PlugIcon, Power } from 'lucide-react';
import { ChatConnection, ChatSource } from '@/types/chatSource';
import { useToast } from '@/hooks/use-toast';
import { 
  connectToTwitchChat, 
  disconnectFromTwitchChat,
  hasTwitchOAuthToken,
  saveTwitchOAuthToken,
  getTwitchUsername,
  clearTwitchOAuthToken,
  isTwitchConnected,
  disableDemoMode as disableTwitchDemoMode
} from '@/services/twitchService';
import { 
  connectToYouTubeLiveChat,
  hasYoutubeOAuthToken,
  saveYoutubeOAuthToken,
  getYoutubeChannelId,
  clearYoutubeOAuthToken,
  fetchYouTubeLiveBroadcasts,
  enableDemoMode,
  isDemoMode,
  validateToken,
  disableDemoMode as disableYoutubeDemoMode,
  checkLiveStreamingEnabled
} from '@/services/youtubeService';
import { Link } from 'react-router-dom';
import YouTubeOAuthButton from '@/components/YouTubeOAuthButton';

interface ChatConnectionsProps {
  connections: ChatConnection[];
  onConnectionChange: (connections: ChatConnection[]) => void;
}

const ChatConnections: React.FC<ChatConnectionsProps> = ({ 
  connections, 
  onConnectionChange 
}) => {
  const [isTwitchAuthed, setIsTwitchAuthed] = useState(hasTwitchOAuthToken());
  const [isYoutubeAuthed, setIsYoutubeAuthed] = useState(hasYoutubeOAuthToken());
  const [isConnectingTwitch, setIsConnectingTwitch] = useState(false);
  const [isConnectingYoutube, setIsConnectingYoutube] = useState(false);
  const [isTwitchStreamConnected, setIsTwitchStreamConnected] = useState(false);
  const [isYoutubeStreamConnected, setIsYoutubeStreamConnected] = useState(false);
  const { toast } = useToast();
  // Reference to store YouTube disconnect functions
  const youtubeDisconnectFns = useRef<Record<string, () => void>>({});
  
  // Reference to store current connections for callbacks to avoid stale closure
  const connectionsRef = useRef(connections);
  
  // Debounce connection attempts to prevent rapid reconnections
  const connectionAttempts = useRef<Record<string, number>>({});
  const lastConnectionAttempt = useRef<Record<string, number>>({});

  // Clear demo modes on component mount to prevent automatic activation
  useEffect(() => {
    console.log("ChatConnections: Clearing any existing demo modes");
    disableTwitchDemoMode();
    disableYoutubeDemoMode();
  }, []);

  // Update connectionsRef whenever connections change
  useEffect(() => {
    connectionsRef.current = connections;
  }, [connections]);

  // Add effect to listen for auth callbacks from Electron
  useEffect(() => {
    // Create a wrapper function that can be referenced for both adding and removing
    const messageEventHandler = (event: MessageEvent) => {
      // Use void to properly handle the promise from the async function
      void handleAuthCallback(event);
    };
    
    const handleAuthCallback = async (event: MessageEvent) => {
      console.log("ChatConnections: Received message event:", event.data);
      
      // Handle Twitch auth
      if (event.data && event.data.type === 'twitch-oauth-callback' && event.data.token) {
        console.log("ChatConnections: Twitch token received");
        saveTwitchOAuthToken(event.data.token);
        setIsTwitchAuthed(true);
        
        toast({
          title: "Twitch Authentication Successful",
          description: "You can now connect to your Twitch channel"
        });
      }
      
      // Handle YouTube auth
      if (event.data && event.data.type === 'youtube-oauth-callback' && event.data.token) {
        console.log("ChatConnections: YouTube token received:", event.data.token.substring(0, 10) + "...");
        
        try {
          // Save token and check if it's valid
          const isValid = await saveYoutubeOAuthToken(event.data.token);
          
          if (isValid) {
            setIsYoutubeAuthed(true);
            toast({
              title: "YouTube Authentication Successful",
              description: "You can now connect to your YouTube live stream"
            });
            
            // Check if user has any live broadcasts
            try {
              const broadcasts = await fetchYouTubeLiveBroadcasts();
              if (!broadcasts || broadcasts.length === 0) {
                console.log("ChatConnections: No active broadcasts found");
                toast({
                  title: "No Active YouTube Streams",
                  description: "No active streams found. You can manually enable demo mode if needed for testing.",
                  duration: 5000
                });
              } else {
                toast({
                  title: "YouTube Live Stream Found",
                  description: `Found ${broadcasts.length} active stream(s). Click 'Connect Stream' to monitor chat.`
                });
              }
            } catch (error) {
              console.error("Error checking for broadcasts:", error);
              // Don't enable demo mode automatically
              toast({
                title: "YouTube Error",
                description: "Error checking for live streams. Please try again or manually enable demo mode if needed.",
                variant: "destructive",
                duration: 5000
              });
            }
          } else {
            // Token is invalid or insufficient permissions
            toast({
              title: "YouTube Permission Issue",
              description: "Authentication succeeded but lacks required permissions for live chat. Please log out and log in again to grant full YouTube access.",
              variant: "destructive",
              duration: 8000
            });
          }
        } catch (error) {
          console.error("Error in YouTube auth callback:", error);
          toast({
            title: "YouTube Authentication Error",
            description: "There was a problem authenticating with YouTube. Please try again.",
            variant: "destructive"
          });
        }
      }
    };

    // Listen for auth callbacks
    window.addEventListener('message', messageEventHandler);
    
    // Auto-setup listener for Electron if available
    if (typeof window.electron !== 'undefined') {
      console.log("ChatConnections: Setting up Electron auth callback listener");
      window.electron.onAuthCallback((data) => {
        console.log("ChatConnections: Auth callback received in renderer:", data);
        // Use void to properly handle the promise from the async function
        void handleAuthCallback(new MessageEvent('message', { data }));
      });
    }
    
    return () => {
      window.removeEventListener('message', messageEventHandler);
    };
  }, [toast]);

  // Debug function to validate the YouTube token (improved error handling)
  const validateYouTubeToken = async (token: string, silent = false) => {
    try {
      console.log("Validating YouTube token...");
      const response = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log("YouTube token is valid. Channel data:", data);
        
        // Check if user has any live broadcasts (only if not silent)
        if (!silent) {
          checkForLiveBroadcasts(token, silent);
        }
        return true;
      } else {
        const errorText = await response.text();
        console.error("YouTube token validation failed:", response.status, errorText);
        
        // Only clear token and update UI state for 401 errors (expired/invalid tokens)
        if (response.status === 401) {
          console.log("Token expired (401), clearing auth state");
          setIsYoutubeAuthed(false);
          localStorage.removeItem('youtube_oauth_token');
          
          if (!silent) {
            toast({
              title: "YouTube Session Expired",
              description: "Your YouTube session has expired. Please log in again.",
              variant: "destructive"
            });
          }
        } else if (response.status === 403) {
          // For 403 errors, don't clear the token but show a warning
          if (!silent) {
            console.log("Insufficient permissions (403), but keeping token");
            toast({
              title: "YouTube Permission Warning",
              description: "Some YouTube features may not work due to insufficient permissions.",
              variant: "destructive"
            });
          }
        } else if (!silent) {
          // For other errors, just show a general warning without clearing the token
          toast({
            title: "YouTube Authentication Issue",
            description: "There was an issue validating your YouTube authentication. Some features may not work properly.",
            variant: "destructive"
          });
        }
        
        return false;
      }
    } catch (error) {
      console.error("Error validating YouTube token:", error);
      // For network errors, don't clear the token - the issue might be temporary
      if (!silent) {
        toast({
          title: "YouTube Connection Issue",
          description: "Could not validate YouTube authentication due to network issues.",
          variant: "destructive"
        });
      }
      return false;
    }
  };

  // Debug function to check for live broadcasts
  const checkForLiveBroadcasts = async (token: string, silent = false) => {
    try {
      console.log("Checking for YouTube live broadcasts...");
      const response = await fetch(
        'https://www.googleapis.com/youtube/v3/liveBroadcasts?part=snippet&broadcastStatus=active',
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        console.log("Live broadcasts response:", data);
        
        if (data.items && data.items.length > 0) {
          if (!silent) {
            toast({
              title: "YouTube Live Stream Found",
              description: `Found ${data.items.length} active live stream(s). Click 'Connect Stream' to monitor chat.`
            });
          }
          return true;
        } else {
          // No active broadcasts found - don't auto-enable demo mode
          if (!silent) {
            toast({
              title: "No Active YouTube Streams",
              description: "No active live streams found. You can manually enable demo mode for testing if needed.",
              duration: 5000
            });
          }
          return false;
        }
      } else {
        const errorText = await response.text();
        console.error("Failed to fetch live broadcasts:", response.status, errorText);
        
        // If permission error, suggest re-authentication
        if (response.status === 403) {
          if (!silent) {
            toast({
              title: "YouTube Permission Error",
              description: "Insufficient permissions for live chat access. Please log out and log in again to grant full YouTube permissions.",
              variant: "destructive",
              duration: 8000
            });
          }
        } else if (!silent) {
          toast({
            title: "YouTube API Error",
            description: "Could not check for live streams. This may be due to missing permissions.",
            variant: "destructive"
          });
        }
        return false;
      }
    } catch (error) {
      console.error("Error checking for live broadcasts:", error);
      // Don't auto-enable demo mode as fallback
      return false;
    }
  };

  // Add effect to update connection status based on active connections
  useEffect(() => {
    const hasTwitchConnection = connections.some(
      conn => conn.type === 'twitch' && conn.isConnected
    );
    
    const hasYoutubeConnection = connections.some(
      conn => conn.type === 'youtube' && conn.isConnected
    );
    
    console.log(`Connection status update: Twitch=${hasTwitchConnection}, YouTube=${hasYoutubeConnection}, total connections=${connections.length}`);
    
    setIsTwitchStreamConnected(hasTwitchConnection);
    setIsYoutubeStreamConnected(hasYoutubeConnection);
  }, [connections]);
  
  // Add toast notifications with instructions in the component
  useEffect(() => {
    if (isYoutubeAuthed && isDemoMode()) {
      // Only show this on the first render when both conditions are met
      setTimeout(() => {
        toast({
          title: "YouTube Demo Mode Active",
          description: "You're connected with demo mode. Start a live stream on YouTube to use real chat.",
          duration: 5000
        });
      }, 1000);
    }
  }, [isYoutubeAuthed, toast]);
  
  // Add effect to check authentication on component mount and periodically (less aggressive)
  useEffect(() => {
    // Only verify YouTube token on mount if authenticated
    if (isYoutubeAuthed) {
      const token = localStorage.getItem('youtube_oauth_token');
      if (token) {
        // Use silent validation to avoid UI disruption
        validateYouTubeToken(token, true);
      }
    }
    
    // Set up periodic check for YouTube token validity (every 10 minutes, reduced from 5)
    const intervalId = setInterval(() => {
      if (isYoutubeAuthed) {
        const token = localStorage.getItem('youtube_oauth_token');
        if (token) {
          validateYouTubeToken(token, true); // always silent check
        }
      }
    }, 10 * 60 * 1000);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [isYoutubeAuthed]);

  const handleConnectToTwitch = async () => {
    if (!isTwitchAuthed) {
      toast({
        title: "Twitch Connection",
        description: "Please login with Twitch first",
        variant: "destructive"
      });
      return;
    }

    // Prevent multiple rapid connection attempts
    if (isConnectingTwitch) {
      console.log("Twitch connection already in progress, ignoring request");
      return;
    }

    setIsConnectingTwitch(true);
    
    try {
      // Get user's Twitch username
      const username = await getTwitchUsername();
      if (username) {
        // Check debounce - prevent connections within 5 seconds of last attempt
        const lastAttempt = lastConnectionAttempt.current[username] || 0;
        const timeSinceLastAttempt = Date.now() - lastAttempt;
        
        if (timeSinceLastAttempt < 5000) {
          console.log(`Debouncing Twitch connection attempt for ${username}`);
          toast({
            title: "Please Wait",
            description: "Please wait a moment before reconnecting",
            variant: "default"
          });
          return;
        }
        
        lastConnectionAttempt.current[username] = Date.now();
        
        // Check if we're already connected to this channel
        const existingConnection = connections.find(
          conn => conn.type === 'twitch' && conn.channelName.toLowerCase() === username.toLowerCase()
        );
        
        if (!existingConnection) {
          const connectionId = `twitch-${Date.now()}`;
          const newConnection: ChatConnection = {
            id: connectionId,
            type: 'twitch',
            channelName: username,
            isConnected: false
          };

          // Add to connections list
          const updatedConnections = [...connections, newConnection];
          onConnectionChange(updatedConnections);

          // Connect to Twitch chat with improved error handling
          connectToTwitchChat(
            username,
            (username, message) => {
              // Message handler will be implemented in the parent component
            },
            (connected, error) => {
              // Update connection status with proper state management
              // Use the ref to get current connections to avoid stale closure
              const currentConnections = connectionsRef.current;
              console.log(`Twitch connection callback: connected=${connected}, error=${error}, currentConnections length=${currentConnections.length}`);
              
              const updatedList = currentConnections.map(conn => 
                conn.id === connectionId 
                  ? { ...conn, isConnected: connected, error: error } 
                  : conn
              );
              
              // Only update if we found the connection
              const connectionExists = currentConnections.some(conn => conn.id === connectionId);
              if (connectionExists) {
                console.log(`Updating connection ${connectionId} status: connected=${connected}`);
                onConnectionChange(updatedList);
              } else {
                console.warn(`Connection ${connectionId} not found in current connections`);
              }

              if (connected) {
                toast({
                  title: "Connected to Twitch",
                  description: `Now listening to ${username}'s chat`
                });
              } else if (error && !error.includes('RECONNECT')) {
                // Don't show toast for reconnection attempts
                toast({
                  title: "Twitch Connection Error",
                  description: error,
                  variant: "destructive"
                });
              }
            }
          );
        } else {
          toast({
            title: "Already Connected",
            description: `You're already connected to ${username}'s chat`
          });
        }
      } else {
        toast({
          title: "Twitch Connection",
          description: "Could not determine your Twitch username",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error connecting to Twitch:", error);
      toast({
        title: "Twitch Connection Error",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    } finally {
      setIsConnectingTwitch(false);
    }
  };

  const handleDisconnectFromTwitch = async () => {
    // Disconnect from all Twitch channels
    const twitchConnections = connections.filter(conn => conn.type === 'twitch');
    
    if (twitchConnections.length === 0) {
      toast({
        title: "Twitch",
        description: "No active Twitch connections to disconnect"
      });
      return;
    }
    
    console.log("Disconnecting from Twitch channels:", twitchConnections.map(c => c.channelName));
    
    try {
      // Disconnect each connection with proper error handling
      const disconnectPromises = twitchConnections.map(async (conn) => {
        try {
          console.log(`Disconnecting from Twitch channel: ${conn.channelName}`);
          await disconnectFromTwitchChat(conn.channelName);
          
          // Remove from UI immediately after successful disconnect
          const updatedConnections = connections.filter(c => c.id !== conn.id);
          onConnectionChange(updatedConnections);
          
          return { success: true, channel: conn.channelName };
        } catch (error) {
          console.error(`Error disconnecting from ${conn.channelName}:`, error);
          return { success: false, channel: conn.channelName, error };
        }
      });
      
      // Wait for all disconnections to complete
      const results = await Promise.allSettled(disconnectPromises);
      
      // Update state
      setIsTwitchStreamConnected(false);
      
      // Report results
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      if (failed === 0) {
        toast({
          title: "Twitch Disconnected",
          description: `Successfully disconnected from all ${successful} Twitch channel(s)`
        });
      } else {
        toast({
          title: "Twitch Disconnection",
          description: `Disconnected from ${successful} channel(s), ${failed} had issues but were removed from the list`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error in handleDisconnectFromTwitch:", error);
      
      // Force update state even if there were errors
      setIsTwitchStreamConnected(false);
      
      // Remove all Twitch connections from UI as fallback
      const updatedConnections = connections.filter(conn => conn.type !== 'twitch');
      onConnectionChange(updatedConnections);
      
      toast({
        title: "Twitch Disconnection",
        description: "Disconnection completed with some issues, but all channels have been removed",
        variant: "destructive"
      });
    }
  };

  const handleConnectToYoutube = async () => {
    if (!isYoutubeAuthed) {
      toast({
        title: "YouTube Connection",
        description: "Please login with YouTube first",
        variant: "destructive"
      });
      return;
    }

    // Prevent multiple simultaneous connection attempts
    if (isConnectingYoutube) {
      console.log("YouTube connection already in progress, ignoring request");
      return;
    }

    setIsConnectingYoutube(true);
    console.log("Starting YouTube connection process...");
    
    try {
      console.log("Attempting to connect to YouTube live stream...");
      
      // Get active YouTube broadcasts with comprehensive error handling
      let broadcasts: any[] = [];
      try {
        console.log("Fetching YouTube broadcasts...");
        broadcasts = await fetchYouTubeLiveBroadcasts();
        console.log("Retrieved broadcasts:", broadcasts);
      } catch (broadcastFetchError) {
        console.error("Failed to fetch YouTube broadcasts:", broadcastFetchError);
        
        // Handle specific broadcast fetch errors
        if (broadcastFetchError instanceof Error) {
          let errorTitle = "YouTube Error";
          let errorDescription = "An error occurred while connecting to YouTube";
          
          if (broadcastFetchError.message.includes('insufficient permissions') || 
              broadcastFetchError.message.includes('403')) {
            errorTitle = "YouTube Permission Error";
            errorDescription = "Please log out and log in again to grant full YouTube permissions.";
          } else if (broadcastFetchError.message.includes('not responding') || 
                     broadcastFetchError.message.includes('timeout') ||
                     broadcastFetchError.message.includes('AbortError')) {
            errorTitle = "YouTube API Timeout";
            errorDescription = "YouTube API is not responding. Please try again later.";
          } else if (broadcastFetchError.message.includes('401')) {
            errorTitle = "YouTube Authentication Expired";
            errorDescription = "Your YouTube session has expired. Please log in again.";
          } else {
            errorDescription = broadcastFetchError.message;
          }
          
          toast({
            title: errorTitle,
            description: errorDescription,
            variant: "destructive",
            duration: 8000
          });
        } else {
          toast({
            title: "YouTube Connection Error",
            description: "An unexpected error occurred while fetching broadcasts",
            variant: "destructive"
          });
        }
        return; // Exit early if we can't fetch broadcasts
      }
      
      if (broadcasts.length > 0) {
        // Connect to the first active broadcast
        const broadcastId = broadcasts[0].id;
        const broadcastTitle = broadcasts[0].snippet?.title || 'Unknown';
        
        console.log(`Connecting to broadcast: ${broadcastId} (${broadcastTitle})`);
        
        // Check if we're already connected to this broadcast
        const existingConnection = connections.find(
          conn => conn.type === 'youtube' && conn.channelName === broadcastTitle
        );
        
        if (!existingConnection) {
          const connectionId = `youtube-${Date.now()}`;
          const newConnection: ChatConnection = {
            id: connectionId,
            type: 'youtube',
            channelName: broadcastTitle || broadcastId,
            isConnected: false
          };

          // Add to connections list
          const updatedConnections = [...connections, newConnection];
          onConnectionChange(updatedConnections);

          // Connect to YouTube chat with timeout protection
          try {
            console.log("Establishing YouTube chat connection...");
            const { disconnect } = await connectToYouTubeLiveChat(
              broadcastId,
              (message) => {
                console.log("Received YouTube chat message:", message);
              },
              (error) => {
                console.error("YouTube chat connection error:", error);
                
                // Update connection status with error using current connections ref
                const currentConnections = connectionsRef.current;
                const updatedList = currentConnections.map(conn => 
                  conn.id === connectionId 
                    ? { ...conn, isConnected: false, error: error.message } 
                    : conn
                );
                onConnectionChange(updatedList);
                setIsYoutubeStreamConnected(false);

                toast({
                  title: "YouTube Connection Error",
                  description: error.message || "Failed to connect to YouTube",
                  variant: "destructive"
                });
              }
            );

            console.log("YouTube chat connection established successfully");
            
            // Store the disconnect function for later use
            youtubeDisconnectFns.current[connectionId] = disconnect;
            
            // Update connection status on successful connection using current connections ref
            const currentConnections = connectionsRef.current;
            const updatedList = currentConnections.map(conn => 
              conn.id === connectionId 
                ? { ...conn, isConnected: true, error: undefined } 
                : conn
            );
            onConnectionChange(updatedList);
            setIsYoutubeStreamConnected(true);
            
            toast({
              title: "Connected to YouTube",
              description: `Now listening to live chat for: ${broadcastTitle}`
            });
          } catch (connectionError) {
            console.error("Error establishing YouTube chat connection:", connectionError);
            
            // Remove the connection from the list on error using current connections ref
            const currentConnections = connectionsRef.current;
            const updatedList = currentConnections.filter(conn => conn.id !== connectionId);
            onConnectionChange(updatedList);
            
            // Handle specific error types
            if (connectionError instanceof Error) {
              if (connectionError.message.includes('insufficient permissions')) {
                toast({
                  title: "YouTube Permission Error",
                  description: "Please log out and log in again to grant full YouTube permissions.",
                  variant: "destructive",
                  duration: 8000
                });
              } else if (connectionError.message.includes('not responding')) {
                toast({
                  title: "YouTube Connection Timeout",
                  description: "YouTube API is not responding. Please try again later.",
                  variant: "destructive"
                });
              } else {
                toast({
                  title: "YouTube Connection Error",
                  description: connectionError.message,
                  variant: "destructive"
                });
              }
            }
          }
        } else {
          toast({
            title: "Already Connected",
            description: "You're already connected to this YouTube live stream"
          });
        }
      } else {
        console.log("No active YouTube broadcasts found");
        
        toast({
          title: "No Active Streams",
          description: "No active YouTube live streams found. Please start a live stream on YouTube first.",
          variant: "destructive",
          duration: 6000
        });
      }
    } catch (error) {
      console.error("Unexpected error in handleConnectToYoutube:", error);
      
      // Provide more specific error messaging
      let errorMessage = "An unexpected error occurred. Please try again.";
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          errorMessage = "Network error. Please check your internet connection and try again.";
        } else if (error.message.includes('timeout')) {
          errorMessage = "Connection timed out. Please try again later.";
        } else if (error.message.includes('abort')) {
          errorMessage = "Request was cancelled. Please try again.";
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }
      
      toast({
        title: "YouTube Connection Error",
        description: errorMessage,
        variant: "destructive",
        duration: 8000
      });
    } finally {
      console.log("YouTube connection process completed, resetting state");
      setIsConnectingYoutube(false);
    }
  };

  const handleDisconnectFromYoutube = () => {
    // Disconnect from all YouTube channels
    const youtubeConnections = connections.filter(conn => conn.type === 'youtube');
    
    if (youtubeConnections.length === 0) {
      toast({
        title: "YouTube",
        description: "No active YouTube connections to disconnect"
      });
      return;
    }
    
    // Disconnect each connection
    youtubeConnections.forEach(conn => {
      disconnectChat(conn);
    });
    
    setIsYoutubeStreamConnected(false);
    
    toast({
      title: "YouTube Disconnected",
      description: "Successfully disconnected from all YouTube live streams"
    });
  };

  const disconnectChat = async (connection: ChatConnection) => {
    // First remove from connections list to update UI immediately
    const updatedConnections = connections.filter(conn => conn.id !== connection.id);
    onConnectionChange(updatedConnections);
    
    try {
      if (connection.type === 'twitch') {
        await disconnectFromTwitchChat(connection.channelName);
      } else if (connection.type === 'youtube') {
        // Call the stored disconnect function for this specific connection
        const disconnect = youtubeDisconnectFns.current[connection.id];
        if (disconnect) {
          disconnect();
          // Remove the disconnect function from storage
          delete youtubeDisconnectFns.current[connection.id];
        }
      }
      
      toast({
        title: `Disconnected from ${connection.type === 'twitch' ? 'Twitch' : 'YouTube'}`,
        description: `No longer listening to ${connection.channelName}'s chat`
      });
    } catch (error) {
      console.error(`Error disconnecting from ${connection.channelName}:`, error);
      
      toast({
        title: "Warning",
        description: `Had trouble disconnecting from ${connection.channelName}, but it's been removed from the list`,
        variant: "destructive"
      });
    }
  };

  const handleTwitchLogout = async () => {
    // Disconnect from all Twitch channels
    const twitchConnections = connections.filter(conn => conn.type === 'twitch');
    
    try {
      // Disconnect from all Twitch connections
      for (const conn of twitchConnections) {
        await disconnectChat(conn);
      }
    } catch (error) {
      console.error("Error during Twitch logout:", error);
    }
    
    // Clear token and update state
    clearTwitchOAuthToken();
    setIsTwitchAuthed(false);
    setIsTwitchStreamConnected(false);
    
    toast({
      title: "Twitch Disconnected",
      description: "You've been logged out of Twitch"
    });
  };
  
  const handleYoutubeLogout = () => {
    // Disconnect from all YouTube channels
    connections
      .filter(conn => conn.type === 'youtube')
      .forEach(conn => disconnectChat(conn));
    
    // Clear token and update state
    clearYoutubeOAuthToken();
    setIsYoutubeAuthed(false);
    setIsYoutubeStreamConnected(false);
    
    toast({
      title: "YouTube Disconnected",
      description: "You've been logged out of YouTube"
    });
  };

  const getSourceIcon = (source: ChatSource) => {
    switch (source) {
      case 'twitch':
        return <Twitch size={16} className="text-purple-400" />;
      case 'youtube':
        return <Youtube size={16} className="text-red-400" />;
      default:
        return null;
    }
  };

  // Handle Twitch OAuth login
  const handleTwitchAuth = () => {
    const TWITCH_CLIENT_ID = 'udjuiavbj15nv9adih3dioaoj969ny';
    const REDIRECT_URI = 'http://localhost:3000/callback';
    
    // Twitch OAuth implicit flow
    const scopes = ['chat:read', 'chat:edit'];
    const authUrl = new URL('https://id.twitch.tv/oauth2/authorize');
    authUrl.searchParams.append('client_id', TWITCH_CLIENT_ID);
    authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.append('response_type', 'token');
    authUrl.searchParams.append('scope', scopes.join(' '));
    authUrl.searchParams.append('force_verify', 'true');
    authUrl.searchParams.append('state', 'twitch_auth_' + Date.now());
    
    const fullAuthUrl = authUrl.toString();
    console.log('ChatConnections: Twitch Auth URL:', fullAuthUrl);
    
    toast({
      title: "Twitch Authentication",
      description: "Opening Twitch login in your browser..."
    });
    
    // Check if we're running in Electron
    if (typeof window !== 'undefined' && (window as any).electron) {
      try {
        console.log('Using Electron OAuth flow');
        (window as any).electron.openExternalAuth(fullAuthUrl, REDIRECT_URI);
      } catch (error) {
        console.error("Error opening Twitch auth URL:", error);
        toast({
          title: "Authentication Error",
          description: "Failed to open Twitch authentication page",
          variant: "destructive"
        });
      }
    } else {
      // Fallback: Traditional web flow - open in new window
      console.log('Using web OAuth flow');
      const authWindow = window.open(
        fullAuthUrl,
        'twitch_auth',
        'width=500,height=700,scrollbars=yes,resizable=yes'
      );
      
      if (!authWindow) {
        toast({
          title: "Popup Blocked",
          description: "Please allow popups and try again.",
          variant: "destructive"
        });
        return;
      }
      
      // For web version, we would need to handle the auth callback differently
      // This is a simplified version - in production you'd want to handle the callback properly
      toast({
        title: "Web Authentication",
        description: "Complete the authentication in the popup window. The popup should close automatically when done.",
        duration: 10000
      });
    }
  };

  // Handle YouTube OAuth login
  const handleYouTubeAuth = () => {
    // Google OAuth Client ID 
    const YOUTUBE_CLIENT_ID = '311952405738-1cd4o0irnc5b7maihbm3f68qatns9764.apps.googleusercontent.com';
    const REDIRECT_URI = 'http://localhost:3000/callback';
    
    // YouTube OAuth flow with full permissions for chat and broadcasts
    const scopes = [
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/youtube.force-ssl',
      'https://www.googleapis.com/auth/youtube',  // Full YouTube scope
      'https://www.googleapis.com/auth/youtube.upload'  // For more capabilities if needed
    ];
    
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.append('client_id', YOUTUBE_CLIENT_ID);
    authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.append('response_type', 'token');
    authUrl.searchParams.append('scope', scopes.join(' '));
    authUrl.searchParams.append('prompt', 'consent'); // Always prompt for consent to refresh permissions
    // Note: access_type=offline cannot be used with response_type=token (implicit flow)
    authUrl.searchParams.append('include_granted_scopes', 'true');
    authUrl.searchParams.append('state', 'youtube_auth_' + Date.now());
    
    const fullAuthUrl = authUrl.toString();
    console.log('ChatConnections: YouTube Auth URL:', fullAuthUrl);
    
    toast({
      title: "YouTube Authentication",
      description: "Opening YouTube login in your browser..."
    });
    
    // Check if we're running in Electron
    if (typeof window !== 'undefined' && (window as any).electron) {
      try {
        console.log('Using Electron OAuth flow for YouTube');
        (window as any).electron.openExternalAuth(fullAuthUrl, REDIRECT_URI);
      } catch (error) {
        console.error("Error opening YouTube auth URL:", error);
        toast({
          title: "Authentication Error",
          description: "Failed to open YouTube authentication page",
          variant: "destructive"
        });
      }
    } else {
      // Fallback: Traditional web flow - open in new window
      console.log('Using web OAuth flow for YouTube');
      const authWindow = window.open(
        fullAuthUrl,
        'youtube_auth',
        'width=500,height=700,scrollbars=yes,resizable=yes'
      );
      
      if (!authWindow) {
        toast({
          title: "Popup Blocked",
          description: "Please allow popups and try again.",
          variant: "destructive"
        });
        return;
      }
      
      toast({
        title: "Web Authentication",
        description: "Complete the authentication in the popup window. The popup should close automatically when done.",
        duration: 10000
      });
    }
  };

  // Diagnostic function to help troubleshoot YouTube issues
  const diagnoseYouTubeIssues = async () => {
    console.log("=== YouTube Connection Diagnostics ===");
    
    const token = localStorage.getItem('youtube_oauth_token');
    if (!token) {
      console.log("❌ No YouTube token found");
      toast({
        title: "YouTube Diagnostic",
        description: "No YouTube authentication token found. Please login first.",
        variant: "destructive"
      });
      return;
    }
    
    console.log("✅ YouTube token exists:", token.substring(0, 10) + "...");
    
    try {
      // Test 1: Basic API access
      console.log("Testing basic YouTube API access...");
      const channelResponse = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (channelResponse.ok) {
        const channelData = await channelResponse.json();
        console.log("✅ Basic API access working");
        console.log("Channel:", channelData.items?.[0]?.snippet?.title);
        
        toast({
          title: "✅ Basic YouTube API",
          description: `Connected to channel: ${channelData.items?.[0]?.snippet?.title || 'Unknown'}`,
        });
      } else {
        console.log("❌ Basic API access failed:", channelResponse.status);
        const errorText = await channelResponse.text();
        console.log("Error details:", errorText);
        
        // Provide specific guidance based on error
        if (channelResponse.status === 403) {
          const errorMsg = "403 Forbidden - Likely permissions or quota issue";
          console.log("🔧 SOLUTION: This is likely a permissions or live streaming issue");
          console.log("Try: 1. Enable live streaming in YouTube Studio");
          console.log("     2. Use the 'Reset YouTube Auth' button below");
          
          toast({
            title: "❌ YouTube API Error (403)",
            description: "Permission denied. Enable live streaming in YouTube Studio and reset auth.",
            variant: "destructive",
            duration: 8000
          });
        } else if (channelResponse.status === 401) {
          toast({
            title: "❌ YouTube Auth Expired (401)",
            description: "Your authentication has expired. Please log in again.",
            variant: "destructive",
            duration: 8000
          });
        } else if (channelResponse.status === 429) {
          toast({
            title: "❌ YouTube Quota Exceeded (429)",
            description: "API quota exceeded. Try again tomorrow or contact support.",
            variant: "destructive",
            duration: 8000
          });
        }
        return; // Stop diagnostics if basic API fails
      }
      
      // Test 2: Check live streaming capability
      console.log("Checking live streaming capability...");
      try {
        const liveStreamCheck = await checkLiveStreamingEnabled();
        if (liveStreamCheck.enabled) {
          console.log("✅ Live streaming is enabled");
          toast({
            title: "✅ Live Streaming Enabled",
            description: "Your channel can create live streams.",
          });
        } else {
          console.log("❌ Live streaming not enabled:", liveStreamCheck.reason);
          console.log("🔧 SOLUTION: Enable live streaming in YouTube Studio");
          toast({
            title: "❌ Live Streaming Disabled",
            description: "Enable live streaming in YouTube Studio → Settings → Channel → Features",
            variant: "destructive",
            duration: 10000
          });
        }
      } catch (liveStreamError) {
        console.log("⚠️ Could not check live streaming status:", liveStreamError);
        toast({
          title: "⚠️ Live Streaming Check Failed",
          description: "Could not verify live streaming status. Check YouTube Studio manually.",
          variant: "destructive"
        });
      }
      
      // Test 3: Live broadcasts access
      console.log("Testing live broadcasts access...");
      const broadcastResponse = await fetch('https://www.googleapis.com/youtube/v3/liveBroadcasts?part=snippet&broadcastStatus=active', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (broadcastResponse.ok) {
        const broadcastData = await broadcastResponse.json();
        console.log("✅ Live broadcasts access working");
        console.log("Active broadcasts:", broadcastData.items?.length || 0);
        
        if (broadcastData.items?.length === 0) {
          console.log("ℹ️ No active broadcasts found. Start a live stream to test chat connection.");
          toast({
            title: "ℹ️ No Active Streams",
            description: "Start a live stream on YouTube to test chat connection.",
            duration: 6000
          });
        } else {
          console.log("Found broadcasts:", broadcastData.items.map((b: any) => b.snippet?.title));
          toast({
            title: "✅ Active Broadcasts Found",
            description: `Found ${broadcastData.items.length} active broadcast(s). Ready to connect!`,
          });
        }
      } else {
        console.log("❌ Live broadcasts access failed:", broadcastResponse.status);
        const errorText = await broadcastResponse.text();
        console.log("Error details:", errorText);
        
        toast({
          title: "❌ Broadcast Access Failed",
          description: `HTTP ${broadcastResponse.status}: Cannot access live broadcasts. Check permissions.`,
          variant: "destructive",
          duration: 8000
        });
      }
      
      console.log("=== Diagnostic Complete ===");
      toast({
        title: "YouTube Diagnostic Complete",
        description: "Check the browser console (F12) for detailed results.",
        duration: 5000
      });
      
    } catch (error) {
      console.error("Diagnostic error:", error);
      toast({
        title: "Diagnostic Error",
        description: `Failed to run diagnostics: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
        duration: 8000
      });
    }
  };

  const resetYouTubeAuth = () => {
    clearYoutubeOAuthToken();
    setIsYoutubeAuthed(false);
    toast({
      title: "YouTube Authentication Reset",
      description: "Please log in again to reconnect YouTube.",
    });
  };

  const handleDisconnect = async (connectionId: string) => {
    const connection = connections.find(conn => conn.id === connectionId);
    if (!connection) {
      console.warn(`Connection with ID ${connectionId} not found`);
      return;
    }

    // Remove from connections list to update UI immediately
    const updatedConnections = connections.filter(conn => conn.id !== connectionId);
    onConnectionChange(updatedConnections);
    
    try {
      console.log(`Disconnecting from ${connection.type} channel: ${connection.channelName}`);
      
      if (connection.type === 'twitch') {
        await disconnectFromTwitchChat(connection.channelName);
        console.log(`Successfully disconnected from Twitch channel: ${connection.channelName}`);
      } else if (connection.type === 'youtube') {
        // Call the stored disconnect function for this specific connection
        const disconnect = youtubeDisconnectFns.current[connection.id];
        if (disconnect) {
          disconnect();
          // Remove the disconnect function from storage
          delete youtubeDisconnectFns.current[connection.id];
          console.log(`Successfully disconnected from YouTube channel: ${connection.channelName}`);
        } else {
          console.warn(`No disconnect function found for YouTube connection: ${connection.id}`);
        }
      }
      
      toast({
        title: `Disconnected from ${connection.type === 'twitch' ? 'Twitch' : 'YouTube'}`,
        description: `No longer listening to ${connection.channelName}'s chat`
      });
    } catch (error) {
      console.error(`Error disconnecting from ${connection.channelName}:`, error);
      
      toast({
        title: "Warning",
        description: `Had trouble disconnecting from ${connection.channelName}, but it's been removed from the list`,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Chat Connections</h2>
        <Badge variant="outline" className="text-xs">
          {connections.length} connected
        </Badge>
      </div>

      {/* Twitch Section */}
      <Card className="border-purple-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Twitch className="h-5 w-5 text-purple-500" />
            Twitch
            {isTwitchAuthed && (
              <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/50">
                <CheckCircle className="h-3 w-3 mr-1" />
                Authenticated
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {!isTwitchAuthed ? (
              <Button 
                onClick={handleTwitchAuth}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <LogIn className="h-4 w-4 mr-2" />
                Login with Twitch
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  onClick={handleConnectToTwitch}
                  disabled={isConnectingTwitch || isTwitchStreamConnected}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <PlugIcon className="h-4 w-4 mr-2" />
                  {isConnectingTwitch ? 'Connecting...' : isTwitchStreamConnected ? 'Connected to Stream' : 'Connect to Stream'}
                </Button>
                {isTwitchStreamConnected && (
                  <Button
                    onClick={handleDisconnectFromTwitch}
                    variant="outline"
                    className="border-red-500/50 text-red-400 hover:bg-red-500/20"
                  >
                    <Power className="h-4 w-4 mr-2" />
                    Disconnect
                  </Button>
                )}
                <Button
                  onClick={handleTwitchLogout}
                  variant="outline"
                  className="border-gray-500/50 text-gray-400 hover:bg-gray-500/20"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            )}
          </div>
          
          {connections.filter(c => c.type === 'twitch').map(connection => (
            <div key={connection.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <Twitch className="h-4 w-4 text-purple-500" />
                <span className="font-medium">{connection.channelName}</span>
                <Badge variant={connection.isConnected ? 'default' : 'secondary'}>
                  {connection.isConnected ? 'Connected' : 'Disconnected'}
                </Badge>
              </div>
              <Button
                onClick={() => handleDisconnect(connection.id)}
                variant="ghost"
                size="sm"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* YouTube Section */}
      <Card className="border-red-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Youtube className="h-5 w-5 text-red-500" />
            YouTube
            {isYoutubeAuthed && (
              <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/50">
                <CheckCircle className="h-3 w-3 mr-1" />
                Authenticated
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {!isYoutubeAuthed ? (
              <YouTubeOAuthButton onAuthChange={(isAuthed) => {
                if (isAuthed) {
                  setIsYoutubeAuthed(true);
                  toast({
                    title: "YouTube Authentication Successful",
                    description: "You can now connect to your YouTube live stream"
                  });
                }
              }} />
            ) : (
              <div className="flex gap-2">
                <Button
                  onClick={handleConnectToYoutube}
                  disabled={isConnectingYoutube || isYoutubeStreamConnected}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <PlugIcon className="h-4 w-4 mr-2" />
                  {isConnectingYoutube ? 'Connecting...' : isYoutubeStreamConnected ? 'Connected to Live Chat' : 'Connect to Live Chat'}
                </Button>
                {isYoutubeStreamConnected && (
                  <Button
                    onClick={handleDisconnectFromYoutube}
                    variant="outline"
                    className="border-red-500/50 text-red-400 hover:bg-red-500/20"
                  >
                    <Power className="h-4 w-4 mr-2" />
                    Disconnect
                  </Button>
                )}
                <Button
                  onClick={handleYoutubeLogout}
                  variant="outline"
                  className="border-gray-500/50 text-gray-400 hover:bg-gray-500/20"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
                <Button
                  onClick={diagnoseYouTubeIssues}
                  variant="outline"
                  className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/20"
                >
                  🔍 Diagnose
                </Button>
                <Button
                  onClick={resetYouTubeAuth}
                  variant="outline"
                  className="border-gray-500/50 text-gray-400 hover:bg-gray-500/20"
                >
                  Reset Auth
                </Button>
              </div>
            )}
          </div>
          
          {connections.filter(c => c.type === 'youtube').map(connection => (
            <div key={connection.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <Youtube className="h-4 w-4 text-red-500" />
                <span className="font-medium">{connection.channelName}</span>
                <Badge variant={connection.isConnected ? 'default' : 'secondary'}>
                  {connection.isConnected ? 'Connected' : 'Disconnected'}
                </Badge>
              </div>
              <Button
                onClick={() => handleDisconnect(connection.id)}
                variant="ghost"
                size="sm"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default ChatConnections;
