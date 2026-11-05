/* eslint-disable @typescript-eslint/no-explicit-any */

// TODO: verify actual server shape
export interface SubtitleProbeTrack {
  index: number;
  title?: string;
  language?: string;
}

// TODO: verify actual server shape
export interface SubtitleProbeResponse {
  subtitles?: SubtitleProbeTrack[];
  [key: string]: any;
}

export interface MappedSubtitleTrack {
  src: string;
  label: string;
  srclang: string;
  id: number | string;
}

export interface OnlineSubtitleResult {
  /** OpenSubtitles file id (0 for other sources); older servers only know this. */
  fileId: number;
  /** "os:<fileId>" | "subdl:<path>" (servers from 2026-10-19). */
  downloadId?: string;
  source?: 'opensubtitles' | 'subdl' | 'gestdown' | 'jellyfin';
  /** Made for exactly the file playing (servers from 2026-10-29). */
  exactMatch?: boolean;
  /** Viewers who kept it on for this very movie or episode (servers from 2026-11-04): listed first. */
  kept?: number;
  /** The timing they used, in ms (+ later): applied when this viewer has none of their own. */
  keptDelayMs?: number;
  language: string;
  releaseName: string;
  [key: string]: any;
}

// TODO: verify actual server shape
export interface OnlineSubtitleSearchResponse {
  results?: OnlineSubtitleResult[];
}

export interface OpenSubtitlesLinkStatus {
  linked: boolean;
  username: string | null;
}
