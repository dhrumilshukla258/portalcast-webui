/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from 'react';

// Was duplicated 4x (completePlayback/handleEnded/playNextEpisode/playPrevEpisode
// in VideoContext.tsx), each redoing an O(n) findIndex + O(n) find over `episodes`
// on every call. Memoized here keyed on [episodes, item] so the O(n) work happens
// once per episode-list/active-item change instead of once per call, and the
// number->episode map gives O(1) next/prev-by-number lookups.
export interface EpisodeLookup {
  currentIndex: number;
  isDescending: boolean;
  getEpNum: (ep: any) => number;
  byNum: Map<number, any>;
}

const getEpNum = (ep: any): number => {
  const numVal = ep.series_number ?? ep.episode_number;
  return numVal !== undefined ? Number(numVal) : NaN;
};

export function useEpisodeLookup(
  episodes: any[] | undefined,
  item: any
): EpisodeLookup {
  return useMemo(() => {
    if (!episodes || episodes.length === 0 || !item) {
      return { currentIndex: -1, isDescending: false, getEpNum, byNum: new Map() };
    }

    const activeCardId = item._episodeCardId || item.id;
    const activeCardIdStr =
      activeCardId !== undefined && activeCardId !== null ? String(activeCardId) : '';
    const currentIndex = episodes.findIndex((ep: any) => {
      if (ep.id === undefined || ep.id === null) return false;
      const epIdStr = String(ep.id);
      return (
        epIdStr === activeCardIdStr ||
        epIdStr === activeCardIdStr.replace('ep_', '') ||
        activeCardIdStr === epIdStr.replace('ep_', '')
      );
    });

    let isDescending = false;
    const firstEpNum = getEpNum(episodes[0]);
    const lastEpNum = getEpNum(episodes[episodes.length - 1]);
    if (!isNaN(firstEpNum) && !isNaN(lastEpNum) && episodes.length > 1) {
      isDescending = firstEpNum > lastEpNum;
    }

    const byNum = new Map<number, any>();
    for (const ep of episodes) {
      const n = getEpNum(ep);
      if (!isNaN(n) && !byNum.has(n)) byNum.set(n, ep);
    }

    return { currentIndex, isDescending, getEpNum, byNum };
  }, [episodes, item]);
}

export interface AdjacentEpisodeResult {
  episode: any | null;
  // The index that was used for the fallback (list-direction) step — callers
  // need this raw value (not just `episode`) to detect the "ran off the end,
  // trigger onLoadMoreEpisodes" case (stepIndex === episodes.length), which
  // is otherwise indistinguishable from "no next episode at all".
  stepIndex: number;
}

// Shared next/prev resolution: number-based lookup first, falling back to
// list-direction index — same fallback order every call site used before the
// split, kept identical so behavior doesn't change.
export function resolveAdjacentEpisode(
  lookup: EpisodeLookup,
  episodes: any[],
  direction: 1 | -1
): AdjacentEpisodeResult {
  const { currentIndex, isDescending, getEpNum, byNum } = lookup;
  if (currentIndex === -1) return { episode: null, stepIndex: -1 };

  const curEpNum = getEpNum(episodes[currentIndex]);
  if (!isNaN(curEpNum)) {
    const byNumber = byNum.get(curEpNum + direction);
    if (byNumber) return { episode: byNumber, stepIndex: -1 };
  }

  const stepIndex =
    direction === 1
      ? isDescending
        ? currentIndex - 1
        : currentIndex + 1
      : isDescending
        ? currentIndex + 1
        : currentIndex - 1;

  if (stepIndex >= 0 && stepIndex < episodes.length) {
    return { episode: episodes[stepIndex], stepIndex };
  }
  return { episode: null, stepIndex };
}
