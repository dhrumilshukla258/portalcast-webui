import { forwardRef, useImperativeHandle } from 'react';
import type { MediaItem, ChannelGroup } from '@/types';
import TvChannelListCard from '@/components/molecules/TvChannelListCard';
import { useResizableWidth } from '@/hooks/useResizableWidth';
import { useChannelListNav } from '@/hooks/useChannelListNav';

export interface TvChannelListRef {
  handleKeyDown: (e: KeyboardEvent) => void;
}

interface TvChannelListProps {
  channels: MediaItem[];
  channelGroups: ChannelGroup[];
  onChannelSelect: (item: MediaItem) => void;
  onBack: () => void;
  currentItemId: string | null | undefined;
  showCloseButton?: boolean;
  isOverlay?: boolean;
  favorites?: string[];
  recentChannels?: string[];
  providerKey?: string;
}

const TvChannelList = forwardRef<TvChannelListRef, TvChannelListProps>(
  (
    {
      channels,
      channelGroups,
      onChannelSelect,
      onBack,
      currentItemId,
      showCloseButton = true,
      isOverlay = false,
      favorites = [],
      recentChannels = [],
      providerKey = 'default',
    },
    ref
  ) => {
    const { width: groupsWidth, onMouseDown: onGroupsResizeStart } =
      useResizableWidth(`tvGroupsWidth_${providerKey}`, 150, 120, 360);

    const {
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
    } = useChannelListNav({
      channels,
      channelGroups,
      currentItemId,
      providerKey,
      favorites,
      recentChannels,
      onChannelSelect,
      onBack,
    });

    useImperativeHandle(
      ref,
      () => ({
        handleKeyDown,
      }),
      [handleKeyDown]
    );

    return (
      <div
        className={`glass-panel absolute left-0 top-0 z-40 flex h-full flex-row shadow-2xl transition-all duration-300 ${
          isOverlay
            ? 'w-full md:w-auto md:max-w-[480px] lg:max-w-[560px]'
            : 'w-full'
        }`}
        tabIndex={-1}
      >
        {}
        {!isMobile && showCloseButton && (
          <button
            onClick={onBack}
            className="absolute right-6 top-4 z-30 rounded-full p-2 text-gray-400 outline-hidden transition-transform hover:scale-110 hover:text-white focus:scale-110 focus:bg-white/10 focus:text-white"
            aria-label="Close"
            data-focusable="true"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}

        {}
        <div
          ref={groupListRef}
          style={!isMobile ? { width: groupsWidth } : undefined}
          className={`custom-scrollbar no-scrollbar-mobile z-20 flex h-full w-full shrink-0 flex-col overflow-y-auto border-r border-white/5 bg-gray-900/60 p-3 shadow-[4px_0_24px_rgba(0,0,0,0.2)] ${
            isMobile && showChannelsList
              ? 'hidden'
              : 'animate-in slide-in-from-left block duration-300'
          }`}
        >
          <div className="mb-4 mt-2 flex items-center justify-between px-2">
            <h2 className="text-sm font-black uppercase tracking-tight text-white/80 drop-shadow-md sm:text-base">
              Categories
            </h2>
            {isMobile && showCloseButton && (
              <button
                onClick={onBack}
                className="rounded-full bg-white/5 p-2 text-gray-400 transition-colors hover:text-white"
                aria-label="Close"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>

          <div className="custom-scrollbar flex flex-col gap-1 pb-20">
            {channelGroups?.map((group, index) => {
              if (!group) return null;

              const isGroupFocused =
                focusedColumn === 'groups' && focusedGroupIndex === index;
              const isGroupSelected = selectedGroup?.id === group.id;

              return (
                <div
                  key={group.id || index}
                  data-focusable="true"
                  onClick={() => handleGroupClick(group, index)}
                  className={`group flex cursor-pointer items-center justify-between rounded-lg px-2 py-2 text-left text-xs font-semibold transition-all duration-200 sm:text-sm ${
                    isGroupFocused
                      ? 'scale-[1.01] bg-blue-600 text-white shadow-md shadow-blue-900/30'
                      : isGroupSelected
                        ? 'bg-white/15 text-white shadow-inner'
                        : 'text-gray-400 hover:bg-white/10 hover:text-gray-100'
                  }`}
                >
                  <span className="truncate drop-shadow-xs">{group.title}</span>
                  {(isGroupFocused || isGroupSelected) && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 opacity-70"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Drag handle to resize the categories panel */}
        {!isMobile && (
          <div
            onMouseDown={onGroupsResizeStart}
            title="Drag to resize categories panel"
            className="group z-20 hidden w-3 shrink-0 cursor-col-resize items-center justify-center bg-gray-900/40 md:flex"
          >
            <div className="h-16 w-1 rounded-full bg-gray-700/60 transition-colors group-hover:bg-blue-500" />
          </div>
        )}

        {}
        <div
          ref={channelListRef}
          className={`custom-scrollbar no-scrollbar-mobile relative z-10 h-full flex-1 overflow-y-auto bg-gray-900/30 p-2 sm:p-3 ${
            isMobile
              ? showChannelsList
                ? 'slide-enter-active block'
                : 'hidden'
              : 'block'
          }`}
        >
          {isMobile && (
            <div className="sticky top-0 z-20 mb-2 flex w-full items-center justify-between rounded-b-2xl border-b border-white/10 bg-gray-900/90 p-3 shadow-md backdrop-blur-xl sm:p-4">
              <button
                onClick={() => setShowChannelsList(false)}
                className="flex flex-1 items-center text-white/90 transition-colors hover:text-white"
              >
                <div className="mr-3 rounded-full bg-white/10 p-1">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </div>
                <span className="truncate text-lg font-extrabold tracking-tight sm:text-xl">
                  {selectedGroup?.title || 'Channels'}
                </span>
              </button>
              <button
                onClick={onBack}
                className="ml-2 rounded-full bg-white/5 p-2 text-gray-400 transition-colors hover:text-white"
                aria-label="Close"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          )}

          {!isMobile && (
            <div className="mb-6 px-3">
              <h1 className="text-3xl font-black tracking-tight text-white/90 drop-shadow-md">
                {selectedGroup?.title || 'Channels'}
              </h1>
              <p className="mt-1 text-gray-400">
                {filteredChannels.length} channels available
              </p>
            </div>
          )}

          <div className="flex flex-col gap-0.5 pb-32">
            {filteredChannels.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center text-gray-500">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="mb-4 h-16 w-16 opacity-50"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-lg font-medium">No channels found</p>
              </div>
            ) : (
              filteredChannels.map((item, index) => (
                <TvChannelListCard
                  key={item.id}
                  item={item}
                  onClick={() => handleChannelSelect(item, index)}
                  isFocused={
                    focusedColumn === 'channels' &&
                    focusedChannelIndex === index
                  }
                />
              ))
            )}
          </div>
        </div>
      </div>
    );
  }
);

TvChannelList.displayName = 'TvChannelList';

export default TvChannelList;
