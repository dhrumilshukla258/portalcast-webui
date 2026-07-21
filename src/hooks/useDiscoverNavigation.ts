import { useCallback, useState } from 'react';
import { toast } from 'react-toastify';
import { getMedia } from '@/api/endpoints/movies';
import { getSeries } from '@/api/endpoints/series';
import { getChannels } from '@/api/endpoints/channels';
import { getDiscoverVariants, type DiscoverVariant } from '@/api/endpoints/discover';
import type { CarouselSlide } from '@/api/endpoints/carousel';
import { initialContext } from '@/hooks/useMediaLibrary';
import type { MediaItem, ContextType } from '@/types';

interface UseDiscoverNavigationArgs {
  pushFrame: () => void;
  fetchData: (context: ContextType, typeOverride?: 'movie' | 'series' | 'tv') => void;
  handleContentTypeChangeRaw: (type: 'movie' | 'series' | 'tv') => void;
  setCurrentSeriesItem: (item: MediaItem | null) => void;
  setVariantPickerItem: (item: MediaItem | null) => void;
  setVariantPickerOptions: (options: DiscoverVariant[]) => void;
  setDetailItem: (item: MediaItem | null) => void;
  startPlayback: (item: MediaItem, startTime?: number, endTime?: number) => Promise<void>;
  handleItemClick: (item: MediaItem) => Promise<void>;
}

