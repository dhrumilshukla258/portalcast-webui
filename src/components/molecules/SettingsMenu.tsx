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
import { subtitleDownloads, subtitleFailureText } from '@/utils/subtitleDownload';

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
  const subField = 'w-full rounded-md border border-gray-700 bg-gray-950/70 px-2 py-1.5 text-sm text-gray-100 outline-none focus:border-blue-500';

  const qualities = useVideoQualityOptions({ auto: true, sort: 'ascending' });
  const audioOptions = useAudioOptions();
  const captionOptions = useCaptionOptions();
  const subtitleDelay = React.useSyncExternalStore(subscribeSubtitleDelay, getSubtitleDelay);

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
      // The first of the top five that downloads (the TV app does the same).
      let best: (typeof results)[number] | undefined;
      for (const r of results.slice(0, 5)) {
        if (await subtitleDownloads(r)) { best = r; break; }
      }
      if (!best) {
        if (results.length) toast.error("Couldn't load a subtitle. Try one from the list.");
        return;
      }
      const label = addOnlineSubtitle?.(best);
      if (label) setPendingLabel(label);
      setIsSettingsMenuOpen(false);
    } finally {
      setBestBusy(false);
    }
  };

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

  const menuTitle = {
    main: 'Settings', quality: 'Quality', audio: 'Audio', subtitles: 'Subtitles',
    'add-subtitle': 'Find subtitles', cast: 'Cast', external: 'Open in…',
  }[activeSettingsMenu] ?? 'Settings';

  // The same full-height side panel as Filters and the TV app (pc-panel in index.css; owner
  // 2026-11-04: the small popover looked out of place). A press on the shade closes it.
  return (
    <>
    <div className="pc-shade fixed inset-0 z-40" aria-hidden="true" />
    <div
      ref={settingsMenuRef}
      className="pc-panel fixed bottom-0 right-0 top-0 z-50 flex w-full flex-col px-4 pb-4 pt-6 text-base text-gray-100 sm:w-[420px]"
    >
      <h2 className="truncate px-3 pb-3 text-xl font-semibold text-white">{menuTitle}</h2>
      <div className="mx-3 mb-2 h-px shrink-0 bg-white/[0.06]" />
      <div key={activeSettingsMenu} className="pc-swap-in custom-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
      {/* MAIN MENU */}
      {activeSettingsMenu === 'main' && (
        <div className="flex flex-col space-y-1">
          <button
            data-focusable="true"
            data-control="settings-item"
            onClick={() => handleMenuChange('quality')} // 👈 Updated
            className="pc-row flex items-center justify-between text-left"
          >
            <span>Quality</span>
            <div className="pc-muted flex items-center">
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
              className="pc-row flex items-center justify-between text-left"
            >
              <span>Audio</span>
              <div className="pc-muted flex items-center">
                <ChevronRightIcon className="h-4 w-4" />
              </div>
            </button>
          )}

          <button
            data-focusable="true"
            data-control="settings-item"
            onClick={() => handleMenuChange('subtitles')} // 👈 Updated
            className="pc-row flex items-center justify-between text-left"
          >
            <span>Captions</span>
            <div className="pc-muted flex items-center">
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
              className="pc-row flex items-center justify-between text-left"
            >
              <span>Open in…</span>
              <div className="pc-muted flex items-center">
                <ExternalLink className="mr-1 h-4 w-4" />
                <ChevronRightIcon className="h-4 w-4" />
              </div>
            </button>
          )}

          <button
            data-focusable="true"
            data-control="settings-close"
            onClick={() => setIsSettingsMenuOpen(false)}
            className="pc-row mt-3 flex items-center justify-between text-left"
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
            className="pc-row mb-1 flex items-center"
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
              className="pc-row flex items-center text-left"
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
        <div className="flex flex-col">
          <button
            data-focusable="true"
            data-control="settings-back"
            onClick={() => handleMenuChange('main')} // 👈 Back ponalum focus reset aagum
            className="pc-row mb-1 flex items-center"
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
              data-selected={qualities.selectedValue === value ? 'true' : 'false'}
              className="pc-row flex items-center justify-between text-left"
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
        <div className="flex flex-col">
          <button
            data-focusable="true"
            data-control="settings-back"
            onClick={() => handleMenuChange('main')}
            className="pc-row mb-1 flex items-center"
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
              data-selected={audioOptions.selectedValue === value ? 'true' : 'false'}
              className="pc-row flex items-center justify-between text-left"
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
        <div className="flex flex-col">
          <button
            data-focusable="true"
            data-control="settings-back"
            onClick={() => handleMenuChange('main')} // 👈 Back
            className="pc-row mb-1 flex items-center"
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
              data-selected={captionOptions.selectedValue === value ? 'true' : 'false'}
              className="pc-row flex items-center justify-between text-left"
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
                className="pc-row flex-1 text-center text-sm"
              >
                {label}
              </button>
            ))}
            <button
              data-focusable="true"
              data-control="settings-item"
              onClick={() => setSubtitleDelay(0)}
              className="pc-row flex-1 text-center text-sm"
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
            className="pc-row mt-2 flex items-center justify-between text-left font-semibold"
          >
            <span>+ Add Subtitle</span>
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ADD SUBTITLE SUBMENU — exactly two choices, results replace them once you search */}
      {activeSettingsMenu === 'add-subtitle' && (
        <div className="flex flex-col">
          <button
            data-focusable="true"
            data-control="settings-back"
            onClick={() => {
              clearSubtitleSearch?.();
              handleMenuChange('subtitles');
            }}
            className="pc-row mb-1 flex items-center"
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
                className="pc-row flex items-center justify-between text-left font-semibold disabled:opacity-50"
              >
                <span>{bestBusy ? 'Finding the best match…' : 'Best match (one tap)'}</span>
              </button>
              <button
                data-focusable="true"
                data-control="settings-item"
                onClick={() => void searchOnlineSubtitles?.(subQuery)}
                disabled={subtitleSearchLoading}
                className="pc-row flex items-center justify-between text-left disabled:opacity-50"
              >
                <span>{subtitleSearchLoading ? 'Searching…' : 'Search Online'}</span>
              </button>
              <button
                data-focusable="true"
                data-control="settings-item"
                onClick={() => localSubtitleInputRef.current?.click()}
                className="pc-row flex items-center justify-between text-left"
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
                  onClick={async () => {
                    // Added only when it downloads: a failed file used to be added (and announced)
                    // as an empty track (owner 2026-11-04).
                    if (!(await subtitleDownloads(result))) {
                      toast.error(subtitleFailureText(result));
                      return;
                    }
                    addOnlineSubtitle?.(result);
                    handleMenuChange('subtitles');
                  }}
                  className="pc-row flex flex-col items-start text-left"
                >
                  <span className="truncate text-sm">{result.releaseName}</span>
                  <span className="pc-muted text-xs uppercase">
                    {result.kept ? `Kept on by ${result.kept} ${result.kept === 1 ? 'viewer' : 'viewers'} · ` : ''}{result.exactMatch ? '✓ Exact match · ' : ''}{result.language} · {result.source === 'subdl' ? 'SubDL' : result.source === 'gestdown' ? 'Gestdown' : result.source === 'jellyfin' ? 'Jellyfin' : 'OpenSubtitles'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CAST SUBMENU */}
      {activeSettingsMenu === 'cast' && (
        <div className="flex flex-col">
          <GoogleCastButton
            data-focusable="true"
            data-control="settings-item"
            onClick={() => {
              setIsSettingsMenuOpen(false);
              setFocusedIndex(0);
            }}
            className="pc-row mb-1 flex w-full items-center justify-between text-left"
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
                className="pc-row flex items-center justify-between text-left"
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
    </div>
    </>
  );
});

SettingsMenu.displayName = 'SettingsMenu';
