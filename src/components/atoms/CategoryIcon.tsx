import { Baby, Clapperboard, Compass, Crown, Globe, History, LayoutGrid, MonitorPlay, Music, Newspaper, Radio, Sparkles, Star, Ticket, Trophy, type LucideIcon } from 'lucide-react';
import { categoryKind, type CategoryKind } from '@/utils/channelRow';

const ICONS: Record<CategoryKind, LucideIcon> = {
  recent: History,
  favorites: Star,
  all: LayoutGrid,
  news: Newspaper,
  sports: Trophy,
  kids: Baby,
  movies: Clapperboard,
  music: Music,
  religious: Sparkles,
  docs: Compass,
  premium: Crown,
  uhd: MonitorPlay,
  events: Ticket,
  radio: Radio,
  region: Globe,
};

/** A Live TV category's icon, from its name (utils/channelRow categoryKind). */
export default function CategoryIcon({ title, className = 'h-4 w-4' }: { title: string; className?: string }) {
  const Icon = ICONS[categoryKind(title)];
  return <Icon className={className} strokeWidth={1.75} aria-hidden />;
}
