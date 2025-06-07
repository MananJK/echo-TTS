import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Volume2, User } from 'lucide-react';
import { Message } from '@/types/message';

interface MessageHistoryProps {
  messages: Message[];
}

const MessageHistory: React.FC<MessageHistoryProps> = ({ messages }) => {
  return (
    <Card className="bg-card/50 backdrop-blur-sm border-stream-accent/30 w-full h-[400px]">
      <ScrollArea className="h-full p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Volume2 size={40} className="mb-2 text-stream-accent/50" />
            <p>No messages yet. Send a Russian message to get started!</p>
            <p className="mt-2 text-sm">Example: !г Привет, как дела?</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div 
                key={message.id}
                className={`p-3 rounded-lg ${
                  message.status === 'playing' 
                    ? 'bg-stream-accent/20 border border-stream-accent animate-pulse-glow' 
                    : 'bg-muted/30'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <User size={16} className="text-stream-accent" />
                  <span className="text-sm font-semibold text-stream-accent">
                    {message.username || 'Viewer'}
                  </span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-sm ml-6">{message.content.replace(/^!г\s*/i, '')}</p>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </Card>
  );
};

export default MessageHistory;
