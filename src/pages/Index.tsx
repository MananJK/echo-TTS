import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Mic, Volume2, MessageSquare, Settings, Radio, Heart, Info, LogIn } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Link } from 'react-router-dom';

// Lazy load components with prefetch to avoid UI jank
const MessageInput = lazy(() => import('@/components/MessageInput'));
const MessageHistory = lazy(() => import('@/components/MessageHistory'));
const VolumeControl = lazy(() => import('@/components/VolumeControl'));
const ApiKeyInput = lazy(() => import('@/components/ApiKeyInput'));
const ChatConnections = lazy(() => import('@/components/ChatConnections').then(module => ({ default: module.default })));
const ConnectionStatusPanel = lazy(() => import('@/components/ConnectionStatusPanel'));

import { Message } from '@/types/message';
import { ChatConnection } from '@/types/chatSource';
import { playMessageAudio, TTSProvider, getAvailableBrowserVoices } from '@/services/ttsService';
import { hasTwitchOAuthToken, connectToTwitchChat, disconnectFromTwitchChat } from '@/services/twitchService';
import { hasYoutubeOAuthToken, connectToYouTubeLiveChat } from '@/services/youtubeService';

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [apiKey, setApiKey] = useState<string>('');
  const [volume, setVolume] = useState<number>(0.7);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('chat');
  const [chatConnections, setChatConnections] = useState<ChatConnection[]>([]);
  const [ttsProvider, setTtsProvider] = useState<TTSProvider>('browser');
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const { toast } = useToast();
  const [isYoutubeAuthed, setIsYoutubeAuthed] = useState<boolean>(hasYoutubeOAuthToken());
  // Add a state to keep track of YouTube connection objects
  const [youtubeConnections, setYoutubeConnections] = useState<Record<string, { disconnect: () => void }>>({});
  // Add state to track if TTS is initialized
  const [ttsInitialized, setTtsInitialized] = useState<boolean>(false);

  // Load API key, volume, and TTS provider from localStorage
  useEffect(() => {
    const savedApiKey = localStorage.getItem('elevenLabsApiKey');
    if (savedApiKey) {
      setApiKey(savedApiKey);
    }
    
    const savedVolume = localStorage.getItem('ttsVolume');
    if (savedVolume) {
      setVolume(parseFloat(savedVolume));
    }
    
    const savedProvider = localStorage.getItem('ttsProvider') as TTSProvider;
    if (savedProvider) {
      setTtsProvider(savedProvider);
    }
    
    const savedVoice = localStorage.getItem('selectedVoice');
    if (savedVoice) {
      setSelectedVoice(savedVoice);
    }

    // Defer voice initialization until user interacts with audio features
    // rather than loading at startup
  }, []);

  // Initialize TTS only when needed (when user navigates to chat tab)
  useEffect(() => {
    if (activeTab === 'chat' && !ttsInitialized) {
      // Get available voices for browser TTS
      const loadVoices = () => {
        const voices = getAvailableBrowserVoices();
        setAvailableVoices(voices);
        
        // If no voice is selected yet, try to find Microsoft Pavel or another Russian voice
        if (!selectedVoice) {
          // First, try to find Microsoft Pavel specifically
          const pavelVoice = voices.find(v => 
            v.name.includes('Pavel') || 
            v.name.includes('Microsoft Pavel')
          );
          
          // If Pavel is found, use it
          if (pavelVoice) {
            setSelectedVoice(pavelVoice.name);
            localStorage.setItem('selectedVoice', pavelVoice.name);
          } else {
            // Otherwise, fall back to any Russian voice
            const russianVoice = voices.find(v => 
              v.lang.startsWith('ru') || 
              v.name.includes('Russian') || 
              v.name.includes('русский')
            );
            
            if (russianVoice) {
              setSelectedVoice(russianVoice.name);
              localStorage.setItem('selectedVoice', russianVoice.name);
            }
          }
        }
        
        setTtsInitialized(true);
      };
      
      // Voice list might not be available immediately in some browsers
      if ('speechSynthesis' in window) {
        // Chrome loads voices asynchronously
        if (window.speechSynthesis.getVoices().length === 0) {
          window.speechSynthesis.onvoiceschanged = loadVoices;
        } else {
          loadVoices();
        }
      }
    }
  }, [activeTab, ttsInitialized, selectedVoice]);

  // Set up message handler for chat messages - only when active tab is connections
  const handleExternalMessage = useRef((username: string, content: string) => {
    // Check if the message is in Russian or starts with !г
    const hasCyrillic = /[\u0400-\u04FF]/.test(content);
    const isCommand = content.startsWith('!г ');
    
    if (hasCyrillic || isCommand) {
      const formattedContent = isCommand ? content : `!г ${content}`;
      handleSendMessage(formattedContent, username);
    }
  });

  // NOTE: Connection establishment is now handled in ChatConnections.tsx
  // This avoids the reconnection issue that was caused by this useEffect
  // running every time chatConnections array changed and calling connect functions again

  // Handle API key submission
  const handleApiKeySubmit = (key: string) => {
    setApiKey(key);
    localStorage.setItem('elevenLabsApiKey', key);
    toast({
      title: "API Key Saved",
      description: "Your ElevenLabs API key has been saved"
    });
  };

  // Handle volume change
  const handleVolumeChange = (value: number) => {
    setVolume(value);
    localStorage.setItem('ttsVolume', value.toString());
  };

  // Handle TTS provider change
  const handleProviderChange = (checked: boolean) => {
    const newProvider: TTSProvider = checked ? 'elevenlabs' : 'browser';
    setTtsProvider(newProvider);
    localStorage.setItem('ttsProvider', newProvider);
    
    toast({
      title: `Switched to ${newProvider === 'browser' ? 'Browser TTS' : 'ElevenLabs'}`,
      description: newProvider === 'elevenlabs' 
        ? "Using ElevenLabs for TTS (requires API key)" 
        : "Using browser's built-in TTS (unlimited usage)"
    });
  };

  // Handle voice selection
  const handleVoiceChange = (voice: string) => {
    setSelectedVoice(voice);
    localStorage.setItem('selectedVoice', voice);
  };

  // Process message queue
  const processMessageQueue = async (newMessage: Message) => {
    if (ttsProvider === 'elevenlabs' && !apiKey) {
      toast({
        title: "API Key Required",
        description: "Please set your ElevenLabs API key in the settings tab",
        variant: "destructive"
      });
      
      // Update message status to error
      setMessages(currentMessages => 
        currentMessages.map(msg => 
          msg.id === newMessage.id ? { ...msg, status: 'error' } : msg
        )
      );
      
      // Switch to settings tab
      setActiveTab('settings');
      return;
    }

    if (isProcessing) return;
    
    try {
      setIsProcessing(true);
      
      // Update message status to playing
      setMessages(currentMessages => 
        currentMessages.map(msg => 
          msg.id === newMessage.id ? { ...msg, status: 'playing' } : msg
        )
      );
      
      // Play the audio
      await playMessageAudio(
        newMessage,
        apiKey,
        () => {
          console.log('Playback started for message:', newMessage.id);
        },
        () => {
          // Update message status to completed when done
          setMessages(currentMessages => 
            currentMessages.map(msg => 
              msg.id === newMessage.id ? { ...msg, status: 'completed' } : msg
            )
          );
          setIsProcessing(false);
        },
        volume,
        ttsProvider,
        selectedVoice
      );
      
    } catch (error) {
      console.error('Error processing message:', error);
      
      toast({
        title: "Error Playing Message",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
      
      // Update message status to error
      setMessages(currentMessages => 
        currentMessages.map(msg => 
          msg.id === newMessage.id ? { ...msg, status: 'error' } : msg
        )
      );
      
      setIsProcessing(false);
    }
  };

  // Handle new message
  const handleSendMessage = (content: string, username?: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      content,
      timestamp: Date.now(),
      username: username || 'You',
      status: 'pending'
    };
    
    setMessages(prevMessages => [...prevMessages, newMessage]);
    processMessageQueue(newMessage);
  };

  return (
    <div className="min-h-screen p-4 md:p-8 bg-stream-bg flex flex-col">
      <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                <span className="bg-gradient-to-r from-stream-accent to-stream-highlight bg-clip-text text-transparent">
                  RusEcho
                </span>
              </h1>
              <p className="text-muted-foreground mt-1">
                TTS for Russian chat messages in your stream
              </p>
          </div>
          
          <Badge 
            variant="outline" 
            className={`${isProcessing ? 'bg-stream-highlight/20 text-stream-highlight border-stream-highlight/40 animate-pulse' : 'bg-muted/30'}`}
          >
            {isProcessing ? 'Speaking' : 'Ready'}
          </Badge>
        </div>

        {/* Connection Status Panel */}
        <Suspense fallback={<div className="h-12 mb-4 bg-card/50 backdrop-blur-sm border border-stream-accent/30 rounded-lg animate-pulse"></div>}>
          <ConnectionStatusPanel connections={chatConnections} />
        </Suspense>
        
        {/* Main Content - More rectangular shape */}
        <Card className="border-stream-accent/30 bg-card/50 backdrop-blur-sm overflow-hidden flex-1 flex flex-col">
          <Tabs defaultValue="chat" value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <CardHeader className="pb-0">
              <TabsList className="grid grid-cols-3 bg-muted/30">
                <TabsTrigger value="chat" className="data-[state=active]:bg-stream-accent data-[state=active]:text-white">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Chat
                </TabsTrigger>
                <TabsTrigger value="connections" className="data-[state=active]:bg-stream-accent data-[state=active]:text-white">
                  <Radio className="h-4 w-4 mr-2" />
                  Connections
                </TabsTrigger>
                <TabsTrigger value="settings" className="data-[state=active]:bg-stream-accent data-[state=active]:text-white">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </TabsTrigger>
              </TabsList>
            </CardHeader>
            
            <CardContent className="pt-6 flex-1 flex flex-col">
              <Suspense fallback={<div className="p-4">Loading...</div>}>
                <TabsContent value="chat" className="space-y-4 flex-1 flex flex-col">
                  {/* Message History */}
                  <div className="flex-1 overflow-y-auto">
                    <MessageHistory messages={messages} />
                  </div>
                  
                  {/* Volume Control */}
                  <div className="flex justify-center my-4">
                    <VolumeControl volume={volume} onVolumeChange={handleVolumeChange} />
                  </div>
                  
                  {/* Message Input */}
                  <MessageInput onSendMessage={handleSendMessage} ttsProvider={ttsProvider} />
                  
                  {/* Footer inside the tab content */}
                  <div className="pt-4 text-center text-sm text-muted-foreground border-t border-stream-accent/10 mt-4">
                    Made with <Heart className="inline h-4 w-4 text-red-500 mx-1" /> - Nerve © 2025
                  </div>
                </TabsContent>
                
                <TabsContent value="connections" className="space-y-4 flex-1 flex flex-col">
                  <div className="flex-1">
                    <ChatConnections 
                      connections={chatConnections}
                      onConnectionChange={setChatConnections}
                    />
                  </div>
                  
                  {/* Footer inside the tab content */}
                  <div className="pt-4 text-center text-sm text-muted-foreground border-t border-stream-accent/10 mt-4">
                    Made with <Heart className="inline h-4 w-4 text-red-500 mx-1" /> - Nerve © 2025
                  </div>
                </TabsContent>
                
                <TabsContent value="settings" className="flex-1 flex flex-col">
                  <div className="space-y-6 flex-1">
                    {/* Security Notice */}
                    <Alert className="bg-yellow-500/10 border-yellow-500/50">
                      <Info className="h-4 w-4 text-yellow-500" />
                      <AlertTitle>Personal Credentials</AlertTitle>
                      <AlertDescription>
                        Your API keys and OAuth tokens are stored locally on your device only and are never sent to our servers.
                        For Twitch and YouTube, we use OAuth authentication which allows you to connect without entering API keys.
                      </AlertDescription>
                    </Alert>
                    
                    {/* TTS Provider Selection */}
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <h4 className="font-medium">TTS Provider</h4>
                        <p className="text-sm text-muted-foreground">
                          Choose between browser's built-in TTS (unlimited) or ElevenLabs (premium quality)
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Label htmlFor="tts-provider">Browser</Label>
                        <Switch 
                          id="tts-provider" 
                          checked={ttsProvider === 'elevenlabs'}
                          onCheckedChange={handleProviderChange}
                        />
                        <Label htmlFor="tts-provider">ElevenLabs</Label>
                      </div>
                    </div>
                    
                    {/* Voice Selection for Browser TTS */}
                    {ttsProvider === 'browser' && (
                      <div className="rounded-lg border p-4">
                        <h4 className="font-medium mb-2">Browser Voice Selection</h4>
                        <p className="text-sm text-muted-foreground mb-4">
                          Select a voice from your operating system (Russian voices recommended)
                        </p>
                        <Select value={selectedVoice} onValueChange={handleVoiceChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a voice" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableVoices.map((voice) => (
                              <SelectItem 
                                key={voice.name} 
                                value={voice.name}
                              >
                                {voice.name} {voice.lang ? `(${voice.lang})` : ''}
                                {voice.lang && voice.lang.startsWith('ru') && ' - Recommended'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    
                    {/* ElevenLabs API Key Input */}
                    {ttsProvider === 'elevenlabs' && (
                      <div className="grid place-items-center">
                        <ApiKeyInput 
                          onApiKeySubmit={handleApiKeySubmit} 
                          apiKeySet={!!apiKey} 
                        />
                      </div>
                    )}
                    
                    <Card className="bg-muted/20 border-stream-accent/20">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Mic size={18} className="text-stream-accent" />
                          How to Use
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 text-sm">
                        <p>
                          <span className="text-stream-accent font-semibold">1.</span> {ttsProvider === 'elevenlabs' ? 'Set your ElevenLabs API key above' : 'Select a voice from the dropdown above'}
                        </p>
                        <p>
                          <span className="text-stream-accent font-semibold">2.</span> Go to the Connections tab and connect to Twitch or YouTube using OAuth
                        </p>
                        <p>
                          <span className="text-stream-accent font-semibold">3.</span> For Twitch, click "Connect with Twitch" and authorize the application
                        </p>
                        <p>
                          <span className="text-stream-accent font-semibold">4.</span> Russian messages or messages starting with <code className="bg-muted px-1 rounded text-stream-accent">!г</code> will be auto-detected
                        </p>
                        <p>
                          <span className="text-stream-accent font-semibold">5.</span> You can also test by manually typing in the Chat tab
                        </p>
                        <p className="text-muted-foreground italic mt-4">
                          Example: <code className="bg-muted px-1 rounded text-stream-accent">!г Привет, как дела?</code>
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                  
                  {/* Footer inside the tab content */}
                  <div className="pt-4 text-center text-sm text-muted-foreground border-t border-stream-accent/10 mt-4">
                    Made with <Heart className="inline h-4 w-4 text-red-500 mx-1" /> - Nerve © 2025
                  </div>
                </TabsContent>
              </Suspense>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

export default Index;
