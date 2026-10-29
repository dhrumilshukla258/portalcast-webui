import React from 'react';
import { useVideoContext } from '@/context/video';
import { formatDelay, getSubtitleDelay, setSubtitleDelay, subscribeSubtitleDelay } from '@/utils/subtitleDelay';
import {
  useVideoQualityOptions,
  useAudioOptions,
  useCaptionOptions,
  GoogleCastButton,
} from '@vidstack/react';
import { ChevronRightIcon, CheckIcon, ChevronLeftIcon, X, ExternalLink } from 'lucide-react';
import { FaChromecast } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { absoluteStreamUrl, externalChoices, playlistFile, playlistName, type ExternalChoice } from '@/utils/externalPlayer';

/** Languages offered in the subtitle search (ISO 639-1). */
const SUBTITLE_LANGUAGES: [string, string][] = [
  ['en', 'English'], ['hi', 'Hindi'], ['ta', 'Tamil'], ['te', 'Telugu'], ['ml', 'Malayalam'], ['kn', 'Kannada'],
  ['bn', 'Bengali'], ['mr', 'Marathi'], ['gu', 'Gujarati'], ['pa', 'Punjabi'], ['ur', 'Urdu'], ['ar', 'Arabic'],
  ['es', 'Spanish'], ['pt', 'Portuguese'], ['fr', 'French'], ['de', 'German'], ['it', 'Italian'], ['nl', 'Dutch'],
  ['pl', 'Polish'], ['ru', 'Russian'], ['tr', 'Turkish'], ['el', 'Greek'], ['he', 'Hebrew'], ['fa', 'Persian'],
  ['zh', 'Chinese'], ['ja', 'Japanese'], ['ko', 'Korean'], ['th', 'Thai'], ['vi', 'Vietnamese'], ['id', 'Indonesian'],
  ['ms', 'Malay'], ['sv', 'Swedish'], ['no', 'Norwegian'], ['da', 'Danish'], ['fi', 'Finnish'], ['ro', 'Romanian'],
];

