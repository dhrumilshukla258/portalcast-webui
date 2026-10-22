import React from 'react';

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
 * again goes back to Home.
 */
const SectionChips: React.FC<{ active: HomeSection; onSelect: (s: HomeSection) => void; trailing?: React.ReactNode }> = ({
  active,
  onSelect,
  trailing,
}) => (
  <div className="flex items-center gap-2" data-focus-group="section-chips">
    {CHIPS.map((c) => (
      <button
        key={c.id}
        data-focusable="true"
        onClick={() => onSelect(active === c.id ? 'home' : c.id)}
        className={`h-9 shrink-0 rounded-full px-4 text-sm font-bold transition-colors ${
          active === c.id ? 'bg-white text-[#05080F]' : 'border border-white/25 text-gray-200'
        }`}
      >
        {c.label}
      </button>
    ))}
    {trailing && <div className="ml-auto">{trailing}</div>}
  </div>
);

export default SectionChips;
