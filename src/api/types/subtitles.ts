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

// TODO: verify actual server shape
export interface OnlineSubtitleResult {
  fileId: number;
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
