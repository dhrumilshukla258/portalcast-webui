import React from 'react';
import LoadingSpinner from '@/components/atoms/LoadingSpinner';
import TvChannelList from '@/components/organisms/channels/TvChannelList';
import ContinueWatching from '@/components/organisms/browse/ContinueWatching';
import { WelcomeCarousel } from '@/components/organisms/browse/WelcomeCarousel';
import MovieDetailPage from '@/components/organisms/browse/MovieDetailPage';
import SeriesOverviewPage from '@/components/organisms/browse/SeriesOverviewPage';
import SeasonEpisodesPage from '@/components/organisms/browse/SeasonEpisodesPage';
import MediaGrid from './main-content-grid/MediaGrid';
import GridFooter from './main-content-grid/GridFooter';
import CategorySidebar from './main-content-grid/CategorySidebar';
import MobileCategoryDrawer from './main-content-grid/MobileCategoryDrawer';
import { useResizableWidth } from '@/hooks/useResizableWidth';
import { isTizenDevice } from '@/utils/helpers';
import type { MediaItem, ContextType, ChannelGroup } from '@/types';
import type { CarouselSlide } from '@/api/endpoints/carousel';
import type { ProgressRecord } from '@/api/types/user';

interface MainContentGridProps {
  items: MediaItem[];
  currentSeriesItem?: MediaItem | null;
  loading: boolean;
  error: string | null;
  paginationError: string | null;
  context: ContextType;
  contentType: 'movie' | 'series' | 'tv';
  totalItemsCount: number;
  handleItemClick: (item: MediaItem) => void;
  handlePageChange: (dir: number) => void;
  channelGroups: ChannelGroup[];
  handleBack: () => void;
  cwRefreshKey: number;
  setCwRefreshKey?: React.Dispatch<React.SetStateAction<number>>;
  fetchData: (
    context: ContextType,
    contentType: 'movie' | 'series' | 'tv'
  ) => void;
  isRestoringFromHistory: boolean;
  vodCategories?: ChannelGroup[];
  loadingCategories?: boolean;
  carouselSlides?: CarouselSlide[];
  handleCarouselAction?: (slide: CarouselSlide) => void;
  onSelectCategory?: (categoryId: string, categoryTitle: string) => void;
  favorites?: string[];
  recentChannels?: string[];
  progressRecords?: ProgressRecord[];
  providerKey?: string;
  isCategoriesOpen?: boolean;
  setIsCategoriesOpen?: (open: boolean) => void;
  detailItem?: MediaItem | null;
  onCloseDetail?: () => void;
  onPlayDetailItem?: (item: MediaItem) => void;
  // True when this instance is being rendered as Discover's detail overlay
  // (see App.tsx) rather than the regular Movies/Series browsing experience
  // — the category sidebar belongs to that browsing experience specifically
  // and shouldn't show up around a detail page opened from Discover.
  hideCategorySidebar?: boolean;
  // Reports this view's ambient-backdrop item pool up to App.tsx, which owns
  // the single shared AmbientBackdrop instance — see that component's own
  // comment for why one shared instance instead of one-per-view matters
  // (crossfade continuity across Discover/Movies/Series switches).
  onBackdropItemsChange?: (items: MediaItem[]) => void;
}

