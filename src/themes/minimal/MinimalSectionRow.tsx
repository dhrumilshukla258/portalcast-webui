import { createPortal } from 'react-dom';
import type { SectionRowProps } from '@/components/molecules/SectionChips';
import { useHeaderSlot } from '@/themes/headerSlot';

/**
 * Minimal theme's row under the header (registry SectionRow): none. Movies, Shows and Cast are header
 * tabs, so is Cast, and the page's Filters button shows in the header, next to search.
 */
export default function MinimalSectionRow({ trailing }: SectionRowProps) {
  const slot = useHeaderSlot();
  return slot && trailing ? createPortal(trailing, slot) : null;
}
