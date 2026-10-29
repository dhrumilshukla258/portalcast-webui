/**
 * Where the card that opened a title page was on screen, so the page grows out of that card
 * and shrinks back into it (owner 2026-10-29; the Android TV app does the same:
 * ui/components/CardOrigin.kt). Recorded for every click and Enter, read only when a page opens.
 */
export interface CardOrigin {
  /** The card's centre, in viewport pixels. */
  x: number;
  y: number;
  /** The card's width over the viewport's: the page's starting scale. */
  scale: number;
}

let last: { origin: CardOrigin; at: number } | null = null;

function remember(el: Element | null) {
  const card = el?.closest('[data-focusable], button, a, [role="button"]');
  if (!card) return;
  const r = card.getBoundingClientRect();
  if (!r.width || !r.height) return;
  last = {
    origin: { x: r.left + r.width / 2, y: r.top + r.height / 2, scale: Math.min(1, r.width / window.innerWidth) },
    at: Date.now(),
  };
}

if (typeof document !== 'undefined') {
  document.addEventListener('click', (e) => remember(e.target as Element), true);
  document.addEventListener('keydown', (e) => { if (e.key === 'Enter') remember(document.activeElement); }, true);
}

/** The card picked just now (a page that opens later, or without a card, has none). */
export function takeCardOrigin(): CardOrigin | null {
  const o = last && Date.now() - last.at < 5000 ? last.origin : null;
  last = null;
  return o;
}