const MainContentGrid = React.memo(
  ({
    items,
    currentSeriesItem,
    loading,
    error,
    paginationError,
    context,
    contentType,
    totalItemsCount,
    handleItemClick,
    handlePageChange,
    channelGroups,
    handleBack,
    setCwRefreshKey,
    fetchData,
    isRestoringFromHistory,
    vodCategories = [],
    carouselSlides = [],
    handleCarouselAction = () => {},
    onSelectCategory = () => {},
    favorites = [],
    recentChannels = [],
    progressRecords = [],
    providerKey = 'default',
    isCategoriesOpen = false,
    setIsCategoriesOpen = () => {},
    detailItem = null,
    onCloseDetail = () => {},
    onPlayDetailItem = () => {},
    hideCategorySidebar = false,
    onBackdropItemsChange,
  }: MainContentGridProps) => {
    const isTizen = isTizenDevice();
    const { width: sidebarWidth, onMouseDown: onSidebarResizeStart } =
      useResizableWidth(`vodSidebarWidth_${providerKey}_${contentType}`, 220, 160, 420);
    const [showMobileCategoryDrawer, setShowMobileCategoryDrawer] =
      React.useState(false);
    const contentScrollRef = React.useRef<HTMLDivElement>(null);

    // The content pane keeps its scroll position across renders (it's the same DOM node),
    // so opening a movie/series/season page while scrolled down in the grid would otherwise
    // mount already scrolled past the back button. Snap it to the top on every navigation.
    React.useEffect(() => {
      contentScrollRef.current?.scrollTo({ top: 0 });
    }, [detailItem, context.movieId, context.seasonId]);
    const isEpisodeList =
      items &&
      items.length > 0 &&
      (!!items[0].is_episode || context.seasonId !== null);

    const enrichedItems = React.useMemo(() => {
      if (!isEpisodeList || !items) return items;
      return items.map((item) => ({
        ...item,
        is_episode: 1,
        description: item.description || currentSeriesItem?.description,
        director: item.director || currentSeriesItem?.director,
        actors: item.actors || currentSeriesItem?.actors,
        year: item.year || currentSeriesItem?.year,
        rating_imdb: item.rating_imdb || currentSeriesItem?.rating_imdb,
        rating_kinopoisk:
          item.rating_kinopoisk || currentSeriesItem?.rating_kinopoisk,
        rating_mpaa: item.rating_mpaa || currentSeriesItem?.rating_mpaa,
        age: item.age || currentSeriesItem?.age,
        country: item.country || currentSeriesItem?.country,
        genres_str: item.genres_str || currentSeriesItem?.genres_str,
        screenshot_uri:
          item.screenshot_uri || currentSeriesItem?.screenshot_uri,
      }));
    }, [items, isEpisodeList, currentSeriesItem]);

    // Built once per progressRecords/vodCategories change instead of doing a
    // linear .find() per rendered card — items can grow into the hundreds via
    // pagination, so an O(n*m) scan-per-card was redoing the same lookup
    // work on every render of the grid.
    const progressByMediaId = React.useMemo(() => {
      const map = new Map<string, ProgressRecord>();
      for (const record of progressRecords) map.set(String(record.mediaId), record);
      return map;
    }, [progressRecords]);

    const categoryById = React.useMemo(() => {
      const map = new Map<string, string>();
      for (const cat of vodCategories) map.set(String(cat.id), cat.title);
      return map;
    }, [vodCategories]);

    const isRootVod = contentType !== 'tv' && !context.search && !context.movieId;
    // True for the whole movie/series browsing experience (root list, inside a category,
    // and drilled into a series' seasons/episodes) — the category sidebar stays mounted
    // throughout all of these, only the content pane on the right changes.
    const showVodBrowser = contentType !== 'tv' && !context.search && !hideCategorySidebar;

    // General ambient backdrop behind the whole grid (distinct from the
    // per-card one in MediaCard) — cycles through every backdrop-carrying
    // item in the current category, rather than sitting on whichever one
    // happened to load first. Movie categories naturally cycle movie
    // backdrops, series categories series backdrops, since the pool is just
    // `items`, already scoped to the active contentType/category.
    const gridBackdropItems = React.useMemo(
      () => (contentType === 'tv' || isEpisodeList ? [] : items || []),
      [items, contentType, isEpisodeList]
    );

    React.useEffect(() => {
      onBackdropItemsChange?.(gridBackdropItems);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gridBackdropItems]);

    if (loading && items.length === 0 && !showVodBrowser) return <LoadingSpinner />;

    if (error) {
      return (
        <div className="text-center">
          <p className="text-red-500">{error}</p>
          <button
            onClick={() => fetchData(context, contentType)}
            className="mt-4 rounded-lg bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600"
            data-focusable="true"
          >
            Reload
          </button>
        </div>
      );
    }

    return (
      <div className="flex h-full flex-col">
        {!isTizen && contentType === 'tv' ? (
          <div className="relative min-h-0 w-full flex-1 overflow-hidden rounded-xl border border-white/10 bg-black/70">
            <TvChannelList
              channels={items}
              channelGroups={channelGroups}
              onChannelSelect={handleItemClick}
              onBack={handleBack}
              currentItemId={null}
              showCloseButton={false}
              favorites={favorites}
              recentChannels={recentChannels}
              providerKey={providerKey}
            />
          </div>
        ) : (
          (() => {
            const gridContent = (
              <MediaGrid
                items={enrichedItems}
                contentType={contentType}
                isEpisodeList={isEpisodeList}
                isTizen={isTizen}
                loading={loading}
                context={context}
                handleItemClick={handleItemClick}
                progressByMediaId={progressByMediaId}
                categoryById={categoryById}
              />
            );

            const footer = (
              <GridFooter
                items={items}
                loading={loading}
                context={context}
                totalItemsCount={totalItemsCount}
                contentType={contentType}
                paginationError={paginationError}
                handlePageChange={handlePageChange}
              />
            );

            const isMovieDetail = contentType === 'movie' && !!detailItem;
            const isSeriesOverview = contentType === 'series' && !!context.movieId && !context.seasonId && !!currentSeriesItem;
            const isSeasonEpisodes = contentType === 'series' && !!context.movieId && !!context.seasonId && !!currentSeriesItem;

            // Identifies "what page is currently shown" — used as a React key so the
            // content wrapper remounts (and replays its fade-in) on real navigation
            // (detail open/close, back, category switch) but not on incidental
            // re-renders like a silent background refresh patching item fields.
            const viewKey = `${contentType}_${context.category ?? ''}_${context.movieId ?? ''}_${context.seasonId ?? ''}_${context.search ?? ''}`;

            const mainBody = isMovieDetail ? (
              <MovieDetailPage item={detailItem as MediaItem} onPlay={onPlayDetailItem} onBack={onCloseDetail} />
            ) : isSeasonEpisodes ? (
              <SeasonEpisodesPage
                seriesItem={currentSeriesItem as MediaItem}
                seasonTitle={context.parentTitle}
                episodes={items}
                loadingEpisodes={loading}
                progressRecords={progressRecords}
                onPlayEpisode={onPlayDetailItem}
                onBack={handleBack}
              />
            ) : isSeriesOverview ? (
              <SeriesOverviewPage
                seriesItem={currentSeriesItem as MediaItem}
                seasons={items}
                loadingSeasons={loading}
                progressRecords={progressRecords}
                onSelectSeason={handleItemClick}
                onPlayEpisode={onPlayDetailItem}
                onBack={handleBack}
              />
            ) : (
              <>
                {isRootVod && carouselSlides.length > 0 && (
                  <div data-focus-group="carousel">
                    <WelcomeCarousel slides={carouselSlides} onAction={handleCarouselAction} />
                  </div>
                )}
                {isRootVod && (
                  <ContinueWatching
                    onClick={handleItemClick}
                    progressRecords={progressRecords}
                    onProgressChanged={() => setCwRefreshKey?.((prev) => prev + 1)}
                  />
                )}
                {!isEpisodeList && (
                  <h2 className="mb-4 px-2 text-center text-xl font-bold text-white sm:px-0 sm:text-left sm:text-2xl">
                    {context.parentTitle}
                  </h2>
                )}
                {gridContent}
                {footer}
              </>
            );

            if (showVodBrowser && vodCategories.length > 1) {
              return (
                <div className="flex min-h-0 flex-1 items-stretch overflow-hidden rounded-xl border border-gray-800/60">
                  <CategorySidebar
                    sidebarWidth={sidebarWidth}
                    onSidebarResizeStart={onSidebarResizeStart}
                    vodCategories={vodCategories}
                    selectedCategory={context.category}
                    onSelectCategory={onSelectCategory}
                    contentType={contentType as 'movie' | 'series'}
                    providerKey={providerKey}
                    isCategoriesOpen={isCategoriesOpen}
                    setIsCategoriesOpen={setIsCategoriesOpen}
                  />

                  <div id="app-content-scroll" ref={contentScrollRef} className="custom-scrollbar min-w-0 flex-1 overflow-y-auto p-2 sm:p-3">
                    {/* Category drawer trigger (mobile) */}
                    <div className="mb-3 px-2 md:hidden">
                      <button
                        onClick={() => setShowMobileCategoryDrawer(true)}
                        data-focusable="true"
                        className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/70 px-3 py-2 text-sm font-bold text-gray-200 transition-colors hover:bg-black/80"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                        <span className="truncate">
                          {vodCategories.find((c) => c.id === context.category)?.title || 'Categories'}
                        </span>
                      </button>
                    </div>
                    <div key={viewKey} className={isRestoringFromHistory ? '' : 'content-transition'}>
                      {mainBody}
                    </div>
                  </div>

                  {showMobileCategoryDrawer && (
                    <MobileCategoryDrawer
                      vodCategories={vodCategories}
                      selectedCategory={context.category}
                      onSelectCategory={onSelectCategory}
                      contentType={contentType as 'movie' | 'series'}
                      providerKey={providerKey}
                      isCategoriesOpen={isCategoriesOpen}
                      setIsCategoriesOpen={setIsCategoriesOpen}
                      onClose={() => setShowMobileCategoryDrawer(false)}
                    />
                  )}
                </div>
              );
            }

            return (
              <div id="app-content-scroll" ref={contentScrollRef} className="custom-scrollbar min-h-0 flex-1 overflow-y-auto">
                <div key={viewKey} className={isRestoringFromHistory ? '' : 'content-transition'}>
                  {mainBody}
                </div>
              </div>
            );
          })()
        )}
      </div>
    );
  }
);

export default MainContentGrid;
