import React, { useState, useCallback, useEffect } from 'react';
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
// (stats/users/content/carousel/config/logs/API-reference tabs all live
// here). Eagerly bundling it meant every session paid its parse/download
// cost on first load even though most users never open it.
const Admin = React.lazy(() => import('@/components/organisms/admin/Admin'));
// Lazy — only needed once playback actually starts, and its tree pulls in
// the HLS/vidstack player stack, which is one of the heaviest dependencies
// in the app.
const VideoPlayer = React.lazy(() => import('@/components/organisms/video/VideoPlayer'));
import ConfirmationModal from '@/components/molecules/ConfirmationModal';
import VariantPickerModal from '@/components/molecules/VariantPickerModal';
import MainContentGrid from '@/components/organisms/browse/MainContentGrid';
// Lazy — only mounted when the user opens the Discover tab, not on initial load.
const DiscoverView = React.lazy(() => import('@/components/organisms/discover/DiscoverView'));
import { AmbientBackdrop } from '@/components/molecules/AmbientBackdrop';
import { TitleSearchBar } from '@/components/molecules/TitleSearchBar';

import { useMediaLibrary, initialContext } from '@/hooks/useMediaLibrary';
import { useDiscover } from '@/hooks/useDiscover';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import { useDiscoverNavigation } from '@/hooks/useDiscoverNavigation';
import { useSearchController } from '@/hooks/useSearchController';
import { useTVFocus } from '@/hooks/useTVFocus';
import { useCastReceiver } from '@/hooks/useCastReceiver';
import { isTizenDevice } from './utils/helpers';
import type { MediaItem } from '@/types';
import { type DiscoverVariant } from '@/api/endpoints/discover';

function TVPortal({ onShowAdmin }: { onShowAdmin: () => void }) {
  const isTizen = isTizenDevice();
  const { user, updatePreferences } = useAuth();
  const recentSearches = user?.preferences?.recentSearches || [];
  const [detailItem, setDetailItem] = useState<MediaItem | null>(null);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [showDiscover, setShowDiscover] = useState(false);
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
    handleSearch,
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

  const { recommendations, recommendationsBasedOn, loadingRecommendations, fetchRecommendations } = useDiscover();

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
    }, [])
  );

  // One shared AmbientBackdrop instance instead of one per view (Discover,
  // MainContentGrid) — each view reports its own item pool up via
  // onBackdropItemsChange. Deliberately a single COMBINED pool, not a
  // per-view switch — switching pools based on which section is active
  // still meant the backdrop visibly changed the instant you navigated
  // (even with a smooth crossfade, it was still a different image every
  // time). Merging both into one continuous rotation means the backdrop
  // genuinely doesn't care which section you're looking at.
  const [discoverBackdropItems, setDiscoverBackdropItems] = useState<MediaItem[]>([]);
  const [gridBackdropItems, setGridBackdropItems] = useState<MediaItem[]>([]);
  const activeBackdropItems = React.useMemo(
    () => [...discoverBackdropItems, ...gridBackdropItems],
    [discoverBackdropItems, gridBackdropItems]
  );

  const onClearWatched = useCallback(
    () => handleClearWatched(setConfirmModal),
    [handleClearWatched]
  );

  const {
    isSearchActive,
    setIsSearchActive,
    isSearchTyping,
    setIsSearchTyping,
    searchTerm,
    setSearchTerm,
  } = useTVFocus({
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

  const { onSearchSubmit, onSelectRecentSearch, onRemoveRecentSearch } = useSearchController({
    searchTerm,
    setSearchTerm,
    contextSearch: context.search,
    pushFrame,
    handleSearch,
    setDetailItem,
    recentSearches,
    updatePreferences,
    isTizen,
  });

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
    if (isDiscoverBrowsing) return 'Discover';

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
  }, [streamUrl, context, contentType, showDiscover, detailItem, currentSeriesItem]);

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
    <>
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
          episodes={
            currentItem?.is_episode || currentItem?.series_number !== undefined
              ? items
              : undefined
          }
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
          <div className="flex min-h-0 w-full flex-1 flex-col px-2 py-0 sm:px-6 sm:py-6">
            <Header
              currentTitle={currentTitle}
              contentType={contentType}
              handleContentTypeChange={handleContentTypeChange}
              isDiscoverActive={showDiscover}
              onSelectDiscover={() => {
                setDetailItem(null);
                // A series detail left open (currentSeriesItem) wasn't being
                // cleared here — the dark tint/overlay condition below checks
                // it too, so jumping to Discover straight from a series
                // detail left that tint permanently on, darkening Discover's
                // own rows like a stuck modal even though nothing was
                // actually open there.
                setCurrentSeriesItem(null);
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
              <AmbientBackdrop items={activeBackdropItems} allowLowRes />
              {/* Moved out of Header into its own sub-bar here — mirrors how
                  DiscoverView's Filters/Movies/Series bar sits below the main
                  nav row, so Movies/Series/TV get an equivalent section bar
                  instead of search being buried in the header's action
                  controls. Discover still has no search of its own (it's
                  filter-driven, see DiscoverFilters). */}
              {!showDiscover && !streamUrl && (
                <TitleSearchBar
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                  handleSearch={onSearchSubmit}
                  isSearchActive={isSearchActive}
                  setIsSearchActive={setIsSearchActive}
                  isSearchTyping={isSearchTyping}
                  setIsSearchTyping={setIsSearchTyping}
                  isTizen={isTizen}
                  recentSearches={recentSearches}
                  onSelectRecentSearch={onSelectRecentSearch}
                  onRemoveRecentSearch={onRemoveRecentSearch}
                  placeholder={
                    contentType === 'tv'
                      ? 'Search channels...'
                      : contentType === 'movie'
                        ? 'Search movies...'
                        : contentType === 'series'
                          ? 'Search series...'
                          : 'Search titles...'
                  }
                />
              )}
              {showDiscover && (
                <React.Suspense fallback={null}>
                  <DiscoverView
                    onClick={handleDiscoverItemClick}
                    recommendations={recommendations}
                    recommendationsBasedOn={recommendationsBasedOn}
                    loadingRecommendations={loadingRecommendations}
                    loadingItemId={discoverLoadingItemId}
                    onActiveTypeChange={setDiscoverActiveType}
                    onBackdropItemsChange={setDiscoverBackdropItems}
                  />
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
                  tint, not backdrop-blur — this is obscuring Discover's own
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
                detailItem={detailItem}
                onCloseDetail={handleBack}
                onPlayDetailItem={startPlayback}
                hideCategorySidebar={showDiscover}
                onBackdropItemsChange={setGridBackdropItems}
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
    </>
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
              <div className="min-h-screen app-bg font-sans text-gray-200">
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
