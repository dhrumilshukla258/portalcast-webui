// The TV apps' remote (isTvApp(): Samsung, LG), as the Android TV app moves (docs/design-system.md,
// Navigation): each arrow goes to the nearest element that way on screen, a row / tab bar / chips
// row given back the element last focused in it, Up from the content reaches the chips and then
// the tabs, resting on a tab 350 ms opens it, holding OK opens the title menu, Back goes to the tabs
// and then out. The pointer (LG's Magic Remote) focuses what it points at.
//
// Elements: `data-focusable="true"` (as everywhere). Optional marks:
//   data-tv-group   a row, the tabs, the chips: entering it from outside lands on the element last
//                   focused in it, else its `data-active="true"` one, else the nearest.
//   data-tv-tab     a tab: opened after 350 ms of focus (unless `data-active`).
//   data-tv-layer   a full-screen layer over the page (a title page): focus stays inside it.
//   data-tv-scroll="rows"  on a scroll box: the focused row is brought to its top (Home's rows);
//                   other scroll boxes only bring the focused element into view.
//   data-default-focus="true"  where a screen or layer starts.

export interface TvRemoteOptions {
  /** The app's Back (closes what is open, then Home, then exit). */
  onBack: () => void;
  /** Off while the player is up (it has its own keys). */
  isActive: () => boolean;
  /** A grid's last row reached: load the next page. */
  onNearEnd?: () => void;
}

const BACK_KEYS = new Set([8, 27, 461, 10009]);
const ARROWS: Record<number, Dir> = { 37: 'left', 38: 'up', 39: 'right', 40: 'down' };
type Dir = 'left' | 'up' | 'right' | 'down';
const HOLD_MS = 550;
const TAB_REST_MS = 350;
const REPEAT_GAP_MS = 70; // a held arrow moves about 14 times a second, never faster than frames

const LAYERS = '[role="dialog"], [data-tv-layer], .detail-modal-container, .categories-modal-container';

// Speed (owner: "fast as hell"): a press reads the boxes of a few dozen elements at most, never
// every card on the page, and no computed styles (a hidden element has an empty box).
function visible(el: HTMLElement): boolean {
  if ((el as HTMLButtonElement).disabled || el.getAttribute('aria-hidden') === 'true') return false;
  const r = el.getBoundingClientRect();
  return r.width >= 1 && r.height >= 1;
}

/** The open layer focus belongs to (the last one in the page), else the page. */
function currentScope(): ParentNode {
  const layers = Array.from(document.querySelectorAll<HTMLElement>(LAYERS)).filter((l) => l.isConnected && l.getBoundingClientRect().width > 0);
  return layers.length ? layers[layers.length - 1] : document;
}

function focusablesIn(root: ParentNode): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>('[data-focusable="true"]')).filter(visible);
}

const isTyping = (el: Element | null) => !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');

/** The best element from `from` towards `dir`, by distance along it plus misalignment across it. */
function nearest(from: DOMRect, dir: Dir, candidates: HTMLElement[], self: HTMLElement): HTMLElement | null {
  let best: HTMLElement | null = null;
  let bestScore = Infinity;
  const fcx = from.left + from.width / 2, fcy = from.top + from.height / 2;
  for (const el of candidates) {
    if (el === self || el.contains(self) || self.contains(el)) continue;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    let along: number, across: number;
    if (dir === 'down') { if (r.top < from.top + from.height * 0.5 || cy <= fcy) continue; along = Math.max(0, r.top - from.bottom); across = Math.max(0, r.left - from.right, from.left - r.right); }
    else if (dir === 'up') { if (r.bottom > from.bottom - from.height * 0.5 || cy >= fcy) continue; along = Math.max(0, from.top - r.bottom); across = Math.max(0, r.left - from.right, from.left - r.right); }
    else if (dir === 'right') { if (r.left < from.left + from.width * 0.5 || cx <= fcx) continue; along = Math.max(0, r.left - from.right); across = Math.max(0, r.top - from.bottom, from.top - r.bottom); }
    else { if (r.right > from.right - from.width * 0.5 || cx >= fcx) continue; along = Math.max(0, from.left - r.right); across = Math.max(0, r.top - from.bottom, from.top - r.bottom); }
    const offset = dir === 'up' || dir === 'down' ? Math.abs(cx - fcx) : Math.abs(cy - fcy);
    const score = along + across * 4 + offset * 0.15;
    if (score < bestScore) { bestScore = score; best = el; }
  }
  return best;
}

