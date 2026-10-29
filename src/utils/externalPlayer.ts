// "Open in…" another player (owner 2026-10-29: "support any external player the user wants").
// The player gets the same short-lived stream link the built-in player uses: a token on this
// server, never the provider's or Jellyfin's address. Each platform has its own way in:
//   Android: an intent: link (a chosen app, or Android's own "Open with" chooser)
//   iPhone/iPad: the app's URL scheme (VLC, Infuse, nPlayer)
//   Computers: a one-entry .m3u playlist (opens in VLC, mpv, PotPlayer, IINA…), or the copied link
import { getServerUrl } from '@/api/config';

export type ExternalPlatform = 'android' | 'ios' | 'desktop';

export interface ExternalChoice {
  id: string;
  label: string;
  /** A link to open (`href`), or a file to save (`playlist`), or the link to copy (`copy`). */
  action: 'href' | 'playlist' | 'copy';
  href?: string;
}

export function externalPlatform(ua: string = navigator.userAgent): ExternalPlatform {
  if (/Android/i.test(ua)) return 'android';
  // iPadOS reports itself as a Mac; touch tells them apart.
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1)) return 'ios';
  return 'desktop';
}

/** The stream link as a full address another app can open. */
export function absoluteStreamUrl(streamUrl: string, origin: string = window.location.origin): string {
  const host = getServerUrl();
  const base = !host || host === '/' ? origin : host;
  return new URL(streamUrl, base.endsWith('/') ? base : `${base}/`).href;
}

const ANDROID_APPS: { id: string; label: string; pkg: string }[] = [
  { id: 'vlc', label: 'VLC', pkg: 'org.videolan.vlc' },
  { id: 'mx', label: 'MX Player', pkg: 'com.mxtech.videoplayer.ad' },
  { id: 'just', label: 'Just Player', pkg: 'com.brouken.player' },
];

function androidIntent(url: string, title: string, pkg?: string): string {
  const u = new URL(url);
  const rest = url.slice(u.protocol.length + 2); // without "https://"
  const type = /m3u8/i.test(url) ? 'application/x-mpegURL' : 'video/*';
  const extras = [`S.title=${encodeURIComponent(title)}`, pkg ? `package=${pkg}` : ''].filter(Boolean).join(';');
  return `intent://${rest}#Intent;scheme=${u.protocol.replace(':', '')};action=android.intent.action.VIEW;type=${type};${extras};end`;
}

/** What "Open in…" offers on this device. */
export function externalChoices(url: string, title: string, platform: ExternalPlatform = externalPlatform()): ExternalChoice[] {
  const enc = encodeURIComponent(url);
  const copy: ExternalChoice = { id: 'copy', label: 'Copy stream link', action: 'copy' };
  if (platform === 'android') {
    return [
      { id: 'any', label: 'Choose an app…', action: 'href', href: androidIntent(url, title) },
      ...ANDROID_APPS.map((a) => ({ id: a.id, label: a.label, action: 'href' as const, href: androidIntent(url, title, a.pkg) })),
      copy,
    ];
  }
  if (platform === 'ios') {
    return [
      { id: 'vlc', label: 'VLC', action: 'href', href: `vlc-x-callback://x-callback-url/stream?url=${enc}` },
      { id: 'infuse', label: 'Infuse', action: 'href', href: `infuse://x-callback-url/play?url=${enc}` },
      { id: 'nplayer', label: 'nPlayer', action: 'href', href: `nplayer-${url}` },
      copy,
    ];
  }
  return [
    { id: 'playlist', label: 'Open in VLC, mpv… (.m3u)', action: 'playlist' },
    copy,
  ];
}

/** A one-entry playlist: any desktop player opens it and plays the stream. */
export function playlistFile(url: string, title: string): string {
  return `#EXTM3U\n#EXTINF:-1,${title.replace(/[\r\n]+/g, ' ')}\n${url}\n`;
}

/** A file name safe on every system. */
export function playlistName(title: string): string {
  return `${(title || 'PortalCast').replace(/[^\w\s.-]+/g, '').trim().slice(0, 80) || 'PortalCast'}.m3u`;
}
