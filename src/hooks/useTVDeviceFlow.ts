import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '@/api/client';
import { webPlatformAdapter } from '@/api/platform';

interface DeviceCodeResponse {
  deviceCode: string;
  userCode: string;
  verificationUrl: string;
  expiresIn: number;
}

interface UseTVDeviceFlowArgs {
  activeTab: 'web' | 'tv' | 'forgot' | 'reset';
  isLoggedIn: boolean;
}

// The TV QR sign-in flow: request a device+user code pair, show the QR/code,
// poll the server until another device authorizes it (or it expires). Starts
// polling whenever `activeTab` becomes 'tv' and tears it down otherwise —
// kept as one hook since startTVDeviceFlow/startPolling both close over the
// same pollIntervalRef and deviceStatus state.
export function useTVDeviceFlow({ activeTab, isLoggedIn }: UseTVDeviceFlowArgs) {
  const [deviceFlow, setDeviceFlow] = useState<DeviceCodeResponse | null>(null);
  const [deviceStatus, setDeviceStatus] = useState<'pending' | 'expired' | 'loading'>('loading');
  const pollIntervalRef = useRef<number | null>(null);

  const startPolling = useCallback((deviceCode: string) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    pollIntervalRef.current = window.setInterval(async () => {
      try {
        const response = await api.post<{ status: 'pending' | 'authorized' | 'expired'; accessToken?: string; refreshToken?: string; user?: { id: number; email: string; name: string; role: string } }>('/auth/device/poll', {
          deviceCode,
        });

        if (response.data) {
          const { status, accessToken, refreshToken, user } = response.data;
          if (status === 'authorized' && accessToken && refreshToken && user) {
            clearInterval(pollIntervalRef.current!);

            // Set context auth state
            webPlatformAdapter.storage.set('auth_token', accessToken);
            webPlatformAdapter.storage.set('refresh_token', refreshToken);
            webPlatformAdapter.storage.set('auth_user', JSON.stringify(user));

            toast.success(`Logged in as ${user.name}`);
            window.location.reload(); // Reload triggers AuthProvider init
          } else if (status === 'expired') {
            clearInterval(pollIntervalRef.current!);
            setDeviceStatus('expired');
          }
        }
      } catch (err) {
        console.error('Device poll error:', err);
      }
    }, 4000);
  }, []);

  const startTVDeviceFlow = useCallback(async () => {
    setDeviceStatus('loading');
    setDeviceFlow(null);
    try {
      const response = await api.post<DeviceCodeResponse>('/auth/device/code');
      if (response.data) {
        setDeviceFlow(response.data);
        setDeviceStatus('pending');
        startPolling(response.data.deviceCode);
      }
    } catch (error) {
      console.error('Failed to start TV device flow:', error);
      toast.error('Failed to generate TV login code.');
      setDeviceStatus('expired');
    }
  }, [startPolling]);

  useEffect(() => {
    if (activeTab === 'tv' && !isLoggedIn) {
      startTVDeviceFlow();
    } else {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    }

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [activeTab, isLoggedIn, startTVDeviceFlow]);

  const qrCodeUrl = deviceFlow
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&color=255-255-255&bgcolor=15-23-42&data=${encodeURIComponent(
        deviceFlow.verificationUrl
      )}`
    : '';

  return { deviceFlow, deviceStatus, startTVDeviceFlow, qrCodeUrl };
}
