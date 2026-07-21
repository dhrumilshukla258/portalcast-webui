import React from 'react';
import { X } from 'lucide-react';

interface ImportUrlModalProps {
  isOpen: boolean;
  importText: string;
  onChangeText: (value: string) => void;
  onClose: () => void;
  onApply: () => void;
}

const ImportUrlModal: React.FC<ImportUrlModalProps> = ({
  isOpen,
  importText,
  onChangeText,
  onClose,
  onApply,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="animate-in zoom-in-95 w-full max-w-lg rounded-3xl border border-gray-800 bg-[#0f111a] p-6 shadow-2xl duration-200">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-black text-white">
            Import Config Text
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            <X size={20} />
          </button>
        </div>
        <textarea
          className="custom-scrollbar h-48 w-full rounded-xl border border-gray-800 bg-gray-950 p-4 font-mono text-xs text-gray-300 outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          placeholder="Paste content with http://..., mac-..., username=..., password=..."
          value={importText}
          onChange={(e) => onChangeText(e.target.value)}
          autoFocus
        ></textarea>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-bold text-gray-400 transition-colors hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onApply}
            className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-black text-white shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-0.5 hover:bg-blue-500"
          >
            Parse & Apply
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportUrlModal;
