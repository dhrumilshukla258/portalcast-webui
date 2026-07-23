import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { MediaItem, ChannelGroup } from '@/types';
import { useAuth } from '@/context/AuthContext';

interface UseChannelListNavArgs {
  channels: MediaItem[];
  channelGroups: ChannelGroup[];
  currentItemId: string | null | undefined;
  providerKey: string;
  favorites: string[];
  recentChannels: string[];
  onChannelSelect: (item: MediaItem) => void;
  onBack: () => void;
}

// Owns the two-column (groups/channels) grid-nav state machine: which
// column/index is focused, the persisted-selection restore logic
// (findInitialIndexes), the derived filtered-channels list, and the remote/
// keyboard handler that drives all of it. Kept as one hook since
// handleKeyDown reads and writes nearly all of this state directly.
export function useChannelListNav({
  channels,
  channelGroups,
  currentItemId,
  providerKey,
  favorites,
  recentChannels,
  onChannelSelect,
  onBack,
}: UseChannelListNavArgs) {
  const { user, updatePreferences } = useAuth();

  const findInitialIndexes = useCallback(() => {
    if (!currentItemId) {
      // The video player replaces this whole component tree while a
      // channel plays (see App.tsx), so TvChannelList fully unmounts and
      // loses `selectedGroup`/`focusedChannelIndex` — without this,
      // pressing Back after starting a channel always landed back on
      // index 0 ("Recent Channels", 1st channel), regardless of which
      // category/channel the user had actually selected. currentItemId is
      // always null from the caller (MainContentGrid), so this path is
      // the only one that ever runs in practice.
      //
      // Preferences (synced across devices) are checked first; localStorage
      // is only a same-device fallback for logged-out/offline cases and for
      // the instant read on first mount before the profile fetch resolves.
      try {
        const savedGroupId =
          user?.preferences?.lastSelectedTvGroup?.[providerKey] ||
          localStorage.getItem(`tvSelectedGroupId_${providerKey}`);
        const savedChannelId =
          user?.preferences?.lastSelectedTvChannel?.[providerKey] ||
          localStorage.getItem(`tvSelectedChannelId_${providerKey}`);
        const groupIdx = savedGroupId
          ? channelGroups.findIndex((g) => String(g.id) === savedGroupId)
          : -1;
        if (groupIdx > -1) {
          let channelIdx = 0;
          if (savedChannelId) {
            const group = channelGroups[groupIdx];
            const filteredChannelsVal =
              group.id === 'all'
                ? channels
                : channels.filter((c) => String(c.tv_genre_id) === String(group.id));
            const idx = filteredChannelsVal.findIndex((c) => String(c.id) === savedChannelId);
            if (idx > -1) channelIdx = idx;
          }
          return { groupIdx, channelIdx };
        }
      } catch {
        // localStorage unavailable — fall through to the default below
      }
      return { groupIdx: 0, channelIdx: 0 };
    }
    const currentChannel = channels.find((c) => c.id === currentItemId);
    const resolvedGroupIdx = currentChannel
      ? channelGroups.findIndex(
          (g) => String(g.id) === String(currentChannel.tv_genre_id)
        )
      : -1;

    let targetGroupIdx = 0;

    if (resolvedGroupIdx > -1) {
      targetGroupIdx = resolvedGroupIdx;
    } else {
      const allIdx = channelGroups.findIndex((g) => g.id === 'all');
      targetGroupIdx = allIdx > -1 ? allIdx : 0;
    }

    if (!channelGroups[targetGroupIdx]) return { groupIdx: 0, channelIdx: 0 };

    let targetChannelIdx = 0;
    if (targetGroupIdx > -1) {
      const filteredChannelsVal = channels.filter(
        (c) =>
          String(c.tv_genre_id) === String(channelGroups[targetGroupIdx].id)
      );
      if (channelGroups[targetGroupIdx].id === 'all') {
        targetChannelIdx = channels.findIndex((c) => c.id === currentItemId);
      } else {
        targetChannelIdx = filteredChannelsVal.findIndex(
          (c) => c.id === currentItemId
        );
      }
    }

    return {
      groupIdx: targetGroupIdx,
      channelIdx: Math.max(0, targetChannelIdx),
    };
  }, [currentItemId, channels, channelGroups, providerKey, user?.preferences]);

  const initialIndexes = findInitialIndexes();

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showChannelsList, setShowChannelsList] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [focusedColumn, setFocusedColumn] = useState<'groups' | 'channels'>(
    'channels'
  );
  const [selectedGroup, setSelectedGroup] = useState<ChannelGroup | undefined>(
    channelGroups[initialIndexes.groupIdx] || channelGroups[0]
  );
  const [focusedGroupIndex, setFocusedGroupIndex] = useState(
    initialIndexes.groupIdx
  );
  const [focusedChannelIndex, setFocusedChannelIndex] = useState(
    initialIndexes.channelIdx
  );

  useEffect(() => {
    if (!selectedGroup && channelGroups.length > 0) {
      const indexes = findInitialIndexes();
      setSelectedGroup(channelGroups[indexes.groupIdx] || channelGroups[0]);
      setFocusedGroupIndex(indexes.groupIdx);
      setFocusedChannelIndex(indexes.channelIdx);
    }
  }, [selectedGroup, channelGroups, findInitialIndexes]);

  const groupListRef = useRef<HTMLDivElement>(null);
  const channelListRef = useRef<HTMLDivElement>(null);

  // Built once instead of a channels.find() per recent-channel id below —
  // `channels` can be hundreds to 1000+ entries for IPTV providers.
  const channelById = useMemo(() => {
    const map = new Map<string, MediaItem>();
    for (const c of channels) map.set(String(c.id), c);
    return map;
  }, [channels]);

  const filteredChannels = useMemo(() => {
    if (!selectedGroup || selectedGroup.id === 'all') {
      return channels;
    }

    if (selectedGroup.id === 'fav') {
      const favIds = new Set(favorites);
      return channels.filter((c) => favIds.has(c.id));
    }
    if (selectedGroup.id === 'recent') {
      return recentChannels
        .map((id) => channelById.get(String(id)))
        .filter((c): c is MediaItem => c !== undefined);
    }

    return channels.filter(
      (c) => String(c.tv_genre_id) === String(selectedGroup.id)
    );
  }, [channels, selectedGroup, favorites, recentChannels, channelById]);

  const handleGroupClick = useCallback(
    (group: ChannelGroup, index: number) => {
      setSelectedGroup(group);
      setFocusedGroupIndex(index);
      setFocusedChannelIndex(0);
      setFocusedColumn('channels');
      try {
        localStorage.setItem(`tvSelectedGroupId_${providerKey}`, String(group.id));
      } catch {
        // localStorage unavailable — selection just won't survive a remount
      }
      if (user) {
        updatePreferences({
          lastSelectedTvGroup: {
            ...(user.preferences?.lastSelectedTvGroup || {}),
            [providerKey]: String(group.id),
          },
        });
      }
      if (isMobile) {
        setShowChannelsList(true);
      }
    },
    [isMobile, providerKey, user, updatePreferences]
  );

  // Persists which channel was picked so it survives the unmount/remount
  // this component goes through when the player opens (see the
  // `!currentItemId` branch in findInitialIndexes above) — without this,
  // selecting e.g. the 5th channel and pressing Back always re-highlighted
  // (and re-scrolled to) the 1st channel in the group instead of the one
  // actually playing. Also updates focusedChannelIndex — a mouse click
  // never used to set it (only keyboard nav did), so the highlight ring
  // and the scroll-into-view effect below both stayed pinned to whatever
  // index a prior keyboard nav (or the initial default of 0) left behind,
  // which is what made clicking a channel further down the list appear to
  // "jump back to the top".
  const handleChannelSelect = useCallback(
    (channel: MediaItem, index: number) => {
      try {
        localStorage.setItem(`tvSelectedChannelId_${providerKey}`, String(channel.id));
      } catch {
        // localStorage unavailable — selection just won't survive a remount
      }
      if (user) {
        updatePreferences({
          lastSelectedTvChannel: {
            ...(user.preferences?.lastSelectedTvChannel || {}),
            [providerKey]: String(channel.id),
          },
        });
      }
      setFocusedChannelIndex(index);
      setFocusedColumn('channels');
      onChannelSelect(channel);
    },
    [onChannelSelect, providerKey, user, updatePreferences]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const activeKeys = [37, 38, 39, 40, 13, 0, 10009, 8, 10073];
      if (!activeKeys.includes(e.keyCode)) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      switch (e.keyCode) {
        case 37:
          setFocusedColumn('groups');
          break;
        case 39:
          setFocusedColumn('channels');
          break;
        case 38:
          if (focusedColumn === 'groups') {
            setFocusedGroupIndex((prev) => (prev > 0 ? prev - 1 : 0));
          } else {
            setFocusedChannelIndex((prev) => (prev > 0 ? prev - 1 : 0));
          }
          break;
        case 40:
          if (focusedColumn === 'groups') {
            setFocusedGroupIndex((prev) =>
              prev < channelGroups.length - 1
                ? prev + 1
                : channelGroups.length - 1
            );
          } else {
            setFocusedChannelIndex((prev) =>
              prev < filteredChannels.length - 1
                ? prev + 1
                : filteredChannels.length - 1
            );
          }
          break;
        case 13:
          if (focusedColumn === 'groups') {
            handleGroupClick(
              channelGroups[focusedGroupIndex],
              focusedGroupIndex
            );
          } else {
            handleChannelSelect(filteredChannels[focusedChannelIndex], focusedChannelIndex);
          }
          break;
        case 0:
        case 10009:
        case 8:
        case 10073:
          if (isMobile && showChannelsList) {
            setShowChannelsList(false);
          } else {
            onBack();
          }
          break;
      }
    },
    [
      focusedColumn,
      focusedGroupIndex,
      focusedChannelIndex,
      channelGroups,
      filteredChannels,
      handleChannelSelect,
      onBack,
      handleGroupClick,
      isMobile,
      showChannelsList,
    ]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      if (groupListRef.current) {
        const items = groupListRef.current.querySelectorAll(
          '[data-focusable="true"]'
        );
        const focusedItem = items[focusedGroupIndex] as HTMLElement;

        if (focusedItem) {
          // 'nearest', not 'center' — matches the Movies/Series category
          // sidebar's scroll behavior (useTVFocus's generic scrollIntoView),
          // which only scrolls as much as needed instead of always forcing
          // the selection to the vertical middle of the list.
          focusedItem.scrollIntoView({
            behavior: 'instant',
            block: 'nearest',
          });
        }
      }
    }, 10);
    return () => clearTimeout(timer);
  }, [focusedGroupIndex, focusedColumn]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (channelListRef.current) {
        const items = channelListRef.current.querySelectorAll(
          '[data-focusable="true"]'
        );
        const focusedItem = items[focusedChannelIndex] as HTMLElement;

        if (focusedItem) {
          focusedItem.scrollIntoView({
            behavior: 'instant',
            block: 'center',
          });
        }
      }
    }, 10);
    return () => clearTimeout(timer);
  }, [focusedChannelIndex, filteredChannels, focusedColumn]);

  return {
    isMobile,
    showChannelsList,
    setShowChannelsList,
    focusedColumn,
    selectedGroup,
    focusedGroupIndex,
    focusedChannelIndex,
    groupListRef,
    channelListRef,
    filteredChannels,
    handleGroupClick,
    handleChannelSelect,
    handleKeyDown,
  };
}
