import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowDownAZ,
  Bookmark,
  Clapperboard,
  Film,
  Captions,
  ChevronLeft,
  House,
  LogOut,
  Palette,
  Search,
  Shield,
  SortAsc,
  SortDesc,
  Trash2,
  Trophy,
  Tv,
  Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import OpenSubtitlesModal from '@/components/molecules/OpenSubtitlesModal';
import type { HeaderProps } from '@/components/organisms/layout/Header';
import { themeLabel, useTheme } from '@/themes/theme';
import ThemePicker from '@/themes/ThemePicker';
import { setHeaderSlot } from '@/themes/headerSlot';
import { smooth, snappy } from './motion';

type Tab = 'home' | 'movies' | 'shows' | 'cast' | 'tv' | 'sports' | 'mylist' | 'search';

/**
 * Minimal theme's header: a translucent bar with the logo, the sections as text tabs centred
 * (the selected one on a pill that slides between them), and search, the page's Filters
 * (headerSlot), sort and profile on the right. Movies, Shows and Cast are tabs (Home's chip row
 * is gone in this theme, MinimalSectionRow). Below 880 px the sections are a tab bar along the
 * bottom, as in iOS (Home, Movies, Shows, Live TV, My List; Cast and Sports are then in the
 * profile menu, search in the top bar). Same props and actions as the Classic Header.
 */
