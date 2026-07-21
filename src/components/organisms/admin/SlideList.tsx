import React from 'react';
import { Trash2, Edit2, ArrowUp, ArrowDown } from 'lucide-react';
import type { CarouselSlide } from '@/api/endpoints/carousel';

interface SlideListProps {
  slides: CarouselSlide[];
  onMove: (index: number, direction: 'up' | 'down') => void;
  onEdit: (slide: CarouselSlide, index: number) => void;
  onDelete: (index: number) => void;
}

const SlideList: React.FC<SlideListProps> = ({ slides, onMove, onEdit, onDelete }) => {
  if (slides.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-gray-800 py-12 text-center text-gray-500 italic">
        No slides configured. Add a slide to see it in VOD main pages.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {slides.map((slide, index) => (
        <div key={index} className="flex flex-col md:flex-row items-center gap-4 rounded-3xl border border-gray-800 bg-gray-900/10 p-4">
          <img
            src={slide.imageUrl || slide.tabletImageUrl || slide.mobileImageUrl}
            alt={slide.title || 'Banner image'}
            className="h-20 w-36 rounded-xl object-cover border border-gray-800"
          />
          <div className="flex-1 text-left">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-gray-800 px-2 py-0.5 text-[10px] font-black text-gray-400">Order: {slide.order}</span>
              {slide.imageUrl && (
                <span className="rounded bg-blue-950/40 border border-blue-900/50 px-2 py-0.5 text-[10px] font-semibold text-blue-400">
                  Desktop
                </span>
              )}
              {slide.tabletImageUrl && (
                <span className="rounded bg-indigo-950/40 border border-indigo-900/50 px-2 py-0.5 text-[10px] font-semibold text-indigo-400">
                  Tablet
                </span>
              )}
              {slide.mobileImageUrl && (
                <span className="rounded bg-purple-950/40 border border-purple-900/50 px-2 py-0.5 text-[10px] font-semibold text-purple-400">
                  Mobile
                </span>
              )}
              {slide.actionType !== 'none' && (
                <span className="rounded bg-gray-800 border border-gray-700 px-2 py-0.5 text-[10px] font-black text-gray-300 uppercase">
                  {slide.actionType === 'play' ? 'Play' : 'Details'}: {slide.mediaType} ({slide.mediaId})
                </span>
              )}
            </div>
            <h4 className="mt-1 font-bold text-white">{slide.title || 'Untitled Banner'}</h4>
            <p className="text-xs text-gray-500 line-clamp-1">{slide.description || 'No description'}</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onMove(index, 'up')}
              disabled={index === 0}
              className="rounded-lg bg-gray-800 p-2 text-gray-400 transition-colors hover:bg-gray-700 disabled:opacity-30"
              data-focusable="true"
              title="Move Up"
            >
              <ArrowUp size={14} />
            </button>
            <button
              type="button"
              onClick={() => onMove(index, 'down')}
              disabled={index === slides.length - 1}
              className="rounded-lg bg-gray-800 p-2 text-gray-400 transition-colors hover:bg-gray-700 disabled:opacity-30"
              data-focusable="true"
              title="Move Down"
            >
              <ArrowDown size={14} />
            </button>
            <button
              type="button"
              onClick={() => onEdit(slide, index)}
              className="rounded-lg bg-blue-900/20 border border-blue-900/40 p-2 text-blue-400 transition-colors hover:bg-blue-900/40"
              data-focusable="true"
              title="Edit"
            >
              <Edit2 size={14} />
            </button>
            <button
              type="button"
              onClick={() => onDelete(index)}
              className="rounded-lg bg-red-900/20 border border-red-900/40 p-2 text-red-500 transition-colors hover:bg-red-900/40"
              data-focusable="true"
              title="Delete"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SlideList;
