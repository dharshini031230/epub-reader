import { Check, Copy, Share2, StickyNote, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { HIGHLIGHT_COLORS } from '../../services/readerThemeService';
import type { AnnotationRecord, HighlightColor } from '../../types/library';

export interface SelectionToolbarState {
  cfiRange: string;
  text: string;
  x: number;
  y: number;
  existingAnnotation?: AnnotationRecord | null;
}

interface ReaderSelectionToolbarProps {
  selection: SelectionToolbarState | null;
  bookTitle: string;
  onHighlight: (
    cfiRange: string,
    text: string,
    color: HighlightColor,
    note?: string
  ) => Promise<void>;
  onUpdateAnnotation: (
    id: string,
    patch: { color?: HighlightColor; note?: string }
  ) => Promise<void>;
  onDeleteAnnotation: (id: string) => Promise<void>;
  onDismiss: () => void;
  onNotify: (msg: string) => void;
}

export function ReaderSelectionToolbar({
  selection,
  bookTitle,
  onHighlight,
  onUpdateAnnotation,
  onDeleteAnnotation,
  onDismiss,
  onNotify,
}: ReaderSelectionToolbarProps) {
  const [showNoteComposer, setShowNoteComposer] = useState(false);
  const [selectedColor, setSelectedColor] = useState<HighlightColor>('yellow');
  const [noteText, setNoteText] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!selection) {
      setShowNoteComposer(false);
      setNoteText('');
      setCopied(false);
      return;
    }
    if (selection.existingAnnotation) {
      setSelectedColor(selection.existingAnnotation.color ?? 'yellow');
      setNoteText(selection.existingAnnotation.note);
      setShowNoteComposer(Boolean(selection.existingAnnotation.note));
    } else {
      setSelectedColor('yellow');
      setNoteText('');
      setShowNoteComposer(false);
    }
    setCopied(false);
  }, [selection]);

  if (!selection) return null;

  const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 768;
  const panelWidth = showNoteComposer ? 320 : 300;
  const clampedLeft = Math.max(
    12,
    Math.min(vw - panelWidth - 12, selection.x - panelWidth / 2)
  );
  const preferAbove = selection.y > 190;
  const clampedTop = preferAbove
    ? Math.max(12, selection.y - (showNoteComposer ? 205 : 64))
    : Math.min(vh - (showNoteComposer ? 210 : 80), selection.y + 18);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(selection.text);
      setCopied(true);
      onNotify('Copied excerpt to clipboard.');
      setTimeout(() => setCopied(false), 1800);
    } catch {
      onNotify('Clipboard access unavailable in this browser.');
    }
  };

  const handleShare = async () => {
    const shareQuote = `“${selection.text}” — ${bookTitle}`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: bookTitle,
          text: shareQuote,
        });
        onDismiss();
        return;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(shareQuote);
      onNotify('Quote copied for sharing (Web Share unavailable here).');
      onDismiss();
    } catch {
      onNotify('Sharing is not supported in this browser.');
    }
  };

  const handleColorClick = async (color: HighlightColor) => {
    setSelectedColor(color);
    if (selection.existingAnnotation) {
      await onUpdateAnnotation(selection.existingAnnotation.id, { color });
      onDismiss();
    } else if (!showNoteComposer) {
      await onHighlight(selection.cfiRange, selection.text, color);
      onDismiss();
    }
  };

  const handleSaveWithNote = async () => {
    if (selection.existingAnnotation) {
      await onUpdateAnnotation(selection.existingAnnotation.id, {
        color: selectedColor,
        note: noteText,
      });
    } else {
      await onHighlight(
        selection.cfiRange,
        selection.text,
        selectedColor,
        noteText
      );
    }
    onDismiss();
  };

  return (
    <div
      role="dialog"
      aria-label="Selection actions"
      style={{
        left: `${clampedLeft}px`,
        top: `${clampedTop}px`,
        width: `${panelWidth}px`,
      }}
      className="fixed z-50 rounded-lg bg-[#15151B]/98 border border-white/[0.14] shadow-2xl p-2.5 text-[#F2EDE4] backdrop-blur-md"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Colour Swatches + Primary Actions */}
      <div className="flex items-center justify-between gap-2">
        <div
          className="flex items-center gap-1.5"
          role="group"
          aria-label="Highlight colours"
        >
          {HIGHLIGHT_COLORS.map((c) => {
            const active =
              (selection.existingAnnotation || showNoteComposer) &&
              selectedColor === c.id;
            return (
              <button
                key={c.id}
                type="button"
                title={`Highlight ${c.label}`}
                aria-label={`Highlight ${c.label}`}
                onClick={() => void handleColorClick(c.id)}
                className={`w-6 h-6 rounded-full transition-transform cursor-pointer ${
                  active
                    ? 'ring-2 ring-white ring-offset-2 ring-offset-[#15151B] scale-110'
                    : 'hover:scale-110'
                }`}
                style={{ backgroundColor: c.swatch }}
              />
            );
          })}
        </div>

        <div className="flex items-center gap-0.5 border-l border-white/[0.1] pl-1.5">
          <button
            type="button"
            title="Add note"
            aria-label="Add or edit note"
            onClick={() => setShowNoteComposer((prev) => !prev)}
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              showNoteComposer
                ? 'bg-[#D99B43] text-[#08080A]'
                : 'text-[#C8C1B6] hover:text-[#F2EDE4] hover:bg-white/[0.08]'
            }`}
          >
            <StickyNote className="w-4 h-4" />
          </button>

          <button
            type="button"
            title="Copy excerpt"
            aria-label="Copy selected text"
            onClick={() => void handleCopy()}
            className="p-1.5 rounded-md text-[#C8C1B6] hover:text-[#F2EDE4] hover:bg-white/[0.08] transition-colors cursor-pointer"
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>

          <button
            type="button"
            title="Share quote"
            aria-label="Share quote"
            onClick={() => void handleShare()}
            className="p-1.5 rounded-md text-[#C8C1B6] hover:text-[#F2EDE4] hover:bg-white/[0.08] transition-colors cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {selection.existingAnnotation && (
            <button
              type="button"
              title="Remove highlight"
              aria-label="Delete highlight"
              onClick={async () => {
                if (selection.existingAnnotation) {
                  await onDeleteAnnotation(selection.existingAnnotation.id);
                }
                onDismiss();
              }}
              className="p-1.5 rounded-md text-[#C8C1B6] hover:text-red-400 hover:bg-white/[0.08] transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            title="Dismiss"
            aria-label="Dismiss selection toolbar"
            onClick={onDismiss}
            className="p-1.5 rounded-md text-[#6E685F] hover:text-[#F2EDE4] cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {showNoteComposer && (
        <div className="mt-2.5 pt-2.5 border-t border-white/[0.08] space-y-2">
          <textarea
            rows={3}
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Write a personal note for this passage..."
            className="w-full p-2 rounded bg-[#0B0B0E] border border-white/[0.12] text-xs text-[#F2EDE4] placeholder:text-[#6E685F] focus:outline-none focus:border-[#D99B43]"
            autoFocus
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowNoteComposer(false)}
              className="px-2.5 py-1 text-[11px] text-[#A69F93] hover:text-[#F2EDE4] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSaveWithNote()}
              className="px-3 py-1.5 rounded bg-[#D99B43] hover:bg-[#E8B15C] text-[#08080A] text-[11px] font-semibold cursor-pointer"
            >
              Save Highlight &amp; Note
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
