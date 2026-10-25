import React, { useState } from 'react';
import { Settings, Captions, Trash2, Shield, LogOut, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import OpenSubtitlesModal from '@/components/molecules/OpenSubtitlesModal';
import type { HeaderProps } from '@/components/organisms/layout/Header';

/**
 * The TV apps' header (docs/design-system.md, Navigation): the logo, then the five tabs as text
 * (the current one white with a primary underline), a Settings button on the right. Resting on a
 * tab opens it (tv/remote.ts); Up from the content lands on the current tab.
 */
const TvHeader: React.FC<HeaderProps> = ({
  contentType,
  handleContentTypeChange,
  isDiscoverActive = false,
  onSelectDiscover,
  isSearchActive = false,
  onSelectSearch,
  isMyListActive = false,
  onSelectMyList,
  isSportsActive = false,
  onSelectSports,
  isPeopleActive = false,
  typedHome,
  handleClearWatched,
}) => {
  const overlayActive = isDiscoverActive || isSearchActive || isMyListActive || isSportsActive || isPeopleActive || !!typedHome;
  const homeActive = isDiscoverActive || !!typedHome || isPeopleActive || (!overlayActive && contentType !== 'tv');
  const liveActive = !overlayActive && contentType === 'tv';
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [subtitlesOpen, setSubtitlesOpen] = useState(false);

  const tabs: { label: string; active: boolean; onSelect?: () => void }[] = [
    { label: 'Home', active: homeActive, onSelect: onSelectDiscover },
    { label: 'Live TV', active: liveActive, onSelect: () => handleContentTypeChange('tv') },
    { label: 'Sports', active: isSportsActive, onSelect: onSelectSports },
    { label: 'Search', active: isSearchActive, onSelect: onSelectSearch },
    { label: 'My List', active: isMyListActive, onSelect: onSelectMyList },
  ];

  return (
    <header className="tv-header relative z-50 flex h-[72px] shrink-0 items-center gap-12 bg-[#05080F] px-12">
      <img src="/portalcast-logo.svg" alt="PortalCast" className="h-[26px] w-auto select-none" draggable={false} />
      <nav className="flex items-center gap-8" data-tv-group="tabs">
        {tabs.filter((t) => t.onSelect).map((t) => (
          <button
            key={t.label}
            type="button"
            onClick={() => { if (!t.active) t.onSelect?.(); }}
            className={`tv-tab relative py-2 text-[19px] font-semibold ${t.active ? 'text-white' : 'text-slate-400'}`}
            data-focusable="true"
            data-tv-tab=""
            data-active={t.active ? 'true' : undefined}
            tabIndex={-1}
          >
            {t.label}
            {t.active && <span className="absolute inset-x-0 -bottom-0.5 h-[2px] rounded bg-sky-400" />}
          </button>
        ))}
      </nav>
      <button
        type="button"
        onClick={() => setSettingsOpen(true)}
        className="tv-icon-button ml-auto flex h-11 w-11 items-center justify-center rounded-full text-slate-300"
        aria-label="Settings"
        data-focusable="true"
        tabIndex={-1}
      >
        <Settings className="h-6 w-6" />
      </button>
      {settingsOpen && (
        <TvSettingsPanel
          onClose={() => setSettingsOpen(false)}
          onSubtitles={() => { setSettingsOpen(false); setSubtitlesOpen(true); }}
          onClearHistory={() => { setSettingsOpen(false); handleClearWatched(); }}
        />
      )}
      <OpenSubtitlesModal isOpen={subtitlesOpen} onClose={() => setSubtitlesOpen(false)} />
    </header>
  );
};

/** Settings for now: a full-height panel on the right (the Android TV app's Settings screen comes with step 4). */
const TvSettingsPanel: React.FC<{ onClose: () => void; onSubtitles: () => void; onClearHistory: () => void }> = ({ onClose, onSubtitles, onClearHistory }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  React.useEffect(() => {
    // Back closes it (the remote's Back reaches the page only when nothing handles it first).
    const onKey = (e: KeyboardEvent) => {
      if ([8, 27, 461, 10009].includes(e.keyCode)) { e.preventDefault(); e.stopPropagation(); onClose(); }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);
  const item = 'flex w-full items-center gap-4 rounded-[10px] px-5 py-4 text-left text-[17px] font-semibold text-slate-100';
  return (
    <div className="fixed inset-0 z-[100] flex justify-end bg-black/60" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Settings" className="flex h-full w-[400px] flex-col gap-2 border-l border-white/10 bg-[#0B1120] p-8" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[26px] font-bold text-white">Settings</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="tv-icon-button flex h-10 w-10 items-center justify-center rounded-full text-slate-300" data-focusable="true" tabIndex={-1}>
            <X className="h-6 w-6" />
          </button>
        </div>
        {user && <p className="mb-4 truncate text-[15px] text-slate-400">{user.name || user.email}</p>}
        <button type="button" className={item} onClick={onSubtitles} data-focusable="true" data-default-focus="true" tabIndex={-1}>
          <Captions className="h-5 w-5 text-slate-400" /> Subtitle accounts
        </button>
        <button type="button" className={item} onClick={onClearHistory} data-focusable="true" tabIndex={-1}>
          <Trash2 className="h-5 w-5 text-slate-400" /> Clear watch history
        </button>
        {user?.role === 'admin' && (
          <button type="button" className={item} onClick={() => { onClose(); navigate('/admin'); }} data-focusable="true" tabIndex={-1}>
            <Shield className="h-5 w-5 text-slate-400" /> Admin
          </button>
        )}
        <button type="button" className={`${item} mt-auto text-red-400`} onClick={() => { onClose(); logout(); }} data-focusable="true" tabIndex={-1}>
          <LogOut className="h-5 w-5" /> Sign out
        </button>
      </div>
    </div>
  );
};

export default TvHeader;
