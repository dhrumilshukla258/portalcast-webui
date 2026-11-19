import type { ComponentProps } from 'react';
import { Play } from 'lucide-react';
import Button from './Button';

/** The caller owns playback. The label remains accessible even on compact poster actions. */
export default function PlaybackButton({ children, iconOnly, className = '', ...props }: ComponentProps<'button'> & { iconOnly?: boolean }) {
  return (
    <Button variant="primary" data-icon-only={iconOnly || undefined} className={`ui-play-button ${className}`} {...props}>
      <Play size={18} fill="currentColor" aria-hidden="true" />
      <span className={iconOnly ? 'sr-only' : undefined}>{children}</span>
    </Button>
  );
}
