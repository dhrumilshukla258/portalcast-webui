import React from 'react';
import { Upload, RefreshCw } from 'lucide-react';
import type { ImageVariant } from '@/hooks/useCarouselForm';

interface SlideEditorProps {
  editingIndex: number | null;
  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  imageUrl: string;
  setImageUrl: (v: string) => void;
  tabletImageUrl: string;
  setTabletImageUrl: (v: string) => void;
  mobileImageUrl: string;
  setMobileImageUrl: (v: string) => void;
  desktopFile: File | null;
  tabletFile: File | null;
  mobileFile: File | null;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>, target: ImageVariant) => void;
  onClearFile: (target: ImageVariant) => void;
  actionType: 'none' | 'play' | 'details';
  setActionType: (v: 'none' | 'play' | 'details') => void;
  mediaType: 'movie' | 'series' | 'tv';
  setMediaType: (v: 'movie' | 'series' | 'tv') => void;
  mediaId: string;
  setMediaId: (v: string) => void;
  order: number;
  setOrder: (v: number) => void;
  uploading: boolean;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

// The add/edit slide form — one form for both flows, distinguished by
// `editingIndex`. Each of the three image variants (desktop/tablet/mobile)
// repeats the same URL-input-or-file-picker-with-clear pattern.
const SlideEditor: React.FC<SlideEditorProps> = ({
  editingIndex,
  title,
  setTitle,
  description,
  setDescription,
  imageUrl,
  setImageUrl,
  tabletImageUrl,
  setTabletImageUrl,
  mobileImageUrl,
  setMobileImageUrl,
  desktopFile,
  tabletFile,
  mobileFile,
  onFileSelect,
  onClearFile,
  actionType,
  setActionType,
  mediaType,
  setMediaType,
  mediaId,
  setMediaId,
  order,
  setOrder,
  uploading,
  onCancel,
  onSubmit,
}) => {
  return (
    <form onSubmit={onSubmit} className="rounded-3xl border border-gray-800 bg-gray-900/30 p-6 space-y-4 text-left">
      <h3 className="text-lg font-black text-white">{editingIndex !== null ? 'Edit Slide' : 'Add New Slide'}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-500">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
            placeholder="Slide Title"
          />
        </div>
        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4 border border-gray-800 bg-gray-950/20 rounded-2xl p-4 mt-2">
          <div className="md:col-span-3 flex justify-between items-center">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Image Variations</span>
              <p className="text-[11px] text-gray-500 mt-0.5">Specify a URL or choose a file for at least one variation. The others will fall back dynamically.</p>
            </div>
          </div>

          {/* Desktop/TV Variant */}
          <div className="space-y-1">
            <div className="flex justify-between items-baseline">
              <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-500">Desktop / TV Image</label>
              <span className="text-[9px] font-black text-blue-500 uppercase tracking-wider">16:9 Aspect</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full rounded-xl border border-gray-800 bg-gray-950 px-3 py-2.5 text-xs text-white outline-none focus:border-blue-500"
                placeholder="https://... or upload"
              />
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => onFileSelect(e, 'desktop')}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={uploading}
                />
                <button
                  type="button"
                  className="h-full rounded-xl bg-gray-800 px-3 py-2.5 text-xs font-bold text-gray-300 transition-colors hover:bg-gray-700 flex items-center gap-1 whitespace-nowrap"
                  disabled={uploading}
                >
                  <Upload size={12} />
                </button>
              </div>
            </div>
            {desktopFile && (
              <div className="flex items-center justify-between bg-blue-950/30 border border-blue-900/30 rounded-lg px-2 py-1 mt-1 text-[10px] text-blue-300">
                <span className="truncate max-w-[120px] font-medium">{desktopFile.name}</span>
                <button
                  type="button"
                  onClick={() => onClearFile('desktop')}
                  className="text-red-400 hover:text-red-300 font-bold ml-1 text-xs"
                >
                  Clear
                </button>
              </div>
            )}
            <p className="ml-1 text-[9px] text-gray-500 italic">Recommended: 1920x1080 resolution.</p>
          </div>

          {/* Tablet Variant */}
          <div className="space-y-1">
            <div className="flex justify-between items-baseline">
              <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-500">Tablet Image</label>
              <span className="text-[9px] font-black text-indigo-400 uppercase tracking-wider">4:3 Aspect</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={tabletImageUrl}
                onChange={(e) => setTabletImageUrl(e.target.value)}
                className="w-full rounded-xl border border-gray-800 bg-gray-950 px-3 py-2.5 text-xs text-white outline-none focus:border-blue-500"
                placeholder="https://... or upload"
              />
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => onFileSelect(e, 'tablet')}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={uploading}
                />
                <button
                  type="button"
                  className="h-full rounded-xl bg-gray-800 px-3 py-2.5 text-xs font-bold text-gray-300 transition-colors hover:bg-gray-700 flex items-center gap-1 whitespace-nowrap"
                  disabled={uploading}
                >
                  <Upload size={12} />
                </button>
              </div>
            </div>
            {tabletFile && (
              <div className="flex items-center justify-between bg-indigo-950/30 border border-indigo-900/30 rounded-lg px-2 py-1 mt-1 text-[10px] text-indigo-300">
                <span className="truncate max-w-[120px] font-medium">{tabletFile.name}</span>
                <button
                  type="button"
                  onClick={() => onClearFile('tablet')}
                  className="text-red-400 hover:text-red-300 font-bold ml-1 text-xs"
                >
                  Clear
                </button>
              </div>
            )}
            <p className="ml-1 text-[9px] text-gray-500 italic">Recommended: 1024x768 resolution.</p>
          </div>

          {/* Mobile Variant */}
          <div className="space-y-1">
            <div className="flex justify-between items-baseline">
              <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-500">Mobile Image</label>
              <span className="text-[9px] font-black text-purple-400 uppercase tracking-wider">16:9 / 4:3</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={mobileImageUrl}
                onChange={(e) => setMobileImageUrl(e.target.value)}
                className="w-full rounded-xl border border-gray-800 bg-gray-950 px-3 py-2.5 text-xs text-white outline-none focus:border-blue-500"
                placeholder="https://... or upload"
              />
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => onFileSelect(e, 'mobile')}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={uploading}
                />
                <button
                  type="button"
                  className="h-full rounded-xl bg-gray-800 px-3 py-2.5 text-xs font-bold text-gray-300 transition-colors hover:bg-gray-700 flex items-center gap-1 whitespace-nowrap"
                  disabled={uploading}
                >
                  <Upload size={12} />
                </button>
              </div>
            </div>
            {mobileFile && (
              <div className="flex items-center justify-between bg-purple-950/30 border border-purple-900/30 rounded-lg px-2 py-1 mt-1 text-[10px] text-purple-300">
                <span className="truncate max-w-[120px] font-medium">{mobileFile.name}</span>
                <button
                  type="button"
                  onClick={() => onClearFile('mobile')}
                  className="text-red-400 hover:text-red-300 font-bold ml-1 text-xs"
                >
                  Clear
                </button>
              </div>
            )}
            <p className="ml-1 text-[9px] text-gray-500 italic">Recommended: 640x360 or 640x480.</p>
          </div>
        </div>
        <div className="md:col-span-2">
          <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-500">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
            placeholder="Brief slide description..."
          />
        </div>
        <div>
          <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-500">Action Type</label>
          <select
            value={actionType}
            onChange={(e) => setActionType(e.target.value as 'none' | 'play' | 'details')}
            className="mt-1 w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
          >
            <option value="none">No Action</option>
            <option value="play">Play Directly</option>
            <option value="details">Open Details Modal</option>
          </select>
        </div>
        {actionType !== 'none' && (
          <>
            <div>
              <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-500">Media Type</label>
              <select
                value={mediaType}
                onChange={(e) => setMediaType(e.target.value as 'movie' | 'series' | 'tv')}
                className="mt-1 w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
              >
                <option value="movie">Movie</option>
                <option value="series">Series</option>
                <option value="tv">TV Channel</option>
              </select>
            </div>
            <div>
              <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-500">Media ID</label>
              <input
                type="text"
                value={mediaId}
                onChange={(e) => setMediaId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
                placeholder="Enter database ID or name"
              />
            </div>
          </>
        )}
        <div>
          <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-500">Sort Order</label>
          <input
            type="number"
            value={order}
            onChange={(e) => setOrder(Number(e.target.value))}
            className="mt-1 w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
          />
        </div>
      </div>
      <div className="flex gap-3 justify-end pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-xs font-bold text-gray-300 transition-colors hover:bg-gray-700"
          data-focusable="true"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={uploading}
          className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg transition-colors hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          data-focusable="true"
        >
          {uploading ? (
            <>
              <RefreshCw size={14} className="animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <span>Save Slide</span>
          )}
        </button>
      </div>
    </form>
  );
};

export default SlideEditor;
