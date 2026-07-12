/* eslint-disable @typescript-eslint/no-explicit-any */

// TODO: verify actual server shape
export type DownloadLinkParams = Record<string, any>;

export interface DownloadLinkResponse {
  url: string;
}

export interface UploadFileResponse {
  success: boolean;
  url?: string;
  error?: string;
}
