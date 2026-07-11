import React, { useEffect, useRef, useState } from 'react';
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
export const DraggableCategoryList: React.FC<DraggableCategoryListProps> = ({
  items,
  selectedCategory,
  onSelect,
  onReorder,
}) => {
  const [order, setOrder] = useState(items);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragY, setDragY] = useState(0);

  const rowRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const dragState = useRef({ startY: 0, index: 0, rowHeight: 0 });

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

  const handlePointerDown = (e: React.PointerEvent, id: string, index: number) => {
    if (id === '*') return;
    const row = rowRefs.current.get(id);
    if (!row) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragState.current = { startY: e.clientY, index, rowHeight: row.offsetHeight + 4 };
    setDraggingId(id);
    draggingIdRef.current = id;
    setDragY(0);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingIdRef.current) return;
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
    if (!draggingIdRef.current) return;
    draggingIdRef.current = null;
    setDraggingId(null);
    setDragY(0);
    onReorder(orderRef.current.filter((c) => c.id !== '*').map((c) => c.id));
  };

  // Safety net: if the pointerup/cancel never reaches the row itself (fast drags, touch
  // scroll interference, releasing outside the window), draggingId would otherwise get
  // stuck forever and silently block clicks (onClick is gated by !isDragging).
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
              onPointerDown={(e) => handlePointerDown(e, cat.id, index)}
              onPointerMove={handlePointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              title={isDraggable ? 'Drag to reorder' : undefined}
              className={`flex w-full shrink-0 touch-none items-center rounded-lg px-3 py-2 text-left text-xs font-semibold transition-colors duration-200 sm:text-sm ${
                isActive
                  ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md shadow-blue-900/30'
                  : 'text-gray-400 hover:bg-white/10 hover:text-gray-100'
              } ${isDragging ? 'shadow-xl shadow-black/40 ring-1 ring-sky-400/50' : ''} ${
                isDraggable ? 'cursor-grab active:cursor-grabbing' : ''
              } focus:bg-blue-600 focus:text-white [&.focused]:bg-blue-600 [&.focused]:text-white`}
            >
              <span className="truncate">{cat.title}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
};
