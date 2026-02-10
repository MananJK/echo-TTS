import React from 'react';
import { Button } from '@/components/ui/button';
import { Youtube, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { saveYoutubeOAuthToken, hasYoutubeOAuthToken, clearYoutubeOAuthToken } from '@/services/youtubeService';
import { openExternalAuth, onAuthCallback, isTauriAvailable } from '@/lib/tauri-api';

// Google OAuth Client ID - Update this with your new client ID from Google Cloud Console
// Make sure this client has http://localhost:3000/callback configured as a valid redirect URI
const YOUTUBE_CLIENT_ID = '311952405738-1cd4o0irnc5b7maihbm3f68qatns9764.apps.googleusercontent.com';

// Use our local server for OAuth callback
// IMPORTANT: This MUST match EXACTLY what's registered in Google Cloud Console
// Based on the error message, we need to use http://localhost:3000/callback
const REDIRECT_URI = 'http://localhost:3000/callback';
const WEB_REDIRECT_URI = 'http://localhost:3000/callback';

interface YouTubeOAuthButtonProps {
  onAuthChange: (isAuthed: boolean) => void;
}

const YouTubeOAuthButton: React.FC<YouTubeOAuthButtonProps> = ({ onAuthChange }) => {
  const { toast } = useToast();
  const [isAuthorized, setIsAuthorized] = React.useState<boolean>(hasYoutubeOAuthToken());
  const [isAuthenticating, setIsAuthenticating] = React.useState<boolean>(false);
  const [authError, setAuthError] = React.useState<string | null>(null);

  // Add an effect to check token status periodically (reduced frequency to prevent conflicts)
  React.useEffect(() => {
    const checkToken = () => {
      const hasToken = hasYoutubeOAuthToken();
      if (hasToken !== isAuthorized) {
        setIsAuthorized(hasToken);
        onAuthChange(hasToken);
      }
    };

    // Check immediately and then every 10 seconds (reduced from 1 second)
    checkToken();
    const intervalId = setInterval(checkToken, 10000);
    return () => clearInterval(intervalId);
  }, [isAuthorized, onAuthChange]);

  React.useEffect(() => {
    let mounted = true;
    
    try {
      // Check if we're returning from auth redirect
      const hash = window.location.hash;
      if (hash) {
        const params = new URLSearchParams(hash.substring(1));
        const accessToken = params.get('access_token');
        const error = params.get('error');
        
        if (accessToken) {
          saveYoutubeOAuthToken(accessToken);
          if (mounted) {
            setIsAuthorized(true);
            onAuthChange(true);
            setIsAuthenticating(false);
            setAuthError(null);
          }
          
          window.history.pushState("", document.title, window.location.pathname + window.location.search);
          
          toast({
            title: "YouTube Authentication Successful",
            description: "You can now connect to your YouTube live streams"
          });
        } else if (error) {
          console.error("Auth error from redirect:", error);
          if (mounted) {
            setIsAuthenticating(false);
            setAuthError(error);
          }
          
          toast({
            title: "Authentication Failed",
            description: `YouTube error: ${error}`,
            variant: "destructive"
          });
          
          window.history.pushState("", document.title, window.location.pathname + window.location.search);
        }
      }
      
      const handleAuthCallback = (event: MessageEvent) => {
        if (!mounted) return;
        if (event.data && event.data.type === 'youtube-oauth-callback') {
          if (event.data.token) {
            saveYoutubeOAuthToken(event.data.token);
            setIsAuthorized(true);
            onAuthChange(true);
            setIsAuthenticating(false);
            setAuthError(null);
            
            toast({
              title: "YouTube Authentication Successful",
              description: "You can now connect to your YouTube live streams"
            });
          } else if (event.data.error) {
            console.error("Auth error from IPC:", event.data.error);
            setIsAuthenticating(false);
            setAuthError(event.data.error);
            
            toast({
              title: "Authentication Failed",
              description: `YouTube error: ${event.data.error}`,
              variant: "destructive"
            });
          }
        }
      };

      window.addEventListener('message', handleAuthCallback);
      
      let unlistenAuth = () => {};
      try {
        unlistenAuth = onAuthCallback((data) => {
          if (!mounted) return;
          if (data.type === 'youtube-oauth-callback') {
            if (data.token) {
              saveYoutubeOAuthToken(data.token);
              setIsAuthorized(true);
              onAuthChange(true);
              setIsAuthenticating(false);
              setAuthError(null);
              
              toast({
                title: "YouTube Authentication Successful",
                description: "You can now connect to your YouTube live streams"
              });
            } else if (data.error) {
              console.error("Auth error from Tauri:", data.error);
              setIsAuthenticating(false);
              setAuthError(data.error);
              
              toast({
                title: "Authentication Failed",
                description: `YouTube error: ${data.error}`,
                variant: "destructive"
              });
            }
          }
        });
      } catch (e) {
        console.warn("Could not set up Tauri auth callback:", e);
      }
      
      return () => {
        mounted = false;
        window.removeEventListener('message', handleAuthCallback);
        try {
          unlistenAuth();
        } catch (e) {
          console.warn("Error cleaning up auth listener:", e);
        }
      };
    } catch (error) {
      console.error("YouTubeOAuthButton useEffect error:", error);
      return () => {
        mounted = false;
      };
    }
  }, [onAuthChange, toast]);
 
  const handleConnect = async () => {
    setIsAuthenticating(true);
    setAuthError(null);
    
    // YouTube OAuth flow with comprehensive scopes for Live Chat API
    const scopes = [
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/youtube',
      'https://www.googleapis.com/auth/youtube.force-ssl',
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtubepartner'
    ];
    
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.append('client_id', YOUTUBE_CLIENT_ID);
    
    // Use appropriate redirect URI based on environment
    const finalRedirectUri = typeof window.electron !== 'undefined' ? REDIRECT_URI : WEB_REDIRECT_URI;
    authUrl.searchParams.append('redirect_uri', finalRedirectUri);
    
    
    authUrl.searchParams.append('response_type', 'token');
    authUrl.searchParams.append('scope', scopes.join(' '));
    
    // Use consent prompt to always show the permission screen
    authUrl.searchParams.append('prompt', 'consent');
    
    // Include standard Google OAuth parameters
    authUrl.searchParams.append('include_granted_scopes', 'true');
    authUrl.searchParams.append('state', 'youtube_auth_' + Date.now());
    
    
    // Check if we're running in Electron/Tauri
    if (isTauriAvailable()) {
      try {
        await openExternalAuth(authUrl.toString(), REDIRECT_URI);
      } catch (error) {
        console.error("Error opening auth URL:", error);
        setIsAuthenticating(false);
        setAuthError("Failed to open browser");
        
        toast({
          title: "Authentication Error",
          description: "Failed to open YouTube authentication page",
          variant: "destructive"
        });
      }
    } else {
      // Fallback to web flow
      window.location.href = authUrl.toString();
    }
  };

  const handleDisconnect = () => {
    clearYoutubeOAuthToken();
    setIsAuthorized(false);
    onAuthChange(false);
    setAuthError(null);
    
    toast({
      title: "YouTube Disconnected",
      description: "You've been logged out of YouTube"
    });
  };

  return (
    <div className="flex flex-col space-y-2">
      {isAuthorized ? (
        <Button 
          variant="outline" 
          className="bg-green-500 text-white hover:bg-red-600 w-full"
          onClick={handleDisconnect}
        >
          <CheckCircle className="mr-2 h-4 w-4" />
          Connected to YouTube
        </Button>
      ) : (
        <>
          <Button 
            variant="outline" 
            className={`${isAuthenticating ? 'bg-yellow-500' : 'bg-red-500'} text-white hover:bg-red-600 w-full`}
            onClick={handleConnect}
            disabled={isAuthenticating}
          >
            <Youtube className="mr-2 h-4 w-4" />
            {isAuthenticating ? 'Authenticating...' : 'Log in with YouTube'}
          </Button>
        </>
      )}
      <p className="text-xs text-muted-foreground">
        {isAuthorized 
          ? "Authorized with YouTube. You can now connect to live streams." 
          : authError 
            ? `Auth error: ${authError}. Try again.`
            : "Authorize with YouTube to connect to your live streams."}
      </p>
    </div>
  );
};

export default YouTubeOAuthButton;
