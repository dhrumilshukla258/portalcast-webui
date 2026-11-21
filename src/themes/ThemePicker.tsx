import { useEffect, useRef } from 'react';
import { Check } from 'lucide-react';
import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import { THEMES, useTheme } from './theme';
import { useChooseTheme } from './accountTheme';

type Swatch = (typeof THEMES)[number]['swatch'];

/**
 * Profile menu > Theme: a card per theme in THEMES (theme.ts), each a small preview drawn from
 * its swatch. Picking one applies it at once and saves it to the account (accountTheme.ts), so the page behind shows it; Done, Escape or a
 * click outside closes. Used by every theme's header.
 */
export default function ThemePicker({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const current = useTheme();
  const choose = useChooseTheme();
  const selectedRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open)
      requestAnimationFrame(() =>
        selectedRef.current?.focus({ preventScroll: true })
      );
  }, [open]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      labelledBy="theme-picker-title"
      className="max-w-2xl text-left"
      focusGroup="theme-picker"
    >
      <h2 id="theme-picker-title" className="text-fg text-xl font-semibold">
        Theme
      </h2>
      <p className="text-fg-muted mt-1 text-sm">
        How PortalCast looks on this device.
      </p>

      <div
        role="radiogroup"
        aria-labelledby="theme-picker-title"
        className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3"
      >
        {THEMES.map((t) => {
          const on = t.id === current;
          return (
            <button
              key={t.id}
              ref={on ? selectedRef : undefined}
              type="button"
              role="radio"
              aria-checked={on}
              data-focusable="true"
              onClick={() => choose(t.id)}
              className={`focus-visible:ring-focus grid min-w-0 grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-x-3 rounded-xl p-2 text-left transition-colors hover:bg-white/5 focus:outline-hidden focus-visible:ring-2 sm:block ${on ? 'bg-white/5' : ''}`}
            >
              <span className="row-span-2"><ThemePreview swatch={t.swatch} selected={on} /></span>
              <span className="flex items-center justify-between gap-2 px-1 sm:mt-3">
                <span className="text-fg font-semibold">{t.label}</span>
                {on && (
                  <span className="bg-fg text-page flex h-5 w-5 items-center justify-center rounded-full">
                    <Check size={13} strokeWidth={3} />
                  </span>
                )}
              </span>
              <span className="text-fg-muted mt-0.5 block px-1 text-xs">
                {t.description}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex justify-end">
        <Button variant="primary" onClick={onClose}>
          Done
        </Button>
      </div>
    </Dialog>
  );
}

/** A tiny Home in the theme's colours: header, hero with its button, a row of posters. */
function ThemePreview({
  swatch,
  selected,
}: {
  swatch: Swatch;
  selected: boolean;
}) {
  return (
    <span
      aria-hidden
      className={`block aspect-16/10 overflow-hidden rounded-lg ${selected ? 'ring-focus ring-2' : 'ring-1 ring-white/10'}`}
      style={{ background: swatch.page }}
    >
      <span
        className="flex h-[14%] items-center px-[6%]"
        style={{ background: swatch.panel }}
      >
        <span
          className="h-1 w-[18%] rounded-full opacity-80"
          style={{ background: swatch.fg }}
        />
        <span
          className="ml-auto h-1.5 w-[12%] rounded-full"
          style={{ background: swatch.accent }}
        />
      </span>
      <span
        className="mx-[6%] mt-[5%] flex h-[30%] items-end rounded-md p-[3%]"
        style={{ background: swatch.panel }}
      >
        <span
          className="h-1.5 w-[22%] rounded-full"
          style={{ background: swatch.accent }}
        />
      </span>
      <span className="mx-[6%] mt-[5%] flex gap-[3%]">
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className="aspect-2/3 flex-1 rounded-[3px]"
            style={{ background: swatch.panel }}
          />
        ))}
      </span>
    </span>
  );
}
