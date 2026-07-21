/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useMemo, useRef, useState } from 'react';
import { formatTime } from '@/utils/helpers';
import type { SeekOverlayData } from '@/types';

// Owns the "hold skip button to accelerate seek distance" behavior and its
// overlay — extracted from VideoContext.tsx. Needs `showControlsAndCursor`
// from the parent (controls-visibility is owned there) for the non-left/right
// skip case.
export function useVideoSeek(
  playerRef: React.RefObject<any>,
  showControlsAndCursor: () => void,
  setControlsVisible: (v: boolean) => void
) {
  const seekRunTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seekRunStart = useRef<number | null>(null);
  const seekRunLevel = useRef<number>(0);
  const seekRunDirection = useRef<number>(0);
  const seekFadeOutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [seekOverlay, setSeekOverlay] = useState<SeekOverlayData | null>(null);

  const SEEK_LEVELS = useMemo(() => [10, 30, 60, 180], []);

  const handleSkipButtonClick = useCallback(
    (seconds: number, isLeftRight: boolean = false) => {
      const player = playerRef.current;
      if (!player) return;

      const direction = seconds > 0 ? 1 : -1;

      const currentDuration = player.state?.duration || player.duration || 0;
      const currentTime = player.state?.currentTime || player.currentTime || 0;

      if (seekRunTimer.current) clearTimeout(seekRunTimer.current);
      if (seekFadeOutTimer.current) clearTimeout(seekFadeOutTimer.current);

      if (
        seekRunStart.current === null ||
        seekRunDirection.current !== direction
      ) {
        seekRunStart.current = currentTime;
        seekRunLevel.current = 0;
        seekRunDirection.current = direction;
      } else {
        seekRunLevel.current += 1;
      }

      const maxLevelIndex = SEEK_LEVELS.length - 1;
      const offset =
        seekRunLevel.current <= maxLevelIndex
          ? SEEK_LEVELS[seekRunLevel.current]
          : SEEK_LEVELS[maxLevelIndex] +
            (seekRunLevel.current - maxLevelIndex) * 60;

      const targetTime = Math.max(
        0,
        Math.min(currentDuration, seekRunStart.current! + offset * direction)
      );

      player.currentTime = targetTime;

      setSeekOverlay({
        visible: true,
        text: `${direction > 0 ? '+' : '-'}${offset}s`,
        time: formatTime(targetTime),
        isLeftRight,
      });

      if (!isLeftRight) {
        showControlsAndCursor();
      }

      seekRunTimer.current = setTimeout(() => {
        seekRunStart.current = null;
        seekRunLevel.current = 0;
        if (isLeftRight) {
          setControlsVisible(false);
        }
        seekFadeOutTimer.current = setTimeout(() => {
          setSeekOverlay(null);
          seekFadeOutTimer.current = null;
        }, 300);
      }, 1500);
    },
    [SEEK_LEVELS, showControlsAndCursor, setControlsVisible, playerRef]
  );

  return { seekOverlay, handleSkipButtonClick };
}
