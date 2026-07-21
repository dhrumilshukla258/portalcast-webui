import React from 'react';
import { Globe, ShieldCheck } from 'lucide-react';
import type { Config } from '@/hooks/useConfigTabActions';

interface ConnectionFormProps {
  config: Config;
  setConfig: React.Dispatch<React.SetStateAction<Config>>;
  handleInputChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => void;
  onImportClick: () => void;
}

// Connection Details + Credentials sections — the left column of the Config
// tab's two-column layout.
const ConnectionForm: React.FC<ConnectionFormProps> = ({
  config,
  setConfig,
  handleInputChange,
  onImportClick,
}) => {
  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-gray-800 bg-gray-900/30 p-6 backdrop-blur-md">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="text-blue-500" size={20} />
            <h3 className="text-lg font-bold text-white">
              Connection Details
            </h3>
          </div>
          <button
            type="button"
            onClick={onImportClick}
            className="text-xs font-bold text-blue-400 hover:underline"
          >
            Import URL
          </button>
        </div>

        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-gray-950 p-1">
            {['stalker', 'xtream'].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() =>
                  setConfig((p) => ({
                    ...p,
                    providerType: type as 'stalker' | 'xtream',
                  }))
                }
                className={`rounded-lg py-2 text-xs font-black uppercase transition-all ${
                  config.providerType === type
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <div>
              <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-500">
                Server Hostname
              </label>
              <input
                name="hostname"
                value={config.hostname}
                onChange={handleInputChange}
                className="mt-1 w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-sm outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="portal.example.com"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-500">
                  Port
                </label>
                <input
                  name="port"
                  value={config.port}
                  onChange={handleInputChange}
                  className="mt-1 w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-500">
                  Context
                </label>
                <input
                  name="contextPath"
                  value={config.contextPath}
                  onChange={handleInputChange}
                  className="mt-1 w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-sm outline-none focus:border-blue-500"
                  placeholder="/c/"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-6 border-t border-gray-800 pt-5">
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                name="proxy"
                checked={config.proxy}
                onChange={handleInputChange}
                className="h-4 w-4 rounded border-gray-700 bg-gray-800 text-blue-600"
              />
              <span className="text-sm font-bold text-gray-300">
                HTTP Proxy
              </span>
            </label>
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                name="playCensored"
                checked={config.playCensored}
                onChange={handleInputChange}
                className="h-4 w-4 rounded border-gray-700 bg-gray-800 text-red-600"
              />
              <span className="text-sm font-bold text-gray-300">
                Adult Content
              </span>
            </label>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-gray-800 bg-gray-900/30 p-6 backdrop-blur-md">
        <div className="mb-6 flex items-center gap-2">
          <ShieldCheck className="text-blue-500" size={20} />
          <h3 className="text-lg font-bold text-white">
            Credentials
          </h3>
        </div>

        {config.providerType === 'xtream' ? (
          <div className="space-y-4">
            <div>
              <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-500">
                Username
              </label>
              <input
                name="username"
                value={config.username}
                onChange={handleInputChange}
                className="mt-1 w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-sm outline-none transition-all focus:border-blue-500"
              />
            </div>
            <div>
              <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-500">
                Password
              </label>
              <input
                name="password"
                type="text"
                value={config.password}
                onChange={handleInputChange}
                className="mt-1 w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-sm outline-none transition-all focus:border-blue-500"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-500">
                MAC Address
              </label>
              <input
                name="mac"
                value={config.mac}
                onChange={handleInputChange}
                placeholder="00:1A:79:..."
                className="mt-1 w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 font-mono text-sm outline-none transition-all focus:border-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-500">
                  STB Model
                </label>
                <input
                  name="stbType"
                  value={config.stbType}
                  onChange={handleInputChange}
                  placeholder="MAG250"
                  className="mt-1 w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-sm outline-none transition-all focus:border-blue-500"
                />
              </div>
              <div>
                <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-500">
                  Serial Number
                </label>
                <input
                  name="serialNumber"
                  value={config.serialNumber}
                  onChange={handleInputChange}
                  className="mt-1 w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-sm outline-none transition-all focus:border-blue-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-500">
                  Device ID 1
                </label>
                <input
                  name="deviceId1"
                  value={config.deviceId1}
                  onChange={handleInputChange}
                  className="mt-1 w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-xs outline-none transition-all focus:border-blue-500"
                />
              </div>
              <div>
                <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-500">
                  Device ID 2
                </label>
                <input
                  name="deviceId2"
                  value={config.deviceId2}
                  onChange={handleInputChange}
                  className="mt-1 w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-xs outline-none transition-all focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default ConnectionForm;