// Everything involved in translating a Discover card (TMDB-sourced, carries
// ContentMeta's "movie_{id}"/"series_{id}" prefixed id, none of the
// is_series/is_playable_movie flags the regular browsing flow relies on)
// into the app's normal detail-page/playback flow. Kept as one hook since
// openDiscoverItem/handleDiscoverItemClick/onSelectVariant share the same
// pushFrame-then-clear-picker ordering rule (see openDiscoverItem) and
// handleCarouselAction resolves carousel slides the same way.
export function useDiscoverNavigation({
  pushFrame,
  fetchData,
  handleContentTypeChangeRaw,
  setCurrentSeriesItem,
  setVariantPickerItem,
  setVariantPickerOptions,
  setDetailItem,
  startPlayback,
  handleItemClick,
}: UseDiscoverNavigationArgs) {
  // Id of the Discover card currently being resolved (variants check +
  // getMedia/getSeries) — without this, a slow resolve (the whole reason
  // we're adding it: those calls can be genuinely slow under load) looks
  // exactly like a dead click, indistinguishable from actually broken.
  const [discoverLoadingItemId, setDiscoverLoadingItemId] = useState<string | null>(null);

  // Discover items (recommendations/browse/facets rows) carry ContentMeta's
  // prefixed id ("movie_{id}"/"series_{id}") and none of the is_series/
  // is_playable_movie flags handleItemClick's branching relies on — those
  // flags encode this app's per-category VOD browsing model (e.g. "is this a
  // category tile or an actual movie"), which Discover has no equivalent of.
  // So instead of feeding raw Discover items into handleItemClick, resolve
  // them the same way handleCarouselAction already does for carousel slides:
  // fetch the real movie/series via getMedia/getSeries, then open its detail
  // page directly, switching the active tab to match so MainContentGrid's
  // (contentType-keyed) detail-page rendering picks it up.
  const openDiscoverItem = useCallback(
    async (item: MediaItem) => {
      const rawId = item.id.replace(/^(movie|series)_/, '');
      // item.type is trusted first, but the id's own prefix (just parsed
      // above) is a more reliable fallback signal than defaulting to "movie"
      // if type is ever missing on a Discover-sourced item.
      const isSeries = item.type === 'series' || item.id.startsWith('series_');
      // Discover cards now carry the category they were actually enriched
      // from (see discover/index.ts's toMediaItem) — pass it straight through
      // instead of "*", which forced the backend into either a live
      // full-catalog portal scan or an unreliable click-time cache guess
      // (both of which could resolve to the wrong category and return wrong
      // metadata / a dead stream for ids that happen to collide across
      // categories). Falls back to "*" only for pre-backfill rows.
      const resolveCategory = item.category || '*';
      try {
        if (isSeries) {
          let res = await getSeries({ movieId: rawId, category: resolveCategory });
          // The category Discover stamped on this item can be stale/wrong
          // (bad backend enrichment, not something fixable here) — a
          // category-scoped movieId lookup then comes back empty even though
          // the title genuinely exists in the real catalog under a different
          // category. Retry unscoped before giving up; matches how the
          // regular Movies/Series browse flow would actually find it.
          if (!res.data?.length && resolveCategory !== '*') {
            res = await getSeries({ movieId: rawId, category: '*' });
          }
          if (!res.data?.length) throw new Error('Series not found');
          // res.data is the SEASON LIST for this series, not the series' own
          // metadata — res.data[0] is literally the first season object
          // (id="32537", name="Season 2. Witchblade : Season 02", is_season:
          // true), never the series itself. Spreading it here as if it were
          // the resolved series produced a garbled title and, worse, a wrong
          // id (the season's, not the series') that every subsequent
          // season/episode lookup then inherited. Build currentSeriesItem
          // from Discover's own already-correct item data instead — same
          // fix as the movie branch's title preservation, and matches how
          // the regular Movies/Series grid builds currentSeriesItem from the
          // clicked list item directly, never from a getSeries response.
          const resolved = { ...item, id: rawId, catalogId: item.id, is_series: 1 } as MediaItem;
          pushFrame();
          // Cleared AFTER pushFrame() (not before) — pushFrame snapshots
          // whatever variantPickerItem/Options currently are, so if this open
          // came from selecting a variant, the frame remembers the picker
          // was showing. Back then reopens the picker instead of skipping
          // straight past it to wherever was active before it ever opened.
          setVariantPickerItem(null);
          setVariantPickerOptions([]);
          setDetailItem(null);
          // Deliberately NOT setShowDiscover(false) — MainContentGrid renders
          // as an overlay on top of Discover instead of replacing it (see the
          // showDiscover-gated overlay wrapper in App.tsx's JSX). The
          // detail page shows without ever leaving the Discover screen. Back
          // clears detailItem/currentSeriesItem, dropping the overlay and
          // revealing Discover's rows again untouched.
          handleContentTypeChangeRaw('series');
          setCurrentSeriesItem(resolved);
          // handleContentTypeChangeRaw only schedules the contentType state
          // update (takes effect next render) — fetchData reads its own
          // memoized `contentType` closure otherwise, so the type override
          // must be passed explicitly or this resolves against whichever tab
          // was active before the switch.
          fetchData(
            {
              ...initialContext,
              category: resolveCategory,
              movieId: resolved.id,
              parentTitle: resolved.title || resolved.name || '',
              contentType: 'series',
            },
            'series'
          );
        } else {
          let res = await getMedia({ movieId: rawId, category: resolveCategory });
          // See the series branch's comment above — same stale-category
          // fallback, movie side.
          if (!res.data?.length && resolveCategory !== '*') {
            res = await getMedia({ movieId: rawId, category: '*' });
          }
          if (!res.data?.length) throw new Error('Movie not found');
          // res.data[0] is a resolved file/quality variant — its own name is
          // often just a descriptor like "Punjabi / Ultra high quality (4K)",
          // not the movie's actual title (same issue documented in
          // useAppNavigation.ts's resolveStreamUrl for the play step). Keep
          // Discover's already-clean trimmedName/title instead of letting the
          // file variant's name overwrite it on the detail page.
          const realTitle = item.title || item.name;
          // res.data[0].category_id (if present) reflects the FILE object's
          // own, unrelated categorization — confirmed via real traffic: a
          // movie fetched successfully via category=1 came back with
          // category_id="4", and re-querying with that "4" (the play step's
          // own getMedia lookup, which prefers item.category_id) failed
          // outright. resolveCategory is the one we *know* worked for this
          // exact id — stamp it on, overriding whatever the file object says.
          //
          // Spread item FIRST (Discover's TMDB-sourced poster/title — already
          // proven good, it's what the card itself displays), then res.data[0]
          // on top (brings in the actually-playable id/cmd/other file-specific
          // fields), then re-apply title/screenshot_uri from item since the
          // file object's own versions are often empty or a raw descriptor —
          // same reasoning as the title fix, just also covering the poster,
          // which was still getting silently overwritten to blank/wrong.
          const resolved = {
            ...item,
            ...res.data[0],
            ...(realTitle ? { title: realTitle, name: realTitle } : {}),
            ...(item.screenshot_uri ? { screenshot_uri: item.screenshot_uri } : {}),
            // Same problem as title/poster above, just for cast/director:
            // Discover's TMDB-enriched item can carry real actors/director
            // data that this specific portal file entry doesn't (an empty
            // "" on the portal side still wins a plain last-spread-wins
            // merge, silently blanking the Cast section on the detail page
            // even though Discover already had it). Prefer whichever side
            // actually has a non-empty value instead of always trusting the
            // file entry.
            actors: res.data[0]?.actors || item.actors,
            director: res.data[0]?.director || item.director,
            category_id: resolveCategory,
            catalogId: item.id,
            is_playable_movie: true,
          } as MediaItem;
          pushFrame();
          // See the series branch above — showDiscover deliberately stays
          // true, MainContentGrid overlays on top instead of replacing Discover.
          // Also cleared AFTER pushFrame() for the same reason as the series
          // branch — Back should reopen the variant picker if this open came
          // from selecting a variant there.
          setVariantPickerItem(null);
          setVariantPickerOptions([]);
          handleContentTypeChangeRaw('movie');
          setDetailItem(resolved);
        }
      } catch (err) {
        console.error('Failed to open discover item:', err);
        toast.error('Failed to load title.');
      }
    },
    [pushFrame, handleContentTypeChangeRaw, setCurrentSeriesItem, fetchData, setVariantPickerItem, setVariantPickerOptions, setDetailItem]
  );

  // A Discover card can represent more than one underlying catalog entry —
  // the same title dubbed/subtitled differently (e.g. "ABC Tamil", "ABC South
  // Dub"). Check for variants before opening; if there's only the one, behave
  // exactly as openDiscoverItem always did (no extra round-trip cost beyond
  // the variants lookup itself).
  const handleDiscoverItemClick = useCallback(
    async (item: MediaItem) => {
      setDiscoverLoadingItemId(item.id);
      try {
        let variants: DiscoverVariant[] = [];
        try {
          variants = await getDiscoverVariants(item.id);
        } catch (err) {
          console.error('Failed to load variants, opening the item directly:', err);
        }
        if (variants.length > 1) {
          // Push a frame BEFORE opening the picker (capturing pre-picker
          // state, picker still closed at this point) — without this, there'd
          // be nothing between "Discover browsing" and "picker open" on the
          // stack, so backing out of the picker itself would have nowhere
          // real to land.
          pushFrame();
          setVariantPickerItem(item);
          setVariantPickerOptions(variants);
          return;
        }
        await openDiscoverItem(item);
      } finally {
        setDiscoverLoadingItemId(null);
      }
    },
    [openDiscoverItem, pushFrame, setVariantPickerItem, setVariantPickerOptions]
  );

  const onSelectVariant = useCallback(
    (variant: MediaItem) => {
      // Deliberately NOT clearing variantPickerItem/Options here — they stay
      // set until openDiscoverItem's own pushFrame() has captured them (its
      // pushFrame() runs after an await, so the picker visually stays open
      // for that brief moment), so Back later can restore "picker was open"
      // instead of skipping past it. openDiscoverItem clears them itself
      // immediately after pushFrame().
      openDiscoverItem(variant);
    },
    [openDiscoverItem]
  );

  const handleCarouselAction = useCallback(
    async (slide: CarouselSlide) => {
      if (slide.actionType === 'none') return;
      try {
        let resolvedItem: MediaItem;
        if (slide.mediaType === 'movie') {
          const res = await getMedia({ movieId: slide.mediaId, category: '*' });
          if (res.data && res.data.length > 0) {
            resolvedItem = {
              ...res.data[0],
              is_playable_movie: true,
            };
          } else {
            throw new Error('Movie not found');
          }
        } else if (slide.mediaType === 'series') {
          const res = await getSeries({ movieId: slide.mediaId, category: '*' });
          if (res.data && res.data.length > 0) {
            resolvedItem = {
              ...res.data[0],
              is_series: 1,
            };
          } else {
            throw new Error('Series not found');
          }
        } else {
          // TV Channel
          const res = await getChannels();
          const channel = res.data.find(
            (c) => String(c.id) === String(slide.mediaId)
          );
          if (channel) {
            resolvedItem = channel;
          } else {
            throw new Error('Channel not found');
          }
        }

        if (slide.actionType === 'play') {
          await startPlayback(resolvedItem);
        } else if (slide.actionType === 'details') {
          await handleItemClick(resolvedItem);
        }
      } catch (err) {
        console.error('Failed to execute carousel action:', err);
        toast.error('Failed to load media.');
      }
    },
    [startPlayback, handleItemClick]
  );

  return {
    discoverLoadingItemId,
    openDiscoverItem,
    handleDiscoverItemClick,
    onSelectVariant,
    handleCarouselAction,
  };
}
