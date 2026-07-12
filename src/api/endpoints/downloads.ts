/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from '@/api/client';
import type { DownloadLinkResponse, UploadFileResponse } from '@/api/types/downloads';

export const getDownloadLink = async (
  params: Record<string, any> = {}
): Promise<DownloadLinkResponse> =>
  (await api.get<DownloadLinkResponse>('/v2/download-link', { params })).data;

export const uploadFile = async (
  file: File
): Promise<UploadFileResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    // Ippo clean-aa unga api pattern mapping direct fallback execute aagum! 🚀
    const response = await api.post<UploadFileResponse>(
      '/upload',
      formData
    );

    return response.data;
  } catch (err: any) {
    console.error('File upload failed:', err);
    return {
      success: false,
      error: err.message || 'Upload failed'
    };
  }
};
