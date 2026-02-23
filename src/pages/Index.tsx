import React, { useState, useEffect, useRef, lazy, Suspense, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Mic, Volume2, MessageSquare, Settings, Radio, Heart, Info, LogIn, ChevronDown, ChevronRight } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

// Lazy load components with prefetch to avoid UI jank
const MessageInput = lazy(() => import('@/components/MessageInput'));
const MessageHistory = lazy(() => import('@/components/MessageHistory'));
const VolumeControl = lazy(() => import('@/components/VolumeControl'));
const ApiKeyInput = lazy(() => import('@/components/ApiKeyInput'));
const ChatConnections = lazy(() => import('@/components/ChatConnections').then(module => ({ default: module.default })));
const ConnectionStatusPanel = lazy(() => import('@/components/ConnectionStatusPanel'));
const AlertSettings = lazy(() => import('@/components/AlertSettings'));

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
  const [isHowToUseOpen, setIsHowToUseOpen] = useState<boolean>(false);
  const { toast } = useToast();
  const [isYoutubeAuthed, setIsYoutubeAuthed] = useState<boolean>(hasYoutubeOAuthToken());
  const [youtubeConnections, setYoutubeConnections] = useState<Record<string, { disconnect: () => void }>>({});
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

  useEffect(() => {
    if (activeTab === 'chat' && !ttsInitialized) {
      const loadVoices = () => {
        const voices = getAvailableBrowserVoices();
        setAvailableVoices(voices);
        
        if (!selectedVoice) {
          const pavelVoice = voices.find(v => 
            v.name.includes('Pavel') || 
            v.name.includes('Microsoft Pavel')
          );
          
          if (pavelVoice) {
            setSelectedVoice(pavelVoice.name);
            localStorage.setItem('selectedVoice', pavelVoice.name);
          } else {
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
      
      if ('speechSynthesis' in window) {
        if (window.speechSynthesis.getVoices().length === 0) {
          const handleVoicesChanged = () => {
            loadVoices();
            window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
          };
          window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
          
          return () => {
            window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
          };
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

  const handleApiKeySubmit = useCallback((key: string) => {
    setApiKey(key);
    localStorage.setItem('elevenLabsApiKey', key);
    toast({
      id: 'api-key-saved',
      title: "API Key Saved",
      description: "Your ElevenLabs API key has been saved"
    });
  }, [toast]);

  const handleVolumeChange = useCallback((value: number) => {
    setVolume(value);
    localStorage.setItem('ttsVolume', value.toString());
  }, []);

  const handleProviderChange = useCallback((checked: boolean) => {
    const newProvider: TTSProvider = checked ? 'elevenlabs' : 'browser';
    setTtsProvider(newProvider);
    localStorage.setItem('ttsProvider', newProvider);
    
    toast({
      id: 'tts-provider-changed',
      title: `Switched to ${newProvider === 'browser' ? 'Browser TTS' : 'ElevenLabs'}`,
      description: newProvider === 'elevenlabs' 
        ? "Using ElevenLabs for TTS (requires API key)" 
        : "Using browser's built-in TTS (unlimited usage)"
    });
  }, [toast]);

  const handleVoiceChange = useCallback((voice: string) => {
    setSelectedVoice(voice);
    localStorage.setItem('selectedVoice', voice);
  }, []);

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
        () => {},
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

  const handleSendMessage = useCallback((content: string, username?: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      content,
      timestamp: Date.now(),
      username: username || 'You',
      status: 'pending'
    };
    
    setMessages(prevMessages => [...prevMessages, newMessage]);
    processMessageQueue(newMessage);
  }, []);

  return (
    <div className="min-h-screen p-4 md:p-8 bg-stream-bg flex flex-col">
      <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                <span className="bg-gradient-to-r from-stream-accent to-stream-highlight bg-clip-text text-transparent">
                  StreamTTS
                </span>
              </h1>
              <p className="text-muted-foreground mt-1">
                Free TTS for streaming chat messages in your stream
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
                  <div className="flex-1 overflow-y-auto">
                    <MessageHistory messages={messages} />
                  </div>
                  
                  <div className="flex justify-center my-4">
                    <VolumeControl volume={volume} onVolumeChange={handleVolumeChange} />
                  </div>
                  
                  <MessageInput onSendMessage={handleSendMessage} ttsProvider={ttsProvider} />
                </TabsContent>
                
                <TabsContent value="connections" className="space-y-4 flex-1 flex flex-col">
                  <div className="flex-1">
                    <ChatConnections 
                      connections={chatConnections}
                      onConnectionChange={setChatConnections}
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="settings" className="flex-1 flex flex-col">
                  <div className="space-y-6 flex-1">
                    <Suspense fallback={<div className="h-48 bg-card/50 rounded-lg animate-pulse"></div>}>
                      <AlertSettings />
                    </Suspense>
                    
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <h4 className="font-medium">TTS Provider</h4>
                        <p className="text-sm text-muted-foreground">
                          Browser TTS (free) or ElevenLabs (premium)
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
                    
                    {ttsProvider === 'browser' && (
                      <div className="rounded-lg border p-4">
                        <h4 className="font-medium mb-2">Voice Selection</h4>
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
                    
                    {ttsProvider === 'elevenlabs' && (
                      <div className="grid place-items-center">
                        <ApiKeyInput 
                          onApiKeySubmit={handleApiKeySubmit} 
                          apiKeySet={!!apiKey} 
                        />
                      </div>
                    )}
                    
                    <Collapsible open={isHowToUseOpen} onOpenChange={setIsHowToUseOpen}>
                      <Card className="bg-muted/20 border-stream-accent/20">
                        <CollapsibleTrigger asChild>
                          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
                            <CardTitle className="text-lg flex items-center gap-2">
                              {isHowToUseOpen ? <ChevronDown size={18} className="text-stream-accent" /> : <ChevronRight size={18} className="text-stream-accent" />}
                              <Mic size={18} className="text-stream-accent" />
                              How to Use
                            </CardTitle>
                          </CardHeader>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <CardContent className="space-y-3 text-sm">
                            <p>
                              <span className="text-stream-accent font-semibold">1.</span> {ttsProvider === 'elevenlabs' ? 'Set your ElevenLabs API key above' : 'Select a voice from the dropdown above'}
                            </p>
                            <p>
                              <span className="text-stream-accent font-semibold">2.</span> Go to Connections and connect to Twitch or YouTube
                            </p>
                            <p>
                              <span className="text-stream-accent font-semibold">3.</span> Messages starting with <code className="bg-muted px-1 rounded text-stream-accent">!г</code> will be read aloud
                            </p>
                            <p className="text-muted-foreground italic mt-4">
                              Example: <code className="bg-muted px-1 rounded text-stream-accent">!г Привет!</code>
                            </p>
                          </CardContent>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                    
                    <Alert className="bg-yellow-500/10 border-yellow-500/50">
                      <Info className="h-4 w-4 text-yellow-500" />
                      <AlertTitle>Privacy</AlertTitle>
                      <AlertDescription>
                        Your API keys and tokens are stored locally and never sent to external servers.
                      </AlertDescription>
                    </Alert>
                  </div>
                </TabsContent>
              </Suspense>
            </CardContent>
          </Tabs>
          
          <div className="p-4 text-center text-xs text-muted-foreground border-t border-stream-accent/10">
            Made with <Heart className="inline h-3 w-3 text-red-500 mx-1" /> Nerve © 2025
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Index;
