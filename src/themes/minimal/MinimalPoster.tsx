import React from 'react';
import { motion } from 'motion/react';
import { snappy } from './motion';

interface MinimalPosterProps {
  /** Tooltip, image alt and the text shown when there is no art. */
  title: string;
  /** The art (src, srcSet...) or null for none. */
  image: React.ImgHTMLAttributes<HTMLImageElement> | null;
  onImageError?: () => void;
  onActivate: () => void;
  /** Extra handlers on the poster (useLongPress: hold or right-click for the title menu). */
  handlers?: React.HTMLAttributes<HTMLDivElement>;
  /** 0-100: a thin white bar inside the art. */
  progress?: number;
  dim?: boolean;
  loading?: boolean;
  /** Small badges in the corners (Local, watched). */
  topLeft?: React.ReactNode;
  topRight?: React.ReactNode;
  /** A PosterAction in the top-right corner, shown on hover. */
  action?: React.ReactNode;
  caption: React.ReactNode;
  detail?: React.ReactNode;
  /** Rows on a phone: the art alone (its own title is on it). */
  captionHiddenOnPhone?: boolean;
}

/**
 * Minimal's poster, shared by every card it draws (MinimalCard, MinimalContinueCard): the art
 * with soft corners, the title and a detail line in small grey type under it. It rests at 96 %
 * and lifts to 100 % on hover (a spring, plus a shadow), so the hovered poster fills its slot
 * exactly and a row that scrolls sideways (and so clips) never cuts its corners. Pressed, it
 * gives a little.
 */
export default function MinimalPoster(p: MinimalPosterProps) {
  return (
    <div className={`group ${p.dim ? 'opacity-35' : ''}`}>
      <motion.div
        initial={false}
        animate={{ scale: 0.96 }}
        whileHover={{ scale: 1 }}
        whileTap={{ scale: 0.93 }}
        transition={snappy}
        onClick={() => {
          if (!p.loading) p.onActivate();
        }}
        {...(p.handlers as object)}
        title={p.title}
        data-focusable="true"
        tabIndex={-1}
        className="relative aspect-2/3 w-full cursor-pointer overflow-hidden rounded-xl bg-gray-900 shadow-black/70 transition-shadow duration-300 group-hover:shadow-2xl"
      >
        {p.image ? (
          <img {...p.image} alt={p.title} loading="lazy" decoding="async" className="h-full w-full object-cover" onError={p.onImageError} />
        ) : (
          <div className="flex h-full w-full items-center justify-center p-3 text-center text-sm font-semibold text-white/40">{p.title}</div>
        )}
        {p.topLeft && <span className="absolute top-2 left-2">{p.topLeft}</span>}
        {p.topRight && <span className="absolute top-2 right-2">{p.topRight}</span>}
        {p.action}
        {p.progress !== undefined && p.progress > 0 && (
          <div className="absolute inset-x-2 bottom-2 h-1 overflow-hidden rounded-full bg-white/25">
            <div className="h-full rounded-full bg-white" style={{ width: `${Math.min(100, p.progress)}%` }} />
          </div>
        )}
        {p.loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-white/25 border-t-white" />
          </div>
        )}
      </motion.div>

      <div className={`mt-2 px-0.5 text-left ${p.captionHiddenOnPhone ? 'hidden sm:block' : ''}`}>
        <p className="truncate text-sm font-medium text-white/85">{p.caption}</p>
        {p.detail && <p className="truncate text-xs text-white/50">{p.detail}</p>}
      </div>
    </div>
  );
}

/** A round button in the poster's top-right corner: on hover, or always on a phone. */
export function PosterAction({
  label,
  onClick,
  children,
  onPhone = false,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  onPhone?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      data-focusable="true"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`absolute top-2 right-2 z-10 h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80 focus-visible:flex ${
        onPhone ? 'flex sm:hidden sm:group-hover:flex' : 'hidden sm:group-hover:flex'
      }`}
    >
      {children}
    </button>
  );
}

/** A small tag on the art (Local, Local · 4K). */
export const PosterBadge = ({ children }: { children: React.ReactNode }) => (
  <span className="rounded-md bg-black/60 px-1.5 py-0.5 text-2xs font-semibold text-white">{children}</span>
);