export class TvRemote {
  private current: HTMLElement | null = null;
  private memory = new WeakMap<Element, HTMLElement>();
  /** What was focused when each layer opened, to go back to when it closes. */
  private layerReturn = new WeakMap<Element, HTMLElement>();
  private scope: ParentNode = document;
  private lastMove = 0;
  private holdTimer: ReturnType<typeof setTimeout> | null = null;
  private held = false;
  private enterDown = false;
  private tabTimer: ReturnType<typeof setTimeout> | null = null;
  private observer: MutationObserver | null = null;
  private checkQueued = false;
  /** Focus was placed by the app (a screen opening), not moved by the viewer yet. */
  private placed = false;

  private opts: TvRemoteOptions;

  constructor(opts: TvRemoteOptions) {
    this.opts = opts;
  }

  start(): () => void {
    document.documentElement.classList.add('tv');
    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('keyup', this.onKeyUp);
    document.addEventListener('mouseover', this.onPointer, true);
    this.observer = new MutationObserver((records) => {
      for (const r of records) {
        // React rewrites className when a focused element re-renders (a chosen tab, a season):
        // put the ring back at once.
        if (r.type === 'attributes') {
          if (r.target === this.current && !this.current.classList.contains('focused')) this.current.classList.add('focused');
        } else {
          this.queueCheck();
        }
      }
    });
    this.observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    this.queueCheck();
    return () => {
      document.removeEventListener('keydown', this.onKeyDown);
      document.removeEventListener('keyup', this.onKeyUp);
      document.removeEventListener('mouseover', this.onPointer, true);
      this.observer?.disconnect();
      if (this.tabTimer) clearTimeout(this.tabTimer);
      if (this.holdTimer) clearTimeout(this.holdTimer);
    };
  }

  /** After the page changed: a layer opened or closed, or the focused element went away. */
  private queueCheck = () => {
    if (this.checkQueued) return;
    this.checkQueued = true;
    setTimeout(() => { this.checkQueued = false; this.check(); }, 60);
  };

  private check() {
    if (!this.opts.isActive()) return;
    const scope = currentScope();
    if (scope !== this.scope) {
      const prev = this.scope;
      this.scope = scope;
      if (scope !== document && this.current && !(scope as Element).contains(this.current)) {
        // A layer opened over the page.
        this.layerReturn.set(scope as Element, this.current);
        this.land(scope);
        return;
      }
      if (prev !== document && !(prev as Element).isConnected) {
        // A layer closed: back to where focus was when it opened.
        const back = this.layerReturn.get(prev as Element);
        if (back && back.isConnected && visible(back)) { this.focus(back, { scroll: true }); return; }
      }
    }
    if (!this.current || !this.current.isConnected || !visible(this.current) || (scope !== document && !(scope as Element).contains(this.current))) {
      this.land(scope);
    } else if (this.placed) {
      // Still where the screen started while its content loads: move to the content when it comes.
      this.land(scope);
    }
  }

  /** Where a screen or layer starts: its default element, else the first one outside the header. */
  private land(scope: ParentNode) {
    const all = focusablesIn(scope);
    if (!all.length) return;
    // Not the header, the tabs or the chips: the content (a screen's first row or grid).
    const chrome = (el: HTMLElement) => !!el.closest('header, [data-tv-group="tabs"], [data-tv-group="chips"]');
    const target = all.find((el) => el.getAttribute('data-default-focus') === 'true')
      ?? all.find((el) => !chrome(el) && !!el.closest('[data-tv-group="row"], .grid'))
      ?? all.find((el) => !chrome(el))
      ?? all[0];
    if (target !== this.current) this.focus(target, { scroll: true });
    this.placed = true;
  }

  focus(el: HTMLElement, { scroll = true, fromKey = false } = {}) {
    this.placed = false;
    if (this.current && this.current !== el) this.current.classList.remove('focused');
    this.current = el;
    el.classList.add('focused');
    // A text box is not focused for real until OK (the keyboard would open on every pass).
    if (isTyping(el)) {
      if (document.activeElement && document.activeElement !== el) (document.activeElement as HTMLElement).blur?.();
    } else {
      el.focus({ preventScroll: true });
    }
    for (let g = el.parentElement?.closest('[data-tv-group]'); g; g = g.parentElement?.closest('[data-tv-group]')) this.memory.set(g, el);
    if (scroll) this.reveal(el);
    if (this.tabTimer) { clearTimeout(this.tabTimer); this.tabTimer = null; }
    if (fromKey && el.hasAttribute('data-tv-tab') && el.getAttribute('data-active') !== 'true') {
      this.tabTimer = setTimeout(() => { this.tabTimer = null; if (this.current === el) el.click(); }, TAB_REST_MS);
    }
  }

