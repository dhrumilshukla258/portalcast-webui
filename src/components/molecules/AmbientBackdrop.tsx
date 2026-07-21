import React from 'react';
import { URL_PATHS } from '@/api/config';
import type { MediaItem } from '@/types';

interface AmbientBackdropProps {
  // Pool of items to pull backdrop_path from — already scoped to whatever's
  // currently showing (a category's items, Discover's facets/rows, etc).
  items: MediaItem[];
  // How long each backdrop stays up before crossfading to the next one.
  rotateMs?: number;
  // Discover's items are TMDB-sourced and always carry a qualifying
  // backdrop_hd_path, so it never needs this. MainContentGrid's library
  // items (Movies/Series) mostly only ever get backdrop_path backfilled
  // (see useLibraryBackgroundRefresh) — without this, most categories have
  // zero eligible images and the grid falls back to a plain black page.
  // Blurred full-bleed, the resolution difference isn't visible.
  allowLowRes?: boolean;
}

// Full-bleed, blurred TMDB backdrop cycling behind a page's content —
// `position: fixed` so it stays put behind the grid as it scrolls, rather
// than scrolling away with the content. Shared by MainContentGrid (Movies/
// Series) and DiscoverView so all three sections get identical ambiance
// instead of three slightly-different reimplementations.
export const AmbientBackdrop: React.FC<AmbientBackdropProps> = ({ items, rotateMs = 45000, allowLowRes = false }) => {
  const [error, setError] = React.useState(false);

  const rawUrls = React.useMemo(() => {
    const baseUrl = URL_PATHS.HOST === '/' ? '' : URL_PATHS.HOST;
    return (items || [])
      .map((i) => i.backdrop_hd_path || (allowLowRes ? i.backdrop_path : undefined))
      .filter((path): path is string => !!path)
      .map((path) => (path.startsWith('http') ? path : `${baseUrl}/api/images${path}`));
  }, [items, allowLowRes]);

  // `items` gets a new array reference on every silent background refresh
  // (even when the backdrop-carrying items and their order haven't changed),
  // which would otherwise reset the rotation index below and yank the
  // backdrop back to the first item on every refresh. Keep a content-stable
  // version so only an actual change in the pool resets the rotation.
  const urlsKey = rawUrls.join('|');
  const urls = React.useMemo(() => rawUrls, [urlsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const [index, setIndex] = React.useState(0);

  React.useEffect(() => {
    setIndex(0);
  }, [urls]);

  React.useEffect(() => {
    if (urls.length < 2) return;
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % urls.length);
    }, rotateMs);
    return () => clearInterval(interval);
  }, [urls, rotateMs]);

  const currentUrl = urls[index] || null;

  React.useEffect(() => {
    setError(false);
  }, [currentUrl]);

  // True crossfade: the outgoing image fades out at the same time the
  // incoming one fades in (both driven by the same `settled` flag), instead
  // of the incoming fading in on top of a statically-opaque outgoing image,
  // which just looked like a brief double-exposure rather than a fade.
  const [displayedUrl, setDisplayedUrl] = React.useState(currentUrl);
  const [outgoingUrl, setOutgoingUrl] = React.useState<string | null>(null);
  const [settled, setSettled] = React.useState(true);

  React.useEffect(() => {
    if (currentUrl === displayedUrl) return;
    // A momentarily-empty pool (e.g. navigating into a season/episode list
    // with no backdrop-bearing items of its own) would otherwise crossfade
    // the backdrop out to nothing and back — sticky here means Movies/Series
    // keep showing their last backdrop through those gaps instead of
    // flickering to blank, matching Discover's always-something feel.
    if (!currentUrl) return;
    setOutgoingUrl(displayedUrl);
    setDisplayedUrl(currentUrl);
    setSettled(false);
    const raf = requestAnimationFrame(() => setSettled(true));
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUrl]);

  if (error || (!displayedUrl && !outgoingUrl)) return null;

  return (
    <>
      {/* No blur on the image itself — the ambient backdrop on the main
          browsing pages is meant to read as a dimmed, vivid image (opacity +
          the dark gradient below do that), not a soft blurred wash. */}
      {outgoingUrl && (
        <img
          src={outgoingUrl}
          alt=""
          aria-hidden="true"
          className={`pointer-events-none fixed inset-0 -z-10 h-full w-full object-cover brightness-110 transition-opacity duration-[1500ms] ease-in-out ${
            settled ? 'opacity-0' : 'opacity-70'
          }`}
        />
      )}
      {displayedUrl && (
        <img
          src={displayedUrl}
          alt=""
          aria-hidden="true"
          className={`pointer-events-none fixed inset-0 -z-10 h-full w-full object-cover brightness-110 transition-opacity duration-[1500ms] ease-in-out ${
            settled ? 'opacity-70' : 'opacity-0'
          }`}
          onError={() => setError(true)}
          onTransitionEnd={() => setOutgoingUrl(null)}
        />
      )}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-[#030305]/5 via-[#030305]/35 to-[#030305]/80" />
    </>
  );
};

export default AmbientBackdrop;
