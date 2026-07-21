import React, { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import { URL_PATHS } from '@/api/config';
import { isTizenDevice } from '@/utils/helpers';
import { SocketContext } from '@/context/useSocket';
import type { Device } from '@/context/SocketContextTypes';
import { useAuth } from '@/context/AuthContext';

// URL_PATHS.HOST can be the literal string '/' (same-origin, see api/config.ts's
// getServerUrl()) — socket.io-client's URL parser doesn't handle a bare '/' the
// way getBaseUrl() does for REST calls; it falls into a `loc.host + uri` branch
// that produces a malformed non-URI, which then gets misparsed into a garbage
// host. Resolve '/' to the actual page origin before handing it to io().
function getSocketUrl(): string {
  const host = URL_PATHS.HOST;
  return host === '/' ? window.location.origin : host;
}
const getIsReceiver = () => {
  const isTizen = isTizenDevice();
  const searchParams = new URLSearchParams(window.location.search);
  return isTizen || searchParams.get('device') === 'receiver';
};

export const SocketProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [receivers, setReceivers] = useState<Device[]>([]);
  const [activeUserCount, setActiveUserCount] = useState<number>(1);
  const [activeDevices, setActiveDevices] = useState<Device[]>([]);

  const isReceiver = getIsReceiver();
  const { user } = useAuth();

  useEffect(() => {
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
      deviceId = uuidv4();
      localStorage.setItem('device_id', deviceId);
    }
    const currentDeviceId = deviceId;
 
    const newSocket = io(getSocketUrl(), {
      transports: ['polling', 'websocket'],
      reconnection: true,
    });

    const handleListUpdate = (data: unknown) => {
      const list = (
        Array.isArray(data)
          ? data
          : (data as Record<string, unknown>).receivers || []
      ) as Device[];
      const filtered = list.filter((r: Device) => r.id !== currentDeviceId);
      setReceivers(filtered);
    };

    const handleActiveDevicesUpdate = (data: unknown) => {
      const list = (Array.isArray(data) ? data : []) as Device[];
      setActiveDevices(list);
    };

    newSocket.on('connect', () => {
      setIsConnected(true);
      
      const displayName = isReceiver ? 'TV' : 'Controller';
      const deviceName = `${displayName} (${currentDeviceId.substring(0, 4)})`;
      newSocket.emit('register', {
        id: currentDeviceId,
        name: deviceName,
        type: isReceiver ? 'receiver' : 'controller',
      });

      newSocket.emit('get_receivers');
      newSocket.emit('get_active_devices');
    });

    newSocket.on('receivers_updated', handleListUpdate);
    newSocket.on('receivers_list', handleListUpdate);

    newSocket.on('active_user_count', (count: number) => {
      setActiveUserCount(count);
    });

    newSocket.on('active_devices_updated', handleActiveDevicesUpdate);
    newSocket.on('active_devices_list', handleActiveDevicesUpdate);

    newSocket.on('config_changed', (data: { hash: string }) => {
      const currentHash = localStorage.getItem('config_hash');
      if (currentHash !== data.hash) {
        localStorage.setItem('config_hash', data.hash);
        if (currentHash) {
          window.dispatchEvent(new Event('config-changed'));
        }
      }
    });

    newSocket.on('disconnect', () => setIsConnected(false));

    setSocket(newSocket);

    return () => {
      newSocket.off('receivers_updated');
      newSocket.off('receivers_list');
      newSocket.off('active_user_count');
      newSocket.off('active_devices_updated');
      newSocket.off('active_devices_list');
      newSocket.off('config_changed');
      newSocket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!socket || !isConnected) return;
    const deviceId = localStorage.getItem('device_id') || '';
    const displayName = user?.name || user?.email || (isReceiver ? 'TV' : 'Controller');
    const deviceName = `${displayName} (${deviceId.substring(0, 4)})`;

    socket.emit('register', {
      id: deviceId,
      name: deviceName,
      type: isReceiver ? 'receiver' : 'controller',
    });
  }, [socket, isConnected, user?.name, user?.email, isReceiver]);

  const castTo = useCallback((
    targetDeviceId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    content: any,
    playbackInfo?: {
      currentTime?: number;
      volume?: number;
      muted?: boolean;
      subtitleTrackIndex?: number;
      audioTrackIndex?: number;
    }
  ) => {
    if (!socket) return;
    socket.emit('cast_command', {
      targetDeviceId,
      command: 'play',
      payload: {
        ...content,
        playbackInfo,
      },
    });
  }, [socket]);

  const refreshReceivers = useCallback(() => {
    if (socket && isConnected) {
      socket.emit('get_receivers');
    }
  }, [socket, isConnected]);

  // Memoized so consumers only re-render when a value they actually read
  // changes — this provider wraps the whole app and `activeUserCount` ticks
  // on socket broadcasts, so an unmemoized literal would re-render every
  // consumer (including ones only interested in e.g. `socket`) on every tick.
  const value = useMemo(
    () => ({
      socket,
      isConnected,
      receivers,
      isReceiver,
      activeUserCount,
      activeDevices,
      castTo,
      refreshReceivers,
    }),
    [socket, isConnected, receivers, isReceiver, activeUserCount, activeDevices, castTo, refreshReceivers]
  );

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
