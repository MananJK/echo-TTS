import { Message } from '@/types/message';

// YouTube Service for managing YouTube Live Chat connections
const YOUTUBE_TOKEN_KEY = 'youtube_oauth_token';
const YOUTUBE_DEMO_MODE_KEY = 'youtube_demo_mode';

// Mock data for demo mode
const DEMO_MESSAGES = [
  { displayName: 'YouTubeUser1', message: 'Привет! Как дела?', color: '#FF0000' },
  { displayName: 'FanFromMoscow', message: 'Отличный стрим сегодня!', color: '#00FF00' },
  { displayName: 'RussianGamer', message: 'Можешь сыграть в эту игру?', color: '#0000FF' },
  { displayName: 'StreamSupporter', message: 'Спасибо за контент!', color: '#FFFF00' },
  { displayName: 'NewViewer', message: 'Я первый раз на твоём стриме', color: '#FF00FF' }
];

// Check if we have a valid YouTube OAuth token
export const hasYoutubeOAuthToken = (): boolean => {
  const token = localStorage.getItem(YOUTUBE_TOKEN_KEY);
  return !!token;
};

// Save the YouTube OAuth token to local storage
export const saveYoutubeOAuthToken = async (token: string): Promise<boolean> => {
  console.log("YouTubeService: Saving token to localStorage", token.substring(0, 10) + "...");
  localStorage.setItem(YOUTUBE_TOKEN_KEY, token);
  // Clear any demo mode flag when using real authentication
  localStorage.removeItem(YOUTUBE_DEMO_MODE_KEY);
  
  // Validate token immediately after saving
  const isValid = await validateToken(token);
  console.log(`YouTubeService: Token validation result: ${isValid ? 'Valid' : 'Invalid'}`);
  
  if (!isValid) {
    console.warn("YouTubeService: Token validation failed, may have insufficient permissions");
  }
  
  return isValid;
};

// Validate a YouTube token to ensure it's working (improved error handling)
export const validateToken = async (token: string): Promise<boolean> => {
  try {
    // Simple API call to check if the token is valid with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
    
    const response = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json();
      console.log("YouTubeService: Token validated successfully", data);
      return true;
    } else {
      const errorText = await response.text();
      console.error(`YouTubeService: Token validation failed (${response.status})`, errorText);
      
      // Only clear token for 401 errors (expired/invalid tokens)
      if (response.status === 401) {
        console.log("YouTubeService: Token expired, clearing from storage");
        localStorage.removeItem(YOUTUBE_TOKEN_KEY);
      }
      // For 403 errors (insufficient permissions), don't clear the token
      // The user can still use some features and can re-authenticate if needed
      
      return false;
    }
  } catch (error) {
    console.error("YouTubeService: Token validation error", error);
    
    // For network/timeout errors, don't clear the token - it might be a temporary issue
    if (error instanceof Error && error.name === 'AbortError') {
      console.log("YouTubeService: Token validation timed out, but keeping token");
    }
    
    return false;
  }
};

// Get the stored YouTube OAuth token
export const getYoutubeOAuthToken = (): string | null => {
  return localStorage.getItem(YOUTUBE_TOKEN_KEY);
};

// Clear the YouTube OAuth token
export const clearYoutubeOAuthToken = (): void => {
  localStorage.removeItem(YOUTUBE_TOKEN_KEY);
  localStorage.removeItem(YOUTUBE_DEMO_MODE_KEY);
};

// Enable demo mode for testing without authentication
export const enableDemoMode = (): void => {
  localStorage.setItem(YOUTUBE_DEMO_MODE_KEY, 'true');
};

// Check if demo mode is enabled
export const isDemoMode = (): boolean => {
  return localStorage.getItem(YOUTUBE_DEMO_MODE_KEY) === 'true';
};

// Disable demo mode for YouTube
export const disableDemoMode = (): void => {
  localStorage.removeItem(YOUTUBE_DEMO_MODE_KEY);
};

