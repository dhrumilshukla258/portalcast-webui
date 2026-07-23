import React, { useEffect, useRef, useState } from 'react';
import { GripVertical } from 'lucide-react';
import type { ChannelGroup } from '@/types';

interface DraggableCategoryListProps {
  items: ChannelGroup[];
  selectedCategory: string | null;
  onSelect: (id: string, title: string) => void;
  onReorder: (orderedIds: string[]) => void;
}

// Pointer-based reorderable list: the dragged row follows the cursor 1:1 (no lag while
// held, so it actually feels grabbed), while the rows it passes over slide out of the way
// with a short eased transition — the "lerp" settle feel native HTML5 drag-and-drop lacks.
//
// Touch devices drag from a dedicated grip handle only; desktop (mouse) drags from
// anywhere on the row via a press-and-hold. These need different affordances because the
// ambiguity they're each solving is different: on a touch device, "is this touch the start
// of a scroll swipe or a drag" can't be resolved by a hold-timer alone — a genuine but
// slow-starting scroll swipe can sit still long enough to fire the timer and get hijacked
// into a drag, which made the whole list feel unscrollable on touch. A dedicated handle
// removes that ambiguity outright (touching the handle is unambiguously a drag, touching
// elsewhere is unambiguously a tap/scroll). On desktop there's no such conflict — wheel
// scroll and mouse-drag are different input events entirely — so whole-row press-and-hold
// stays the nicer affordance there (no need to precision-target a small handle with a
// mouse), and showing an always-visible grip icon on every row would just be visual noise
// nobody on desktop needs.
export const DraggableCategoryList: React.FC<DraggableCategoryListProps> = ({
  items,
  selectedCategory,
  onSelect,
  onReorder,
}) => {
  const [order, setOrder] = useState(items);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragY, setDragY] = useState(0);

  // `(hover: none) and (pointer: coarse)` is the standard way to detect "primarily a touch
  // device" — plain `'ontouchstart' in window` also matches touch-enabled laptops that are
  // really mouse-driven, which would wrongly hide the handle-free whole-row drag those
  // devices actually want.
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(hover: none) and (pointer: coarse)');
    setIsTouchDevice(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsTouchDevice(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const rowRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const dragState = useRef({ startY: 0, index: 0, rowHeight: 0 });

  // Desktop only: a bare pointerdown doesn't grab the row immediately — a short press-hold
  // first, so a plain click-to-select isn't misread as the start of a drag.
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDrag = useRef<{ e: React.PointerEvent; id: string; index: number; startX: number; startY: number } | null>(null);

  const clearPressTimer = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    pendingDrag.current = null;
  };

  // Mirrors of the latest state in refs — the window-level safety-net listener below is
  // only re-attached when a drag starts/ends (not on every pointermove), so a plain closure
  // over `order`/`draggingId` would go stale mid-drag and could commit a stale, pre-drag
  // order after the row's own handler already committed the correct one. Reading through
  // refs guarantees every caller (row handler or window fallback) sees the live value.
  const orderRef = useRef(order);
  orderRef.current = order;
  const draggingIdRef = useRef(draggingId);
  draggingIdRef.current = draggingId;

  // Only resync from the `items` prop when the actual SET of categories changed (e.g. a
  // different provider/content type, or a category was added/removed) — never just because
  // a drag ended. `onReorder` persists the new order asynchronously (updatePreferences), so
  // the `items` prop is still stale for a moment after every drop; resyncing unconditionally
  // here would revert the visual reorder right back, and a second drag before that async
  // round-trip finishes would then commit from the wrong (reverted) baseline.
  useEffect(() => {
    const incomingIds = items.map((c) => c.id).sort().join(',');
    const currentIds = orderRef.current.map((c) => c.id).sort().join(',');
    if (incomingIds !== currentIds) {
      setOrder(items);
    }
  }, [items]);

  const beginDrag = (e: React.PointerEvent, id: string, index: number) => {
    const row = rowRefs.current.get(id);
    if (!row) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragState.current = { startY: e.clientY, index, rowHeight: row.offsetHeight + 4 };
    setDraggingId(id);
    draggingIdRef.current = id;
    setDragY(0);
  };

  // Touch handle: unambiguous, starts the drag immediately.
  const handleHandlePointerDown = (e: React.PointerEvent, id: string, index: number) => {
    if (id === '*') return;
    beginDrag(e, id, index);
  };

  // Desktop row: ambiguous with a click, so arm a hold-timer instead of starting immediately.
  const handleRowPointerDown = (e: React.PointerEvent, id: string, index: number) => {
    if (id === '*' || isTouchDevice) return;
    clearPressTimer();
    pendingDrag.current = { e, id, index, startX: e.clientX, startY: e.clientY };
    pressTimer.current = setTimeout(() => {
      if (pendingDrag.current) beginDrag(pendingDrag.current.e, pendingDrag.current.id, pendingDrag.current.index);
      pressTimer.current = null;
    }, 160);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingIdRef.current) {
      // Desktop only — if a press-hold is armed, cancel it once the pointer has moved far
      // enough to look like something other than a hold-in-place.
      if (pendingDrag.current) {
        const dx = e.clientX - pendingDrag.current.startX;
        const dy = e.clientY - pendingDrag.current.startY;
        if (Math.abs(dx) > 8 || Math.abs(dy) > 8) clearPressTimer();
      }
      return;
    }
    const { startY, index, rowHeight } = dragState.current;
    const delta = e.clientY - startY;
    setDragY(delta);

    const shift = Math.round(delta / rowHeight);
    if (shift === 0) return;

    const targetIndex = Math.min(orderRef.current.length - 1, Math.max(1, index + shift));
    if (targetIndex === index) return;

    setOrder((prev) => {
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(targetIndex, 0, moved);
      orderRef.current = next;
      return next;
    });
    dragState.current.index = targetIndex;
    dragState.current.startY += shift * rowHeight;
    setDragY(delta - shift * rowHeight);
  };

  // Idempotent by design: whichever handler (the row's own pointerup, or the window
  // fallback) fires first "claims" the drag by clearing draggingIdRef immediately, so a
  // second, later call is a no-op instead of re-committing a stale order on top.
  const endDrag = () => {
    clearPressTimer();
    if (!draggingIdRef.current) return;
    draggingIdRef.current = null;
    setDraggingId(null);
    setDragY(0);
    onReorder(orderRef.current.filter((c) => c.id !== '*').map((c) => c.id));
  };

  // Safety net: if the pointerup/cancel never reaches the row/handle itself (fast drags,
  // touch scroll interference, releasing outside the window), draggingId would otherwise
  // get stuck forever and silently block clicks (onClick is gated by !isDragging).
  useEffect(() => {
    if (!draggingId) return;
    const onWindowPointerUp = () => endDrag();
    window.addEventListener('pointerup', onWindowPointerUp);
    window.addEventListener('pointercancel', onWindowPointerUp);
    return () => {
      window.removeEventListener('pointerup', onWindowPointerUp);
      window.removeEventListener('pointercancel', onWindowPointerUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draggingId]);

  return (
    <div className="flex flex-col gap-1 pb-4">
      {order.map((cat, index) => {
        const isActive = selectedCategory === cat.id;
        const isDraggable = cat.id !== '*';
        const isDragging = draggingId === cat.id;

        return (
          <div
            key={cat.id || index}
            ref={(el) => {
              if (el) rowRefs.current.set(cat.id, el);
              else rowRefs.current.delete(cat.id);
            }}
            style={{
              transform: isDragging ? `translateY(${dragY}px) scale(1.03)` : undefined,
              transition: isDragging ? 'none' : 'transform 180ms ease',
              zIndex: isDragging ? 10 : undefined,
            }}
            className="relative"
          >
            <button
              data-focusable="true"
              data-selected={isActive ? 'true' : 'false'}
              onClick={() => !isDragging && onSelect(cat.id, cat.title)}
              onPointerDown={isTouchDevice ? undefined : (e) => handleRowPointerDown(e, cat.id, index)}
              onPointerMove={isTouchDevice ? undefined : handlePointerMove}
              onPointerUp={isTouchDevice ? undefined : endDrag}
              onPointerCancel={isTouchDevice ? undefined : endDrag}
              title={isDraggable && !isTouchDevice ? 'Drag to reorder' : undefined}
              className={`flex w-full shrink-0 select-none items-center rounded-lg py-2 text-left text-xs font-semibold sm:text-sm ${
                isTouchDevice ? 'pl-3 pr-1' : 'px-3'
              } ${!isTouchDevice && isDragging ? 'touch-none' : !isTouchDevice ? 'touch-pan-y' : ''} ${
                isActive
                  ? 'bg-linear-to-r from-sky-500 to-blue-600 text-white shadow-md shadow-blue-900/30'
                  : 'text-gray-400 hover:bg-white/10 hover:text-gray-100'
              } ${isDragging ? 'shadow-xl shadow-black/40 ring-1 ring-sky-400/50' : ''} ${
                isDraggable && !isTouchDevice ? 'cursor-grab active:cursor-grabbing' : ''
              } focus:bg-blue-600 focus:text-white [&.focused]:bg-blue-600 [&.focused]:text-white`}
            >
              <span className="flex-1 truncate">{cat.title}</span>
              {/* Touch only — desktop drags from anywhere on the row via
                  press-and-hold instead (see the component's own comment for
                  why these need different affordances). */}
              {isTouchDevice && isDraggable && (
                <span
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    handleHandlePointerDown(e, cat.id, index);
                  }}
                  onPointerMove={handlePointerMove}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                  aria-label="Drag to reorder"
                  className="touch-none flex h-full shrink-0 cursor-grab items-center px-2.5 text-gray-500 active:cursor-grabbing"
                >
                  <GripVertical className="h-4 w-4" />
                </span>
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
};
