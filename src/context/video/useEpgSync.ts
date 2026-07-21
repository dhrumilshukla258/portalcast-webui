/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';

// Tracks the current/next EPG program for the active live channel, polling
// every 10s to advance as programs change. Extracted from VideoContext.tsx
// as a self-contained slice — its only inputs are contentType/channelInfo/
// epgData and it owns no refs or state anything else in the player depends on.
export function useEpgSync(
  contentType: 'movie' | 'series' | 'tv',
  channelInfo: any,
  epgData: any
) {
  const [currentProgram, setCurrentProgram] = useState<any | null>(null);
  const [nextProgram, setNextProgram] = useState<any | null>(null);
  const [programProgress, setProgramProgress] = useState(0);

  useEffect(() => {
    if (contentType !== 'tv' || !channelInfo || !epgData) return;
    const updateEPG = () => {
      const now = Date.now();
      const programs = epgData[channelInfo.id] || [];
      const current = programs.find(
        (p: any) =>
          now >= parseInt(p.start_timestamp) * 1000 &&
          now < parseInt(p.stop_timestamp) * 1000
      );
      setCurrentProgram(current || null);

      if (current) {
        const start = parseInt(current.start_timestamp) * 1000;
        const end = parseInt(current.stop_timestamp) * 1000;
        setProgramProgress(
          Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100))
        );
        setNextProgram(
          programs.find((p: any) => parseInt(p.start_timestamp) * 1000 >= end) || null
        );
      }
    };
    updateEPG();
    const interval = setInterval(updateEPG, 10000);
    return () => clearInterval(interval);
  }, [contentType, channelInfo, epgData]);

  return { currentProgram, nextProgram, programProgress };
}
