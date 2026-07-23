import React, { useEffect, useRef } from 'react';
import { URL_PATHS } from '@/api/config';
import type { DiscoverVariant } from '@/api/endpoints/discover';

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
    <div
      className="animate-fade-in fixed inset-0 z-100 flex items-center justify-center bg-black/90"
      onClick={onClose}
    >
      <div
        className="animate-scale-in w-full max-w-lg scale-100 rounded-2xl border border-white/10 bg-black/85 p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="variant-modal-title"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
      >
        <h3 id="variant-modal-title" className="mb-1 text-xl font-bold text-white">
          {title}
        </h3>
        <p className="mb-5 text-sm text-gray-400">This title is available in multiple versions — pick one:</p>

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
                className="group flex flex-col items-center gap-2 rounded-xl border border-gray-700/50 bg-gray-800/40 p-2 text-center transition-all hover:border-blue-500/60 hover:bg-gray-800/70 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <div className="flex aspect-2/3 w-full items-center justify-center overflow-hidden rounded-lg bg-black/30">
                  {imageUrl ? (
                    <img src={imageUrl} alt={variant.variantLabel} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-2xl font-bold text-white/20">{variant.variantLabel[0]?.toUpperCase()}</span>
                  )}
                </div>
                <span className="text-xs font-bold text-gray-200 group-hover:text-white sm:text-sm">
                  {variant.variantLabel}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            data-focusable="true"
            className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-400 transition-colors hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white focus:outline-hidden focus:ring-2 focus:ring-gray-500"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default VariantPickerModal;
