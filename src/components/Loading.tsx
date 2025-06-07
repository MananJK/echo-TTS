import React, { useEffect, useState } from 'react';

interface LoadingProps {
  message?: string;
  /** Indicates that we're in startup stage */
  isStartup?: boolean;
}

/**
 * Loading component with progress animation
 */
const Loading: React.FC<LoadingProps> = ({ 
  message = 'Loading...',
  isStartup = false
}) => {
  const [progress, setProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  
  // Simulate progress for better UX
  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setElapsedTime(elapsed);
      
      // Calculate simulated progress
      // Use a non-linear curve that starts fast and slows down
      // This better represents how loading actually works
      const calculatedProgress = Math.min(100, Math.sqrt(elapsed / 100) * 10);
      setProgress(calculatedProgress);
      
      // If we've been loading too long, cap at 90% to indicate we're waiting
      if (elapsed > 15000 && calculatedProgress > 90) {
        setProgress(90);
      }
    }, 100);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="w-16 h-16 relative">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-gray-400"></div>
        <div className="absolute top-0 left-0 w-16 h-16 flex items-center justify-center text-xs">
          {Math.round(progress)}%
        </div>
      </div>
      <p className="mt-4 text-center text-gray-500">{message}</p>
      
      {isStartup && elapsedTime > 10000 && (
        <div className="mt-4 max-w-md text-center text-xs text-gray-400">
          <p>Taking longer than expected to start...</p>
          <p>This might be due to validating authentication or initializing services.</p>
        </div>
      )}
    </div>
  );
};

export default Loading;