// Fetch active YouTube live broadcasts (improved error handling and resilience)
export const fetchYouTubeLiveBroadcasts = async (): Promise<any[]> => {
  try {
    // Check if in demo mode
    if (isDemoMode()) {
      console.log("YouTube Service: Using demo mode");
      return [
        { id: 'demo_broadcast', snippet: { title: 'Demo Live Stream' } }
      ];
    }

    const token = getYoutubeOAuthToken();
    if (!token) {
      console.error("YouTube Service: No OAuth token available");
      throw new Error('No YouTube OAuth token available. Please log in to YouTube first.');
    }

    // Validate token format
    if (typeof token !== 'string' || token.trim().length === 0) {
      console.error("YouTube Service: Invalid token format");
      throw new Error('Invalid YouTube OAuth token. Please log out and log in again.');
    }

    console.log("YouTube Service: Fetching live broadcasts with token:", token.substring(0, 10) + "...");
    
    // Add timeout protection for broadcast fetching (increased timeout)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log('YouTube Service: Broadcast fetch timeout, aborting request');
      controller.abort();
    }, 20000); // Increased to 20 second timeout
    
    const response = await fetch(
      'https://www.googleapis.com/youtube/v3/liveBroadcasts?part=snippet,contentDetails&broadcastStatus=active',
      {
        headers: {
          Authorization: `Bearer ${token}`
        },
        signal: controller.signal
      }
    );
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (parseError) {
        errorData = { error: { message: `HTTP ${response.status}` } };
      }
      console.error('YouTube API error:', errorData);
      
      // Handle token expiration
      if (response.status === 401) {
        console.log("YouTube Service: Token expired during broadcast fetch");
        clearYoutubeOAuthToken();
        throw new Error('YouTube authentication expired. Please log in again.');
      }
      
      // Handle permission issues - be more specific about the error
      if (response.status === 403) {
        console.log("YouTube Service: Insufficient permissions detected");
        // Check if this is a quota/rate limit issue
        const errorText = await response.text();
        if (errorText.includes('quotaExceeded') || errorText.includes('dailyLimitExceeded')) {
          throw new Error('YouTube API quota exceeded. This app has reached its daily usage limit. Please try again tomorrow or contact support.');
        } else if (errorText.includes('liveStreamingNotEnabled')) {
          throw new Error('Live streaming is not enabled on your YouTube channel. Please enable live streaming in YouTube Studio first.');
        } else if (errorText.includes('insufficientPermissions')) {
          throw new Error('Insufficient YouTube permissions. Please log out and log in again to grant all required permissions.');
        } else {
          throw new Error('YouTube API access denied. Please ensure your channel has live streaming enabled and try logging in again with full permissions.');
        }
      }
      
      // For other errors, provide more context
      const errorMessage = errorData.error?.message || 'Unknown error';
      throw new Error(`YouTube API error (${response.status}): ${errorMessage}`);
    }

    let data;
    try {
      data = await response.json();
      console.log("YouTube Service: Live broadcasts response:", data);
    } catch (jsonError) {
      console.error("YouTube Service: Failed to parse JSON response:", jsonError);
      throw new Error('Invalid response from YouTube API. Please try again later.');
    }
    
    // Validate response structure
    if (!data || typeof data !== 'object') {
      console.error("YouTube Service: Invalid response structure:", data);
      throw new Error('Unexpected response format from YouTube API.');
    }
    
    // If no broadcasts found, return empty array instead of enabling demo mode
    if (!data.items || data.items.length === 0) {
      console.log("YouTube Service: No active broadcasts found");
      return [];
    }
    
    return data.items;
  } catch (error) {
    console.error('Error fetching YouTube broadcasts:', error);
    
    // Handle timeout/abort errors specifically
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('YouTube Service: Broadcast fetch timed out');
      throw new Error('YouTube API is not responding. Please check your internet connection and try again later.');
    }
    
    // Don't automatically enable demo mode on errors
    console.error('YouTube Service: Error fetching broadcasts:', error);
    throw error;
  }
};

