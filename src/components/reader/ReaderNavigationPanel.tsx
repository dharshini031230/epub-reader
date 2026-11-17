import {
  Bookmark,
  Check,
  Edit3,
  Highlighter,
  ListTree,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { formatShortDate } from '../../services/libraryDomainService';
import {
  HIGHLIGHT_COLORS,
  getHighlightColorDefinition,
} from '../../services/readerThemeService';
import type {
  AnnotationRecord,
  BookmarkRecord,
  HighlightColor,
  TocEntry,
} from '../../types/library';

export type ReaderNavTab = 'contents' | 'bookmarks' | 'highlights';

interface ReaderNavigationPanelProps {
  isOpen: boolean;
  activeTab: ReaderNavTab;
  onTabChange: (tab: ReaderNavTab) => void;
  onClose: () => void;
  bookTitle: string;
  toc: TocEntry[];
  activeHref: string;
  currentCfi: string | null;
  currentChapterLabel: string;
  bookmarks: BookmarkRecord[];
  annotations: AnnotationRecord[];
  onNavigateToHref: (href: string) => void;
  onJumpToCfi: (cfi: string) => void;
  onCreateBookmark: (label: string) => Promise<void>;
  onUpdateBookmark: (id: string, label: string) => Promise<void>;
  onDeleteBookmark: (id: string) => Promise<void>;
  onUpdateAnnotation: (
    id: string,
    patch: { note?: string; color?: HighlightColor }
  ) => Promise<void>;
  onDeleteAnnotation: (id: string) => Promise<void>;
}

function normalizeHref(href: string): string {
  return href.split('#')[0].replace(/^\.\//, '').trim().toLowerCase();
}

export function ReaderNavigationPanel({
  isOpen,
  activeTab,
  onTabChange,
  onClose,
  bookTitle,
  toc,
  activeHref,
  currentCfi,
  currentChapterLabel,
  bookmarks,
  annotations,
  onNavigateToHref,
  onJumpToCfi,
  onCreateBookmark,
  onUpdateBookmark,
  onDeleteBookmark,
  onUpdateAnnotation,
  onDeleteAnnotation,
}: ReaderNavigationPanelProps) {
  const [newBookmarkLabel, setNewBookmarkLabel] = useState('');
  const [editingBookmarkId, setEditingBookmarkId] = useState<string | null>(
    null
  );
  const [editingBookmarkLabel, setEditingBookmarkLabel] = useState('');

  const [highlightColorFilter, setHighlightColorFilter] = useState<
    HighlightColor | 'all'
  >('all');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState('');

  if (!isOpen) return null;

  const activeNormalized = normalizeHref(activeHref);

  const renderTocItems = (entries: TocEntry[], depth = 0) => {
    return (
      <ul className={depth === 0 ? 'space-y-0.5' : 'mt-0.5 space-y-0.5 border-l border-white/[0.08] ml-3 pl-2'}>
        {entries.map((entry) => {
          const entryNormalized = normalizeHref(entry.href);
          const isActive =
            Boolean(activeNormalized) &&
            (activeNormalized === entryNormalized ||
              activeNormalized.endsWith(entryNormalized) ||
              entryNormalized.endsWith(activeNormalized));

          return (
            <li key={`${entry.id}-${entry.href}`}>
              <button
                type="button"
                onClick={() => onNavigateToHref(entry.href)}
                className={`w-full text-left px-3 py-2.5 min-h-[40px] rounded-md text-xs leading-snug transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[#D99B43]/15 text-[#E8B15C] font-medium border border-[#D99B43]/30'
                    : 'text-[#C8C1B6] hover:bg-white/[0.05] hover:text-[#F2EDE4]'
                }`}
              >
                <span className="block truncate">{entry.label}</span>
              </button>
              {entry.subitems &&
                entry.subitems.length > 0 &&
                renderTocItems(entry.subitems, depth + 1)}
            </li>
          );
        })}
      </ul>
    );
  };

  const filteredAnnotations =
    highlightColorFilter === 'all'
      ? annotations
      : annotations.filter(
          (ann) => (ann.color ?? 'yellow') === highlightColorFilter
        );

  const handleAddBookmarkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCfi) return;
    const labelToSave =
      newBookmarkLabel.trim() || currentChapterLabel || 'Bookmark';
    await onCreateBookmark(labelToSave);
    setNewBookmarkLabel('');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Reader navigation panel"
      className="fixed inset-0 z-50 flex justify-start bg-black/65 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <aside className="w-full max-w-md h-full bg-[#111116] border-r border-white/[0.1] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wider text-[#6E685F] font-medium">
              Reading Navigator
            </p>
            <h2 className="font-serif text-base text-[#F2EDE4] truncate mt-0.5">
              {bookTitle}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation panel"
            className="p-2 min-w-[40px] min-h-[40px] inline-flex items-center justify-center rounded-md text-[#A69F93] hover:text-[#F2EDE4] hover:bg-white/[0.06] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-4 pt-3 pb-2 border-b border-white/[0.08] grid grid-cols-3 gap-1.5 bg-[#0D0D11]">
          <button
            type="button"
            onClick={() => onTabChange('contents')}
            className={`inline-flex items-center justify-center gap-1.5 py-2 px-2 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'contents'
                ? 'bg-[#D99B43] text-[#08080A] font-semibold'
                : 'text-[#A69F93] hover:text-[#F2EDE4] hover:bg-white/[0.04]'
            }`}
          >
            <ListTree className="w-3.5 h-3.5" />
            <span>Contents</span>
          </button>
          <button
            type="button"
            onClick={() => onTabChange('bookmarks')}
            className={`inline-flex items-center justify-center gap-1.5 py-2 px-2 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'bookmarks'
                ? 'bg-[#D99B43] text-[#08080A] font-semibold'
                : 'text-[#A69F93] hover:text-[#F2EDE4] hover:bg-white/[0.04]'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Marks ({bookmarks.length})</span>
          </button>
          <button
            type="button"
            onClick={() => onTabChange('highlights')}
            className={`inline-flex items-center justify-center gap-1.5 py-2 px-2 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'highlights'
                ? 'bg-[#D99B43] text-[#08080A] font-semibold'
                : 'text-[#A69F93] hover:text-[#F2EDE4] hover:bg-white/[0.04]'
            }`}
          >
            <Highlighter className="w-3.5 h-3.5" />
            <span>Notes ({annotations.length})</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'contents' && (
            <div>
              {toc.length === 0 ? (
                <p className="text-xs text-[#A69F93] py-8 text-center">
                  No table of contents entries were declared in this EPUB.
                </p>
              ) : (
                renderTocItems(toc)
              )}
            </div>
          )}

          {activeTab === 'bookmarks' && (
            <div className="space-y-4">
              <form
                onSubmit={(e) => void handleAddBookmarkSubmit(e)}
                className="p-3.5 rounded-md bg-[#18181F] border border-white/[0.08] space-y-2.5"
              >
                <label className="block text-[11px] font-medium text-[#A69F93]">
                  Bookmark current location
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newBookmarkLabel}
                    onChange={(e) => setNewBookmarkLabel(e.target.value)}
                    placeholder={
                      currentChapterLabel
                        ? `${currentChapterLabel}`
                        : 'Optional note or label'
                    }
                    className="flex-1 min-w-0 h-9 px-2.5 rounded-md bg-[#0E0E12] border border-white/[0.1] text-xs text-[#F2EDE4] placeholder:text-[#6E685F] focus:outline-none focus:border-[#D99B43]"
                  />
                  <button
                    type="submit"
                    disabled={!currentCfi}
                    className="inline-flex items-center gap-1 px-3 h-9 rounded-md bg-[#D99B43] hover:bg-[#E8B15C] disabled:opacity-40 text-[#08080A] text-xs font-semibold shrink-0 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              </form>

              {bookmarks.length === 0 ? (
                <div className="text-center py-10 space-y-1.5">
                  <p className="text-sm font-serif text-[#F2EDE4]">
                    No bookmarks yet
                  </p>
                  <p className="text-xs text-[#6E685F]">
                    Save important pages here to jump right back to them.
                  </p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {bookmarks.map((bm) => {
                    const isEditing = editingBookmarkId === bm.id;
                    return (
                      <li
                        key={bm.id}
                        className="rounded-md bg-[#18181F] border border-white/[0.08] p-3 space-y-2"
                      >
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editingBookmarkLabel}
                              onChange={(e) =>
                                setEditingBookmarkLabel(e.target.value)
                              }
                              className="flex-1 h-8 px-2.5 rounded bg-[#0E0E12] border border-white/[0.12] text-xs text-[#F2EDE4] focus:outline-none focus:border-[#D99B43]"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={async () => {
                                await onUpdateBookmark(
                                  bm.id,
                                  editingBookmarkLabel
                                );
                                setEditingBookmarkId(null);
                              }}
                              aria-label="Save bookmark label"
                              className="p-1.5 rounded bg-[#D99B43] text-[#08080A] cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => onJumpToCfi(bm.cfi)}
                              className="text-left flex-1 min-w-0 group cursor-pointer"
                            >
                              <p className="text-xs font-medium text-[#F2EDE4] group-hover:text-[#E8B15C] transition-colors truncate">
                                {bm.label}
                              </p>
                              <p className="text-[11px] font-mono text-[#6E685F] mt-0.5">
                                {formatShortDate(bm.createdAt)}
                              </p>
                            </button>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingBookmarkId(bm.id);
                                  setEditingBookmarkLabel(bm.label);
                                }}
                                aria-label="Rename bookmark"
                                className="p-1.5 rounded text-[#A69F93] hover:text-[#F2EDE4] hover:bg-white/[0.06] cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => void onDeleteBookmark(bm.id)}
                                aria-label="Delete bookmark"
                                className="p-1.5 rounded text-[#A69F93] hover:text-red-400 hover:bg-white/[0.06] cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {activeTab === 'highlights' && (
            <div className="space-y-4">
              {annotations.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setHighlightColorFilter('all')}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium cursor-pointer ${
                      highlightColorFilter === 'all'
                        ? 'bg-[#D99B43] text-[#08080A] font-semibold'
                        : 'bg-[#18181F] text-[#A69F93] hover:text-[#F2EDE4]'
                    }`}
                  >
                    All ({annotations.length})
                  </button>
                  {HIGHLIGHT_COLORS.map((c) => {
                    const selected = highlightColorFilter === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() =>
                          setHighlightColorFilter(selected ? 'all' : c.id)
                        }
                        aria-label={`Filter by ${c.label}`}
                        title={c.label}
                        className={`w-6 h-6 rounded-full inline-flex items-center justify-center transition-transform cursor-pointer ${
                          selected
                            ? 'ring-2 ring-white ring-offset-2 ring-offset-[#111116] scale-105'
                            : 'opacity-80 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: c.swatch }}
                      />
                    );
                  })}
                </div>
              )}

              {filteredAnnotations.length === 0 ? (
                <div className="text-center py-10 space-y-1.5">
                  <p className="text-sm font-serif text-[#F2EDE4]">
                    {annotations.length === 0
                      ? 'No highlights or notes yet'
                      : 'No highlights match that colour'}
                  </p>
                  <p className="text-xs text-[#6E685F]">
                    Select any passage while reading to highlight or attach a
                    note.
                  </p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {filteredAnnotations.map((ann) => {
                    const colorDef = getHighlightColorDefinition(ann.color);
                    const isEditingNote = editingNoteId === ann.id;
                    return (
                      <li
                        key={ann.id}
                        className="rounded-md bg-[#18181F] border border-white/[0.08] p-3.5 space-y-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 text-[11px] text-[#A69F93] truncate">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: colorDef.swatch }}
                            />
                            <span className="truncate">
                              {ann.chapterLabel || 'Passage'}
                            </span>
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingNoteId(ann.id);
                                setEditingNoteText(ann.note);
                              }}
                              aria-label="Edit highlight note"
                              className="p-1.5 rounded text-[#A69F93] hover:text-[#F2EDE4] hover:bg-white/[0.06] cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => void onDeleteAnnotation(ann.id)}
                              aria-label="Delete highlight"
                              className="p-1.5 rounded text-[#A69F93] hover:text-red-400 hover:bg-white/[0.06] cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => onJumpToCfi(ann.cfiRange)}
                          className="w-full text-left font-serif text-xs leading-relaxed text-[#E9E2D8] hover:text-white pl-2.5 border-l-2 transition-colors cursor-pointer"
                          style={{ borderColor: colorDef.swatch }}
                        >
                          “{ann.text}”
                        </button>

                        {/* Quick colour dots */}
                        <div className="flex items-center gap-1.5 pt-0.5">
                          {HIGHLIGHT_COLORS.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() =>
                                void onUpdateAnnotation(ann.id, {
                                  color: c.id,
                                })
                              }
                              aria-label={`Change highlight colour to ${c.label}`}
                              className={`w-4 h-4 rounded-full cursor-pointer transition-transform ${
                                (ann.color ?? 'yellow') === c.id
                                  ? 'ring-2 ring-white ring-offset-1 ring-offset-[#18181F] scale-110'
                                  : 'opacity-65 hover:opacity-100'
                              }`}
                              style={{ backgroundColor: c.swatch }}
                            />
                          ))}
                        </div>

                        {isEditingNote ? (
                          <div className="space-y-2 pt-1">
                            <textarea
                              rows={3}
                              value={editingNoteText}
                              onChange={(e) =>
                                setEditingNoteText(e.target.value)
                              }
                              placeholder="Write your note..."
                              className="w-full p-2 rounded bg-[#0E0E12] border border-white/[0.12] text-xs text-[#F2EDE4] focus:outline-none focus:border-[#D99B43]"
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setEditingNoteId(null)}
                                className="px-2.5 py-1 text-[11px] text-[#A69F93] hover:text-[#F2EDE4] cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  await onUpdateAnnotation(ann.id, {
                                    note: editingNoteText,
                                  });
                                  setEditingNoteId(null);
                                }}
                                className="px-3 py-1 rounded bg-[#D99B43] text-[#08080A] text-[11px] font-semibold cursor-pointer"
                              >
                                Save Note
                              </button>
                            </div>
                          </div>
                        ) : (
                          ann.note && (
                            <p className="text-xs text-[#C6BFB4] bg-[#0E0E12] px-2.5 py-2 rounded border border-white/[0.06] whitespace-pre-wrap">
                              {ann.note}
                            </p>
                          )
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
