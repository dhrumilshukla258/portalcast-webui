import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Info } from 'lucide-react';
import PlaybackButton from '@/components/ui/PlaybackButton';
import ActivityIndicator from '@/components/ui/ActivityIndicator';
import type { ContinueHeroProps } from '@/components/organisms/browse/ContinueHero';
import { useContinueHero } from '@/components/organisms/browse/useContinueHero';
import { downsize } from '@/utils/imageSize';
import { easeOut, smooth, snappy } from './motion';

/**
 * Minimal theme's Home hero, Apple TV style: the backdrop large, fading into black at the
 * bottom, title (or logo art) bottom left, a white Resume button and a glass Details one (the
 * title's page). The art fades in once it has loaded; nothing moves after that.
 */
const heroButton =
  'inline-flex w-fit items-center gap-2 rounded-xl px-7 py-3 text-base font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white [&.focused]:outline-2 [&.focused]:outline-offset-4 [&.focused]:outline-white';
const MinimalHero: React.FC<ContinueHeroProps> = ({ progressRecords, onResume }) => {
  const hero = useContinueHero(progressRecords);
  const [loadedArt, setLoadedArt] = useState<string | null>(null);
  if (!hero) return null;
  const { item, details, title, art, onArtError, detail, pct, openDetails, detailsLoading } = hero;
  const src = art ? downsize(art, 'w1280') : null;

  return (
    <section className="relative mb-10 overflow-hidden rounded-2xl bg-gray-900">
      <div className="relative min-h-80 w-full sm:aspect-21/9 sm:min-h-0">
        {src && (
          <motion.img
            key={src}
            src={src}
            alt=""
            onLoad={() => setLoadedArt(src)}
            onError={onArtError}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={loadedArt === src ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 1.04 }}
            transition={{ duration: 0.9, ease: easeOut }}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-linear-to-t from-black via-black/35 to-transparent" />
        <div className="absolute inset-0 bg-linear-to-r from-black/75 via-black/15 to-transparent" />

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={smooth}
          className="absolute inset-x-0 bottom-0 flex max-w-2xl flex-col items-start gap-3 p-6 text-left sm:p-10"
        >
          <span className="text-sm font-semibold text-white/60">Continue Watching</span>
          {details?.logo ? (
            <img src={details.logo} alt={title} className="max-h-20 max-w-[min(100%,380px)] object-contain object-left sm:max-h-28" />
          ) : (
            <h2 className="text-3xl leading-tight font-bold text-white sm:text-5xl">{title}</h2>
          )}
          {details?.tagline && <p className="line-clamp-2 text-base text-white/70">{details.tagline}</p>}
          <div className="flex items-center gap-3">
            <div className="h-1 w-32 overflow-hidden rounded-full bg-white/25 sm:w-48">
              <div className="h-full rounded-full bg-white" style={{ width: `${pct}%` }} />
            </div>
            {detail && <span className="truncate text-sm text-white/70">{detail}</span>}
          </div>
          <div className="mt-1 flex items-center gap-3">
            <PlaybackButton onClick={() => onResume(item)}>Resume</PlaybackButton>
            {openDetails && (
              <motion.button
                type="button"
                onClick={openDetails}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                transition={snappy}
                data-focusable="true"
                className={`${heroButton} minimal-glass-action text-white backdrop-blur-md`}
              >
                {detailsLoading ? <ActivityIndicator className="text-lg" /> : <Info size={18} />}
                Details
              </motion.button>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default MinimalHero;
