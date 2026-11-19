import { useState } from 'react';
import { Info } from 'lucide-react';
import Button from '@/components/ui/Button';
import PlaybackButton from '@/components/ui/PlaybackButton';
import type { ContinueHeroProps } from '@/components/organisms/browse/ContinueHero';
import { useContinueHero } from '@/components/organisms/browse/useContinueHero';
import ActivityIndicator from '@/components/ui/ActivityIndicator';
import { downsize } from '@/utils/imageSize';

export default function ConsoleHero({ progressRecords, onResume }: ContinueHeroProps) {
  const hero = useContinueHero(progressRecords);
  const [brokenLogo, setBrokenLogo] = useState('');
  if (!hero) return null;
  const { item, details, title, art, onArtError, detail, pct, openDetails, detailsLoading } = hero;
  return (
    <section className="console-hero" aria-label={`Continue watching ${title}`}>
      {art && <img className="console-art" src={downsize(art, 'w1280')} alt="" fetchPriority="high" onError={onArtError} />}
      <div className="console-story">
        <p className="console-kicker">Continue Watching</p>
        <h2>{details?.logo && details.logo !== brokenLogo
          ? <img src={details.logo} alt={title} onError={() => setBrokenLogo(details.logo ?? '')} />
          : title}</h2>
        {details?.tagline && <p className="console-tagline">{details.tagline}</p>}
        <div className="console-meta">
          <progress max={100} value={pct} aria-label="Viewing progress" />
          {detail && <span className="truncate">{detail}</span>}
        </div>
        <div className="console-actions">
          <PlaybackButton onClick={() => onResume(item)}>Resume</PlaybackButton>
          {openDetails && <Button variant="secondary" aria-busy={detailsLoading} disabled={detailsLoading} onClick={openDetails}>
            {detailsLoading ? <ActivityIndicator /> : <Info size={17} aria-hidden />}Details
          </Button>}
        </div>
      </div>
      {/* A static horizon under the art, drawn once; no blur, video layer or scroll listener. */}
      <svg className="console-horizon" aria-hidden="true" viewBox="0 0 1200 80" preserveAspectRatio="none">
        <defs><linearGradient id="console-edge"><stop stopColor="var(--console-wave)" stopOpacity="0" />
          <stop offset=".36" stopColor="var(--console-wave)" stopOpacity=".3" />
          <stop offset=".78" stopColor="var(--color-focus)" /><stop offset="1" stopColor="var(--console-wave)" /></linearGradient></defs>
        <path d="M0 46 Q760 126 1201 4 V81 H0Z" fill="var(--color-page)" />
        <g fill="none" stroke="url(#console-edge)">
          <path d="M0 46 Q760 126 1201 4" opacity=".13" strokeWidth="5" vectorEffect="non-scaling-stroke" />
          <path d="M0 46 Q760 126 1201 4" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        </g>
      </svg>
    </section>
  );
}
