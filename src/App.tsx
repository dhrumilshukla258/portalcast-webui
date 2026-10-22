import IptvOfflineBanner from '@/components/atoms/IptvOfflineBanner';
import { lazyImport } from '@/utils/staleBuild';
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '@/App.css';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Home from '@/components/pages/Home';
import Login from '@/components/pages/Login';
import Verify from '@/components/pages/Verify';
import { Loader2 } from 'lucide-react';

import { Header } from '@/components/organisms/layout/Header';
// Lazy — admin-only, rarely visited, and it's a large component tree
// (stats/users/content/settings/logs/API-reference tabs all live
// here). Eagerly bundling it meant every session paid its parse/download
// cost on first load even though most users never open it.
const Admin = React.lazy(lazyImport(() => import('@/components/organisms/admin/Admin')));
// Lazy — only needed once playback actually starts, and its tree pulls in
// the HLS/vidstack player stack, which is one of the heaviest dependencies
// in the app.
const VideoPlayer = React.lazy(lazyImport(() => import('@/components/organisms/video/VideoPlayer')));
import ConfirmationModal from '@/components/molecules/ConfirmationModal';
import VariantPickerModal from '@/components/molecules/VariantPickerModal';
import MainContentGrid from '@/components/organisms/browse/MainContentGrid';
import ContinueWatching from '@/components/organisms/browse/ContinueWatching';
import SportsView from '@/components/organisms/sports/SportsView';
import CategoryBrowseView from '@/components/organisms/browse/CategoryBrowseView';
import PeopleView from '@/components/organisms/people/PeopleView';
import SectionChips, { type HomeSection } from '@/components/molecules/SectionChips';
import ContinueHero from '@/components/organisms/browse/ContinueHero';
// Lazy — only mounted when the user opens the Discover tab, not on initial load.
const DiscoverView = React.lazy(lazyImport(() => import('@/components/organisms/discover/DiscoverView')));
import { OpenTitleContext, PersonPageContext } from '@/context/PersonPageContext';
import MyListView from '@/components/organisms/discover/MyListView';
// Lazy — only mounted when a cast or crew member is opened.
const PersonPage = React.lazy(lazyImport(() => import('@/components/organisms/person/PersonPage')));

import { useMediaLibrary, initialContext } from '@/hooks/useMediaLibrary';
import { useDiscover } from '@/hooks/useDiscover';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import { useDiscoverNavigation } from '@/hooks/useDiscoverNavigation';
import { cleanRecentSearches } from '@/hooks/useSearchController';
import SearchView from '@/components/organisms/search/SearchView';
import { useTVFocus } from '@/hooks/useTVFocus';
import { useCastReceiver } from '@/hooks/useCastReceiver';
import { isTizenDevice } from './utils/helpers';
import type { MediaItem } from '@/types';
import { type DiscoverVariant } from '@/api/endpoints/discover';

