import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import type { MediaItem, ChannelGroup, EPG_List } from '@/types';
import TvChannelListCard from '@/components/molecules/TvChannelListCard';
import CategoryIcon from '@/components/atoms/CategoryIcon';
import WhatsOn from '@/components/organisms/channels/WhatsOn';
import { CirclePlay } from 'lucide-react';
import { titleCase } from '@/utils/channelRow';
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
  /** The guide already loaded (useMediaLibrary's EPG window): rows show what is on now and next. */
  epgData?: Record<string, EPG_List[]>;
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
      epgData,
    },
    ref
  ) => {
    // One clock for every row, once a minute, only while there is a guide to show.
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
      if (!epgData) return;
      setNow(Date.now());
      const id = window.setInterval(() => setNow(Date.now()), 60_000);
      return () => window.clearInterval(id);
    }, [epgData]);
    // What's On (WhatsOn.tsx): the first view of Live TV, above the categories. Not in the
    // player's channel panel, and only with a guide to build it from.
    const canWhatsOn = !isOverlay && !!epgData;
    const [whatsOnOpen, setWhatsOnOpen] = useState(true);
    const showWhatsOn = canWhatsOn && whatsOnOpen;
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
        data-ui={isOverlay ? 'channel-picker' : undefined}
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
            className="absolute right-6 top-4 z-30 rounded-full p-2 text-fg-muted outline-hidden transition-transform hover:scale-110 hover:text-fg focus:scale-110 focus:bg-interaction focus:text-fg"
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
          data-part="categories"
          ref={groupListRef}
          style={!isMobile ? { width: groupsWidth } : undefined}
          className={`custom-scrollbar no-scrollbar-mobile z-20 flex h-full w-full shrink-0 flex-col overflow-y-auto border-r border-white/5 bg-panel/60 p-3 shadow-[4px_0_24px_rgba(0,0,0,0.2)] ${
            isMobile && showChannelsList
              ? 'hidden'
              : 'animate-in slide-in-from-left block duration-300'
          }`}
        >
          <div className="mb-4 mt-2 flex items-center justify-between px-2">
            <h2 className="ui-label">Categories</h2>
            {isMobile && showCloseButton && (
              <button
                onClick={onBack}
                className="rounded-full bg-white/5 p-2 text-fg-muted transition-colors hover:text-fg"
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
            {canWhatsOn && (
              <div
                data-focusable="true"
                onClick={() => {
                  setWhatsOnOpen(true);
                  if (isMobile) setShowChannelsList(true);
                }}
                className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 text-left text-xs font-semibold transition-all duration-200 sm:text-sm ${
                  showWhatsOn ? 'bg-white/15 text-fg shadow-inner' : 'text-fg-muted hover:bg-interaction hover:text-fg'
                }`}
              >
                <CirclePlay className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                <span className="truncate">What's On</span>
              </div>
            )}
            {channelGroups?.map((group, index) => {
              if (!group) return null;

              const isGroupFocused =
                focusedColumn === 'groups' && focusedGroupIndex === index;
              const isGroupSelected = !showWhatsOn && selectedGroup?.id === group.id;

              return (
                <div
                  key={group.id || index}
                  data-focusable="true"
                  onClick={() => {
                    setWhatsOnOpen(false);
                    handleGroupClick(group, index);
                  }}
                  className={`group flex cursor-pointer items-center justify-between rounded-lg px-2 py-2 text-left text-xs font-semibold transition-all duration-200 sm:text-sm ${
                    isGroupFocused
                      ? 'ui-selected scale-[1.01]'
                      : isGroupSelected
                        ? 'bg-white/15 text-fg shadow-inner'
                        : 'text-fg-muted hover:bg-interaction hover:text-fg'
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <CategoryIcon title={group.title} className="h-4 w-4 shrink-0 opacity-70" />
                    <span className="truncate drop-shadow-xs">{titleCase(group.title)}</span>
                  </span>
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
            data-part="divider"
            onMouseDown={onGroupsResizeStart}
            title="Drag to resize categories panel"
            className="group z-20 hidden w-3 shrink-0 cursor-col-resize items-center justify-center bg-panel/40 md:flex"
          >
            <div className="h-16 w-1 rounded-full bg-panel-hover/60 transition-colors group-hover:bg-focus" />
          </div>
        )}

        {}
        <div
          data-part="channels"
          ref={channelListRef}
          className={`custom-scrollbar no-scrollbar-mobile relative z-10 h-full flex-1 overflow-y-auto bg-panel/30 p-2 sm:p-3 ${
            isMobile
              ? showChannelsList
                ? 'slide-enter-active block'
                : 'hidden'
              : 'block'
          }`}
        >
          {isMobile && (
            <div data-part="mobile-heading" className="sticky top-0 z-20 mb-2 flex w-full items-center justify-between rounded-b-2xl border-b border-line bg-panel/90 p-3 shadow-md backdrop-blur-xl sm:p-4">
              <button
                onClick={() => setShowChannelsList(false)}
                className="flex flex-1 items-center text-white/90 transition-colors hover:text-fg"
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
                  {showWhatsOn ? "What's On" : selectedGroup?.title ? titleCase(selectedGroup.title) : 'Channels'}
                </span>
              </button>
              <button
                onClick={onBack}
                className="ml-2 rounded-full bg-white/5 p-2 text-fg-muted transition-colors hover:text-fg"
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

          {showWhatsOn && (
            <WhatsOn
              channels={channels}
              groups={channelGroups}
              epgData={epgData!}
              now={now}
              favorites={favorites}
              recentChannels={recentChannels}
              onPlay={(ch) => handleChannelSelect(ch, Math.max(0, filteredChannels.findIndex((c) => String(c.id) === String(ch.id))))}
            />
          )}

          {!isMobile && !showWhatsOn && (
            <div className="mb-6 px-3">
              <h1 className="text-3xl font-black tracking-tight text-white/90 drop-shadow-md">
                {selectedGroup?.title ? titleCase(selectedGroup.title) : 'Channels'}
              </h1>
              <p className="mt-1 text-fg-muted">
                {filteredChannels.length} channels available
              </p>
            </div>
          )}

          <div className={`flex flex-col gap-0.5 pb-32 ${showWhatsOn ? 'hidden' : ''}`}>
            {filteredChannels.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center text-fg-subtle">
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
                  programs={epgData?.[String(item.id)]}
                  now={epgData ? now : undefined}
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
