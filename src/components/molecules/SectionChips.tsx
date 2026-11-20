import React from 'react';
import { isTvApp } from '@/utils/helpers';
import Chip from '@/components/ui/Chip';

const TV = isTvApp();

export type HomeSection = 'home' | 'movie' | 'series' | 'people';

const CHIPS: { id: Exclude<HomeSection, 'home'>; label: string }[] = [
  { id: 'movie', label: 'Movies' },
  { id: 'series', label: 'Series' },
  { id: 'people', label: 'Cast' },
];

/**
 * Where a chip leads from [active] (owner 2026-11-13; the same in the Android TV app,
 * HomeScreen.kt nextSection). Movies and Series are two switches over Home, which shows both:
 * from Home one of them narrows to it, the other one then brings both back (Home), and the only
 * one on, chosen again, does too. Cast opens Cast; again, Home.
 */
export function nextSection(active: HomeSection, chip: Exclude<HomeSection, 'home'>): HomeSection {
  if (chip === 'people') return active === 'people' ? 'home' : 'people';
  if (active === 'movie' || active === 'series') return 'home';
  return chip;
}

/** Whether a chip shows as on: Movies and Series both on Home, else the section open. */
export function sectionOn(active: HomeSection, chip: Exclude<HomeSection, 'home'>): boolean {
  return active === chip || (active === 'home' && chip !== 'people');
}

/**
 * Home's sections, the same on phone, PC and TV: Movies · Series · People as compact chips
 * from the left and the page's Filters button on the right (`trailing`): the one row under
 * the header (owner: two rows at the top, everywhere). A chip that is on ([sectionOn]) is
 * lightly filled, the look Home starts with (owner 2026-11-13: not white, not blue).
 */
/** Home's row under the header: Classic's chips, or a theme's own (registry SectionRow). */
export interface SectionRowProps {
  active: HomeSection;
  onSelect: (s: HomeSection) => void;
  /** The page's Filters button. */
  trailing?: React.ReactNode;
}

const SectionChips: React.FC<SectionRowProps> = ({ active, onSelect, trailing }) => (
  <div className={`flex items-center ${TV ? 'gap-3' : 'gap-2'}`} data-focus-group="section-chips" data-tv-group="chips">
    {CHIPS.map((c) => {
      const on = sectionOn(active, c.id);
      return (
        <Chip
          key={c.id}
          variant="toggle"
          selected={on}
          data-active={active === c.id ? 'true' : undefined}
          onClick={() => onSelect(nextSection(active, c.id))}
          className={TV ? 'h-[38px] px-5 text-[15px]' : ''}
        >
          {c.label}
        </Chip>
      );
    })}
    {trailing && <div className="ml-auto">{trailing}</div>}
  </div>
);

export default SectionChips;
