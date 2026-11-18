import React from 'react';

type ChipProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  selected?: boolean;
  /** 'toggle': Home's section chips, outlined and lightly filled when on. */
  variant?: 'filter' | 'toggle';
};

/** A filter or section switch (ui.css .ui-chip), reachable with the arrow keys and remote. */
export default function Chip({ selected = false, variant = 'filter', className = '', ...rest }: ChipProps) {
  return (
    <button
      type="button"
      data-focusable="true"
      aria-pressed={selected}
      data-variant={variant === 'toggle' ? 'toggle' : undefined}
      className={`ui-chip ${className}`}
      {...rest}
    />
  );
}
