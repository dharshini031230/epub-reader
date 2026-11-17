import { AlertTriangle, Loader2, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Book } from '../types/library';

interface DeleteBookModalProps {
  book: Book | null;
  onCancel: () => void;
  onConfirmPermanentDelete: (book: Book) => Promise<void>;
}

export function DeleteBookModal({
  book,
  onCancel,
  onConfirmPermanentDelete,
}: DeleteBookModalProps) {
  const [stage, setStage] = useState<1 | 2>(1);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setStage(1);
    setIsDeleting(false);
    setError(null);
  }, [book?.id]);

  useEffect(() => {
    if (!book) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [book, isDeleting, onCancel]);

  if (!book) return null;

  const authorText = book.authors.join(', ') || 'Unknown Author';

  const handlePermanentDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    setError(null);
    try {
      await onConfirmPermanentDelete(book);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to permanently delete book.'
      );
      setIsDeleting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-book-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting) onCancel();
      }}
    >
      <div className="w-full max-w-md rounded-lg bg-[#111116] border border-white/[0.12] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            {stage === 1 ? (
              <Trash2 className="w-4 h-4 text-[#D99B43]" aria-hidden="true" />
            ) : (
              <AlertTriangle
                className="w-4 h-4 text-red-400"
                aria-hidden="true"
              />
            )}
            <h2
              id="delete-book-modal-title"
              className="font-serif text-lg font-medium text-[#F2EDE4]"
            >
              {stage === 1 ? 'Delete Book' : 'Confirm Permanent Deletion'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            aria-label="Cancel deletion"
            className="p-1.5 rounded-md text-[#A69F93] hover:text-[#F2EDE4] hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div
              role="alert"
              className="p-3 rounded-md bg-red-950/50 border border-red-500/40 text-xs text-red-200"
            >
              {error}
            </div>
          )}

          {stage === 1 ? (
            <>
              <div className="p-3.5 rounded-md bg-[#18181F] border border-white/[0.08] space-y-1">
                <p className="font-serif text-base font-medium text-[#F2EDE4]">
                  {book.title}
                </p>
                <p className="text-xs text-[#A69F93]">by {authorText}</p>
              </div>
              <p className="text-sm text-[#A69F93] leading-relaxed">
                Deleting this book will remove it from your Folio library,
                including its placement in collections and series.
              </p>
            </>
          ) : (
            <>
              <div className="p-3.5 rounded-md bg-red-950/30 border border-red-500/30 space-y-1">
                <p className="font-serif text-base font-medium text-[#F2EDE4]">
                  {book.title}
                </p>
                <p className="text-xs text-[#A69F93]">by {authorText}</p>
              </div>
              <p className="text-sm text-red-200 leading-relaxed">
                Are you absolutely sure? This action will permanently delete
                this book and its locally stored EPUB file, customised cover,
                reading progress, bookmarks, highlights and annotations. This
                cannot be undone.
              </p>
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-white/[0.08] bg-[#0D0D11] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-2 rounded-md border border-white/[0.12] text-xs font-medium text-[#A69F93] hover:text-[#F2EDE4] hover:border-white/25 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          {stage === 1 ? (
            <button
              type="button"
              onClick={() => setStage(2)}
              className="px-4 py-2 rounded-md bg-[#D99B43] hover:bg-[#E8B15C] text-[#08080A] text-xs font-semibold transition-colors cursor-pointer"
            >
              Continue to Delete
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handlePermanentDelete()}
              disabled={isDeleting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Permanently Delete Book</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
