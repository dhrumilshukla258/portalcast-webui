import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { X, Upload, RotateCcw, Check } from 'lucide-react';
import { api } from '@/api/client';

type Kind = 'poster' | 'backdrop' | 'logo';
interface Choice { path: string; width: number; height: number; language: string | null; preview: string }
interface ImagesResponse {
  id: string;
  current: Record<Kind, string | null>;
  custom: Record<Kind, boolean>;
  choices: { posters: Choice[]; backdrops: Choice[]; logos: Choice[] };
}

const errorText = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { error?: string } } })?.response?.data?.error || fallback;

const TABS: { kind: Kind; label: string; list: keyof ImagesResponse['choices']; aspect: string }[] = [
  { kind: 'poster', label: 'Poster', list: 'posters', aspect: 'aspect-[2/3]' },
  { kind: 'backdrop', label: 'Backdrop', list: 'backdrops', aspect: 'aspect-video' },
  { kind: 'logo', label: 'Logo', list: 'logos', aspect: 'aspect-[3/1]' },
];

/**
 * Admin "Edit images" (server content/customArt.ts): pick a TMDB alternative or upload your
 * own poster, backdrop or logo. The choice applies to every version of the title and is kept
 * when TMDB data refreshes; "Automatic" brings TMDB's (or the folder's) image back.
 */
const EditImagesDialog: React.FC<{ contentId: string; title: string; onClose: () => void; onChanged?: () => void }> = ({ contentId, title, onClose, onChanged }) => {
  const [data, setData] = useState<ImagesResponse | null>(null);
  const [tab, setTab] = useState<Kind>('poster');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      setData((await api.get<ImagesResponse>(`/admin/titles/${encodeURIComponent(contentId)}/images`)).data ?? null);
    } catch (err) {
      toast.error(errorText(err, 'Could not load images'));
    }
  }, [contentId]);
  useEffect(() => {
    void load();
  }, [load]);

  const done = async (msg: string) => {
    toast.success(msg);
    onChanged?.();
    await load();
  };

  const choose = async (c: Choice) => {
    setBusy(true);
    try {
      await api.post(`/admin/titles/${encodeURIComponent(contentId)}/images`, { kind: tab, tmdbPath: c.path });
      await done(`${TABS.find((t) => t.kind === tab)!.label} saved`);
    } catch (err) {
      toast.error(errorText(err, 'Could not save the image'));
    } finally {
      setBusy(false);
    }
  };

  const upload = async (file: File) => {
    setBusy(true);
    try {
      const form = new FormData();
      form.append('kind', tab);
      form.append('file', file);
      await api.post(`/admin/titles/${encodeURIComponent(contentId)}/images/upload`, form);
      await done('Image uploaded');
    } catch (err) {
      toast.error(errorText(err, 'Could not upload the image'));
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    setBusy(true);
    try {
      await api.delete(`/admin/titles/${encodeURIComponent(contentId)}/images/${tab}`);
      await done('Back to the automatic image');
    } catch (err) {
      toast.error(errorText(err, 'Could not reset the image'));
    } finally {
      setBusy(false);
    }
  };

  const active = TABS.find((t) => t.kind === tab)!;
  const choices = data?.choices[active.list] ?? [];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4" role="dialog" aria-modal="true">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-gray-800 bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-800 px-5 py-3">
          <h2 className="truncate text-lg font-black text-white">Edit images · {title}</h2>
          <button type="button" onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-800" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-800 px-5 py-3">
          {TABS.map((t) => (
            <button
              key={t.kind}
              type="button"
              onClick={() => setTab(t.kind)}
              className={`rounded-lg px-3 py-1.5 text-sm font-bold ${tab === t.kind ? 'bg-blue-600 text-white' : 'border border-gray-700 text-gray-300 hover:bg-gray-800'}`}
            >
              {t.label}
              {data?.custom[t.kind] && <span className="ml-1.5 text-[10px] text-blue-200">custom</span>}
            </button>
          ))}
          <div className="ml-auto flex gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/avif,image/gif"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void upload(f);
                e.target.value = '';
              }}
            />
            <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 rounded-lg border border-gray-700 px-3 py-1.5 text-xs font-bold text-gray-200 hover:bg-gray-800 disabled:opacity-50">
              <Upload size={14} /> Upload
            </button>
            {data?.custom[tab] && (
              <button type="button" disabled={busy} onClick={() => void reset()} className="flex items-center gap-1.5 rounded-lg border border-gray-700 px-3 py-1.5 text-xs font-bold text-gray-200 hover:bg-gray-800 disabled:opacity-50">
                <RotateCcw size={14} /> Automatic
              </button>
            )}
          </div>
        </div>
        <div className="overflow-y-auto p-5">
          {data?.current[tab] && (
            <div className="mb-4">
              <div className="mb-1 text-xs font-semibold text-gray-500">Now</div>
              <img src={data.current[tab]!} alt="" className={`${tab === 'poster' ? 'h-40' : 'h-24'} rounded-lg bg-black/40 object-contain`} />
            </div>
          )}
          {!data && <p className="text-sm text-gray-500">Loading…</p>}
          {data && choices.length === 0 && <p className="text-sm text-gray-500">TMDB has no alternatives for this title. Upload one instead.</p>}
          <div className={`grid gap-3 ${tab === 'poster' ? 'grid-cols-3 sm:grid-cols-5 md:grid-cols-6' : 'grid-cols-2 sm:grid-cols-3'}`}>
            {choices.map((c) => (
              <button
                key={c.path}
                type="button"
                disabled={busy}
                onClick={() => void choose(c)}
                className={`group relative overflow-hidden rounded-lg border border-gray-800 bg-black/40 hover:border-blue-500 disabled:opacity-50 ${active.aspect}`}
                title={`${c.width}×${c.height}${c.language ? ` · ${c.language}` : ''}`}
              >
                <img src={c.preview} alt="" loading="lazy" className={`h-full w-full ${tab === 'logo' ? 'object-contain p-2' : 'object-cover'}`} />
                <span className="absolute bottom-1 right-1 hidden rounded bg-blue-600 p-0.5 text-white group-hover:block">
                  <Check size={12} />
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditImagesDialog;