function TVPortal({ onShowAdmin }: { onShowAdmin: () => void }) {
  const isTizen = isTizenDevice();
  const { user, updatePreferences } = useAuth();
  // Cleaned for display too, so fragments saved by older builds disappear at once.
  const recentSearches = useMemo(() => cleanRecentSearches(user?.preferences?.recentSearches || []), [user?.preferences?.recentSearches]);
  const [detailItem, setDetailItem] = useState<MediaItem | null>(null);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  // Movies / Series tabs' "Browse by category" on a phone: open the category list, not just the last category.
  const [openCategoryDrawer, setOpenCategoryDrawer] = useState(false);
  const onCategoryDrawerOpened = useCallback(() => setOpenCategoryDrawer(false), []);
  // Home on load, always (owner: the old Movies / Live TV screen showed first).
  const [showDiscover, setShowDiscover] = useState(true);
  const [variantPickerItem, setVariantPickerItem] = useState<MediaItem | null>(null);
  const [variantPickerOptions, setVariantPickerOptions] = useState<DiscoverVariant[]>([]);
  // Track whether the detail modal pushed its own history entry
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    isDestructive: false,
  });

  const {
    context,
    items,
    loading,
    error,
    paginationError,
    totalItemsCount,
    contentType,
    epgData,
    channelGroups,
    favorites,
    recentChannels,
    handleContentTypeChange: handleContentTypeChangeRaw,
    setContentType,
    cycleSort,
    handlePageChange,
    toggleFavorite,
    fetchData,
    handleClearWatched,
    cwRefreshKey,
    setCwRefreshKey,
    isPortal,
    addToRecentChannels,
    playLastTvChannel,
    setPlayLastTvChannel,

    setItems,
    setContext,
    isRestoringFromHistory,
    setTotalItemsCount,
    vodCategories,
    loadingCategories,
    carouselSlides,
    progressRecords,
    providerKey,
  } = useMediaLibrary(!!detailItem);

  const { recommendations, recommendationsBasedOn, loadingRecommendations, fetchRecommendations, homeRows, genreOrder } = useDiscover();

  // Mirrors DiscoverView's own Movies/Series checkbox state (reported up via
  // onActiveTypeChange) so "Because You Watched" can be based on the
  // most-recently-watched title of just that type when the user has
  // filtered to one — undefined (both selected) keeps the old "most recent
  // watch overall" behavior.
  const [discoverActiveType, setDiscoverActiveType] = useState<'movie' | 'series' | undefined>(undefined);

  useEffect(() => {
    if (user) fetchRecommendations(discoverActiveType);
  }, [user?.id, discoverActiveType, fetchRecommendations]);

  const {
    history,
    streamUrl,
    rawStreamUrl,
    currentItem,
    currentSeriesItem,
    setCurrentSeriesItem,
    resumePlaybackState,
    handleItemClick,
    handleBack,
    closePlayer,
    previewChannel,
    handleNextChannel,
    handlePrevChannel,
    playCastedMedia,
    pushFrame,
    startPlayback,
    focusedIndex,
    setFocusedIndex,
    episodeSnapshot,
  } = useAppNavigation(
    context,
    items,
    contentType,
    totalItemsCount,
    fetchData,
    isPortal,
    addToRecentChannels,
    playLastTvChannel,
    setPlayLastTvChannel,
    setItems,
    setContext,
    setTotalItemsCount,
    isRestoringFromHistory,
    detailItem,
    setDetailItem,
    setCwRefreshKey,
    showDiscover,
    setShowDiscover,
    variantPickerItem,
    variantPickerOptions,
    useCallback((item: MediaItem | null, options: MediaItem[]) => {
      setVariantPickerItem(item);
      setVariantPickerOptions(options as DiscoverVariant[]);
    }, []),
    setContentType
  );

  // No page backdrop any more (owner, 2026-10-22: a plain black-blue page). Views still
  // report their on-screen items; nothing uses them now.
  const mergeBackdropItems = useCallback<(items: MediaItem[]) => void>(() => {}, []);

  const onClearWatched = useCallback(
    () => handleClearWatched(setConfirmModal),
    [handleClearWatched]
  );

  useTVFocus({
    streamUrl,
    items,
    contentType,
    handleBack,
    handlePageChange,
    cycleSort,
    handleContentTypeChange: handleContentTypeChangeRaw,
    handleClearWatched: onClearWatched,
    isConfirmingDelete: confirmModal.isOpen,
    isDetailOpen: !!detailItem,
    isCategoriesOpen: isCategoriesOpen,
    focusedIndex,
    setFocusedIndex,
  });

  const handleContentTypeChange = useCallback(
    (type: 'movie' | 'series' | 'tv') => {
      setDetailItem(null);
      setShowDiscover(false);
      handleContentTypeChangeRaw(type);
    },
    [handleContentTypeChangeRaw]
  );

  const {
    discoverLoadingItemId,
    openDiscoverItem,
    handleDiscoverItemClick,
    onSelectVariant,
    handleCarouselAction,
  } = useDiscoverNavigation({
    pushFrame,
    fetchData,
    handleContentTypeChangeRaw,
    setCurrentSeriesItem,
    setVariantPickerItem,
    setVariantPickerOptions,
    setDetailItem,
    startPlayback,
    handleItemClick,
  });

  // Global Search (the TV app's Search tab) lives on the same layer as Discover: a title
  // opened from it is shown over it, and Back returns to the results.
  const [overlayPage, setOverlayPage] = useState<'discover' | 'search' | 'mylist' | 'movies' | 'series' | 'sports' | 'people'>('discover');
  // Browse by category (Movies / Series tabs), the new-layout page over the tab.
  const [categoryType, setCategoryType] = useState<'movie' | 'series' | null>(null);
  // My library (the NAS files) instead of the IPTV categories list.
  const [categoryOnly, setCategoryOnly] = useState<{ id: string; title: string } | null>(null);
  useEffect(() => { setCategoryType(null); }, [overlayPage]);
  const isPeoplePage = showDiscover && overlayPage === 'people';
  // Sports (plan Phase 6.7) on the same layer; its "Find channel" opens Search on Live TV.
  const isSportsPage = showDiscover && overlayPage === 'sports';
  const [searchLiveQuery, setSearchLiveQuery] = useState<string | undefined>(undefined);
  const isSearchPage = showDiscover && overlayPage === 'search';
  // My List (design Phase 6) lives on the same layer as Discover and Search.
  const isMyListPage = showDiscover && overlayPage === 'mylist';
  // The Movies / Series tabs: Home's layout for one type (design Phase 6.3); their per-category
  // browse (the regular Movies/Series section) opens from its Categories button.
  const typedHome: 'movie' | 'series' | undefined = !showDiscover
    ? undefined
    : overlayPage === 'movies' ? 'movie' : overlayPage === 'series' ? 'series' : undefined;
  // Phones: Movies · Series · People are chips at the top of Home and those pages (the bottom
  // bar is Home, Live TV, Sports, Search, My List).
  const openSection = useCallback((sec: HomeSection) => {
    setDetailItem(null);
    setCurrentSeriesItem(null);
    setOverlayPage(sec === 'movie' ? 'movies' : sec === 'series' ? 'series' : sec === 'people' ? 'people' : 'discover');
    setShowDiscover(true);
  }, [setDetailItem, setCurrentSeriesItem, setShowDiscover]);
  const activeSection: HomeSection = typedHome ?? (overlayPage === 'people' ? 'people' : 'home');
  const sectionChips = (filterButton: React.ReactNode) => (
    <SectionChips active={activeSection} onSelect={openSection} trailing={filterButton} />
  );
  // Continue Watching on Home; the Movies / Series tabs show only that type's titles.
  const homeProgress = React.useMemo(
    () => (typedHome ? progressRecords.filter((r) => (Number(r.meta?.is_series) === 1) === (typedHome === 'series')) : progressRecords),
    [progressRecords, typedHome]
  );
  const searchOpenTitle = useCallback(
    (item: MediaItem, isSeries: boolean) => {
      openDiscoverItem({
        ...item,
        type: isSeries ? 'series' : 'movie',
        category: item.category_id != null ? String(item.category_id) : '*',
      } as MediaItem);
    },
    [openDiscoverItem]
  );
  const searchPickVersion = useCallback(
    (display: MediaItem, versions: MediaItem[], isSeries: boolean) => {
      const type = isSeries ? 'series' : 'movie';
      pushFrame();
      setVariantPickerItem({ ...display, type } as MediaItem);
      setVariantPickerOptions(
        versions.map((v) => ({
          ...v,
          type,
          category: v.category_id != null ? String(v.category_id) : '*',
          // version_label: the server's short label ("Hindi 1080p", "Local · Malayalam 4K").
          variantLabel: String(v.version_label || v.name || v.title || ''),
        })) as DiscoverVariant[]
      );
    },
    [pushFrame]
  );
  // A cast or crew member's page, over everything else (opened from a title's header).
  const [personId, setPersonId] = useState<number | null>(null);
  const closePerson = useCallback(() => setPersonId(null), []);
  // A title opened from a person's page: Back from it returns to that page, not past it.
  const [personReturn, setPersonReturn] = useState<number | null>(null);
  const openPersonTitle = useCallback(
    async (item: MediaItem) => {
      if (personId != null) setPersonReturn(personId);
      await handleDiscoverItemClick(item);
      setPersonId(null);
    },
    [handleDiscoverItemClick, personId]
  );

  const titleOpen = !!detailItem || !!currentSeriesItem || !!variantPickerItem || !!streamUrl;
  const titleWasOpen = React.useRef(false);
  useEffect(() => {
    if (titleOpen) { titleWasOpen.current = true; return; }
    if (titleWasOpen.current && personReturn != null) {
      setPersonId(personReturn);
      setPersonReturn(null);
    }
    titleWasOpen.current = false;
  }, [titleOpen, personReturn]);
  // Leaving for another tab forgets the way back to the person.
  useEffect(() => { setPersonReturn(null); }, [overlayPage]);

  // More Like This on a detail page opens titles the way a person's page does.
  const openTitle = React.useMemo(
    () => ({ open: (item: MediaItem) => void openPersonTitle(item), loadingItemId: discoverLoadingItemId }),
    [openPersonTitle, discoverLoadingItemId]
  );

  const searchPlayChannel = useCallback((channel: MediaItem) => { startPlayback(channel); }, [startPlayback]);
  const setRecentSearches = useCallback(
    (list: string[]) => updatePreferences({ recentSearches: list }),
    [updatePreferences]
  );

  // Stable reference instead of an inline arrow literal at the JSX call
  // site — VideoPlayer's tree includes React.memo'd controls that consume
  // this prop, so a fresh function identity every render was defeating that
  // memoization on every App re-render while a video is playing.
  const onLoadMoreEpisodes = useCallback(async () => {
    handlePageChange(1);
  }, [handlePageChange]);

  const scrollPositionRef = React.useRef(0);

  React.useEffect(() => {
    if (streamUrl) {
      scrollPositionRef.current = window.scrollY || document.documentElement.scrollTop;
    } else if (scrollPositionRef.current > 0) {
      const savedPosition = scrollPositionRef.current;
      setTimeout(() => {
        window.scrollTo(0, savedPosition);
      }, 100);
      scrollPositionRef.current = 0;
    }
  }, [streamUrl]);

  const { pendingPlaybackState } = useCastReceiver({
    playCastedMedia,
  });

  const currentTitle = React.useMemo(() => {
    if (streamUrl) return 'Now Playing';

    // Discover manages its own browsing state entirely separately from the
    // shared Movies/Series `context` (facets/whatsNew/genreRows live in
    // useDiscover, not here) — so without this check, the header just kept
    // showing whatever category title was last active on Movies/Series
    // (e.g. "HINDI | NEW RELEASE") the whole time Discover was open, since
    // nothing about switching to Discover ever touches `context`.
    const isDiscoverBrowsing =
      showDiscover && !detailItem && !(currentSeriesItem && contentType === 'series');
    if (isDiscoverBrowsing) {
      if (overlayPage === 'search') return 'Search';
      if (overlayPage === 'mylist') return 'My List';
      if (overlayPage === 'sports') return 'Sports';
      if (overlayPage === 'people') return 'Cast';
      if (overlayPage === 'movies') return 'Movies';
      if (overlayPage === 'series') return 'Series';
      return 'Discover';
    }

    // openDiscoverItem's series branch calls fetchData (updating
    // context.parentTitle correctly), but its movie branch never touches
    // context at all — only setDetailItem. Falling through to
    // context.parentTitle for an open movie detail then shows whatever was
    // last active on the regular Movies/Series context (stale category
    // title), not the movie actually open. detailItem's own title is always
    // right regardless of which path opened it (Discover or the regular
    // grid), so read it directly instead of going through context.
    if (detailItem) return detailItem.title || detailItem.name || 'Details';

    const isRoot =
      (!context.category || context.category === '*') &&
      !context.search &&
      !context.movieId &&
      !context.seasonId;

    if (isRoot) {
      return contentType === 'tv'
        ? 'TV'
        : contentType === 'series'
          ? 'Series'
          : 'Movies';
    }

    return context.parentTitle || 'Browse';
  }, [streamUrl, context, contentType, showDiscover, overlayPage, detailItem, currentSeriesItem]);

  const onSelectCategory = useCallback(
    (categoryId: string, categoryTitle: string) => {
      setDetailItem(null);
      const newContext = {
        ...initialContext,
        category: categoryId,
        parentTitle:
          categoryId === '*'
            ? contentType === 'movie'
              ? 'Movies'
              : 'Series'
            : categoryTitle,
        contentType,
      };
      fetchData(newContext);
    },
    [contentType, fetchData]
  );

  return (
    <PersonPageContext.Provider value={setPersonId}>
    <OpenTitleContext.Provider value={openTitle}>
      {streamUrl ? (
        <React.Suspense
          fallback={
            <div className="flex h-screen w-full items-center justify-center bg-black">
              <Loader2 className="h-8 w-8 animate-spin text-white/60" />
            </div>
          }
        >
        <VideoPlayer
          streamUrl={streamUrl}
          rawStreamUrl={rawStreamUrl}
          onBack={closePlayer}
          itemId={currentItem?.id || null}
          seasonId={context.seasonId}
          categoryId={context.category}
          context={context}
          contentType={contentType}
          mediaId={
            context.movieId ??
            (contentType === 'movie' && currentItem ? currentItem.id : null)
          }
          item={currentItem}
          seriesItem={currentSeriesItem}
          channels={contentType === 'tv' ? items : undefined}
          episodes={episodeSnapshot}
          channelInfo={contentType === 'tv' ? currentItem : null}
          previewChannelInfo={contentType === 'tv' ? previewChannel : null}
          onNextChannel={handleNextChannel}
          onPrevChannel={handlePrevChannel}
          onChannelSelect={handleItemClick}
          onEpisodeSelect={startPlayback}
          onLoadMoreEpisodes={onLoadMoreEpisodes}
          epgData={epgData}
          channelGroups={channelGroups}
          favorites={favorites}
          recentChannels={recentChannels}
          toggleFavorite={toggleFavorite}
          initialPlaybackState={
            resumePlaybackState || pendingPlaybackState || undefined
          }
        />
        </React.Suspense>
      ) : (
        <div className="flex h-screen flex-col overflow-hidden app-bg font-sans text-gray-200">
          <div className="flex min-h-0 w-full flex-1 flex-col pb-16 sm:pb-0">
            <Header
              currentTitle={currentTitle}
              contentType={contentType}
              handleContentTypeChange={handleContentTypeChange}
              isDiscoverActive={showDiscover && overlayPage === 'discover'}
              isSearchActive={isSearchPage}
              isMyListActive={isMyListPage}
              typedHome={typedHome}
              onSelectTypedHome={(t) => {
                setDetailItem(null);
                setCurrentSeriesItem(null);
                setOverlayPage(t === 'movie' ? 'movies' : 'series');
                setShowDiscover(true);
              }}
              onSelectMyList={() => {
                setDetailItem(null);
                setCurrentSeriesItem(null);
                setOverlayPage('mylist');
                setShowDiscover(true);
              }}
              onSelectSearch={() => {
                setDetailItem(null);
                setCurrentSeriesItem(null);
                setSearchLiveQuery(undefined);
                setOverlayPage('search');
                setShowDiscover(true);
              }}
              isPeopleActive={isPeoplePage}
              onSelectPeople={() => openSection('people')}
              isSportsActive={isSportsPage}
              onSelectSports={() => {
                setDetailItem(null);
                setCurrentSeriesItem(null);
                setOverlayPage('sports');
                setShowDiscover(true);
              }}
              onSelectDiscover={() => {
                setDetailItem(null);
                // A series detail left open (currentSeriesItem) wasn't being
                // cleared here — the dark tint/overlay condition below checks
                // it too, so jumping to Discover straight from a series
                // detail left that tint permanently on, darkening Discover's
                // own rows like a stuck modal even though nothing was
                // actually open there.
                setCurrentSeriesItem(null);
                setOverlayPage('discover');
                setShowDiscover(true);
              }}
              sort={context.sort}
              cycleSort={cycleSort}
              showAdmin={false}
              setShowAdmin={onShowAdmin}
              handleClearWatched={onClearWatched}
              streamUrl={streamUrl}
              historyLength={history.length}
              handleBack={handleBack}
            />

            <main className="relative min-h-0 flex-1">
              <IptvOfflineBanner />
              {/* No rotating backdrop any more (owner: a plain black-blue page reads better). */}
              {isSearchPage && (
                <SearchView
                  // A new "Find channel" query starts a fresh search.
                  key={searchLiveQuery ?? 'search'}
                  liveQuery={searchLiveQuery}
                  recentSearches={recentSearches}
                  onRecentSearchesChange={setRecentSearches}
                  onOpenTitle={searchOpenTitle}
                  onPickVersion={searchPickVersion}
                  onPlayChannel={searchPlayChannel}
                  onOpenDiscoverTitle={handleDiscoverItemClick}
                  isTizen={isTizen}
                />
              )}
              {isPeoplePage && <PeopleView sectionChips={sectionChips} />}
              {isSportsPage && (
                <SportsView
                  onPlayChannel={searchPlayChannel}
                  onFindChannel={(q) => {
                    setSearchLiveQuery(q);
                    setOverlayPage('search');
                  }}
                />
              )}
              {isMyListPage && (
                <MyListView
                  onClick={handleDiscoverItemClick}
                  loadingItemId={discoverLoadingItemId}
                  active={!detailItem && !(currentSeriesItem && contentType === 'series')}
                />
              )}
              {showDiscover && categoryType && (
                <CategoryBrowseView
                  key={`${categoryType}:${categoryOnly?.id ?? 'list'}`}
                  type={categoryType}
                  only={categoryOnly ?? undefined}
                  onOpenTitle={searchOpenTitle}
                  onClose={() => { setCategoryType(null); setCategoryOnly(null); }}
                />
              )}
              {showDiscover && (overlayPage === 'discover' || !!typedHome) && (
                <React.Suspense fallback={null}>
                  <div className={categoryType ? 'hidden' : 'contents'}>
                  <DiscoverView
                    // A fresh view per tab: Home, Movies and Series each keep their own filters.
                    key={overlayPage}
                    fixedType={typedHome}
                    sectionChips={sectionChips}
                    continueWatching={
                      <>
                        <ContinueHero progressRecords={homeProgress} onResume={handleItemClick} />
                        <ContinueWatching
                          onClick={handleItemClick}
                          skipFirst
                          progressRecords={homeProgress}
                          onProgressChanged={() => setCwRefreshKey((prev) => prev + 1)}
                        />
                      </>
                    }
                    onOpenCategories={typedHome ? () => { setCategoryOnly(null); setCategoryType(typedHome); } : undefined}
                    onOpenMyLibrary={typedHome ? () => { setCategoryOnly({ id: 'local', title: 'My library' }); setCategoryType(typedHome); } : undefined}
                    onClick={handleDiscoverItemClick}
                    recommendations={recommendations}
                    recommendationsBasedOn={recommendationsBasedOn}
                    loadingRecommendations={loadingRecommendations}
                    homeRows={homeRows}
                    genreOrder={genreOrder}
                    loadingItemId={discoverLoadingItemId}
                    onActiveTypeChange={setDiscoverActiveType}
                    onBackdropItemsChange={mergeBackdropItems}
                  />
                  </div>
                </React.Suspense>
              )}
              {/* Discover keeps showDiscover=true when opening a title (see
                  openDiscoverItem) instead of switching sections — MainContentGrid
                  is reused as-is for the actual detail-page rendering (identical
                  behavior to the regular Movies/Series flow, zero duplicated logic),
                  just layered on top as an overlay instead of replacing Discover's
                  rows underneath. Closing the detail (Back) clears detailItem/
                  currentSeriesItem, this stops rendering, and Discover's rows are
                  revealed again exactly as they were — no remount, scroll position
                  preserved. */}
              {/* The wrapper below is fixed, not absolute — absolute only covered
                  main's own content box (inset below the header, inside the
                  page's padding), which left a hard-edged rectangle visible
                  against the full-viewport AmbientBackdrop around it — fixed
                  inset-0 on JUST the tint layer matches AmbientBackdrop's own
                  coverage exactly, so there's no seam. Solid near-opaque
                  tint, not backdrop-blur-sm — this is obscuring Discover's own
                  sharp poster cards behind it (not the ambient image), and a
                  plain opacity layer does that without the GPU cost/flicker
                  risk of a full-viewport blur filter. Split from the actual
                  content wrapper below on purpose — putting fixed inset-0 on
                  the content wrapper too (an earlier version of this) made
                  the detail card start at the literal top of the viewport
                  instead of below the header, since `fixed` ignores <main>'s
                  layout position entirely; the translucent header then showed
                  the card's content bleeding through it. */}
              {/* Gated on the SAME condition as the content wrapper below, not
                  just showDiscover — otherwise this tint stayed visible the
                  entire time Discover was open, even while just browsing its
                  rows with no detail open, darkening the whole page like it
                  was permanently behind a modal. */}
              {showDiscover && (!!detailItem || (!!currentSeriesItem && contentType === 'series')) && (
                <div className="fixed inset-0 z-40 bg-black/90 animate-in fade-in duration-300" />
              )}
              {(!showDiscover || !!detailItem || (!!currentSeriesItem && contentType === 'series')) && (
              <div className={showDiscover ? 'absolute inset-0 z-40' : 'h-full'}>
              <MainContentGrid
                items={items}
                currentSeriesItem={currentSeriesItem}
                loading={loading}
                error={error}
                paginationError={paginationError}
                context={context}
                contentType={contentType}
                totalItemsCount={totalItemsCount}
                handleItemClick={handleItemClick}
                handlePageChange={handlePageChange}
                channelGroups={channelGroups}
                handleBack={handleBack}
                cwRefreshKey={cwRefreshKey}
                setCwRefreshKey={setCwRefreshKey}
                fetchData={fetchData}
                isRestoringFromHistory={isRestoringFromHistory.current}
                vodCategories={vodCategories}
                loadingCategories={loadingCategories}
                carouselSlides={carouselSlides}
                handleCarouselAction={handleCarouselAction}
                onSelectCategory={onSelectCategory}
                favorites={favorites}
                recentChannels={recentChannels}
                progressRecords={progressRecords}
                providerKey={providerKey}
                isCategoriesOpen={isCategoriesOpen}
                setIsCategoriesOpen={setIsCategoriesOpen}
                openCategoryDrawer={openCategoryDrawer}
                onCategoryDrawerOpened={onCategoryDrawerOpened}
                detailItem={detailItem}
                onCloseDetail={handleBack}
                onPlayDetailItem={startPlayback}
                hideCategorySidebar={showDiscover}
                onBackdropItemsChange={mergeBackdropItems}
              />
              </div>
              )}
            </main>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        isDestructive={confirmModal.isDestructive}
      />

      <VariantPickerModal
        isOpen={!!variantPickerItem}
        title={variantPickerItem?.title || variantPickerItem?.name || ''}
        variants={variantPickerOptions}
        onSelect={onSelectVariant}
        // Routes through handleBack (not a direct state clear) so the frame
        // pushed when the picker opened gets popped too — otherwise it'd sit
        // stale on the stack and a later, unrelated Back press would
        // incorrectly reopen this exact picker again.
        onClose={handleBack}
      />

      {personId != null && !streamUrl && (
        <React.Suspense fallback={null}>
          <PersonPage id={personId} onClose={closePerson} onOpenTitle={openPersonTitle} loadingItemId={discoverLoadingItemId} />
        </React.Suspense>
      )}
    </OpenTitleContext.Provider>
    </PersonPageContext.Provider>
  );
}

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

function ProtectedRoute({ children, adminOnly = false }: ProtectedRouteProps) {
  const { isLoggedIn, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen app-bg flex justify-center items-center font-sans text-gray-200">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!isLoggedIn) {
    const dest = isTizenDevice() ? '/login' : '/home';
    return <Navigate to={dest} replace />;
  }

  if (adminOnly && user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  const navigate = useNavigate();

  return (
    <>
      <Routes>
        <Route path="/home" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<Login />} />
        <Route path="/verify" element={<Verify />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <TVPortal onShowAdmin={() => navigate('/admin')} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute adminOnly>
              <div className="min-h-screen app-bg pt-6 font-sans text-gray-200 md:pt-10">
                <React.Suspense
                  fallback={
                    <div className="flex h-screen w-full items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-white/60" />
                    </div>
                  }
                >
                  <Admin onBack={() => navigate('/')} />
                </React.Suspense>
              </div>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastContainer
        position="bottom-right"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
        toastClassName={(context) =>
          "relative flex p-1 min-h-[60px] rounded-2xl justify-between overflow-hidden cursor-pointer bg-[#0b0f19] border border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.4)] text-gray-200 mb-3 " +
          (context?.type === 'success' ? 'border-l-4 border-l-emerald-500' : 
           context?.type === 'error' ? 'border-l-4 border-l-red-500' : 
           'border-l-4 border-l-[#3b82f6]') // Matching your app's electric blue
        }
        bodyClassName={() => "text-sm font-medium p-3 flex items-start text-gray-300"}
      />
    </>
  );
}
