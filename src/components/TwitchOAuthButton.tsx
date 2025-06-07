import React from 'react';
import { Button } from '@/components/ui/button';
import { Twitch, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { saveTwitchOAuthToken, hasTwitchOAuthToken, clearTwitchOAuthToken, enableDemoMode } from '@/services/twitchService';

// IMPORTANT: Replace with your Twitch Client ID from https://dev.twitch.tv/console
const TWITCH_CLIENT_ID = 'udjuiavbj15nv9adih3dioaoj969ny'; // Public Twitch Client ID used by web player
// Use our local server running on port 3000 that will handle the callback
// For Twitch, we'll keep using the /callback path which is working
const REDIRECT_URI = 'http://localhost:3000/callback';
const WEB_REDIRECT_URI = 'http://localhost:3000/callback';

interface TwitchOAuthButtonProps {
  onAuthChange: (isAuthed: boolean) => void;
}

const TwitchOAuthButton: React.FC<TwitchOAuthButtonProps> = ({ onAuthChange }) => {
  const { toast } = useToast();
  const [isAuthorized, setIsAuthorized] = React.useState<boolean>(hasTwitchOAuthToken());
  const [isAuthenticating, setIsAuthenticating] = React.useState<boolean>(false);

  // Add an effect to check token status periodically
  React.useEffect(() => {
    const checkToken = () => {
      const hasToken = hasTwitchOAuthToken();
      if (hasToken !== isAuthorized) {
        console.log("Twitch OAuth token state changed:", hasToken);
        setIsAuthorized(hasToken);
        onAuthChange(hasToken);
      }
    };

    // Check immediately and then every second
    checkToken();
    const intervalId = setInterval(checkToken, 1000);
    return () => clearInterval(intervalId);
  }, [isAuthorized, onAuthChange]);

  React.useEffect(() => {
    // Check if we're returning from auth redirect
    const hash = window.location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get('access_token');
      
      if (accessToken) {
        saveTwitchOAuthToken(accessToken);
        setIsAuthorized(true);
        onAuthChange(true);
        
        // Clear the URL fragment
        window.history.pushState("", document.title, window.location.pathname + window.location.search);
        
        toast({
          title: "Twitch Authentication Successful",
          description: "You can now connect to your Twitch channels"
        });
      }
    }

    // Handle Electron IPC events if in Electron
    const handleElectronCallback = (event: MessageEvent) => {
      console.log("Received message event:", event.data);
      if (event.data && event.data.type === 'twitch-oauth-callback' && event.data.token) {
        console.log("Twitch token received in handleElectronCallback");
        saveTwitchOAuthToken(event.data.token);
        setIsAuthorized(true);
        onAuthChange(true);
        setIsAuthenticating(false);
        
        toast({
          title: "Twitch Authentication Successful",
          description: "You can now connect to your Twitch channels"
        });
      }
    };

    // Add event listener for Electron auth callbacks
    window.addEventListener('message', handleElectronCallback);
    
    // Auto-setup listener for Electron
    if (typeof window.electron !== 'undefined') {
      console.log("Setting up Electron auth callback listener for Twitch");
      window.electron.onAuthCallback((data) => {
        console.log("Auth callback received in renderer for Twitch:", data);
        if (data && data.type === 'twitch-oauth-callback') {
          if (data.token) {
            console.log("Processing Twitch token in onAuthCallback");
            saveTwitchOAuthToken(data.token);
            setIsAuthorized(true);
            onAuthChange(true);
            setIsAuthenticating(false);
            
            toast({
              title: "Twitch Authentication Successful",
              description: "You can now connect to your Twitch channels"
            });
          } else if (data.error) {
            console.error("Auth error from Electron:", data.error);
            setIsAuthenticating(false);
            
            toast({
              title: "Authentication Failed",
              description: `Twitch error: ${data.error}`,
              variant: "destructive"
            });
          }
        }
      });
    }
    
    return () => {
      window.removeEventListener('message', handleElectronCallback);
    };
  }, [onAuthChange, toast]);

  // Enable demo mode for testing purposes
  const handleDemoMode = () => {
    enableDemoMode();
    setIsAuthorized(true);
    onAuthChange(true);
    
    toast({
      title: "Demo Mode Activated",
      description: "You're now using simulated Twitch chat"
    });
  };

  const handleConnect = () => {
    setIsAuthenticating(true);
    
    // Twitch OAuth implicit flow
    const scopes = ['chat:read', 'chat:edit'];
    const authUrl = new URL('https://id.twitch.tv/oauth2/authorize');
    authUrl.searchParams.append('client_id', TWITCH_CLIENT_ID);
    
    // Use appropriate redirect URI based on environment
    const finalRedirectUri = typeof window.electron !== 'undefined' ? REDIRECT_URI : WEB_REDIRECT_URI;
    authUrl.searchParams.append('redirect_uri', finalRedirectUri);
    
    console.log('Twitch Auth: Using authentication flow:', typeof window.electron !== 'undefined' ? 'Electron' : 'Web');
    console.log('Twitch Auth: Redirect URI:', finalRedirectUri);
    console.log('Twitch Auth: Client ID:', TWITCH_CLIENT_ID);
    
    authUrl.searchParams.append('response_type', 'token');
    authUrl.searchParams.append('scope', scopes.join(' '));
    authUrl.searchParams.append('force_verify', 'true'); // Force user to verify credentials
    authUrl.searchParams.append('state', 'twitch_auth_' + Date.now()); // Add state for identification
    
    const fullAuthUrl = authUrl.toString();
    console.log('Twitch Auth: Full OAuth URL:', fullAuthUrl);
    
    // Check if we're running in Electron
    if (typeof window.electron !== 'undefined') {
      try {
        console.log("Twitch Auth: Opening OAuth URL via Electron");
        // Use Electron's openExternal to authenticate in user's default browser
        window.electron.openExternalAuth(fullAuthUrl, finalRedirectUri);
      } catch (error) {
        console.error("Twitch Auth: Error opening auth URL:", error);
        setIsAuthenticating(false);
        
        toast({
          title: "Authentication Error",
          description: "Failed to open Twitch authentication page",
          variant: "destructive"
        });
      }
    } else {
      // Traditional web flow
      console.log("Twitch Auth: Opening OAuth URL via web flow");
      window.location.href = fullAuthUrl;
    }
  };

  const handleDisconnect = () => {
    console.log("TwitchOAuthButton: Disconnecting from Twitch");
    clearTwitchOAuthToken();
    setIsAuthorized(false);
    onAuthChange(false);
    
    toast({
      title: "Twitch Disconnected",
      description: "You've been logged out of Twitch"
    });
  };

  return (
    <div className="flex flex-col space-y-2">
      {isAuthorized ? (
        <Button 
          variant="outline" 
          className="bg-green-500 text-white hover:bg-purple-600 w-full"
          onClick={handleDisconnect}
        >
          <CheckCircle className="mr-2 h-4 w-4" />
          Connected to Twitch
        </Button>
      ) : (
        <>
          <Button 
            variant="outline" 
            className={`${isAuthenticating ? 'bg-yellow-500' : 'bg-purple-500'} text-white hover:bg-purple-600 w-full`}
            onClick={handleConnect}
            disabled={isAuthenticating}
          >
            <Twitch className="mr-2 h-4 w-4" />
            {isAuthenticating ? 'Authenticating...' : 'Log in with Twitch'}
          </Button>
          <Button 
            variant="outline" 
            className="bg-gray-500 text-white hover:bg-gray-600 w-full mt-2"
            onClick={handleDemoMode}
          >
            Use Demo Mode
          </Button>
        </>
      )}
      <p className="text-xs text-muted-foreground">
        {isAuthorized 
          ? "Authorized with Twitch. You can now connect to channels." 
          : "Authorize with Twitch to connect to chat channels."}
      </p>
    </div>
  );
};

export default TwitchOAuthButton;
