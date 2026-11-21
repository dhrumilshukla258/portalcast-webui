import React, { useEffect, useLayoutEffect, useReducer, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft } from 'lucide-react';
import { takeCardOrigin, type CardOrigin } from '@/utils/cardOrigin';

// The motion is the theme's (--ui-title-* in src/components/ui/ui.css). Classic: the Android TV
// app's title pages (ui/nav/TitleTransitions.kt), growing out of the card in 380 ms (Material's
// emphasized decelerate) and shrinking back into it in 260 ms; the fallbacks below.
const OPEN_MS = 380;
const CLOSE_MS = 260;
const EASE_OPEN = 'cubic-bezier(0.05, 0.7, 0.1, 1)';
const EASE_CLOSE = 'cubic-bezier(0.3, 0, 0.8, 0.15)';

function titleMotion() {
  const cs = getComputedStyle(document.documentElement);
  const token = (name: string) => cs.getPropertyValue(name).trim();
  // An easing this browser cannot run (linear() before Chrome 113) would make animate() throw.
  const ease = (name: string, fallback: string) => {
    const v = token(name);
    return v && window.CSS?.supports?.('animation-timing-function', v) ? v : fallback;
  };
  return {
    openMs: Number(token('--ui-title-open-ms')) || OPEN_MS,
    openEase: ease('--ui-title-open-ease', EASE_OPEN),
    closeMs: Number(token('--ui-title-close-ms')) || CLOSE_MS,
    closeEase: ease('--ui-title-close-ease', EASE_CLOSE),
    /** How much of the motion the page takes to fade in (and, closing, out): 1 = all of it. */
    fade: Math.min(1, Math.max(0.05, Number(token('--ui-title-fade')) || 1)),
  };
}

const reducedMotion = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Scale around the card's centre from the card's width; without a card, a slight zoom. */
const motionFrom = (o: CardOrigin | null) => ({
  transform: `scale(${o ? Math.max(o.scale, 0.08) : 0.92})`,
  origin: o ? `${o.x}px ${o.y}px` : '50% 50%',
});

interface TitlePageLayerProps {
  open: boolean;
  /** Which title is shown: a new one (More Like This) grows out of its card again. */
  pageKey: string;
  onBack: () => void;
  children?: React.ReactNode;
}

/**
 * A movie's or series' page on phones and computers (owner 2026-10-29: its own page, not a
 * popup over Home, opening "like the title expanding", as in the Android TV app). Over the whole
 * screen, header included, drawn on <body> like the TV mode's TitleLayer (tv/TvTitlePage), with
 * its own scroll so Home under it keeps its place. Only transform and opacity animate
 * (compositor), with the Web Animations API: no script per frame.
 */
const TitlePageLayer: React.FC<TitlePageLayerProps> = ({ open, pageKey, onBack, children }) => {
  const layerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const origin = useRef<CardOrigin | null>(null);
  const wasOpen = useRef(false);
  // While closing, the last page stays on screen until it has shrunk away.
  const shown = useRef<React.ReactNode>(null);
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  if (open) shown.current = children;

  // Opening, or another title in the open page: grow from the card picked.
  useLayoutEffect(() => {
    if (!open) return;
    const layer = layerRef.current;
    const opening = !wasOpen.current;
    wasOpen.current = true;
    if (!layer) return;
    origin.current = takeCardOrigin();
    layer.scrollTop = 0;
    if (reducedMotion()) return;
    // A first open grows the whole page over Home; a title opened from the page grows its
    // content over the page's own background.
    const target = opening ? layer : contentRef.current;
    if (!target) return;
    const m = motionFrom(origin.current);
    const t = titleMotion();
    const box = target.getBoundingClientRect();
    target.style.transformOrigin = origin.current ? `${origin.current.x - box.left}px ${origin.current.y - box.top}px` : m.origin;
    const frames: Keyframe[] =
      t.fade < 1
        ? [{ transform: m.transform, opacity: 0 }, { opacity: 1, offset: t.fade }, { transform: 'none', opacity: 1 }]
        : [{ transform: m.transform, opacity: 0 }, { transform: 'none', opacity: 1 }];
    const anim = target.animate(frames, { duration: t.openMs, easing: t.openEase });
    return () => anim.cancel();
  }, [open, pageKey]);

  // Closing: shrink back into the card, then leave.
  useLayoutEffect(() => {
    if (open || !wasOpen.current) return;
    wasOpen.current = false;
    const layer = layerRef.current;
    const done = () => {
      shown.current = null;
      rerender();
    };
    if (!layer || reducedMotion()) {
      done();
      return;
    }
    const m = motionFrom(origin.current);
    const t = titleMotion();
    layer.style.transformOrigin = m.origin;
    const frames: Keyframe[] =
      t.fade < 1
        ? [{ transform: 'none', opacity: 1 }, { opacity: 1, offset: 1 - t.fade }, { transform: m.transform, opacity: 0 }]
        : [{ transform: 'none', opacity: 1 }, { transform: m.transform, opacity: 0 }];
    const anim = layer.animate(frames, { duration: t.closeMs, easing: t.closeEase, fill: 'forwards' });
    // The finish event waits for a drawn frame (none in a hidden tab): a timer as well.
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      done();
    };
    anim.onfinish = finish;
    const timer = window.setTimeout(finish, t.closeMs + 100);
    return () => {
      anim.onfinish = null;
      window.clearTimeout(timer);
      anim.cancel();
    };
  }, [open]);

  // Escape: Back, unless a dialog over the page (title menu, versions) takes it.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented || document.querySelector('[role="dialog"]')) return;
      e.preventDefault();
      onBack();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onBack]);

  if (shown.current == null) return null;
  return createPortal(
    <div
      ref={layerRef}
      className="fixed inset-0 z-[85] overflow-y-auto overscroll-contain bg-surface-2 custom-scrollbar"
      data-tv-layer=""
      style={open ? undefined : { pointerEvents: 'none' }}
    >
      <div className="sticky top-0 z-20 h-0">
        <button
          type="button"
          onClick={onBack}
          data-focusable="true"
          aria-label="Back"
          className="m-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80 focus:outline-hidden focus:ring-2 focus:ring-portalcast-light sm:m-5"
        >
          <ArrowLeft size={20} />
        </button>
      </div>
      <div ref={contentRef} className="pb-[max(2.5rem,env(safe-area-inset-bottom))]">
        {shown.current}
      </div>
    </div>,
    document.body
  );
};

export default TitlePageLayer;
