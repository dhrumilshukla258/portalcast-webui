import { useEffect, type RefObject } from 'react';

/**
 * Parallax: `ref` moves down by a share of its scroller's scroll, so the page slides over it.
 * The share is the theme's --ui-backdrop-parallax (0: it stays put); never with Reduce Motion.
 * A transform, written at most once a frame, without re-rendering.
 */
export function useParallax(ref: RefObject<HTMLElement | null>, key: unknown) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const share = parseFloat(getComputedStyle(el).getPropertyValue('--ui-backdrop-parallax')) || 0;
    if (!share || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let scroller = el.parentElement;
    while (scroller && !/(auto|scroll)/.test(getComputedStyle(scroller).overflowY)) scroller = scroller.parentElement;
    if (!scroller) return;
    const box = scroller;
    let frame = 0;
    const apply = () => {
      frame = 0;
      el.style.transform = `translate3d(0, ${Math.round(box.scrollTop * share)}px, 0)`;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(apply);
    };
    apply();
    box.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      box.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
      el.style.transform = '';
    };
  }, [ref, key]);
}