const MinimalHeader: React.FC<HeaderProps> = React.memo((p) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showSubtitles, setShowSubtitles] = useState(false);
  const [showThemes, setShowThemes] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !panelRef.current?.contains(t)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const onHome = p.isDiscoverActive || p.isPeopleActive || !!p.typedHome;
  const active: Tab = p.isSearchActive
    ? 'search'
    : p.isPeopleActive
      ? 'cast'
      : p.isMyListActive
      ? 'mylist'
      : p.isSportsActive
        ? 'sports'
        : p.typedHome === 'movie'
          ? 'movies'
          : p.typedHome === 'series'
            ? 'shows'
            : !onHome && p.contentType === 'tv'
              ? 'tv'
              : 'home';
  const typed = p.onSelectTypedHome;
  // Sort orders the provider's own lists (IPTV categories, My library, Live TV's channels).
  // Home, Movies, Shows, Cast, Search, My List and Sports keep their own order: not shown there.
  const sortable = !onHome && !p.isSearchActive && !p.isMyListActive && !p.isSportsActive;

  const tabs: { id: Tab; label: string; icon: typeof House; onClick?: () => void }[] = [
    { id: 'home', label: 'Home', icon: House, onClick: p.onSelectDiscover },
    { id: 'movies', label: 'Movies', icon: Film, onClick: typed && (() => typed('movie')) },
    { id: 'shows', label: 'Shows', icon: Clapperboard, onClick: typed && (() => typed('series')) },
    { id: 'cast', label: 'Cast', icon: Users, onClick: p.onSelectPeople },
    { id: 'tv', label: 'Live TV', icon: Tv, onClick: () => p.handleContentTypeChange('tv') },
    { id: 'sports', label: 'Sports', icon: Trophy, onClick: p.onSelectSports },
    { id: 'search', label: 'Search', icon: Search, onClick: p.onSelectSearch },
    { id: 'mylist', label: 'My List', icon: Bookmark, onClick: p.onSelectMyList },
  ];
  const shown = tabs.filter((t) => t.onClick);

  const SortIcon = p.sort === 'oldest' ? SortAsc : p.sort === 'alphabetic' ? ArrowDownAZ : SortDesc;
  const iconButton =
    'flex h-9 w-9 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-white [&.focused]:bg-white/15 [&.focused]:text-white';
  const menuItem =
    'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-white/90 transition-colors hover:bg-white/10 [&.focused]:bg-white/15';

  const menuAction = (fn: () => void) => () => {
    setMenuOpen(false);
    fn();
  };

  return (
    <>
      <header className="ui-glass absolute inset-x-0 top-0 z-50">
        <div className="relative flex h-14 items-center justify-between gap-3 px-4 sm:h-16 sm:px-8">
          <div className="flex min-w-0 items-center gap-2">
            {p.historyLength > 0 && !p.streamUrl && (
              <button onClick={p.handleBack} className={iconButton} data-focusable="true" tabIndex={-1} aria-label="Back">
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            {/* Home, like the Home tab (the app is one route, so navigate('/') would do nothing). */}
            <button type="button" onClick={p.onSelectDiscover ?? (() => navigate('/'))} aria-label="Home" className="rounded-md focus-visible:outline-2 focus-visible:outline-white">
              <img src="/portalcast-logo.svg" alt="PortalCast" className="h-5 w-auto brightness-0 invert sm:h-6" />
            </button>
          </div>

          {!p.streamUrl && (
            <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-0.5 rounded-full bg-white/6 p-1 min-[880px]:flex">
              {shown
                .filter((t) => t.id !== 'search')
                .map((t) => (
                  <button
                    key={t.id}
                    onClick={t.onClick}
                    className={`relative rounded-full px-2.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors xl:px-4 xl:text-base [&.focused]:text-white ${
                      active === t.id ? 'text-white' : 'text-white/55 hover:text-white'
                    }`}
                    data-focusable="true"
                    data-default-focus={active === t.id ? 'true' : undefined}
                    aria-current={active === t.id ? 'page' : undefined}
                    tabIndex={-1}
                  >
                    {active === t.id && theme !== 'console' && (
                      <motion.span layoutId="minimal-nav-pill" className="absolute inset-0 rounded-full bg-white/15" transition={snappy} />
                    )}
                    <span className="relative">{t.label}</span>
                  </button>
                ))}
            </nav>
          )}

          {!p.streamUrl && (
            <div className="flex shrink-0 items-center gap-1">
              {p.onSelectSearch && (
                <button
                  onClick={p.onSelectSearch}
                  className={`${iconButton} ${active === 'search' ? 'bg-white/15 text-white' : ''}`}
                  data-focusable="true"
                  tabIndex={-1}
                  aria-label="Search"
                >
                  <Search className="h-[18px] w-[18px]" />
                </button>
              )}
              {/* The page's Filters (Home, Movies, Shows), shown here by MinimalSectionRow: just its
                  icon (and the count when some are set), like the other buttons here. */}
              <span ref={setHeaderSlot} className="contents [&_button]:border-transparent [&_button>span:not(.absolute)]:hidden" />
              {sortable && (
                <button
                  onClick={p.cycleSort}
                  className={iconButton}
                  data-focusable="true"
                  data-control="sort"
                  tabIndex={-1}
                  title={`Sort: ${p.sort === 'alphabetic' ? 'A-Z' : p.sort === 'oldest' ? 'Oldest' : 'Latest'}`}
                >
                  <SortIcon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                </button>
              )}

              {user && (
                <div className="relative ml-1" ref={menuRef}>
                  <motion.button
                    whileHover={theme === 'console' ? undefined : { scale: 1.06 }}
                    whileTap={theme === 'console' ? undefined : { scale: 0.92 }}
                    transition={snappy}
                    onClick={() => setMenuOpen((o) => !o)}
                    className="flex h-9 w-9 cursor-pointer select-none items-center justify-center rounded-full bg-white/15 transition-colors hover:bg-white/25 aria-expanded:bg-white/25 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-white [&.focused]:outline-2 [&.focused]:outline-white"
                    data-focusable="true"
                    data-control="profile"
                    tabIndex={-1}
                    aria-label="Profile"
                    aria-expanded={menuOpen}
                  >
                    {user.name ? user.name[0].toUpperCase() : 'U'}
                  </motion.button>

                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* The profile menu and the phone tab bar sit outside the header: a blurred element only
          blurs what is inside a blurred parent, and the header's blur would also make it the box
          `fixed` is measured from. */}
      <AnimatePresence>
        {menuOpen && user && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.15 } }}
            transition={smooth}
            style={{ transformOrigin: 'top right' }}
            ref={panelRef}
            className="ui-glass fixed top-[calc(var(--chrome-top)+0.5rem)] right-4 z-[60] w-72 rounded-2xl p-1.5 text-left shadow-2xl shadow-black/60 ring-1 ring-white/10 sm:right-8"
          >
            <div className="px-3 pt-2 pb-2.5">
              <p className="truncate text-base font-semibold text-white">{user.name}</p>
              <p className="truncate text-sm text-white/50">{user.email}</p>
            </div>
            <div className="my-1 h-px bg-white/10" />
            {p.onSelectPeople && (
              <button onClick={menuAction(p.onSelectPeople)} className={`${menuItem} min-[880px]:hidden`} data-focusable="true" tabIndex={-1}>
                <Users className="h-4 w-4 text-white/60" /> Cast
              </button>
            )}
            {p.onSelectSports && (
              <button onClick={menuAction(p.onSelectSports)} className={`${menuItem} min-[880px]:hidden`} data-focusable="true" tabIndex={-1}>
                <Trophy className="h-4 w-4 text-white/60" /> Sports
              </button>
            )}
            {user.role === 'admin' && (
              <button onClick={menuAction(() => navigate('/admin'))} className={menuItem} data-focusable="true" tabIndex={-1}>
                <Shield className="h-4 w-4 text-white/60" /> Admin Panel
              </button>
            )}
            <button onClick={menuAction(() => setShowSubtitles(true))} className={menuItem} data-focusable="true" tabIndex={-1}>
              <Captions className="h-4 w-4 text-white/60" /> Subtitle Account
            </button>
            <button onClick={menuAction(() => navigate('/verify'))} className={menuItem} data-focusable="true" tabIndex={-1}>
              <Tv className="h-4 w-4 text-white/60" /> Authorize a Device
            </button>
            <button onClick={menuAction(p.handleClearWatched)} className={menuItem} data-focusable="true" tabIndex={-1}>
              <Trash2 className="h-4 w-4 text-white/60" /> Clear History
            </button>
            <button onClick={menuAction(() => setShowThemes(true))} className={menuItem} data-focusable="true" tabIndex={-1}>
              <Palette className="h-4 w-4 text-white/60" /> Theme: {themeLabel(theme)}
            </button>
            <div className="my-1 h-px bg-white/10" />
            <button onClick={menuAction(logout)} className={`${menuItem} text-red-400`} data-focusable="true" tabIndex={-1}>
              <LogOut className="h-4 w-4" /> Log Out
            </button>
          </motion.div>
        )}
      </AnimatePresence>


      {!p.streamUrl && (
        <nav className="ui-glass fixed inset-x-0 bottom-0 z-50 flex pb-[env(safe-area-inset-bottom)] min-[880px]:hidden">
          {shown
            .filter((t) => t.id !== 'sports' && t.id !== 'search' && t.id !== 'cast')
            .map((t) => {
              const Icon = t.icon;
              const on = active === t.id;
              return (
                <motion.button
                  key={t.id}
                  whileTap={theme === 'console' ? undefined : { scale: 0.9 }}
                  transition={snappy}
                  onClick={t.onClick}
                  className={`flex flex-1 flex-col items-center gap-0.5 pt-2 pb-1.5 text-3xs font-medium transition-colors ${
                    on ? 'text-white' : 'text-white/45'
                  }`}
                  data-focusable="true"
                  tabIndex={-1}
                  aria-current={on ? 'page' : undefined}
                >
                  <Icon className="h-[22px] w-[22px]" strokeWidth={on ? 2.2 : 1.8} />
                  {t.label}
                </motion.button>
              );
            })}
        </nav>
      )}

      <OpenSubtitlesModal isOpen={showSubtitles} onClose={() => setShowSubtitles(false)} />
      <ThemePicker open={showThemes} onClose={() => setShowThemes(false)} />
    </>
  );
});

export default MinimalHeader;
