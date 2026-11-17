import { Palette, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { bookStorageService } from '../services/bookStorageService';
import { createDefaultCoverSpec } from '../services/coverArtGenerator';
import { getReadingStatusLabel } from '../services/libraryDomainService';
import type {
  Book,
  CoverDesignRecord,
  CoverDesignSpec,
  CoverPresetRecord,
} from '../types/library';
import { CoverDesigner, type CoverSavePayload } from './CoverDesigner';

interface BookTarget {
  kind: 'book';
  book: Book;
  existingDesign?: CoverDesignRecord;
}

interface DraftTarget {
  kind: 'draft';
  title: string;
  author: string;
  subtitle?: string;
  imprint?: string;
  hasOriginalCover: boolean;
  existingDesign?: {
    spec: CoverDesignSpec;
    customImageData: ArrayBuffer | null;
    customImageMimeType: string | null;
  } | null;
}

export type CoverDesignerTarget = BookTarget | DraftTarget;

interface CoverDesignerModalProps {
  target: CoverDesignerTarget | null;
  presets: CoverPresetRecord[];
  onClose: () => void;
  onSaveForBook?: (bookId: string, payload: CoverSavePayload) => Promise<void>;
  onRestoreOriginalForBook?: (bookId: string) => Promise<void>;
  onSaveForDraft?: (payload: CoverSavePayload) => Promise<void>;
  onRestoreOriginalForDraft?: () => Promise<void>;
  onSavePreset: (name: string, spec: CoverDesignSpec) => Promise<CoverPresetRecord>;
  onDeletePreset: (id: string) => Promise<void>;
}

export function CoverDesignerModal({
  target,
  presets,
  onClose,
  onSaveForBook,
  onRestoreOriginalForBook,
  onSaveForDraft,
  onRestoreOriginalForDraft,
  onSavePreset,
  onDeletePreset,
}: CoverDesignerModalProps) {
  const [bookHasOriginalCover, setBookHasOriginalCover] = useState(false);

  useEffect(() => {
    if (!target) return;
    let active = true;
    if (target.kind === 'book') {
      void bookStorageService
        .hasOriginalBookCover(target.book.id)
        .then((hasOrig) => {
          if (active) setBookHasOriginalCover(hasOrig);
        })
        .catch(() => {
          if (active) setBookHasOriginalCover(false);
        });
    } else {
      setBookHasOriginalCover(target.hasOriginalCover);
    }
    return () => {
      active = false;
    };
  }, [target]);

  useEffect(() => {
    if (!target) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [target, onClose]);

  const initialSpec = useMemo<CoverDesignSpec | null>(() => {
    if (!target) return null;
    if (target.kind === 'book') {
      if (target.existingDesign) {
        return target.existingDesign.spec;
      }
      return createDefaultCoverSpec({
        title: target.book.title,
        author: target.book.authors.join(', '),
      });
    }
    if (target.existingDesign) {
      return target.existingDesign.spec;
    }
    return createDefaultCoverSpec({
      title: target.title || 'Untitled Volume',
      author: target.author,
      subtitle: target.subtitle,
      imprint: target.imprint,
    });
  }, [target]);

  if (!target || !initialSpec) return null;

  const targetTitle =
    target.kind === 'book'
      ? target.book.title
      : target.title || 'Untitled Volume';

  const initialCustomImageData =
    target.existingDesign?.customImageData ?? null;
  const initialCustomImageMimeType =
    target.existingDesign?.customImageMimeType ?? null;

  const hasOriginalCover =
    target.kind === 'book' ? bookHasOriginalCover : target.hasOriginalCover;

  const handleSave = async (payload: CoverSavePayload) => {
    if (target.kind === 'book' && onSaveForBook) {
      await onSaveForBook(target.book.id, payload);
    } else if (target.kind === 'draft' && onSaveForDraft) {
      await onSaveForDraft(payload);
    }
    onClose();
  };

  const handleRestoreOriginal = async () => {
    if (target.kind === 'book' && onRestoreOriginalForBook) {
      await onRestoreOriginalForBook(target.book.id);
      onClose();
    } else if (target.kind === 'draft' && onRestoreOriginalForDraft) {
      await onRestoreOriginalForDraft();
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cover-designer-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 lg:p-6 bg-black/85 backdrop-blur-sm"
    >
      <div className="w-full h-full sm:h-auto sm:max-h-[92vh] max-w-5xl flex flex-col sm:rounded-lg bg-[#111116] border-0 sm:border sm:border-white/[0.12] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-b border-white/[0.08] bg-[#0E0E13]">
          <div className="flex items-center gap-2.5 min-w-0">
            <Palette
              className="w-4 h-4 text-[#D99B43] shrink-0"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <h2
                id="cover-designer-modal-title"
                className="font-serif text-lg font-medium text-[#F2EDE4] truncate"
              >
                Cover Designer
              </h2>
              <p className="text-[11px] text-[#A69F93] truncate">
                {targetTitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close cover designer"
            className="p-2 rounded-md text-[#A69F93] hover:text-[#F2EDE4] hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <CoverDesigner
          initialSpec={initialSpec}
          initialCustomImageData={initialCustomImageData}
          initialCustomImageMimeType={initialCustomImageMimeType}
          hasOriginalCover={hasOriginalCover}
          presets={presets}
          readingProgress={target.kind === 'book' ? target.book.progress : 0}
          readingStatusLabel={
            target.kind === 'book'
              ? getReadingStatusLabel(target.book.status)
              : 'To Read'
          }
          saveButtonLabel={
            target.kind === 'book'
              ? 'Save Cover to Volume'
              : 'Apply Custom Cover'
          }
          onSave={handleSave}
          onRestoreOriginal={
            hasOriginalCover ? handleRestoreOriginal : undefined
          }
          onSavePreset={onSavePreset}
          onDeletePreset={onDeletePreset}
          onCancel={onClose}
        />
      </div>
    </div>
  );
}
