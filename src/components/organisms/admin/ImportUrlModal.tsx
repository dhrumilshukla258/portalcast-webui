import React from 'react';
import { X } from 'lucide-react';
import Dialog from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';

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
  return (
    <Dialog open={isOpen} onClose={onClose} labelledBy="import-config-title" className="max-w-lg" dismissOnBackdrop={false}>
      <div className="mb-6 flex items-center justify-between">
        <h2 id="import-config-title" className="text-xl font-black text-white">
          Import Config Text
        </h2>
        <button onClick={onClose} className="text-gray-500 hover:text-white">
          <X size={20} />
        </button>
      </div>
      <textarea
        className="custom-scrollbar h-48 w-full rounded-xl border border-gray-800 bg-gray-950 p-4 font-mono text-xs text-gray-300 outline-hidden transition-all focus:border-focus focus:ring-1 focus:ring-focus"
        placeholder="Paste content with http://..., mac-..., username=..., password=..."
        value={importText}
        onChange={(e) => onChangeText(e.target.value)}
        autoFocus
      ></textarea>
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="accent" onClick={onApply}>
          Parse & Apply
        </Button>
      </div>
    </Dialog>
  );
};

export default ImportUrlModal;