  /** Every scroll box around `el` moves just enough (Home's rows: the focused row to the top). */
  private reveal(el: HTMLElement) {
    if (el.closest('header')) {
      for (let p = el.parentElement; p; p = p.parentElement) if (p.scrollTop) p.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const r = el.getBoundingClientRect();
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const s = getComputedStyle(p);
      const box = p.getBoundingClientRect();
      // Screen pixels per scroll pixel (1, or the zoom when the page is zoomed: main.tsx).
      const k = p.offsetWidth ? box.width / p.offsetWidth : 1;
      if ((s.overflowX === 'auto' || s.overflowX === 'scroll') && p.scrollWidth > p.clientWidth + 1) {
        // A row runs to the screen's edges: the focused card stays clear of them by the page's side padding.
        const pad = 56 * k;
        if (r.left < box.left + pad) p.scrollTo({ left: p.scrollLeft - (box.left + pad - r.left) / k, behavior: 'smooth' });
        else if (r.right > box.right - pad) p.scrollTo({ left: p.scrollLeft + (r.right - (box.right - pad)) / k, behavior: 'smooth' });
      }
      if ((s.overflowY === 'auto' || s.overflowY === 'scroll') && p.scrollHeight > p.clientHeight + 1) {
        if (p.getAttribute('data-tv-scroll') === 'rows') {
          const section = (el.closest('[data-tv-section]') as HTMLElement | null) ?? el;
          const top = section.getBoundingClientRect().top - box.top - 16 * k;
          if (Math.abs(top) > 2) p.scrollTo({ top: p.scrollTop + top / k, behavior: 'smooth' });
        } else {
          const pad = Math.min(80, box.height * 0.12);
          if (r.top < box.top + pad) p.scrollTo({ top: p.scrollTop - (box.top + pad - r.top) / k, behavior: 'smooth' });
          else if (r.bottom > box.bottom - pad) p.scrollTo({ top: p.scrollTop + (r.bottom - (box.bottom - pad)) / k, behavior: 'smooth' });
        }
      }
    }
  }

  move(dir: Dir) {
    const scope = currentScope();
    const cur = this.current && this.current.isConnected && (scope === document || (scope as Element).contains(this.current)) && visible(this.current) ? this.current : null;
    if (!cur) { this.land(scope); return; }
    const from = cur.getBoundingClientRect();
    // 1. Within the current row or list (a row's cards Left / Right, a list's items Up / Down).
    const own = cur.parentElement?.closest('[data-tv-group]') ?? null;
    let next: HTMLElement | null = own ? nearest(from, dir, focusablesIn(own), cur) : null;
    if (!next) {
      // 2. Elsewhere: each row or list counts as one box, plus the loose elements; the best of those,
      //    then inside a chosen group its best element (remembered / active / nearest, below).
      const units: HTMLElement[] = [];
      for (const g of Array.from(scope.querySelectorAll<HTMLElement>('[data-tv-group]'))) {
        if (g !== own && !g.contains(cur) && !g.parentElement?.closest('[data-tv-group]') && visible(g)) units.push(g);
      }
      for (const el of Array.from(scope.querySelectorAll<HTMLElement>('[data-focusable="true"]'))) {
        if (el !== cur && !el.parentElement?.closest('[data-tv-group]') && visible(el)) units.push(el);
      }
      const unit = nearest(from, dir, units, cur);
      if (!unit) return;
      next = unit.hasAttribute('data-tv-group') ? nearest(from, dir, focusablesIn(unit), cur) ?? focusablesIn(unit)[0] ?? null : unit;
      if (!next) return;
    }
    // Up from the content stops at the chips row before the tabs (Android TV app).
    if (dir === 'up' && next.closest('header, [data-tv-group="tabs"]') && !cur.closest('header, [data-tv-group="chips"]')) {
      const chips = scope.querySelector<HTMLElement>('[data-tv-group="chips"] [data-focusable="true"]');
      if (chips && visible(chips) && chips.getBoundingClientRect().bottom <= from.top + 1) next = chips;
    }
    // Into a row, the tabs or the chips from outside: where it was left, else its active element.
    const group = next.closest('[data-tv-group]');
    if (group && !group.contains(cur)) {
      const remembered = this.memory.get(group);
      const active = group.querySelector<HTMLElement>('[data-focusable="true"][data-active="true"]');
      // The chips row starts at its first chip; a row, at the nearest card.
      const first = group.getAttribute('data-tv-group') === 'chips' ? focusablesIn(group)[0] : null;
      const pick = remembered && remembered.isConnected && visible(remembered) ? remembered : active && visible(active) ? active : first;
      if (pick) next = pick;
    }
    this.focus(next, { scroll: true, fromKey: true });
    if ((dir === 'down' || dir === 'right') && this.opts.onNearEnd) {
      const grid = next.closest('.grid');
      if (grid) {
        const cells = focusablesIn(grid);
        const cols = getComputedStyle(grid).getPropertyValue('grid-template-columns').split(' ').length || 1;
        if (cells.indexOf(next) >= cells.length - cols) this.opts.onNearEnd();
      }
    }
  }

