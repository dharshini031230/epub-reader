import { AlertTriangle, Loader2, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface EntityDeleteModalProps {
  isOpen: boolean;
  entityType: 'collection' | 'series' | 'tag';
  entityName: string;
  bookCount: number;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}

export function EntityDeleteModal({
  isOpen,
  entityType,
  entityName,
  bookCount,
  onCancel,
  onConfirm,
}: EntityDeleteModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setIsDeleting(false);
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) onCancel();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, isDeleting, onCancel]);

  if (!isOpen) return null;

  const titleLabel =
    entityType === 'collection'
      ? 'Delete Collection'
      : entityType === 'series'
        ? 'Delete Series'
        : 'Delete Tag';

  const handleConfirm = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await onConfirm();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="entity-delete-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting) onCancel();
      }}
    >
      <div className="w-full max-w-md rounded-lg bg-[#111116] border border-white/[0.12] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-[#D99B43]" aria-hidden="true" />
            <h2
              id="entity-delete-title"
              className="font-serif text-lg font-medium text-[#F2EDE4]"
            >
              {titleLabel}
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            aria-label="Close confirmation"
            className="p-1.5 rounded-md text-[#A69F93] hover:text-[#F2EDE4] hover:bg-white/[0.06] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-3">
          <p className="text-sm text-[#F2EDE4]">
            Are you sure you want to delete the {entityType}{' '}
            <span className="font-serif font-medium text-[#E8B15C]">
              &ldquo;{entityName}&rdquo;
            </span>
            ?
          </p>
          <p className="text-xs text-[#A69F93] leading-relaxed">
            {bookCount > 0
              ? `All ${bookCount} associated ${bookCount === 1 ? 'book' : 'books'} and their locally stored EPUB files will remain safely in your library.`
              : `This ${entityType} currently has no books. Your library volumes will remain untouched.`}
          </p>
        </div>

        <div className="px-6 py-4 border-t border-white/[0.08] bg-[#0D0D11] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-2 rounded-md border border-white/[0.12] text-xs font-medium text-[#A69F93] hover:text-[#F2EDE4] cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={isDeleting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-red-600 hover:bg-red-500 text-white text-xs font-semibold cursor-pointer"
          >
            {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Delete {entityType === 'collection' ? 'Collection' : entityType === 'series' ? 'Series' : 'Tag'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