export const SettingsMenu = React.memo(() => {
  const {
    isSettingsMenuOpen,
    activeSettingsMenu,
    setActiveSettingsMenu,
    setIsSettingsMenuOpen,
    settingsMenuRef,
    setFocusedIndex,
    receivers,
    handleCast,
    onlineSubtitleResults,
    subtitleSearchLoading,
    searchOnlineSubtitles,
    addOnlineSubtitle,
    addLocalSubtitleFile,
    clearSubtitleSearch,
    streamUrl,
    item,
    seriesItem,
    channelInfo,
    playerRef,
  } = useVideoContext();

  const title: string = String(item?.title || item?.name || channelInfo?.name || seriesItem?.name || 'PortalCast');
  const externalUrl = streamUrl ? absoluteStreamUrl(streamUrl) : null;

  /** "Open in…": pauses here, then hands the same stream link to the chosen player. */
  const openExternal = async (choice: ExternalChoice) => {
    if (!externalUrl) return;
    if (choice.action === 'copy') {
      try {
        await navigator.clipboard.writeText(externalUrl);
        toast.success('Stream link copied. It works on this network until 6 hours after its last use.');
      } catch {
        window.prompt('Copy the stream link:', externalUrl);
      }
      return;
    }
    try { playerRef.current?.pause?.(); } catch { /* not ready */ }
    if (choice.action === 'playlist') {
      const blob = new Blob([playlistFile(externalUrl, title)], { type: 'audio/x-mpegurl' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = playlistName(title);
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
    } else if (choice.href) {
      window.location.href = choice.href;
    }
    setIsSettingsMenuOpen(false);
  };

  const localSubtitleInputRef = React.useRef<HTMLInputElement>(null);

  // The online subtitle search, prefilled from the title playing; the viewer can change any of it.
  const isEpisode = Boolean(item?.is_episode);
  const defaultTitle = String((isEpisode ? seriesItem?.name || seriesItem?.title : item?.title || item?.name) || item?.name || '');
  const [subQuery, setSubQuery] = React.useState({
    title: defaultTitle,
    year: item?.year ? String(item.year) : '',
    season: isEpisode && item?.series_number != null ? String(item.series_number) : '',
    episode: isEpisode && item?.episode_num != null ? String(item.episode_num) : '',
    language: (navigator.language || 'en').slice(0, 2).toLowerCase(),
  });
  React.useEffect(() => {
    setSubQuery((q) => ({
      ...q,
      title: defaultTitle,
      year: item?.year ? String(item.year) : '',
      season: isEpisode && item?.series_number != null ? String(item.series_number) : '',
      episode: isEpisode && item?.episode_num != null ? String(item.episode_num) : '',
    }));
  }, [defaultTitle, isEpisode, item?.year, item?.series_number, item?.episode_num]);
  // "Best match": the top result (made for this file first, Jellyfin's first) is added and
  // switched on as soon as the player has loaded it.
  const [pendingLabel, setPendingLabel] = React.useState<string | null>(null);
  const [bestBusy, setBestBusy] = React.useState(false);
  React.useEffect(() => {
    if (!pendingLabel) return;
    const opt = captionOptions.find((o) => o.label === pendingLabel);
    if (opt) {
      opt.select();
      setPendingLabel(null);
    }
  }, [captionOptions, pendingLabel]);
  const addBestMatch = async () => {
    if (bestBusy) return;
    setBestBusy(true);
    try {
      const results = (await searchOnlineSubtitles?.(subQuery)) ?? [];
      const best = results[0];
      if (!best) return;
      const label = addOnlineSubtitle?.(best);
      if (label) setPendingLabel(label);
      setIsSettingsMenuOpen(false);
    } finally {
      setBestBusy(false);
    }
  };
  const subField = 'w-full rounded-md border border-gray-700 bg-gray-950/70 px-2 py-1.5 text-sm text-gray-100 outline-none focus:border-blue-500';

  const qualities = useVideoQualityOptions({ auto: true, sort: 'ascending' });
  const audioOptions = useAudioOptions();
  const captionOptions = useCaptionOptions();
  const subtitleDelay = React.useSyncExternalStore(subscribeSubtitleDelay, getSubtitleDelay);

  // Close menu on click outside
  React.useEffect(() => {
    if (!isSettingsMenuOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        settingsMenuRef.current &&
        !settingsMenuRef.current.contains(event.target as Node)
      ) {
        // Check if the clicked target is the settings button itself to prevent immediate re-opening
        const target = event.target as HTMLElement;
        if (target.closest('[data-control="settings-menu"]') || target.closest('[title="Settings"]')) {
          return;
        }
        setIsSettingsMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', handleClickOutside);
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
    };
  }, [isSettingsMenuOpen, setIsSettingsMenuOpen, settingsMenuRef]);

  // Helper function to handle menu changes smoothly
  const handleMenuChange = (
    menuName: 'main' | 'quality' | 'audio' | 'subtitles' | 'add-subtitle' | 'cast' | 'external'
  ) => {
    setActiveSettingsMenu(menuName);
    setFocusedIndex(0);
  };

  if (!isSettingsMenuOpen) return null;

  return (
    <div
      ref={settingsMenuRef}
      className="absolute bottom-[calc(100%+12px)] right-[-10px] z-50 flex w-56 origin-bottom-right flex-col rounded-xl border border-gray-600/40 bg-gray-900/95 p-2 text-base text-gray-100 shadow-[0_-10px_40px_rgba(0,0,0,0.7)] backdrop-blur-xl transition-all"
    >
      {/* MAIN MENU */}
      {activeSettingsMenu === 'main' && (
        <div className="flex flex-col space-y-1">
          <button
            data-focusable="true"
            data-control="settings-item"
            onClick={() => handleMenuChange('quality')} // 👈 Updated
            className="flex items-center justify-between rounded-sm px-3 py-2 transition-colors hover:bg-white/20 focus:bg-white/20 focus:outline-hidden"
          >
            <span>Quality</span>
            <div className="flex items-center text-gray-400">
              <span className="mr-1 text-xs">
                {qualities.selectedValue === 'auto'
                  ? 'Auto'
                  : `${qualities.selectedQuality?.height}p`}
              </span>
              <ChevronRightIcon className="h-4 w-4" />
            </div>
          </button>

          {audioOptions.length > 0 && (
            <button
              data-focusable="true"
              data-control="settings-item"
              onClick={() => handleMenuChange('audio')} // 👈 Updated
              className="flex items-center justify-between rounded-sm px-3 py-2 transition-colors hover:bg-white/20 focus:bg-white/20 focus:outline-hidden"
            >
              <span>Audio</span>
              <div className="flex items-center text-gray-400">
                <ChevronRightIcon className="h-4 w-4" />
              </div>
            </button>
          )}

          <button
            data-focusable="true"
            data-control="settings-item"
            onClick={() => handleMenuChange('subtitles')} // 👈 Updated
            className="flex items-center justify-between rounded-sm px-3 py-2 transition-colors hover:bg-white/20 focus:bg-white/20 focus:outline-hidden"
          >
            <span>Captions</span>
            <div className="flex items-center text-gray-400">
              <span className="mr-1 text-xs">
                {captionOptions.selectedValue === 'off' ? 'Off' : 'On'}
              </span>
              <ChevronRightIcon className="h-4 w-4" />
            </div>
          </button>

          {externalUrl && (
            <button
              data-focusable="true"
              data-control="settings-item"
              onClick={() => handleMenuChange('external')}
              className="flex items-center justify-between rounded-sm px-3 py-2 transition-colors hover:bg-white/20 focus:bg-white/20 focus:outline-hidden"
            >
              <span>Open in…</span>
              <div className="flex items-center text-gray-400">
                <ExternalLink className="mr-1 h-4 w-4" />
                <ChevronRightIcon className="h-4 w-4" />
              </div>
            </button>
          )}

          <button
            data-focusable="true"
            data-control="settings-close"
            onClick={() => setIsSettingsMenuOpen(false)}
            className="mt-1 flex items-center justify-between rounded-sm border-t border-gray-700/60 px-3 pt-2 pb-1 text-red-400 transition-colors hover:bg-white/10 focus:bg-white/10 focus:outline-hidden"
          >
            <span>Close Menu</span>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* OPEN IN ANOTHER PLAYER */}
      {activeSettingsMenu === 'external' && externalUrl && (
        <div className="flex flex-col space-y-1">
          <button
            data-focusable="true"
            data-control="settings-item"
            onClick={() => handleMenuChange('main')}
            className="flex items-center rounded-sm px-3 py-2 text-gray-300 transition-colors hover:bg-white/20 focus:bg-white/20 focus:outline-hidden"
          >
            <ChevronLeftIcon className="mr-2 h-4 w-4" />
            <span>Open in…</span>
          </button>
          {externalChoices(externalUrl, title).map((c) => (
            <button
              key={c.id}
              data-focusable="true"
              data-control="settings-item"
              onClick={() => void openExternal(c)}
              className="flex items-center rounded-sm px-3 py-2 text-left transition-colors hover:bg-white/20 focus:bg-white/20 focus:outline-hidden"
            >
              <span>{c.label}</span>
            </button>
          ))}
          <p className="px-3 pt-1 text-[11px] leading-snug text-gray-500">
            The other player gets this stream only, never your provider's address. Progress there is not saved here.
          </p>
        </div>
      )}

      {/* QUALITY SUBMENU */}
      {activeSettingsMenu === 'quality' && (
        <div className="flex max-h-[250px] flex-col overflow-y-auto overflow-x-hidden">
          <button
            data-focusable="true"
            data-control="settings-back"
            onClick={() => handleMenuChange('main')} // 👈 Back ponalum focus reset aagum
            className="mb-2 flex items-center rounded-sm border-b border-gray-700 px-3 py-2 transition-colors hover:bg-white/20 focus:bg-white/20 focus:outline-hidden"
          >
            <ChevronLeftIcon className="mr-1 h-4 w-4" />
            <span>Back</span>
          </button>
          {qualities.map(({ label, value, select }) => (
            <button
              key={value}
              data-focusable="true"
              data-control="settings-item"
              onClick={() => {
                select();
                setIsSettingsMenuOpen(false);
                setFocusedIndex(0);
              }}
              className={`flex items-center justify-between rounded-sm px-3 py-2 transition-colors hover:bg-white/20 focus:bg-white/20 focus:outline-hidden ${qualities.selectedValue === value ? 'text-blue-400' : ''}`}
            >
              <span>{label}</span>
              {qualities.selectedValue === value && (
                <CheckIcon className="h-4 w-4" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* AUDIO SUBMENU */}
      {activeSettingsMenu === 'audio' && (
        <div className="flex max-h-[250px] flex-col overflow-y-auto overflow-x-hidden">
          <button
            data-focusable="true"
            data-control="settings-back"
            onClick={() => handleMenuChange('main')}
            className="mb-2 flex items-center rounded-sm border-b border-gray-700 px-3 py-2 transition-colors hover:bg-white/20 focus:bg-white/20 focus:outline-hidden"
          >
            <ChevronLeftIcon className="mr-1 h-4 w-4" />
            <span>Back</span>
          </button>
          {audioOptions.map(({ label, value, select }) => (
            <button
              key={value}
              data-focusable="true"
              data-control="settings-item"
              onClick={() => {
                select();
                setIsSettingsMenuOpen(false);
                setFocusedIndex(0);
              }}
              className={`flex items-center justify-between rounded-sm px-3 py-2 transition-colors hover:bg-white/20 focus:bg-white/20 focus:outline-hidden ${audioOptions.selectedValue === value ? 'text-blue-400' : ''}`}
            >
              <span>{label || 'Default'}</span>
              {audioOptions.selectedValue === value && (
                <CheckIcon className="h-4 w-4" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* CAPTIONS SUBMENU — already-available tracks, plus one clean way to add more */}
      {activeSettingsMenu === 'subtitles' && (
        <div className="flex max-h-[250px] flex-col overflow-y-auto overflow-x-hidden">
          <button
            data-focusable="true"
            data-control="settings-back"
            onClick={() => handleMenuChange('main')} // 👈 Back
            className="mb-2 flex items-center rounded-sm border-b border-gray-700 px-3 py-2 transition-colors hover:bg-white/20 focus:bg-white/20 focus:outline-hidden"
          >
            <ChevronLeftIcon className="mr-1 h-4 w-4" />
            <span>Back</span>
          </button>
          {captionOptions.map(({ label, value, select }) => (
            <button
              key={value}
              data-focusable="true"
              data-control="settings-item"
              onClick={() => {
                select();
                setIsSettingsMenuOpen(false);
                setFocusedIndex(0);
              }}
              className={`flex items-center justify-between rounded-sm px-3 py-2 transition-colors hover:bg-white/20 focus:bg-white/20 focus:outline-hidden ${captionOptions.selectedValue === value ? 'text-blue-400' : ''}`}
            >
              <span>{label}</span>
              {captionOptions.selectedValue === value && (
                <CheckIcon className="h-4 w-4" />
              )}
            </button>
          ))}

          {/* Per-title subtitle timing (utils/subtitleDelay.ts), saved on this device */}
          <div className="mt-1 border-t border-gray-700 px-3 pt-2 text-xs text-gray-300">
            Timing: {formatDelay(subtitleDelay)}
          </div>
          <div className="flex items-center gap-1 px-2 pb-1 pt-1">
            {[
              { label: '− 0.25 s', delta: -250 },
              { label: '+ 0.25 s', delta: 250 },
            ].map(({ label, delta }) => (
              <button
                key={label}
                data-focusable="true"
                data-control="settings-item"
                onClick={() => setSubtitleDelay(subtitleDelay + delta)}
                className="flex-1 rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-white/20 focus:bg-white/20 focus:outline-hidden"
              >
                {label}
              </button>
            ))}
            <button
              data-focusable="true"
              data-control="settings-item"
              onClick={() => setSubtitleDelay(0)}
              className="flex-1 rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-white/20 focus:bg-white/20 focus:outline-hidden"
            >
              Reset
            </button>
          </div>

          <button
            data-focusable="true"
            data-control="settings-item"
            onClick={() => {
              clearSubtitleSearch?.();
              handleMenuChange('add-subtitle');
            }}
            className="mt-1 flex items-center justify-between rounded-sm border-t border-gray-700 px-3 py-2 text-blue-400 transition-colors hover:bg-white/20 focus:bg-white/20 focus:outline-hidden"
          >
            <span>+ Add Subtitle</span>
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ADD SUBTITLE SUBMENU — exactly two choices, results replace them once you search */}
      {activeSettingsMenu === 'add-subtitle' && (
        <div className="flex max-h-[250px] flex-col overflow-y-auto overflow-x-hidden">
          <button
            data-focusable="true"
            data-control="settings-back"
            onClick={() => {
              clearSubtitleSearch?.();
              handleMenuChange('subtitles');
            }}
            className="mb-2 flex items-center rounded-sm border-b border-gray-700 px-3 py-2 transition-colors hover:bg-white/20 focus:bg-white/20 focus:outline-hidden"
          >
            <ChevronLeftIcon className="mr-1 h-4 w-4" />
            <span>Back</span>
          </button>

          <input
            ref={localSubtitleInputRef}
            type="file"
            accept=".srt,.vtt"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                addLocalSubtitleFile?.(file);
                handleMenuChange('subtitles');
              }
              e.target.value = '';
            }}
          />

          {!onlineSubtitleResults?.length && (
            <>
              <form
                className="mb-1 flex flex-col gap-1.5 px-1"
                onSubmit={(e) => {
                  e.preventDefault();
                  void searchOnlineSubtitles?.(subQuery);
                }}
              >
                <input
                  data-focusable="true"
                  aria-label="Title to search"
                  placeholder="Title"
                  value={subQuery.title}
                  onChange={(e) => setSubQuery({ ...subQuery, title: e.target.value })}
                  className={subField}
                />
                <div className="flex gap-1.5">
                  {isEpisode ? (
                    <>
                      <input data-focusable="true" aria-label="Season" placeholder="S" inputMode="numeric" value={subQuery.season}
                        onChange={(e) => setSubQuery({ ...subQuery, season: e.target.value.replace(/\D/g, '').slice(0, 4) })} className={subField} />
                      <input data-focusable="true" aria-label="Episode" placeholder="E" inputMode="numeric" value={subQuery.episode}
                        onChange={(e) => setSubQuery({ ...subQuery, episode: e.target.value.replace(/\D/g, '').slice(0, 4) })} className={subField} />
                    </>
                  ) : (
                    <input data-focusable="true" aria-label="Year" placeholder="Year" inputMode="numeric" value={subQuery.year}
                      onChange={(e) => setSubQuery({ ...subQuery, year: e.target.value.replace(/\D/g, '').slice(0, 4) })} className={subField} />
                  )}
                  <select data-focusable="true" aria-label="Language" value={subQuery.language}
                    onChange={(e) => setSubQuery({ ...subQuery, language: e.target.value })} className={subField}>
                    {SUBTITLE_LANGUAGES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
                  </select>
                </div>
              </form>
              <button
                data-focusable="true"
                data-control="settings-item"
                onClick={() => void addBestMatch()}
                disabled={subtitleSearchLoading || bestBusy}
                className="flex items-center justify-between rounded-sm px-3 py-2 font-semibold text-blue-300 transition-colors hover:bg-white/20 focus:bg-white/20 focus:outline-hidden disabled:opacity-50"
              >
                <span>{bestBusy ? 'Finding the best match…' : 'Best match (one tap)'}</span>
              </button>
              <button
                data-focusable="true"
                data-control="settings-item"
                onClick={() => void searchOnlineSubtitles?.(subQuery)}
                disabled={subtitleSearchLoading}
                className="flex items-center justify-between rounded-sm px-3 py-2 transition-colors hover:bg-white/20 focus:bg-white/20 focus:outline-hidden disabled:opacity-50"
              >
                <span>{subtitleSearchLoading ? 'Searching…' : 'Search Online'}</span>
              </button>
              <button
                data-focusable="true"
                data-control="settings-item"
                onClick={() => localSubtitleInputRef.current?.click()}
                className="flex items-center justify-between rounded-sm px-3 py-2 transition-colors hover:bg-white/20 focus:bg-white/20 focus:outline-hidden"
              >
                <span>From Device</span>
              </button>
            </>
          )}

          {onlineSubtitleResults && onlineSubtitleResults.length > 0 && (
            <div className="flex flex-col gap-0.5">
              {onlineSubtitleResults.map((result: any) => (
                <button
                  key={result.downloadId || result.fileId}
                  data-focusable="true"
                  data-control="settings-item"
                  onClick={() => {
                    addOnlineSubtitle?.(result);
                    handleMenuChange('subtitles');
                  }}
                  className="flex flex-col items-start rounded-sm px-3 py-2 text-left transition-colors hover:bg-white/20 focus:bg-white/20 focus:outline-hidden"
                >
                  <span className="truncate text-sm">{result.releaseName}</span>
                  <span className="text-xs uppercase text-gray-400">
                    {result.exactMatch ? '✓ Exact match · ' : ''}{result.language} · {result.source === 'subdl' ? 'SubDL' : result.source === 'gestdown' ? 'Gestdown' : result.source === 'jellyfin' ? 'Jellyfin' : 'OpenSubtitles'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CAST SUBMENU */}
      {activeSettingsMenu === 'cast' && (
        <div className="flex max-h-[250px] flex-col overflow-y-auto overflow-x-hidden">
          <GoogleCastButton
            data-focusable="true"
            data-control="settings-item"
            onClick={() => {
              setIsSettingsMenuOpen(false);
              setFocusedIndex(0);
            }}
            className="flex w-full items-center justify-between rounded-sm px-3 py-2 text-left transition-colors hover:bg-white/20 focus:bg-white/20 focus:outline-hidden border-b border-gray-700/40 mb-1 pb-2"
          >
            <div className="flex items-center space-x-2">
              <FaChromecast className="h-4 w-4 text-blue-400" />
              <span>Google Cast (Chromecast)</span>
            </div>
          </GoogleCastButton>

          {receivers && receivers.length > 0 ? (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            receivers.map((receiver: any) => (
              <button
                key={receiver.id}
                data-focusable="true"
                data-control="settings-item"
                onClick={() => {
                  handleCast(receiver.id);
                  setIsSettingsMenuOpen(false);
                  setFocusedIndex(0);
                }}
                className="flex items-center justify-between rounded-sm px-3 py-2 transition-colors hover:bg-white/20 focus:bg-white/20 focus:outline-hidden"
              >
                <span>{receiver.name}</span>
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-center text-sm text-gray-400">
              No other local screen apps found
            </div>
          )}
        </div>
      )}
    </div>
  );
});

SettingsMenu.displayName = 'SettingsMenu';
