import React from 'react';
import { isTvApp } from '@/utils/helpers';

const TV = isTvApp();

export type HomeSection = 'home' | 'movie' | 'series' | 'people';

const CHIPS: { id: Exclude<HomeSection, 'home'>; label: string }[] = [
  { id: 'movie', label: 'Movies' },
  { id: 'series', label: 'Series' },
  { id: 'people', label: 'Cast' },
];

/**
 * Home's sections, the same on phone, PC and TV: Movies · Series · People as compact chips
 * from the left and the page's Filters button on the right (`trailing`): the one row under
 * the header (owner: two rows at the top, everywhere). The chosen chip is filled; choosing it
 * again goes back to Home. On Home, the types Home is showing ([included]: Movies and Series,
 * or the one its Show setting keeps) are lightly filled (owner 2026-11-03), so choosing one
 * reads as narrowing Home down to it.
 */
const SectionChips: React.FC<{
  active: HomeSection;
  onSelect: (s: HomeSection) => void;
  trailing?: React.ReactNode;
  included?: readonly HomeSection[];
}> = ({ active, onSelect, trailing, included = ['movie', 'series'] }) => (
  <div className={`flex items-center ${TV ? 'gap-3' : 'gap-2'}`} data-focus-group="section-chips" data-tv-group="chips">
    {CHIPS.map((c) => (
      <button
        key={c.id}
        data-focusable="true"
        data-active={active === c.id ? 'true' : undefined}
        onClick={() => onSelect(active === c.id ? 'home' : c.id)}
        className={`${TV ? 'h-[38px] px-5 text-[15px]' : 'h-9 px-4 text-sm'} shrink-0 rounded-full font-bold transition-colors ${
          active === c.id
            ? 'bg-white text-[#05080F]'
            : active === 'home' && included.includes(c.id)
              ? 'border border-white/40 bg-white/15 text-white'
              : 'border border-white/25 text-gray-200'
        }`}
      >
        {c.label}
      </button>
    ))}
    {trailing && <div className="ml-auto">{trailing}</div>}
  </div>
);

export default SectionChips;
