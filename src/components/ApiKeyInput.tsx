
import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Key, Eye, EyeOff, Check } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

interface ApiKeyInputProps {
  onApiKeySubmit: (apiKey: string) => void;
  apiKeySet: boolean;
}

const ApiKeyInput: React.FC<ApiKeyInputProps> = ({ onApiKeySubmit, apiKeySet }) => {
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      onApiKeySubmit(apiKey.trim());
    }
  };

  return (
    <Card className="w-full max-w-md bg-card/50 backdrop-blur-sm border-stream-accent/30">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <Key size={20} className="text-stream-accent" />
          ElevenLabs API Key
        </CardTitle>
        <CardDescription>
          Enter your ElevenLabs API key to enable Russian text-to-speech
        </CardDescription>
      </CardHeader>
      
      <form onSubmit={handleSubmit}>
        <CardContent>
          <div className="relative">
            <Input
              type={showApiKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your ElevenLabs API key"
              className="pr-10 bg-muted border-stream-accent/30 focus:border-stream-accent"
              disabled={apiKeySet}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setShowApiKey(!showApiKey)}
              disabled={apiKeySet}
            >
              {apiKeySet ? (
                <Check size={18} className="text-stream-highlight" />
              ) : showApiKey ? (
                <EyeOff size={18} />
              ) : (
                <Eye size={18} />
              )}
            </button>
          </div>
          
          <p className="mt-2 text-xs text-muted-foreground">
            Get your API key from <a 
              href="https://elevenlabs.io/app" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-stream-accent hover:underline"
            >
              ElevenLabs
            </a>
          </p>
        </CardContent>
        
        {!apiKeySet && (
          <CardFooter>
            <Button 
              type="submit" 
              className="w-full bg-stream-accent hover:bg-stream-accent/80"
              disabled={!apiKey.trim()}
            >
              Save API Key
            </Button>
          </CardFooter>
        )}
      </form>
    </Card>
  );
};

export default ApiKeyInput;