// Connect to YouTube live chat
export const connectToYouTubeLiveChat = async (
  broadcastId: string,
  onMessage: (message: any) => void,
  onError: (error: Error) => void
): Promise<{ disconnect: () => void }> => {
  // For demo mode, simulate messages
  if (isDemoMode() || broadcastId === 'demo_broadcast') {
    console.log('Starting YouTube demo mode');
    let demoInterval: NodeJS.Timeout;
    
    const sendDemoMessage = () => {
      const randomMessage = DEMO_MESSAGES[Math.floor(Math.random() * DEMO_MESSAGES.length)];
      onMessage({
        id: `demo_${Date.now()}`,
        authorDetails: {
          displayName: randomMessage.displayName,
          profileImageUrl: 'https://via.placeholder.com/36',
          channelId: `demo_channel_${randomMessage.displayName}`
        },
        snippet: {
          displayMessage: randomMessage.message,
          publishedAt: new Date().toISOString()
        },
        userColor: randomMessage.color
      });
    };
    
    demoInterval = setInterval(sendDemoMessage, 5000);
    setTimeout(sendDemoMessage, 1000); // Send first message quickly
    
    return {
      disconnect: () => {
        clearInterval(demoInterval);
      }
    };
  }
  
  // Real YouTube chat connection (improved resilience)
  try {
    const token = getYoutubeOAuthToken();
    if (!token) {
      throw new Error('No YouTube OAuth token available');
    }
    
    console.log('YouTube: Attempting to connect to broadcast:', broadcastId);
    
    // First, get the liveChatId for the broadcast with timeout (increased timeout)
    const broadcastController = new AbortController();
    const broadcastTimeout = setTimeout(() => {
      console.log('YouTube: Broadcast fetch timeout');
      broadcastController.abort();
    }, 20000); // Increased to 20 second timeout
    
    const broadcastResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/liveBroadcasts?part=snippet,contentDetails&id=${broadcastId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        },
        signal: broadcastController.signal
      }
    );
    
    clearTimeout(broadcastTimeout);
    
    if (!broadcastResponse.ok) {
      let errorData;
      try {
        errorData = await broadcastResponse.json();
      } catch (parseError) {
        errorData = { error: { message: `HTTP ${broadcastResponse.status}` } };
      }
      console.error('YouTube: Broadcast fetch error:', errorData);
      
      if (broadcastResponse.status === 401) {
        console.log("YouTube: Token expired during broadcast fetch");
        clearYoutubeOAuthToken();
        throw new Error('YouTube authentication expired. Please log in again.');
      } else if (broadcastResponse.status === 403) {
        throw new Error('YouTube authentication lacks required permissions for live chat access. Please log out and log in again to grant full YouTube permissions.');
      }
      
      const errorMessage = errorData.error?.message || 'Unknown error';
      throw new Error(`YouTube API error (${broadcastResponse.status}): ${errorMessage}`);
    }
    
    const broadcastData = await broadcastResponse.json();
    console.log('YouTube: Broadcast data received:', broadcastData);
    
    if (!broadcastData.items || broadcastData.items.length === 0) {
      throw new Error('Broadcast not found or is not accessible');
    }
    
    const liveChatId = broadcastData.items[0].snippet.liveChatId;
    if (!liveChatId) {
      throw new Error('Live chat is not available for this broadcast or the stream is not currently live');
    }
    
    console.log('YouTube: Live chat ID found:', liveChatId);
    
    // Set up polling for chat messages
    let nextPageToken: string | null = null;
    let timeoutId: NodeJS.Timeout | null = null;
    let isConnected = true;
    let errorCount = 0;
    const MAX_ERRORS = 3;
    
    const fetchChatMessages = async () => {
      if (!isConnected) return;
      
      try {
        console.log('YouTube: Fetching chat messages...');
        const url = new URL('https://www.googleapis.com/youtube/v3/liveChat/messages');
        url.searchParams.append('part', 'snippet,authorDetails');
        url.searchParams.append('liveChatId', liveChatId);
        url.searchParams.append('maxResults', '200');
        
        if (nextPageToken) {
          url.searchParams.append('pageToken', nextPageToken);
        }
        
        // Add timeout protection for message fetching (increased timeout)
        const fetchController = new AbortController();
        const fetchTimeout = setTimeout(() => {
          console.log('YouTube: Fetch timeout, aborting request');
          fetchController.abort();
        }, 20000); // Increased to 20 second timeout for consistency
        
        const response = await fetch(url.toString(), {
          headers: {
            Authorization: `Bearer ${token}`
          },
          signal: fetchController.signal
        });
        
        clearTimeout(fetchTimeout);
        
        if (!response.ok) {
          let errorData;
          try {
            errorData = await response.json();
          } catch (parseError) {
            errorData = { error: { message: `HTTP ${response.status}` } };
          }
          console.error('YouTube chat API error:', errorData);
          
          // Handle token expiration - only clear for 401 errors
          if (response.status === 401) {
            console.log("YouTube: Token expired during chat fetch");
            clearYoutubeOAuthToken();
            throw new Error('YouTube authentication expired. Please log in again.');
          }
          
          // For 403 errors, don't clear token but provide specific error
          if (response.status === 403) {
            throw new Error('YouTube authentication lacks required permissions for live chat access. Please log out and log in again to grant full YouTube permissions.');
          }
          
          // For rate limiting (429), provide specific guidance
          if (response.status === 429) {
            throw new Error('YouTube API rate limit exceeded. Please wait a moment and try again.');
          }
          
          const errorMessage = errorData.error?.message || 'Unknown error';
          throw new Error(`YouTube API error (${response.status}): ${errorMessage}`);
        }
        
        const data = await response.json();
        console.log('YouTube: Chat messages fetched successfully', data.items?.length || 0, 'messages');
        nextPageToken = data.nextPageToken;
        
        // Reset error count on successful fetch
        errorCount = 0;
        
        // Process new messages
        if (data.items && data.items.length > 0) {
          data.items.forEach((message: any) => {
            // Only process 'textMessageEvent' type messages
            if (message.snippet.type === 'textMessageEvent') {
              onMessage({
                id: message.id,
                authorDetails: message.authorDetails,
                snippet: message.snippet,
                userColor: generateColorFromChannelId(message.authorDetails.channelId)
              });
            }
          });
        }
        
        // Use pollingIntervalMillis from the response for proper rate limiting
        const pollInterval = data.pollingIntervalMillis || 10000;
        console.log(`YouTube: Next poll in ${pollInterval}ms`);
        if (isConnected) {
          timeoutId = setTimeout(() => {
            fetchChatMessages().catch(err => {
              console.error('YouTube: Error in scheduled fetch:', err);
            });
          }, pollInterval);
        }
      } catch (error) {
        console.error('Error fetching chat messages:', error);
        
        // Handle timeout/abort errors
        if (error instanceof Error && error.name === 'AbortError') {
          console.error('YouTube: Request timed out');
          errorCount++;
        } else {
          errorCount++;
        }
        
        // Only call onError and stop if we've had too many consecutive errors
        if (errorCount >= MAX_ERRORS) {
          console.error(`YouTube: Too many consecutive errors (${errorCount}), stopping polling`);
          onError(error as Error);
          isConnected = false;
          return;
        }
        
        // Retry after a delay if still connected
        if (isConnected) {
          const retryDelay = Math.min(15000 * errorCount, 60000); // Exponential backoff, max 1 minute
          console.log(`YouTube: Retrying in ${retryDelay}ms (attempt ${errorCount}/${MAX_ERRORS})`);
          timeoutId = setTimeout(() => {
            fetchChatMessages().catch(err => {
              console.error('YouTube: Error in retry fetch:', err);
            });
          }, retryDelay);
        }
      }
    };
    
    // Start fetching messages with initial delay to allow connection to establish
    console.log('YouTube: Starting chat polling...');
    timeoutId = setTimeout(() => {
      fetchChatMessages().catch(err => {
        console.error('YouTube: Error in initial fetch:', err);
      });
    }, 1000);
    
    // Return disconnect function
    return {
      disconnect: () => {
        isConnected = false;
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
      }
    };
  } catch (error) {
    console.error('Error connecting to YouTube chat:', error);
    
    // Handle timeout/abort errors specifically
    if (error instanceof Error && error.name === 'AbortError') {
      const timeoutError = new Error('Connection timeout - YouTube API is not responding');
      onError(timeoutError);
      throw timeoutError;
    }
    
    onError(error as Error);
    throw error;
  }
};

