import React, { useEffect, useRef } from 'react';
import { URL_PATHS } from '@/api/config';
import type { DiscoverVariant } from '@/api/endpoints/discover';
import Dialog from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';

interface VariantPickerModalProps {
  isOpen: boolean;
  title: string;
  variants: DiscoverVariant[];
  onSelect: (variant: DiscoverVariant) => void;
  onClose: () => void;
}

const VariantPickerModal: React.FC<VariantPickerModalProps> = ({ isOpen, title, variants, onSelect, onClose }) => {
  const firstButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) firstButtonRef.current?.focus();
  }, [isOpen]);

  if (!isOpen) return null;

  const baseUrl = URL_PATHS.HOST === '/' ? '' : URL_PATHS.HOST;

  return (
    <Dialog open={isOpen} onClose={onClose} labelledBy="variant-modal-title" className="max-w-lg">
      <h3 id="variant-modal-title" className="mb-1 text-xl font-bold text-fg">
        {title}
      </h3>
      <p className="mb-5 text-sm text-fg-muted">This title is available in multiple versions — pick one:</p>

      <div className="grid max-h-136 grid-cols-3 gap-3 overflow-y-auto custom-scrollbar">
        {variants.map((variant, index) => {
          const imageUrl = variant.screenshot_uri
            ? variant.screenshot_uri.startsWith('http')
              ? variant.screenshot_uri
              : `${baseUrl}/api/images${variant.screenshot_uri}`
            : null;
          return (
            <button
              key={`${variant.id}-${index}`}
              ref={index === 0 ? firstButtonRef : undefined}
              onClick={() => onSelect(variant)}
              data-focusable="true"
              className="group flex flex-col items-center gap-2 rounded-xl border border-line bg-white/5 p-2 text-center transition-all hover:border-focus/60 hover:bg-interaction focus:outline-hidden focus-visible:ring-2 focus-visible:ring-focus"
            >
              <div className="flex aspect-2/3 w-full items-center justify-center overflow-hidden rounded-lg bg-black/30">
                {imageUrl ? (
                  <img src={imageUrl} alt={variant.variantLabel} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-white/20">{variant.variantLabel[0]?.toUpperCase()}</span>
                )}
              </div>
              <span className="text-xs font-bold text-fg-soft group-hover:text-fg sm:text-sm">
                {variant.variantLabel}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex justify-end">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </Dialog>
  );
};

export default VariantPickerModal;
