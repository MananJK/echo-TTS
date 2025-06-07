
import React from 'react';
import { Slider } from '@/components/ui/slider';
import { Volume, Volume1, Volume2, VolumeX } from 'lucide-react';

interface VolumeControlProps {
  volume: number;
  onVolumeChange: (value: number) => void;
}

const VolumeControl: React.FC<VolumeControlProps> = ({ volume, onVolumeChange }) => {
  const getVolumeIcon = () => {
    if (volume === 0) return <VolumeX size={18} />;
    if (volume < 0.4) return <Volume size={18} />;
    if (volume < 0.7) return <Volume1 size={18} />;
    return <Volume2 size={18} />;
  };

  return (
    <div className="flex items-center gap-2 w-full max-w-xs">
      <div className="text-stream-accent">
        {getVolumeIcon()}
      </div>
      <Slider
        value={[volume]}
        min={0}
        max={1}
        step={0.01}
        onValueChange={(value) => onVolumeChange(value[0])}
        className="flex-1"
      />
      <span className="text-xs text-muted-foreground w-8 text-right">
        {Math.round(volume * 100)}%
      </span>
    </div>
  );
};

export default VolumeControl;