// Helper function to generate consistent colors from channel IDs
function generateColorFromChannelId(channelId: string): string {
  let hash = 0;
  for (let i = 0; i < channelId.length; i++) {
    hash = channelId.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 70%, 50%)`;
}

// Diagnostic function to help troubleshoot YouTube connection issues
export const diagnosYouTubeConnection = async (): Promise<string> => {
  try {
    const token = getYoutubeOAuthToken();
    if (!token) {
      return "❌ No YouTube OAuth token found";
    }

    // Test basic API access
    const response = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      const channelName = data.items?.[0]?.snippet?.title || 'Unknown';
      return `✅ YouTube API working - Connected as: ${channelName}`;
    } else {
      return `❌ YouTube API error: ${response.status} ${response.statusText}`;
    }
  } catch (error) {
    return `❌ Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
};

// Get the YouTube channel ID for the authenticated user
export const getYoutubeChannelId = async (): Promise<string | null> => {
  try {
    const token = getYoutubeOAuthToken();
    if (!token) {
      console.log("YouTubeService: No token available to get channel ID");
      return null;
    }
    
    // Call YouTube API to get user's channel info
    const response = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    if (!response.ok) {
      console.error("YouTubeService: Failed to get channel info", await response.text());
      return null;
    }
    
    const data = await response.json();
    if (data && data.items && data.items.length > 0) {
      const channelId = data.items[0].id;
      console.log(`YouTubeService: Got channel ID: ${channelId}`);
      return channelId;
    }
    
    return null;
  } catch (error) {
    console.error("YouTubeService: Error getting channel ID:", error);
    return null;
  }
};

