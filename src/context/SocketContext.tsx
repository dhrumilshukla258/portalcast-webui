import React, { useEffect, useState, type ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import { URL_PATHS } from '@/api/config';
import { isTizenDevice } from '@/utils/helpers';
import { SocketContext } from '@/context/useSocket';
import type { Device } from '@/context/SocketContextTypes';
import { useAuth } from '@/context/AuthContext';

const SOCKET_URL = URL_PATHS.HOST;
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
 
    const newSocket = io(SOCKET_URL, {
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

  const castTo = (
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
  };

  const refreshReceivers = () => {
    if (socket && isConnected) {
      socket.emit('get_receivers');
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        receivers,
        isReceiver,
        activeUserCount,
        activeDevices,
        castTo,
        refreshReceivers,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};
