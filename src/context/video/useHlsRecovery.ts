/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { isHLSProvider, type MediaProviderAdapter } from '@vidstack/react';
import { authFetch } from '@/api/client';

// Owns the hls.js error-recovery/retry state machine — extracted from
// VideoContext.tsx. This is the logic behind the "channel keeps
// reconnecting" investigation: vidstack only auto-recovers fatal *media*
// errors itself; fatal *network* errors reach `handleError` with no attempt
// at recovery, so this tries hls.js's own in-place `startLoad()` first and
// only falls back to a full player remount (new `reloadTrigger`, which
// re-fetches the manifest as a brand-new session) as a last resort.
export function useHlsRecovery(
  contentType: 'movie' | 'series' | 'tv',
  streamUrl: string | null | undefined,
  playerRef: React.RefObject<any>
) {
  const hlsInstanceRef = useRef<any>(null);
  const mediaErrorRecoveryAttempted = useRef(false);
  const isRetrying = useRef(false);

  const [retryCount, setRetryCount] = useState(0);
  const [reloadTrigger, setReloadTrigger] = useState(0);
  const [isRecovering, setIsRecovering] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);

  // Called whenever playback genuinely succeeds (canplay) or a new stream
  // starts — clears out retry/recovery bookkeeping from the previous session.
  const resetRecoveryState = useCallback(() => {
    setIsRecovering(false);
    isRetrying.current = false;
    setRetryCount(0);
    mediaErrorRecoveryAttempted.current = false;
  }, []);

  const onProviderChange = useCallback(
    (provider: MediaProviderAdapter | null) => {
      if (provider && isHLSProvider(provider)) {
        provider.config = {
          enableSoftwareAES: true,
          enableWorker: true,
          stretchShortVideoTrack: true,
          manifestLoadingTimeOut: 30000, // 30s
          manifestLoadingMaxRetry: 10,
          manifestLoadingRetryDelay: 1000,
          levelLoadingTimeOut: 30000, // 30s
          levelLoadingMaxRetry: 10,
          levelLoadingRetryDelay: 1000,
          fragLoadingTimeOut: 30000, // 30s
          fragLoadingMaxRetry: 10,
          fragLoadingRetryDelay: 1000,
        };

        // Listen for hls.js instances and attach error listeners
        (provider as any).onInstance?.((hlsInstance: any) => {
          hlsInstanceRef.current = hlsInstance;
          if (!hlsInstance) return;
          mediaErrorRecoveryAttempted.current = false;
          hlsInstance.on('hlsError', (_event: any, data: any) => {
            // Non-fatal errors (a single dropped fragment, a level load
            // hiccup, etc.) are already being retried internally by hls.js
            // per the fragLoadingMaxRetry/levelLoadingMaxRetry config above —
            // acting on them here (tearing down the whole player) just races
            // hls.js's own recovery and is what caused the "reconnecting" loop
            // even while segments were loading fine (VLC, hitting the same
            // proxy URL, never sees this because it has no such layer).
            if (!data.fatal) return;

            const isNetwork404 =
              data.response?.status === 404 ||
              data.response?.code === 404 ||
              data.details?.includes('404') ||
              data.reason?.includes('404');

            if (isNetwork404) {
              if (contentType === 'tv') {
                setStreamError('Channel is not available 404 status');
                setIsRecovering(false);
              }
              return;
            }

            // For other fatal errors, try hls.js's own in-place recovery
            // (recommended by hls.js docs) before falling back to the
            // destructive full-player remount in handleError — that remount
            // re-fetches the manifest as a brand-new session (new server
            // token) and is visibly disruptive, so it should be the last
            // resort, not the first response to a fatal error.
            if (data.type === 'networkError') {
              try {
                hlsInstance.startLoad();
                return;
              } catch (e) {
                console.error('[VideoPlayer] startLoad() failed, falling back to remount', e);
              }
            } else if (data.type === 'mediaError' && !mediaErrorRecoveryAttempted.current) {
              mediaErrorRecoveryAttempted.current = true;
              try {
                hlsInstance.recoverMediaError();
                return;
              } catch (e) {
                console.error('[VideoPlayer] recoverMediaError() failed, falling back to remount', e);
              }
            }
          });
        });
      }
    },
    [contentType]
  );

  const handleError = useCallback(
    async (event: any) => {
      if (isRetrying.current) return;
      const error = event?.detail || event?.error || playerRef.current?.error || playerRef.current?.state?.error;

      let is404 = false;
      if (
        error?.code === 4 ||
        error?.message?.includes('404') ||
        String(error)?.includes('404')
      ) {
        is404 = true;
      }

      // vidstack's HLS provider only auto-recovers fatal *media* errors
      // (it calls hls.recoverMediaError() itself); fatal *network* errors go
      // straight to this handler with no attempt at recovery. hls.js's own
      // docs recommend hls.startLoad() as the cheap, in-place fix for those —
      // try it once before falling back to a full player remount, which tears
      // down and re-fetches everything as a brand-new session (visible
      // freeze, new server-side token) for what's often just a momentary
      // network blip that a live stream naturally recovers from on retry.
      if (!is404 && contentType === 'tv' && !mediaErrorRecoveryAttempted.current && hlsInstanceRef.current) {
        mediaErrorRecoveryAttempted.current = true;
        try {
          hlsInstanceRef.current.startLoad();
          return;
        } catch (e) {
          console.error('[VideoPlayer] startLoad() recovery failed, continuing to remount path', e);
        }
      }

      // Check stream URL status directly if we suspect a network/resource error
      if (!is404 && streamUrl && contentType === 'tv') {
        try {
          // Perform a fast HEAD request to check URL status
          const response = await authFetch(streamUrl, { method: 'HEAD' });
          if (response.status === 404) {
            is404 = true;
          }
        } catch {
          // Try with GET and a short timeout
          try {
            const response = await authFetch(streamUrl, { signal: AbortSignal.timeout(2000) });
            if (response.status === 404) {
              is404 = true;
            }
          } catch (err) {
            console.error('[VideoPlayer] Fetch check for 404 failed:', err);
          }
        }
      }

      if (is404) {
        if (contentType === 'tv') {
          setStreamError('Channel is not available 404 status');
          setIsRecovering(false);
          return;
        }
      }

      if (
        error?.code === 4 ||
        error?.message?.includes('500')
      ) {
        toast.error('Stream error. Please try another source.');
        return;
      }

      if (retryCount < 10) {
        isRetrying.current = true;
        setIsRecovering(true);
        setTimeout(
          () => {
            setRetryCount((prev) => prev + 1);
            setReloadTrigger((prev) => prev + 1);
            setIsRecovering(false);
            // A remount (reloadTrigger) doesn't change streamUrl, so the
            // resetRecoveryState effect keyed on [streamUrl, rawStreamUrl]
            // never refires here — without this, if the freshly remounted
            // player fails again, handleError's isRetrying.current guard at
            // the top would silently swallow every subsequent error forever,
            // breaking the exponential-backoff retry chain after exactly one
            // attempt.
            isRetrying.current = false;
          },
          Math.min(1000 * Math.pow(2, retryCount), 5000)
        );
      } else {
        toast.error('Failed to load stream after multiple attempts');
        setIsRecovering(false);
      }
    },
    [retryCount, contentType, streamUrl, playerRef]
  );

  return {
    retryCount,
    reloadTrigger,
    isRecovering,
    streamError,
    setStreamError,
    setRetryCount,
    setReloadTrigger,
    resetRecoveryState,
    onProviderChange,
    handleError,
  };
}
