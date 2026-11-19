import type { MediaStorage } from '@vidstack/react';

const noPreference = async () => null;

// Vidstack awaits getTime and seeks the provider before it starts autoplay.
export function playbackPositionStorage(
  initialTime: number | undefined,
  readSavedTime: () => Promise<number>,
): MediaStorage {
  let position = Number.isFinite(initialTime) ? initialTime : undefined;
  return {
    async getTime() {
      if (position === undefined) position = await readSavedTime().catch(() => 0);
      return Number.isFinite(position) && position > 2 ? position : 0;
    },
    async setTime(time, ended) {
      // A replacement provider reports zero while loading. Keep the last playhead for it.
      if (ended) position = 0;
      else if (time > 0 && Number.isFinite(time)) position = time;
    },
    getVolume: noPreference,
    getMuted: noPreference,
    getAudioGain: noPreference,
    getPlaybackRate: noPreference,
    getVideoQuality: noPreference,
    getCaptions: noPreference,
    getLang: noPreference,
  };
}
