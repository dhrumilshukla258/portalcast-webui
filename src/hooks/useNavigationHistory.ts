import { useState, useCallback, useRef, useEffect } from 'react';
import type { MediaItem, ContextType } from '@/types';

export interface NavFrame {
  context: ContextType;
  items: MediaItem[];
  focusedIndex: number | null;
  currentSeriesItem: MediaItem | null;
  totalItemsCount: number;
  detailItem: MediaItem | null;
  // Whether the Discover tab was showing when this frame was pushed — without
  // this, opening a title from Discover and pressing Back always landed on the
  // regular Movies/Series grid instead of back on Discover, since `showDiscover`
  // lives in App.tsx and was never part of what this history stack captured.
  showDiscover: boolean;
  // The Discover variant picker (e.g. "Tamil"/"Hindi Dub" versions of one
  // title) also lives in App.tsx and was never part of this stack — selecting
  // a variant and opening its detail page pushes a frame that must remember
  // the picker was open, or Back skips straight past it to wherever was
  // active before the picker ever opened, instead of reopening it first.
  variantPickerItem: MediaItem | null;
  variantPickerOptions: MediaItem[];
  // Discover opening a detail page switches the shared contentType (via
  // handleContentTypeChangeRaw, so MainContentGrid renders the right
  // detail-page shape) without ever putting it back — nothing else in this
  // stack captured/restored it, so backing out of that detail page left
  // contentType stuck on whatever it was switched to, even once showDiscover/
  // detailItem/currentSeriesItem were all correctly restored. See
  // onSetContentType below.
  contentType: 'movie' | 'series' | 'tv';
}

interface UseNavigationHistoryArgs {
  context: ContextType;
  items: MediaItem[];
  focusedIndex: number | null;
  currentSeriesItem: MediaItem | null;
  totalItemsCount: number;
  detailItem: MediaItem | null;
  showDiscover: boolean;
  variantPickerItem: MediaItem | null;
  variantPickerOptions: MediaItem[];
  streamUrl: string | null;
  contentType: 'movie' | 'series' | 'tv';

  setFocusedIndex: (value: number | null) => void;
  setCurrentSeriesItem: (value: MediaItem | null) => void;
  setContext: React.Dispatch<React.SetStateAction<ContextType>>;
  setTotalItemsCount: React.Dispatch<React.SetStateAction<number>>;
  setItems: React.Dispatch<React.SetStateAction<MediaItem[]>>;
  isRestoringFromHistory: React.MutableRefObject<boolean>;
  onOpenDetail?: (item: MediaItem | null) => void;
  onSetShowDiscover?: (value: boolean) => void;
  onSetVariantPicker?: (item: MediaItem | null, options: MediaItem[]) => void;
  // Raw setter, not handleContentTypeChange — restoring a frame must not
  // trigger that function's side effects (preference save, category/carousel
  // refetch, toast) as if the user had deliberately switched tabs.
  onSetContentType?: (type: 'movie' | 'series' | 'tv') => void;
  fetchData: (context: ContextType, typeOverride?: 'movie' | 'series' | 'tv') => void;

  setStreamUrl: (value: string | null) => void;
  setRawStreamUrl: (value: string | null) => void;
  setCurrentItem: (value: MediaItem | null) => void;
  setResumePlaybackState: (value: { currentTime: number } | undefined) => void;
  setCwRefreshKey?: React.Dispatch<React.SetStateAction<number>>;
}

