import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  /** The id of the dialog's heading (aria-labelledby). */
  labelledBy?: string;
  /** Utilities on the panel: its width (default max-w-md), alignment... */
  className?: string;
  /** Close on a click in the dimmed area around the panel (default: yes). */
  dismissOnBackdrop?: boolean;
  /** The arrow-key focus group (useTVFocus), e.g. "cw-remove-confirm". */
  focusGroup?: string;
  /** Default true. False for a big grid of choices: useTVFocus turns off up/down by rows
   *  while a [role="dialog"] is open, which such a grid needs (CategoryPinOverlay). */
  dialogRole?: boolean;
  children: ReactNode;
}

/**
 * A modal dialog (ui.css .ui-dialog): drawn on <body> over everything, the page dimmed behind,
 * Escape or a click outside closes it. Its look is the theme's (--ui-dialog-* tokens): every
 * modal uses this, so a theme restyles all of them at once.
 */
export default function Dialog({ open, onClose, labelledBy, className = 'max-w-md', dismissOnBackdrop = true, focusGroup, dialogRole = true, children }: DialogProps) {
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      e.preventDefault();
      close.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;
  return createPortal(
    <div className="ui-dialog-backdrop" onClick={dismissOnBackdrop ? onClose : undefined} data-focus-group={focusGroup}>
      <div
        role={dialogRole ? 'dialog' : undefined}
        aria-modal={dialogRole || undefined}
        aria-labelledby={labelledBy} className={`ui-dialog ${className}`} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.body,
  );
}
