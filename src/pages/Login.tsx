import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Twitch, Youtube, Heart, Info, AlertTriangle, ArrowRight } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import TwitchOAuthButton from '@/components/TwitchOAuthButton';
import YouTubeOAuthButton from '@/components/YouTubeOAuthButton';
import { hasTwitchOAuthToken } from '@/services/twitchService';
import { hasYoutubeOAuthToken } from '@/services/youtubeService';
import { useToast } from '@/hooks/use-toast';

const Login = () => {
  const [isTwitchAuthed, setIsTwitchAuthed] = useState<boolean>(hasTwitchOAuthToken());
  const [isYoutubeAuthed, setIsYoutubeAuthed] = useState<boolean>(hasYoutubeOAuthToken());
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Check if user is already authenticated
  useEffect(() => {
    if (isTwitchAuthed || isYoutubeAuthed) {
      // If already authenticated, navigate to main app
      navigate('/');
    }
  }, [isTwitchAuthed, isYoutubeAuthed, navigate]);
 
  const handleContinueToApp = () => {
    // Navigate to main app
    navigate('/');
  };

  return (
    <div className="min-h-screen p-4 md:p-8 bg-stream-bg flex flex-col">
      <div className="max-w-3xl mx-auto w-full flex-1 flex flex-col">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold flex items-center justify-center gap-2">
            <span className="bg-gradient-to-r from-stream-accent to-stream-highlight bg-clip-text text-transparent">
              StreamTTS
            </span>
          </h1>
          <p className="text-muted-foreground mt-2">
            Connect to have chat messages read aloud during your streams
          </p>
        </div>
        
        {/* Simple Instructions */}
        <Alert className="mb-8 bg-stream-accent/10 border-stream-accent">
          <Info className="h-4 w-4 text-stream-accent" />
          <AlertTitle>Quick Start Guide</AlertTitle>
          <AlertDescription className="mt-2">
            <ol className="list-decimal pl-5 space-y-2">
              <li>Choose your streaming platform below (Twitch or YouTube)</li>
              <li>Click the "Log in" button to authorize the app</li>
              <li>Once logged in, you'll be automatically directed to the app</li>
            </ol>
          </AlertDescription>
        </Alert>
        
        {/* Main Content */}
        <Tabs defaultValue="twitch" className="flex-1">
          <TabsList className="grid grid-cols-2 w-full max-w-md mx-auto">
            <TabsTrigger value="twitch" className="flex items-center gap-2">
              <Twitch className="h-4 w-4 text-purple-400" />
              Twitch
            </TabsTrigger>
            <TabsTrigger value="youtube" className="flex items-center gap-2">
              <Youtube className="h-4 w-4 text-red-400" />
              YouTube
            </TabsTrigger>
          </TabsList>
          
          <div className="mt-6 mb-8">
            <TabsContent value="twitch">
              <Card className="border-purple-500/30 bg-card/50 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center space-x-4 border-b border-border/40 pb-4">
                  <div className="flex-shrink-0">
                    <Twitch className="h-10 w-10 text-purple-400" />
                  </div>
                  <div>
                    <CardTitle>Connect with Twitch</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="bg-purple-500/10 p-4 rounded-lg">
                      <h3 className="text-lg font-medium mb-2">Twitch Authentication</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Connect with your Twitch account to access chat in your channel
                      </p>
                      <TwitchOAuthButton onAuthChange={setIsTwitchAuthed} />
                    </div>
                    
                    <Alert className="bg-blue-500/10 border-blue-500/30">
                      <Info className="h-4 w-4 text-blue-500" />
                      <AlertTitle>What permissions are needed?</AlertTitle>
                      <AlertDescription>
                        <p className="mt-2">This app requires:</p>
                        <ul className="list-disc pl-5 mt-1">
                          <li><code className="text-xs bg-muted px-1 py-0.5 rounded">chat:read</code> - To receive messages from your chat</li>
                          <li><code className="text-xs bg-muted px-1 py-0.5 rounded">chat:edit</code> - To send responses (optional)</li>
                        </ul>
                      </AlertDescription>
                    </Alert>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="youtube">
              <Card className="border-red-500/30 bg-card/50 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center space-x-4 border-b border-border/40 pb-4">
                  <div className="flex-shrink-0">
                    <Youtube className="h-10 w-10 text-red-400" />
                  </div>
                  <div>
                    <CardTitle>Connect with YouTube</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="bg-red-500/10 p-4 rounded-lg">
                      <h3 className="text-lg font-medium mb-2">YouTube Authentication</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Connect with your YouTube account to access chat in your live streams
                      </p>
                      <YouTubeOAuthButton onAuthChange={setIsYoutubeAuthed} />
                    </div>
                    
                    <Alert className="bg-blue-500/10 border-blue-500/30">
                      <Info className="h-4 w-4 text-blue-500" />
                      <AlertTitle>What permissions are needed?</AlertTitle>
                      <AlertDescription>
                        <p className="mt-2">This app requires:</p>
                        <ul className="list-disc pl-5 mt-1">
                          <li><code className="text-xs bg-muted px-1 py-0.5 rounded">youtube.readonly</code> - To access and read your YouTube live chat</li>
                        </ul>
                      </AlertDescription>
                    </Alert>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
        
        {/* Footer */}
        <div className="pt-4 text-center text-sm text-muted-foreground mt-auto">
          Made with <Heart className="inline h-4 w-4 text-red-500 mx-1" /> - Nerve © 2025
        </div>
      </div>
    </div>
  );
};

export default Login;
