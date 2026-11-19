import React from 'react';
import { useMediaState } from '@vidstack/react';
import { useVideoContext } from '@/context/video';
import ActivityIndicator from '@/components/ui/ActivityIndicator';

export const BufferingOverlay = React.memo(() => {
  const { playerRef } = useVideoContext();
  const isBuffering = useMediaState('waiting', playerRef);
  if (!isBuffering) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
      <ActivityIndicator className="text-4xl text-accent" />
    </div>
  );
});

BufferingOverlay.displayName = 'BufferingOverlay';
