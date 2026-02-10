import React from 'react';

interface LoadingProps {
  message?: string;
  isStartup?: boolean;
}

const Loading: React.FC<LoadingProps> = ({ 
  message = 'Loading...',
  isStartup = false
}) => {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[200px]">
      <div className="w-10 h-10 border-2 border-stream-accent/30 border-t-stream-accent rounded-full animate-spin" />
      <p className="mt-4 text-sm text-muted-foreground">{message}</p>
      
      {isStartup && (
        <p className="mt-2 text-xs text-muted-foreground/60">
          This may take a moment...
        </p>
      )}
    </div>
  );
};

export default Loading;
