import React from 'react';
import { Activity, Monitor, Smartphone } from 'lucide-react';
import type { Device } from '@/context/SocketContextTypes';

const ActiveSessionsPanel: React.FC<{ activeDevices: Device[] }> = ({ activeDevices }) => {
  return (
    <div className="bg-gray-900/30 border border-gray-800 rounded-3xl p-6 backdrop-blur-md space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400 relative">
            <Activity className="w-5 h-5" />
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
            </span>
          </div>
          <div className="text-left">
            <h3 className="font-bold text-white text-lg">Currently Active Sessions</h3>
            <p className="text-xs text-gray-500">Real-time status of clients connected to the server.</p>
          </div>
        </div>
        <span className="bg-green-500/10 border border-green-500/20 text-green-400 font-black px-3 py-1 rounded-full text-xs">
          {activeDevices.length} Active
        </span>
      </div>

      {activeDevices.length === 0 ? (
        <div className="text-center py-6 text-sm text-gray-500 italic border border-dashed border-gray-800 rounded-2xl bg-gray-950/20">
          No active connections detected.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeDevices.map((device) => (
            <div
              key={device.socketId || device.id}
              className="flex items-center space-x-3.5 bg-gray-950/40 border border-gray-800/60 rounded-2xl p-4 hover:border-gray-700/80 transition-all duration-200"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                device.type === 'receiver'
                  ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
                  : 'bg-purple-500/10 border border-purple-500/20 text-purple-400'
              }`}>
                {device.type === 'receiver' ? <Monitor className="w-5 h-5" /> : <Smartphone className="w-5 h-5" />}
              </div>
              <div className="text-left flex-1 min-w-0">
                <div className="font-bold text-white text-sm truncate">{device.name}</div>
                <div className="text-[11px] text-gray-500 mt-0.5 flex items-center justify-between">
                  <span className="capitalize">{device.type}</span>
                  <span className="font-mono text-gray-600 truncate ml-2">{device.ip || 'Unknown IP'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActiveSessionsPanel;
