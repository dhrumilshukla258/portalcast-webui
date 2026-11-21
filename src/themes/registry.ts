// The parts a theme draws its own way, by name. A theme lists only what it replaces; every
// other part, and every part on the TV apps, is Classic's. See src/themes/README.md.
import type React from 'react';
import type { HeaderProps } from '@/components/organisms/layout/Header';
import type { ContinueHeroProps } from '@/components/organisms/browse/ContinueHero';
import type { MediaCardProps } from '@/components/molecules/MediaCard';
import type { ContinueCardProps } from '@/components/organisms/browse/continueCard';
import type { SportsScheduleProps } from '@/components/organisms/sports/SportsView';
import type { SectionRowProps } from '@/components/molecules/SectionChips';
import { isTvApp } from '@/utils/helpers';
import { useTheme, type ThemeId } from './theme';
import MinimalHeader from './minimal/MinimalHeader';
import MinimalHero from './minimal/MinimalHero';
import MinimalCard, { ConsoleCard } from './minimal/MinimalCard';
import MinimalContinueCard, { ConsoleContinueCard } from './minimal/MinimalContinueCard';
import MinimalSportsSchedule from './minimal/MinimalSportsSchedule';
import MinimalSectionRow from './minimal/MinimalSectionRow';
import ConsoleHero from './console/ConsoleHero';

export interface ThemeParts {
  Header?: React.FC<HeaderProps>;
  Hero?: React.FC<ContinueHeroProps>;
  Card?: React.FC<MediaCardProps>;
  ContinueCard?: React.FC<ContinueCardProps>;
  SportsSchedule?: React.FC<SportsScheduleProps>;
  SectionRow?: React.FC<SectionRowProps>;
}

const TV = isTvApp();

const PARTS: Record<ThemeId, ThemeParts> = {
  classic: {},
  minimal: { Header: MinimalHeader, Hero: MinimalHero, Card: MinimalCard, ContinueCard: MinimalContinueCard, SportsSchedule: MinimalSportsSchedule, SectionRow: MinimalSectionRow },
  console: { Header: MinimalHeader, Hero: ConsoleHero, Card: ConsoleCard, ContinueCard: ConsoleContinueCard, SportsSchedule: MinimalSportsSchedule, SectionRow: MinimalSectionRow },
};

/** The current theme's own version of a part, or `classic` when it has none. */
export function usePart<K extends keyof ThemeParts>(name: K, classic: NonNullable<ThemeParts[K]>): NonNullable<ThemeParts[K]> {
  const theme = useTheme();
  return (!TV && PARTS[theme][name]) || classic;
}
