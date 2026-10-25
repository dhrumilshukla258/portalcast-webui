/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { URL_PATHS } from '@/api/config';
import { downsize } from '@/utils/imageSize';
import { ratingLabel, timeLeft } from '@/utils/titleFormat';
import type { MediaItem } from '@/types';

const urlOf = (path: string | undefined | null): string | null => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const base = URL_PATHS.HOST === '/' ? '' : URL_PATHS.HOST;
  return path.startsWith('/api/') ? `${base}${path}` : `${base}/api/images${path}`;
};

const clean = (s: unknown) => {
  const t = typeof s === 'string' ? s.trim() : '';
  return t && t !== '-' && t !== 'No description available' ? t : '';
};

/**
 * The TV apps' hero (design-system.md, Hero): the title the remote is on, on its backdrop at the
 * right faded into the page from the left and the bottom; its name, a meta line, the overview
 * (3 lines, 560 wide), and for something in progress a bar with the time left.
 */
const TvHero: React.FC<{ item: MediaItem | null; children?: React.ReactNode }> = ({ item, children }) => {
  const it = item as any;
  const art = urlOf(it?.cw_backdrop || it?.backdrop_hd_path || it?.backdrop_path || it?.screenshot_uri);
  const [failed, setFailed] = React.useState<string | null>(null);
  const title: string = it ? clean(it.cw_show_title) || clean(it.title) || clean(it.name) : '';
  const year = clean(String(it?.year ?? '')).slice(0, 4);
  const rating = ratingLabel(it?.rating_best);
  const genres = clean(it?.genres_str).split(/\s*[,/|]\s*/).filter(Boolean).slice(0, 3).join(', ');
  const minutes = Number(it?.runtime) || 0;
  const meta = [
    year,
    rating ? `★ ${rating}${it?.rating_source ? ` ${it.rating_source}` : ''}` : '',
    genres,
    minutes > 0 ? (minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`) : '',
  ].filter(Boolean);
  const overview = clean(it?.description) || clean(it?.plot);
  const pct = Math.min(100, Math.max(0, Number(it?.progressPercent) || 0));
  const left = it?.duration && pct ? timeLeft((Number(it.duration) * (100 - pct)) / 100) : undefined;

  return (
    <div className="relative h-full overflow-hidden">
      {art && failed !== art && (
        <div key={art} className="tv-fade-in absolute inset-y-0 right-0 w-[72%]">
          <img src={downsize(art, 'w1280')} alt="" className="h-full w-full object-cover" onError={() => setFailed(art)} />
          {/* Faded into the page: from the left (to 60 % of the picture) and from the bottom. */}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, #05080F 0%, rgba(5,8,15,0.75) 30%, rgba(5,8,15,0) 60%)' }} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(0deg, #05080F 0%, rgba(5,8,15,0) 45%)' }} />
        </div>
      )}
      <div className="relative z-10 flex h-full flex-col px-12">
        {children}
        {item && (
          <div key={title} className="tv-fade-in mt-auto mb-5 w-[560px] text-left">
            <h1 className="line-clamp-2 text-[40px] font-bold leading-[1.1] text-white">{title}</h1>
            {it?.cw_episode && <p className="mt-2 truncate text-[15px] font-medium text-slate-200">{it.cw_episode}</p>}
            {meta.length > 0 && (
              <p className="mt-2 truncate text-[14px] font-medium text-slate-300">
                {meta.map((m, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <span className="mx-2 text-slate-500">·</span>}
                    {m.startsWith('★') ? <><span className="text-amber-400">★</span>{m.slice(1)}</> : m}
                  </React.Fragment>
                ))}
              </p>
            )}
            {overview && <p className="mt-2 line-clamp-3 text-[14px] leading-[1.5] text-slate-300">{overview}</p>}
            {pct > 0 && pct < 100 && (
              <div className="mt-3 flex items-center gap-3">
                <div className="h-1 w-[240px] overflow-hidden rounded-full bg-white/20">
                  <div className="h-full bg-sky-400" style={{ width: `${pct}%` }} />
                </div>
                {left && <span className="text-[13px] text-slate-300">{left}</span>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TvHero;