// Owns the history-frame stack (pushFrame/popHistoryFrame/redoNextFrame/
// restorePreviousFrame/handleBack) plus the browser-popstate/pushState depth
// sync that keeps the real browser back-stack 1:1 with this logical stack.
// All of it shares one `history`/`future` pair and the same restore-a-frame
// setters, so it stays in one module rather than being split further —
// useAppNavigation.ts (the caller) still owns `setHistory` access directly
// for the one case (playContinueWatching) that pushes a frame without going
// through pushFrame().
export function useNavigationHistory({
  context,
  items,
  focusedIndex,
  currentSeriesItem,
  totalItemsCount,
  detailItem,
  showDiscover,
  variantPickerItem,
  variantPickerOptions,
  streamUrl,
  contentType,
  setFocusedIndex,
  setCurrentSeriesItem,
  setContext,
  setTotalItemsCount,
  setItems,
  isRestoringFromHistory,
  onOpenDetail,
  onSetShowDiscover,
  onSetVariantPicker,
  onSetContentType,
  fetchData,
  setStreamUrl,
  setRawStreamUrl,
  setCurrentItem,
  setResumePlaybackState,
  setCwRefreshKey,
}: UseNavigationHistoryArgs) {
  const [history, setHistory] = useState<NavFrame[]>([]);
  // Frames popped by Back land here so a subsequent Forward (browser button
  // or otherwise) can restore them — without this there's nowhere to redo
  // *to*, which is exactly why the Forward button previously did nothing
  // (or, before the popstate direction fix, actively popped another frame).
  const [future, setFuture] = useState<NavFrame[]>([]);
  // Continue Watching jumps straight from wherever the user was to the
  // player, skipping the Series/Season/Episode pages a normal click-through
  // would have actually visited. Closing the player should therefore land
  // back on that real starting page in one Back press, not on a synthetic
  // intermediate frame representing a page the user never manually visited
  // — see restorePreviousFrame and playContinueWatching (useAppNavigation.ts).
  const isFromContinueWatching = useRef(false);

  const currentFrame = useCallback(
    (): NavFrame => ({
      context,
      items,
      focusedIndex,
      currentSeriesItem,
      totalItemsCount,
      detailItem,
      showDiscover,
      variantPickerItem,
      variantPickerOptions,
      contentType,
    }),
    [context, items, focusedIndex, currentSeriesItem, totalItemsCount, detailItem, showDiscover, variantPickerItem, variantPickerOptions, contentType]
  );

  const pushFrame = useCallback(() => {
    setHistory((prev) => [...prev, currentFrame()]);
    // A fresh forward navigation invalidates whatever was available to redo
    // — same as a real browser tab: navigating somewhere new after going
    // Back clears the old Forward stack instead of leaving a stale branch
    // hanging around.
    setFuture([]);
  }, [currentFrame]);

  const applyFrame = useCallback(
    (frame: NavFrame) => {
      setFocusedIndex(frame.focusedIndex);
      setCurrentSeriesItem(frame.currentSeriesItem);
      setContext(frame.context);
      setTotalItemsCount(frame.totalItemsCount);
      onOpenDetail?.(frame.detailItem);
      onSetShowDiscover?.(frame.showDiscover);
      onSetVariantPicker?.(frame.variantPickerItem, frame.variantPickerOptions);
      onSetContentType?.(frame.contentType);

      if (frame.items.length > 0) {
        // Real cached data (this frame was actually loaded before) — restore
        // instantly, no refetch needed. Block fetchData briefly so the
        // context-change effect below doesn't immediately stomp on it.
        isRestoringFromHistory.current = true;
        setItems(frame.items);
        setTimeout(() => {
          isRestoringFromHistory.current = false;
        }, 500);
      } else if (!frame.showDiscover) {
        // Placeholder frame pushed without ever being populated — fetch it for
        // real instead of leaving the page stuck on an empty list until some
        // unrelated click refetches it. Discover frames are excluded: Discover
        // never populates this grid's `items`/`context` state (it owns its own
        // rows via useDiscover), so every Discover frame has items.length === 0
        // and would otherwise trigger this refetch on every single Back press
        // — an unguarded setContext/setItems cycle stacking on top of
        // DiscoverView's own backdrop/type-reporting effects, which is what
        // was tipping React into "Maximum update depth exceeded" (error #185).
        setItems([]);
        // Explicit typeOverride (not relying on fetchData's own closured
        // contentType) for the same reason onSetContentType exists above —
        // fetchData's contentType closure may not have caught up to the
        // frame.contentType restore that just happened in this same tick.
        fetchData(frame.context, frame.contentType);
      }
    },
    [setFocusedIndex, setCurrentSeriesItem, setContext, setTotalItemsCount, onOpenDetail, onSetShowDiscover, onSetVariantPicker, onSetContentType, isRestoringFromHistory, setItems, fetchData]
  );

  const popHistoryFrame = useCallback(() => {
    if (history.length === 0) return;
    const previousFrame = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));

    // Snapshot what we're leaving so a later Forward can restore it —
    // otherwise the state this Back press leaves behind (including an open
    // detail modal) is gone for good, which is why Forward previously had
    // nothing to bring back.
    setFuture((prev) => [...prev, currentFrame()]);

    applyFrame(previousFrame);
  }, [history, currentFrame, applyFrame]);

  const redoNextFrame = useCallback(() => {
    if (future.length === 0) return;
    const nextFrame = future[future.length - 1];
    setFuture((prev) => prev.slice(0, -1));

    // Push what we're leaving back onto the Back stack, so Back still works
    // normally after a Forward.
    setHistory((prev) => [...prev, currentFrame()]);

    applyFrame(nextFrame);
  }, [future, currentFrame, applyFrame]);

  const restorePreviousFrame = useCallback(() => {
    if (streamUrl) {
      setStreamUrl(null);
      setRawStreamUrl(null);
      setCurrentItem(null);
      setResumePlaybackState(undefined);
      // Closing the player is the natural point to refresh Continue Watching —
      // playback just wrote fresh progress via saveProgress()'s periodic/unload
      // saves, but nothing else ever triggers ContinueWatching.tsx to refetch
      // (its own loadItems() only runs once on mount, keyed off this exact
      // refreshKey — which, before this fix, was never incremented anywhere
      // in the app). Without this, the CW row can show stale state (including
      // a blank title/poster from before this exact viewing session) until
      // an unrelated full page reload happens to remount it.
      setCwRefreshKey?.((prev) => prev + 1);
      // A Continue Watching session skipped straight past the Series/Season
      // pages a normal click-through would have visited, so the background
      // episode-list fetch in playContinueWatching is the only thing
      // occupying context/items right now — pop the real previous page in
      // the same Back press instead of leaving the user stranded on that
      // fetch's result (or its failure) for a page they never asked to see.
      if (isFromContinueWatching.current) {
        isFromContinueWatching.current = false;
        popHistoryFrame();
      }
      return;
    }

    popHistoryFrame();
  }, [streamUrl, popHistoryFrame, setStreamUrl, setRawStreamUrl, setCurrentItem, setResumePlaybackState, setCwRefreshKey]);

  const handleBack = useCallback(() => {
    if (streamUrl || history.length > 0) {
      window.history.back();
    }
  }, [streamUrl, history.length]);

  const restorePreviousFrameRef = useRef(restorePreviousFrame);
  useEffect(() => {
    restorePreviousFrameRef.current = restorePreviousFrame;
  }, [restorePreviousFrame]);

  const redoNextFrameRef = useRef(redoNextFrame);
  useEffect(() => {
    redoNextFrameRef.current = redoNextFrame;
  }, [redoNextFrame]);

  const navDepth = history.length + (streamUrl ? 1 : 0);
  const prevNavDepth = useRef(navDepth);

  useEffect(() => {
    // navDepth can jump by more than 1 in a single render — e.g.
    // playContinueWatching pushes 2 NavFrames in one setHistory batch, then
    // (after an await) a 3rd depth unit when streamUrl is set. Pushing only
    // one browser history entry per effect run would leave the browser's
    // back-stack shallower than the app's logical `history` stack, so a
    // later Back press could skip over frames or restore an already-stale
    // one. Push one entry per unit of depth gained to keep them 1:1.
    for (let depth = prevNavDepth.current + 1; depth <= navDepth; depth++) {
      window.history.pushState({ depth }, '');
    }
    prevNavDepth.current = navDepth;
  }, [navDepth]);

  useEffect(() => {
    const onPopState = (e: PopStateEvent) => {
      const state = e.state;
      if (state && (state.modal || state.view)) {
        return;
      }
      const stateDepth = state && typeof state.depth === 'number' ? state.depth : 0;
      const wentBack = stateDepth < prevNavDepth.current;
      // Sync synchronously, right here, instead of waiting for the separate
      // depth-tracking effect to catch up on a later render — that gap let a
      // second, rapid Back press read a still-stale prevNavDepth and get
      // silently swallowed by the old equality guard, so the first press
      // appeared to do nothing.
      prevNavDepth.current = stateDepth;
      if (!wentBack) {
        // Forward (browser Forward button) — restore whatever Back most
        // recently popped, if anything. Previously this fell through to
        // restorePreviousFrame() unconditionally, which popped *another*
        // frame as if the user had pressed Back, silently undoing whatever
        // Forward was supposed to do.
        redoNextFrameRef.current?.();
        return;
      }
      restorePreviousFrameRef.current?.();
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  return {
    history,
    setHistory,
    future,
    isFromContinueWatching,
    pushFrame,
    popHistoryFrame,
    redoNextFrame,
    restorePreviousFrame,
    handleBack,
  };
}
