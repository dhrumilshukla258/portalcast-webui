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
      <section className="rounded-3xl border border-line bg-panel/30 p-6 backdrop-blur-md">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="text-accent" size={20} />
            <h3 className="text-lg font-bold text-fg">
              Connection Details
            </h3>
          </div>
          <button
            type="button"
            onClick={onImportClick}
            className="text-xs font-bold text-accent hover:underline"
          >
            Import URL
          </button>
        </div>

        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-2 rounded-xl bg-page p-1">
            {['stalker', 'xtream', 'm3u'].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() =>
                  setConfig((p) => ({
                    ...p,
                    providerType: type as 'stalker' | 'xtream' | 'm3u',
                  }))
                }
                className={`rounded-lg py-2 text-xs font-black uppercase transition-all ${
                  config.providerType === type
                    ? 'bg-action text-on-action shadow-lg'
                    : 'text-fg-subtle hover:text-fg-soft'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {config.providerType === 'm3u' ? (
            <div className="space-y-4">
              <div>
                <label className="ml-1 text-3xs font-black uppercase tracking-widest text-fg-subtle">
                  Playlist link (M3U)
                </label>
                <input
                  name="m3uUrl"
                  type="url"
                  value={config.m3uUrl ?? ''}
                  onChange={handleInputChange}
                  className="mt-1 w-full rounded-xl border border-line bg-page px-4 py-3 text-sm outline-hidden transition-all focus:border-focus focus:ring-1 focus:ring-focus"
                  placeholder="http://provider.example/get.php?username=…&type=m3u_plus"
                />
              </div>
              <div>
                <label className="ml-1 text-3xs font-black uppercase tracking-widest text-fg-subtle">
                  Guide link (XMLTV, optional)
                </label>
                <input
                  name="xmltvUrl"
                  type="url"
                  value={config.xmltvUrl ?? ''}
                  onChange={handleInputChange}
                  className="mt-1 w-full rounded-xl border border-line bg-page px-4 py-3 text-sm outline-hidden transition-all focus:border-focus focus:ring-1 focus:ring-focus"
                  placeholder="Empty: the guide link inside the playlist"
                />
              </div>
              <p className="ml-1 text-xs text-fg-subtle">
                Live channels, movies and series are read from the playlist (refreshed daily); stored encrypted.
              </p>
            </div>
          ) : (
          <div className="space-y-4">
            <div>
              <label className="ml-1 text-3xs font-black uppercase tracking-widest text-fg-subtle">
                Server Hostname
              </label>
              <input
                name="hostname"
                value={config.hostname}
                onChange={handleInputChange}
                className="mt-1 w-full rounded-xl border border-line bg-page px-4 py-3 text-sm outline-hidden transition-all focus:border-focus focus:ring-1 focus:ring-focus"
                placeholder="portal.example.com"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="ml-1 text-3xs font-black uppercase tracking-widest text-fg-subtle">
                  Port
                </label>
                <input
                  name="port"
                  value={config.port}
                  onChange={handleInputChange}
                  className="mt-1 w-full rounded-xl border border-line bg-page px-4 py-3 text-sm outline-hidden focus:border-focus"
                />
              </div>
              <div>
                <label className="ml-1 text-3xs font-black uppercase tracking-widest text-fg-subtle">
                  Context
                </label>
                <input
                  name="contextPath"
                  value={config.contextPath}
                  onChange={handleInputChange}
                  className="mt-1 w-full rounded-xl border border-line bg-page px-4 py-3 text-sm outline-hidden focus:border-focus"
                  placeholder="/c/"
                />
              </div>
            </div>
          </div>

          )}
          <div className="flex gap-6 border-t border-line pt-5">
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                name="proxy"
                checked={config.proxy}
                onChange={handleInputChange}
                className="h-4 w-4 rounded-sm border-line-strong bg-panel-raised text-accent"
              />
              <span className="text-sm font-bold text-fg-soft">
                HTTP Proxy
              </span>
            </label>
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                name="playCensored"
                checked={config.playCensored}
                onChange={handleInputChange}
                className="h-4 w-4 rounded-sm border-line-strong bg-panel-raised text-red-600"
              />
              <span className="text-sm font-bold text-fg-soft">
                Adult Content
              </span>
            </label>
          </div>
        </div>
      </section>

      {/* M3U: the playlist link carries the account; no portal credentials. */}
      {config.providerType !== 'm3u' && (
      <section className="rounded-3xl border border-line bg-panel/30 p-6 backdrop-blur-md">
        <div className="mb-6 flex items-center gap-2">
          <ShieldCheck className="text-accent" size={20} />
          <h3 className="text-lg font-bold text-fg">
            Credentials
          </h3>
        </div>

        {config.providerType === 'xtream' ? (
          <div className="space-y-4">
            <div>
              <label className="ml-1 text-3xs font-black uppercase tracking-widest text-fg-subtle">
                Username
              </label>
              <input
                name="username"
                value={config.username}
                onChange={handleInputChange}
                className="mt-1 w-full rounded-xl border border-line bg-page px-4 py-3 text-sm outline-hidden transition-all focus:border-focus"
              />
            </div>
            <div>
              <label className="ml-1 text-3xs font-black uppercase tracking-widest text-fg-subtle">
                Password
              </label>
              <input
                name="password"
                type="text"
                value={config.password}
                onChange={handleInputChange}
                className="mt-1 w-full rounded-xl border border-line bg-page px-4 py-3 text-sm outline-hidden transition-all focus:border-focus"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="ml-1 text-3xs font-black uppercase tracking-widest text-fg-subtle">
                MAC Address
              </label>
              <input
                name="mac"
                value={config.mac}
                onChange={handleInputChange}
                placeholder="00:1A:79:..."
                className="mt-1 w-full rounded-xl border border-line bg-page px-4 py-3 font-mono text-sm outline-hidden transition-all focus:border-focus"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="ml-1 text-3xs font-black uppercase tracking-widest text-fg-subtle">
                  STB Model
                </label>
                <input
                  name="stbType"
                  value={config.stbType}
                  onChange={handleInputChange}
                  placeholder="MAG250"
                  className="mt-1 w-full rounded-xl border border-line bg-page px-4 py-3 text-sm outline-hidden transition-all focus:border-focus"
                />
              </div>
              <div>
                <label className="ml-1 text-3xs font-black uppercase tracking-widest text-fg-subtle">
                  Serial Number
                </label>
                <input
                  name="serialNumber"
                  value={config.serialNumber}
                  onChange={handleInputChange}
                  className="mt-1 w-full rounded-xl border border-line bg-page px-4 py-3 text-sm outline-hidden transition-all focus:border-focus"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="ml-1 text-3xs font-black uppercase tracking-widest text-fg-subtle">
                  Device ID 1
                </label>
                <input
                  name="deviceId1"
                  value={config.deviceId1}
                  onChange={handleInputChange}
                  className="mt-1 w-full rounded-xl border border-line bg-page px-4 py-3 text-xs outline-hidden transition-all focus:border-focus"
                />
              </div>
              <div>
                <label className="ml-1 text-3xs font-black uppercase tracking-widest text-fg-subtle">
                  Device ID 2
                </label>
                <input
                  name="deviceId2"
                  value={config.deviceId2}
                  onChange={handleInputChange}
                  className="mt-1 w-full rounded-xl border border-line bg-page px-4 py-3 text-xs outline-hidden transition-all focus:border-focus"
                />
              </div>
            </div>
          </div>
        )}
      </section>
      )}
    </div>
  );
};

export default ConnectionForm;
