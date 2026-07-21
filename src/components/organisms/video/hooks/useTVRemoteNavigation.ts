/* eslint-disable @typescript-eslint/no-unused-expressions */
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { useMediaRemote } from '@vidstack/react';
import type { TvChannelListRef } from '@/components/organisms/channels/TvChannelList';
import type { EpisodeOverlayRef } from '@/components/organisms/video/EpisodeOverlay';
import { useVideoContext } from '@/context/video';

// Owns the TV remote/keyboard navigation state machine: a synchronous ref
// mirror of 3 pieces of context state (`navRef` — kept in sync by 3 small
// effects below) so the keydown listener always reads fresh values without
// re-binding on every render, the focusable-element DOM query used by both
// the keydown handler and the two focus-management effects, and the actual
// keydown handler itself. These all stay together because they share
// `navRef`/`getVisibleFocusableElements` directly — splitting the keydown
// handler out on its own would break the synchronous-read guarantee those
// two exist for.
export function useTVRemoteNavigation(
  tvChannelListRef: RefObject<TvChannelListRef | null>,
  episodeOverlayRef: RefObject<EpisodeOverlayRef | null>,
  remote: ReturnType<typeof useMediaRemote>
) {
  const {
    playerContainerRef,
    settingsMenuRef,
    controlsVisible,
    isSettingsMenuOpen,
    showEpisodeList,
    showChannelList,
    focusedIndex,
    activeSettingsMenu,
    seekOverlay,
    contentType,
    channelInfo,
    showNextEpisodeButton,
    onPrevChannel,
    onNextChannel,
    toggleFavorite,
    toggleChannelList,
    showControlsAndCursor,
    handleSkipButtonClick,
    playNextEpisode,
    playPrevEpisode,
    onBack,
    setControlsVisible,
    setFocusedIndex,
    setShowEpisodeList,
    setIsSettingsMenuOpen,
    setShowNextEpisodeButton,
  } = useVideoContext();

  const [showExitToast, setShowExitToast] = useState(false);
  const backPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isKeyboardModeRef = useRef(false);

  // Detect pointer vs keyboard usage to hide focus highlights on touch/click
  useEffect(() => {
    const handleKeyDown = () => {
      isKeyboardModeRef.current = true;
    };
    const handlePointerDown = () => {
      isKeyboardModeRef.current = false;
      const focusedElements = document.querySelectorAll('.focused');
      focusedElements.forEach((el) => el.classList.remove('focused'));
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('pointerdown', handlePointerDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('pointerdown', handlePointerDown, { capture: true });
    };
  }, []);

  // 🚀 FIX 1: Synchronous Navigation Ref (Prevents getting stuck on fast clicks)
  const navRef = useRef({
    index: focusedIndex ?? 0,
    isSettingsOpen: isSettingsMenuOpen,
    isControlsVisible: controlsVisible,
    isEpisodeListOpen: showEpisodeList,
  });

  // Keep ref in sync with React state
  useEffect(() => {
    navRef.current.isSettingsOpen = isSettingsMenuOpen;
  }, [isSettingsMenuOpen]);
  useEffect(() => {
    navRef.current.isControlsVisible = controlsVisible;
  }, [controlsVisible]);
  useEffect(() => {
    navRef.current.isEpisodeListOpen = showEpisodeList;
  }, [showEpisodeList]);

  // Handle auto-focus sync on change
  const setFocusSync = useCallback((idx: number) => {
    navRef.current.index = idx;
    setFocusedIndex(idx);
  }, [setFocusedIndex]);

  const getVisibleFocusableElements = useCallback((): HTMLElement[] => {
    if (!playerContainerRef.current) return [];

    // Tizen TV settings menu items are nested.
    if (navRef.current.isSettingsOpen && settingsMenuRef.current) {
      const menuFocusables = Array.from(
        settingsMenuRef.current.querySelectorAll<HTMLElement>(
          '[data-focusable="true"]'
        )
      ).filter((el) => {
        // filter out elements inside hidden menus
        const parentMenu = el.closest('[data-submenu]');
        if (parentMenu) {
          return parentMenu.getAttribute('data-open') === 'true';
        }
        return true;
      });
      if (menuFocusables.length > 0) return menuFocusables;
    }

    const elements = Array.from(
      playerContainerRef.current.querySelectorAll<HTMLElement>(
        '[data-focusable="true"]'
      )
    );

    return elements.filter((el) => {
      // 1. Ensure element is visible
      const rect = el.getBoundingClientRect();
      const isVisible = rect.width > 0 && rect.height > 0;
      if (!isVisible) return false;

      // 2. Filter out elements in hidden menus
      const parentMenu = el.closest('.more-options-menu');
      if (parentMenu) {
        // Only focus if the menu is open
        return true;
      }

      // If settings menu is open but it's not the active focused list, don't focus outer elements
      if (navRef.current.isSettingsOpen) {
        return el.closest('.settings-menu-container') !== null;
      }

      return true;
    });
  }, [playerContainerRef, settingsMenuRef]);

  // TV Key Navigation Logic
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || (!e.isTrusted && e.keyCode === 0)) return;
      const wereControlsHidden = !navRef.current.isControlsVisible;

      e.stopPropagation();

      // Direct Global TV Keys
      if (e.keyCode === 405 && contentType === 'tv' && channelInfo) {
        e.preventDefault();
        toggleFavorite(channelInfo);
        return;
      } else if (e.keyCode === 10073) {
        e.preventDefault();
        if (contentType === 'tv') toggleChannelList();
        return;
      }

      if (showChannelList) {
        tvChannelListRef.current?.handleKeyDown(e);
        return;
      }

      if (showEpisodeList) {
        episodeOverlayRef.current?.handleKeyDown(e);
        return;
      }

      const focusable = getVisibleFocusableElements();
      const isMenuOpen = navRef.current.isSettingsOpen;

      let currentIndex = navRef.current.index;
      currentIndex = Math.max(0, Math.min(currentIndex, focusable.length - 1));
      const focusedElement = focusable[currentIndex];

      // Handle Directional & OK Keys
      if ([37, 38, 39, 40, 13].includes(e.keyCode)) {
        if (wereControlsHidden) {
          e.preventDefault();
          showControlsAndCursor();

          // Special Live TV shortcut: Left/Right key switches channels immediately on first press
          if (contentType === 'tv') {
            if (e.keyCode === 37) onPrevChannel?.();
            if (e.keyCode === 39) onNextChannel?.();
          }

          // Special VOD shortcut: Left/Right key seeks immediately on first press
          if (contentType !== 'tv') {
            if (e.keyCode === 37) handleSkipButtonClick(-10, true);
            if (e.keyCode === 39) handleSkipButtonClick(10, true);
          }
          return;
        }

        // Controls are visible
        showControlsAndCursor();

        if (contentType === 'tv') {
          // --- TV Mode ---
          switch (e.keyCode) {
            case 37: // Left
              e.preventDefault();
              if (!isMenuOpen) {
                onPrevChannel?.();
              } else if (currentIndex > 0) {
                setFocusSync(currentIndex - 1);
              }
              break;
            case 39: // Right
              e.preventDefault();
              if (!isMenuOpen) {
                onNextChannel?.();
              } else if (currentIndex < focusable.length - 1) {
                setFocusSync(currentIndex + 1);
              }
              break;
            case 38: // Up
              e.preventDefault();
              setFocusSync(currentIndex > 0 ? currentIndex - 1 : 0);
              break;
            case 40: // Down
              e.preventDefault();
              setFocusSync(
                currentIndex < focusable.length - 1
                  ? currentIndex + 1
                  : currentIndex
              );
              break;
            case 13: // Enter
              e.preventDefault();
              if (focusedElement) {
                const control = focusedElement.getAttribute('data-control');
                if (control === 'play-pause') {
                  remote.togglePaused();
                } else if (control === 'fullscreen') {
                  remote.toggleFullscreen();
                } else if (control === 'settings-menu') {
                  focusedElement.click();
                  setIsSettingsMenuOpen(true);
                  setFocusSync(0);
                } else {
                  focusedElement.click();
                }
              }
              break;
          }
        } else {
          // --- VOD Mode ---
          switch (e.keyCode) {
            case 37: // Left
              e.preventDefault();
              if (isMenuOpen) {
                if (currentIndex > 0) setFocusSync(currentIndex - 1);
              } else if (
                focusedElement?.getAttribute('data-control') === 'seekbar' ||
                focusedElement?.getAttribute('data-control') === 'play-pause'
              ) {
                handleSkipButtonClick(-10, true);
              } else {
                const minIndex = 1;
                if (currentIndex > minIndex) {
                  setFocusSync(currentIndex - 1);
                }
              }
              break;
            case 39: // Right
              e.preventDefault();
              if (isMenuOpen) {
                if (currentIndex < focusable.length - 1) setFocusSync(currentIndex + 1);
              } else if (
                focusedElement?.getAttribute('data-control') === 'seekbar' ||
                focusedElement?.getAttribute('data-control') === 'play-pause'
              ) {
                handleSkipButtonClick(10, true);
              } else {
                if (currentIndex < focusable.length - 1) {
                  setFocusSync(currentIndex + 1);
                }
              }
              break;
            case 38: // Up
              e.preventDefault();
              if (isMenuOpen) {
                setFocusSync(currentIndex > 0 ? currentIndex - 1 : 0);
              } else {
                setFocusSync(0); // Focus seekbar (index 0)
              }
              break;
            case 40: // Down
              e.preventDefault();
              if (isMenuOpen) {
                setFocusSync(
                  currentIndex < focusable.length - 1
                    ? currentIndex + 1
                    : currentIndex
                );
              } else if (focusedElement?.getAttribute('data-control') === 'seekbar') {
                const playIdx = focusable.findIndex(
                  (el) => el.getAttribute('data-control') === 'play-pause'
                );
                setFocusSync(playIdx !== -1 ? playIdx : 1);
              } else {
                setControlsVisible(false); // Hide controls
              }
              break;
            case 13: // Enter
              e.preventDefault();
              if (focusedElement) {
                const control = focusedElement.getAttribute('data-control');
                if (control === 'play-pause') {
                  remote.togglePaused();
                } else if (control === 'fullscreen') {
                  remote.toggleFullscreen();
                } else if (control === 'settings-menu') {
                  focusedElement.click();
                  setIsSettingsMenuOpen(true);
                  setFocusSync(0);
                } else {
                  focusedElement.click();
                }
              }
              break;
          }
        }
        return;
      }

      // Handle non-directional and non-OK keys
      switch (e.keyCode) {
        case 415:
        case 19:
        case 10252: // Play/Pause
          e.preventDefault();
          remote.togglePaused();
          break;
        case 412: // Rewind
          e.preventDefault();
          contentType === 'tv' ? onPrevChannel?.() : handleSkipButtonClick(-30);
          break;
        case 417: // Fast Forward
          e.preventDefault();
          contentType === 'tv' ? onNextChannel?.() : handleSkipButtonClick(30);
          break;
        case 427: // Channel Down
        case 10232: // MediaTrackPrevious
          e.preventDefault();
          if (contentType === 'tv') onPrevChannel?.();
          else if (contentType === 'series') playPrevEpisode?.();
          break;
        case 428: // Channel Up
        case 10233: // MediaTrackNext
          e.preventDefault();
          if (contentType === 'tv') onNextChannel?.();
          else if (contentType === 'series') playNextEpisode?.();
          break;
        case 0:
        case 10009:
        case 8: // Back/Return
          e.preventDefault();
          e.stopPropagation();

          if (showNextEpisodeButton) {
            setShowNextEpisodeButton(false);
            return;
          }

          if (showEpisodeList) {
            setShowEpisodeList(false);
            setFocusSync(0);
            return;
          }

          if (isMenuOpen) {
            const activeTarget =
              document.activeElement ||
              settingsMenuRef.current ||
              document.body;
            activeTarget.dispatchEvent(
              new KeyboardEvent('keydown', {
                key: 'Escape',
                code: 'Escape',
                bubbles: true,
              })
            );
            setTimeout(() => {
              const anyMenuOpen = document.querySelector('[data-open]');
              if (!anyMenuOpen) {
                setIsSettingsMenuOpen(false);
                setFocusSync(0);
              } else {
                setFocusSync(0);
              }
            }, 150);
            return;
          }

          if (document.fullscreenElement) {
            remote.toggleFullscreen();
            return;
          }

          if (backPressRef.current) {
            clearTimeout(backPressRef.current);
            backPressRef.current = null;
            setShowExitToast(false);
            onBack();
          } else {
            setShowExitToast(true);
            backPressRef.current = setTimeout(() => {
              backPressRef.current = null;
              setShowExitToast(false);
            }, 2000);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown, { capture: true });
    return () =>
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [
    showChannelList,
    showEpisodeList,
    setShowEpisodeList,
    contentType,
    remote,
    handleSkipButtonClick,
    onPrevChannel,
    onNextChannel,
    channelInfo,
    toggleFavorite,
    onBack,
    toggleChannelList,
    setIsSettingsMenuOpen,
    showControlsAndCursor,
    getVisibleFocusableElements,
    setFocusSync,
    playNextEpisode,
    playPrevEpisode,
    settingsMenuRef,
    setControlsVisible,
    showNextEpisodeButton,
    setShowNextEpisodeButton,
    tvChannelListRef,
    episodeOverlayRef,
  ]);

  // Handle Focus CSS Classes
  useEffect(() => {
    if (showChannelList || showEpisodeList) return;
    const focusable = getVisibleFocusableElements();
    if (focusable.length === 0) return;

    const newIndex =
      focusedIndex === null ? 0 : Math.min(focusedIndex, focusable.length - 1);
    if (focusedIndex !== newIndex) setFocusedIndex(newIndex);

    focusable.forEach((el, index) => {
      if (index === newIndex) {
        if (isKeyboardModeRef.current) {
          el.classList.add('focused');
        } else {
          el.classList.remove('focused');
        }
        el.focus();
      } else {
        el.classList.remove('focused');
      }
    });
  }, [
    focusedIndex,
    isSettingsMenuOpen,
    activeSettingsMenu,
    showChannelList,
    showEpisodeList,
    getVisibleFocusableElements,
    setFocusedIndex,
    controlsVisible,
    seekOverlay,
  ]);

  // Default focus when controls transition to visible
  useEffect(() => {
    if (controlsVisible && !isSettingsMenuOpen && !showChannelList && !showEpisodeList) {
      const timer = setTimeout(() => {
        const focusable = getVisibleFocusableElements();

        // Always focus the play-pause button by default
        const defaultIndex = focusable.findIndex(
          (el) => el.getAttribute('data-control') === 'play-pause'
        );
        if (defaultIndex !== -1) {
          setFocusSync(defaultIndex);
        } else if (focusable.length > 0) {
          setFocusSync(0);
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [
    controlsVisible,
    isSettingsMenuOpen,
    showChannelList,
    showEpisodeList,
    getVisibleFocusableElements,
    setFocusSync,
    contentType,
  ]);

  return { showExitToast };
}