  private dispatching = false;

  private back() {
    const layer = currentScope();
    if (layer !== document) {
      // A menu, picker or panel is open: it closes on Escape (each listens for it), else the app's Back.
      this.dispatching = true;
      try {
        (document.activeElement && (layer as Element).contains(document.activeElement) ? document.activeElement : (layer as Element))
          .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true, cancelable: true }));
      } finally { this.dispatching = false; }
      setTimeout(() => {
        if ((layer as Element).isConnected && currentScope() === layer) this.opts.onBack();
      }, 80);
      return;
    }
    const st = window.history.state ?? {};
    const somethingOpen = (typeof st.depth === 'number' && st.depth > 0) || st.filterSheet || st.categoryBrowse || st.chooseSports || false;
    if (!somethingOpen && this.current && !this.current.closest('header')) {
      // On a screen: Back goes to the tabs first (Android TV app).
      const tab = document.querySelector<HTMLElement>('header [data-tv-tab][data-active="true"]') ?? document.querySelector<HTMLElement>('header [data-focusable="true"]');
      if (tab) { this.focus(tab, { scroll: true }); return; }
    }
    this.opts.onBack();
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (this.dispatching || !this.opts.isActive() || e.defaultPrevented) return;
    const active = document.activeElement;
    const typing = isTyping(active);
    if (typing) {
      // Typing: Up / Down leave the box, Back / OK close the keyboard, the rest is the box's.
      if (e.keyCode === 38 || e.keyCode === 40) { e.preventDefault(); (active as HTMLElement).blur(); this.move(e.keyCode === 38 ? 'up' : 'down'); }
      else if (e.keyCode === 13 || BACK_KEYS.has(e.keyCode) && e.keyCode !== 8) { e.preventDefault(); (active as HTMLElement).blur(); }
      return;
    }
    const dir = ARROWS[e.keyCode];
    if (dir) {
      e.preventDefault();
      const now = performance.now();
      if (e.repeat && now - this.lastMove < REPEAT_GAP_MS) return;
      this.lastMove = now;
      this.move(dir);
      return;
    }
    if (e.keyCode === 13) {
      e.preventDefault();
      if (e.repeat || this.enterDown) return;
      this.enterDown = true;
      this.held = false;
      const el = this.current;
      if (!el) return;
      if (isTyping(el)) { el.focus(); this.enterDown = false; return; }
      this.holdTimer = setTimeout(() => {
        this.holdTimer = null;
        this.held = true;
        // Holding OK: the title menu (cards answer contextmenu, as a right-click).
        el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
      }, HOLD_MS);
      return;
    }
    if (BACK_KEYS.has(e.keyCode)) {
      e.preventDefault();
      this.back();
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    if (e.keyCode !== 13 || !this.enterDown) return;
    this.enterDown = false;
    if (this.holdTimer) { clearTimeout(this.holdTimer); this.holdTimer = null; }
    if (this.held) { this.held = false; return; }
    if (!this.opts.isActive()) return;
    const el = this.current;
    if (el && el.isConnected) {
      if (this.tabTimer) { clearTimeout(this.tabTimer); this.tabTimer = null; }
      el.click();
    }
  };

  /** LG's pointer: what it points at is focused (without scrolling: the hand is moving it). */
  private onPointer = (e: MouseEvent) => {
    if (!this.opts.isActive()) return;
    const el = (e.target as Element | null)?.closest?.('[data-focusable="true"]') as HTMLElement | null;
    if (!el || el === this.current) return;
    const scope = currentScope();
    if (scope !== document && !(scope as Element).contains(el)) return;
    this.focus(el, { scroll: false });
  };
}
