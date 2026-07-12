import React from 'react';
import LoadingSpinner from '@/components/atoms/LoadingSpinner';
import MediaCard from '@/components/molecules/MediaCard';
import EpisodeCard from '@/components/molecules/EpisodeCard';
import TvChannelListCard from '@/components/molecules/TvChannelListCard';
import TvChannelList from '@/components/organisms/TvChannelList';
import ContinueWatching from '@/components/organisms/ContinueWatching';
import { WelcomeCarousel } from '@/components/organisms/WelcomeCarousel';
import { CategorySelector } from '@/components/organisms/CategorySelector';
import MovieDetailPage from '@/components/organisms/MovieDetailPage';
import SeriesOverviewPage from '@/components/organisms/SeriesOverviewPage';
import SeasonEpisodesPage from '@/components/organisms/SeasonEpisodesPage';
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
    cwRefreshKey,
    fetchData,
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

    const isRootVod = contentType !== 'tv' && !context.search && !context.movieId;
    // True for the whole movie/series browsing experience (root list, inside a category,
    // and drilled into a series' seasons/episodes) — the category sidebar stays mounted
    // throughout all of these, only the content pane on the right changes.
    const showVodBrowser = contentType !== 'tv' && !context.search;

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
          <div className="relative min-h-0 w-full flex-1 overflow-hidden rounded-xl border border-gray-700 bg-gray-900/50">
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
              <>
                {loading && items.length === 0 ? (
                  <div className="flex w-full justify-center py-12">
                    <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
                  </div>
                ) : (
                  <div
                    className={`${
                      contentType === 'tv'
                        ? 'channel-list flex flex-col gap-1'
                        : isEpisodeList && !isTizen
                          ? 'flex flex-col gap-4'
                          : isEpisodeList
                            ? 'grid grid-cols-1 gap-4 px-2 sm:px-0 md:grid-cols-2'
                            : 'grid grid-cols-3 gap-2 px-2 sm:grid-cols-4 sm:gap-4 sm:px-0 md:grid-cols-5 md:gap-6 lg:grid-cols-6 xl:grid-cols-7'
                    } ${loading && items.length > 0 && context.page === 1 ? 'pointer-events-none opacity-50 transition-opacity duration-300' : 'opacity-100'}`}
                  >
                    {enrichedItems?.map((item, index) =>
                      contentType === 'tv' ? (
                        <TvChannelListCard
                          key={`${item.id}-${index}`}
                          item={item}
                          onClick={handleItemClick}
                          isFocused={false}
                        />
                      ) : isEpisodeList ? (
                        (() => {
                          const record = progressRecords.find((r) => String(r.mediaId) === String(item.id));
                          return (
                            <EpisodeCard
                              key={`${item.id}-${index}`}
                              item={item}
                              onClick={handleItemClick}
                              isCompleted={record?.completed}
                            />
                          );
                        })()
                      ) : (
                        (() => {
                          const record = progressRecords.find((r) => String(r.mediaId) === String(item.id));
                          return (
                            <MediaCard
                              key={`${item.id}-${index}`}
                              item={item}
                              onClick={handleItemClick}
                              isCompleted={record?.completed}
                              progressPercent={record?.meta?.progressPercent}
                            />
                          );
                        })()
                      )
                    )}
                  </div>
                )}
              </>
            );

            const footer = (
              <>
                {!items?.length && !loading && !context.search && (
                  <p className="mt-10 text-center text-gray-400">No content found.</p>
                )}
                {!items?.length && !loading && context.search && (
                  <p className="mt-10 text-center text-gray-400">
                    No results found for "{context.search}".
                  </p>
                )}

                {(totalItemsCount === 0 || items.length < totalItemsCount) &&
                  contentType !== 'tv' && (
                    <div className="w-full py-8 flex flex-col items-center justify-center">
                      {loading && items.length > 0 && (
                        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
                      )}
                      {!loading && paginationError && (
                        <div className="text-center">
                          <p className="text-red-500">{paginationError}</p>
                          <button
                            onClick={() => handlePageChange(1)}
                            className="mt-4 rounded-lg bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600"
                            data-focusable="true"
                          >
                            Retry
                          </button>
                        </div>
                      )}
                    </div>
                  )}
              </>
            );

            const isMovieDetail = contentType === 'movie' && !!detailItem;
            const isSeriesOverview = contentType === 'series' && !!context.movieId && !context.seasonId && !!currentSeriesItem;
            const isSeasonEpisodes = contentType === 'series' && !!context.movieId && !!context.seasonId && !!currentSeriesItem;

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
                  <ContinueWatching onClick={handleItemClick} refreshKey={cwRefreshKey} />
                )}
                {gridContent}
                {footer}
              </>
            );

            if (showVodBrowser && vodCategories.length > 1) {
              return (
                <div className="flex min-h-0 flex-1 items-stretch overflow-hidden rounded-xl border border-gray-800/60">
                  {/* Category sidebar (desktop) — scrolls independently, doesn't move with content */}
                  <div
                    style={{ width: sidebarWidth }}
                    className="custom-scrollbar hidden shrink-0 flex-col overflow-y-auto border-r border-gray-800/60 bg-gray-900/40 p-3 md:flex"
                  >
                    <CategorySelector
                      categories={vodCategories}
                      selectedCategory={context.category}
                      onSelectCategory={onSelectCategory}
                      contentType={contentType as 'movie' | 'series'}
                      providerKey={providerKey}
                      showAllOverlay={isCategoriesOpen}
                      setShowAllOverlay={setIsCategoriesOpen}
                      layout="sidebar"
                    />
                  </div>

                  {/* Drag handle to resize the sidebar */}
                  <div
                    onMouseDown={onSidebarResizeStart}
                    title="Drag to resize categories panel"
                    className="group hidden w-3 shrink-0 cursor-col-resize items-center justify-center bg-gray-900/40 md:flex"
                  >
                    <div className="h-16 w-1 rounded-full bg-gray-700/60 transition-colors group-hover:bg-blue-500" />
                  </div>

                  <div id="app-content-scroll" ref={contentScrollRef} className="custom-scrollbar min-w-0 flex-1 overflow-y-auto p-2 sm:p-3">
                    {/* Category drawer trigger (mobile) */}
                    <div className="mb-3 px-2 md:hidden">
                      <button
                        onClick={() => setShowMobileCategoryDrawer(true)}
                        data-focusable="true"
                        className="flex items-center gap-2 rounded-lg border border-gray-800/80 bg-gray-900/40 px-3 py-2 text-sm font-bold text-gray-200 transition-colors hover:bg-gray-800/60"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                        <span className="truncate">
                          {vodCategories.find((c) => c.id === context.category)?.title || 'Categories'}
                        </span>
                      </button>
                    </div>
                    {mainBody}
                  </div>

                  {/* Category drawer (mobile) */}
                  {showMobileCategoryDrawer && (
                    <div className="fixed inset-0 z-50 flex md:hidden">
                      <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowMobileCategoryDrawer(false)}
                      />
                      <div className="animate-in slide-in-from-left relative flex h-full w-[78vw] max-w-xs flex-col border-r border-gray-800 bg-gray-950/95 p-3 shadow-2xl duration-200">
                        <div className="mb-2 flex items-center justify-between px-1">
                          <span className="text-xs font-black uppercase tracking-tight text-white/60">
                            Browse
                          </span>
                          <button
                            onClick={() => setShowMobileCategoryDrawer(false)}
                            aria-label="Close"
                            className="rounded-full p-1.5 text-gray-400 hover:bg-white/10 hover:text-white"
                          >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        <CategorySelector
                          categories={vodCategories}
                          selectedCategory={context.category}
                          onSelectCategory={(id, title) => {
                            onSelectCategory(id, title);
                            setShowMobileCategoryDrawer(false);
                          }}
                          contentType={contentType as 'movie' | 'series'}
                          providerKey={providerKey}
                          showAllOverlay={isCategoriesOpen}
                          setShowAllOverlay={setIsCategoriesOpen}
                          layout="sidebar"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            }

            return (
              <div id="app-content-scroll" ref={contentScrollRef} className="custom-scrollbar min-h-0 flex-1 overflow-y-auto">
                {mainBody}
              </div>
            );
          })()
        )}
      </div>
    );
  }
);

export default MainContentGrid;
