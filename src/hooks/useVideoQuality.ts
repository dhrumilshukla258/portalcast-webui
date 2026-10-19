import { useEffect, useState, type RefObject } from 'react';
import { reportMediaInfo } from '@/api/endpoints/mediaInfo';
import { describeVideo, snapFps } from '@/utils/videoQuality';

interface Identity {
  /** 'movie' | 'episode' for VOD; null for live (shown, never reported). */
  itemType: 'movie' | 'episode' | null;
  itemId: string | null;
}

type FrameCb = (now: number, meta: { mediaTime: number; presentedFrames: number }) => void;
type VideoWithRvfc = HTMLVideoElement & {
  requestVideoFrameCallback?: (cb: FrameCb) => number;
  cancelVideoFrameCallback?: (h: number) => void;
};

/**
 * What the browser is actually decoding: size from the <video> element, frame rate
 * measured from presented frames (requestVideoFrameCallback; null where unsupported).
 * Reports it to the server once per title so catalog badges stop trusting portal names.
 */
export function useVideoQuality(containerRef: RefObject<HTMLElement | null>, id: Identity, reloadKey: unknown): string | null {
  const [stats, setStats] = useState<string | null>(null);

  useEffect(() => {
    setStats(null);
    let video: VideoWithRvfc | null = null;
    let fps: number | null = null;
    let reported = '';
    let rvfcHandle = 0;
    let first: { mediaTime: number; frames: number } | null = null;
    let cancelled = false;

    const update = () => {
      if (!video || !video.videoWidth || !video.videoHeight) return;
      const w = video.videoWidth;
      const h = video.videoHeight;
      setStats(describeVideo(w, h, fps));
      if (id.itemType && id.itemId) {
        const k = `${id.itemType}:${id.itemId}:${w}x${h}:${fps ?? ''}`;
        if (k !== reported && (fps !== null || !video.requestVideoFrameCallback)) {
          reported = k;
          void reportMediaInfo({ itemType: id.itemType, itemId: id.itemId, width: w, height: h, fps });
        }
      }
    };

    const onFrame: FrameCb = (_now, meta) => {
      if (cancelled || !video) return;
      if (!first) first = { mediaTime: meta.mediaTime, frames: meta.presentedFrames };
      const dt = meta.mediaTime - first.mediaTime;
      const df = meta.presentedFrames - first.frames;
      if (dt >= 2 && df > 0) {
        fps = snapFps(df / dt);
        update();
        return; // measured once per title
      }
      rvfcHandle = video.requestVideoFrameCallback!(onFrame);
    };

    const attach = () => {
      const v = containerRef.current?.querySelector('video') as VideoWithRvfc | null;
      if (!v || v === video) return;
      video = v;
      v.addEventListener('loadedmetadata', update);
      v.addEventListener('resize', update);
      if (v.requestVideoFrameCallback) rvfcHandle = v.requestVideoFrameCallback(onFrame);
      update();
    };

    attach();
    const poll = window.setInterval(attach, 1000); // the provider swaps <video> on reloads
    return () => {
      cancelled = true;
      window.clearInterval(poll);
      if (video) {
        video.removeEventListener('loadedmetadata', update);
        video.removeEventListener('resize', update);
        if (rvfcHandle && video.cancelVideoFrameCallback) video.cancelVideoFrameCallback(rvfcHandle);
      }
    };
  }, [containerRef, id.itemType, id.itemId, reloadKey]);

  return stats;
}