// Check if user's channel has live streaming enabled
export const checkLiveStreamingEnabled = async (): Promise<{ enabled: boolean; reason?: string }> => {
  try {
    const token = getYoutubeOAuthToken();
    if (!token) {
      return { enabled: false, reason: 'No authentication token' };
    }

    const response = await fetch('https://www.googleapis.com/youtube/v3/channels?part=status&mine=true', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      if (data.items && data.items.length > 0) {
        const status = data.items[0].status;
        const isEligible = status?.isLinked && !status?.madeForKids;
        
        if (!status?.isLinked) {
          return { enabled: false, reason: 'Channel not linked to Google account properly' };
        }
        
        if (status?.madeForKids) {
          return { enabled: false, reason: 'Made for Kids channels cannot use live streaming' };
        }
        
        // Check if live streaming is specifically enabled
        if (status?.longUploadsStatus !== 'allowed') {
          return { enabled: false, reason: 'Channel not verified for live streaming. Please verify your channel with a phone number.' };
        }
        
        return { enabled: true };
      }
    } else {
      const errorText = await response.text();
      return { enabled: false, reason: `API error: ${response.status} - ${errorText}` };
    }
    
    return { enabled: false, reason: 'Unable to determine live streaming status' };
  } catch (error) {
    console.error('Error checking live streaming status:', error);
    return { enabled: false, reason: error instanceof Error ? error.message : 'Unknown error' };
  }
};
