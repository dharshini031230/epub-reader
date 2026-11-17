import {
  BookOpen,
  Edit3,
  Highlighter,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { formatShortDate } from '../services/libraryDomainService';
import {
  HIGHLIGHT_COLORS,
  getHighlightColorDefinition,
} from '../services/readerThemeService';
import type {
  AnnotationRecord,
  Book,
  HighlightColor,
} from '../types/library';
import { BookCover } from './BookCover';

interface HighlightsViewProps {
  annotations: AnnotationRecord[];
  books: Book[];
  coverUrls: Record<string, string>;
  onOpenBookAtCfi: (book: Book, cfiRange: string) => void;
  onUpdateAnnotation: (
    id: string,
    patch: { note?: string; color?: HighlightColor }
  ) => Promise<AnnotationRecord>;
  onDeleteAnnotation: (id: string) => Promise<void>;
  onNotify: (msg: string) => void;
}

export function HighlightsView({
  annotations,
  books,
  coverUrls,
  onOpenBookAtCfi,
  onUpdateAnnotation,
  onDeleteAnnotation,
  onNotify,
}: HighlightsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [bookFilterId, setBookFilterId] = useState<string>('all');
  const [colorFilter, setColorFilter] = useState<HighlightColor | 'all'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState('');

  const bookMap = useMemo(() => {
    const map = new Map<string, Book>();
    for (const book of books) {
      map.set(book.id, book);
    }
    return map;
  }, [books]);

  const booksWithHighlights = useMemo(() => {
    const ids = new Set(annotations.map((a) => a.bookId));
    return books
      .filter((b) => ids.has(b.id))
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [annotations, books]);

  const filteredAnnotations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return annotations.filter((ann) => {
      if (bookFilterId !== 'all' && ann.bookId !== bookFilterId) {
        return false;
      }
      const annColor = ann.color ?? 'yellow';
      if (colorFilter !== 'all' && annColor !== colorFilter) {
        return false;
      }
      if (!q) return true;
      const book = bookMap.get(ann.bookId);
      const haystack = [
        ann.text,
        ann.note,
        ann.chapterLabel ?? '',
        book?.title ?? '',
        ...(book?.authors ?? []),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [annotations, bookFilterId, colorFilter, searchQuery, bookMap]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div>
          <h1 className="font-serif text-3xl sm:text-4xl font-medium text-[#F2EDE4] tracking-tight">
            Highlights &amp; Notes
          </h1>
          <p className="text-sm text-[#A69F93] mt-1">
            {annotations.length}{' '}
            {annotations.length === 1 ? 'passage' : 'passages'} collected across{' '}
            {booksWithHighlights.length}{' '}
            {booksWithHighlights.length === 1 ? 'volume' : 'volumes'}
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#6E685F] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search passages, notes, or titles..."
            aria-label="Search highlights and notes"
            className="w-full h-10 pl-9 pr-8 rounded-md bg-[#131318] border border-white/[0.1] text-xs text-[#F2EDE4] placeholder:text-[#6E685F] focus:outline-none focus:border-[#D99B43]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6E685F] hover:text-[#F2EDE4] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setColorFilter('all')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
              colorFilter === 'all'
                ? 'bg-[#D99B43] text-[#08080A] border-[#D99B43] font-semibold'
                : 'bg-[#131318] text-[#A69F93] border-white/[0.08] hover:text-[#F2EDE4]'
            }`}
          >
            All Colours
          </button>
          {HIGHLIGHT_COLORS.map((c) => {
            const active = colorFilter === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setColorFilter(active ? 'all' : c.id)}
                aria-label={`Filter by ${c.label}`}
                title={c.label}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs border transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#1C1C24] border-[#D99B43] text-[#F2EDE4]'
                    : 'bg-[#131318] border-white/[0.08] text-[#A69F93] hover:text-[#F2EDE4]'
                }`}
              >
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: c.swatch }}
                />
                <span className="hidden sm:inline">{c.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <label
            htmlFor="highlights-book-filter"
            className="text-xs text-[#6E685F]"
          >
            Book:
          </label>
          <select
            id="highlights-book-filter"
            value={bookFilterId}
            onChange={(e) => setBookFilterId(e.target.value)}
            className="h-9 px-3 rounded-md bg-[#131318] border border-white/[0.1] text-xs text-[#F2EDE4] focus:outline-none focus:border-[#D99B43]"
          >
            <option value="all">All Books</option>
            {booksWithHighlights.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Empty State or List */}
      {annotations.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/[0.12] bg-[#0E0E12] py-16 px-6 text-center space-y-3">
          <Highlighter className="w-8 h-8 text-[#D99B43]/70 mx-auto" />
          <h2 className="font-serif text-xl text-[#F2EDE4]">
            Your Commonplace Book is Empty
          </h2>
          <p className="text-xs text-[#A69F93] max-w-md mx-auto leading-relaxed">
            Open any book from your Shelf and select a passage to highlight it
            in six colours or attach personal marginalia. Everything you mark
            appears here automatically.
          </p>
        </div>
      ) : filteredAnnotations.length === 0 ? (
        <div className="rounded-lg border border-white/[0.08] bg-[#0E0E12] py-12 px-6 text-center space-y-3">
          <p className="font-serif text-lg text-[#F2EDE4]">
            No highlights match the active filters
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setBookFilterId('all');
              setColorFilter('all');
            }}
            className="px-3.5 py-1.5 rounded-md bg-[#18181F] border border-white/[0.1] text-xs text-[#D99B43] hover:text-[#E8B15C] cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredAnnotations.map((ann) => {
            const book = bookMap.get(ann.bookId);
            const colorDef = getHighlightColorDefinition(ann.color);
            const isEditing = editingId === ann.id;
            return (
              <article
                key={ann.id}
                className="rounded-lg bg-[#111116] border border-white/[0.08] p-5 flex flex-col justify-between gap-4 hover:border-white/[0.14] transition-colors"
              >
                <div className="space-y-3">
                  {/* Top Book Context */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {book && (
                        <div className="w-10 shrink-0 rounded overflow-hidden border border-white/[0.1]">
                          <BookCover
                            title={book.title}
                            author={book.authors.join(', ')}
                            publisher={book.publisher}
                            coverUrl={coverUrls[book.id]}
                            size="sm"
                          />
                        </div>
                      )}
                      <div className="min-w-0">
                        <h3 className="font-serif text-sm font-medium text-[#F2EDE4] truncate">
                          {book?.title ?? 'Deleted Volume'}
                        </h3>
                        <p className="text-[11px] text-[#A69F93] truncate">
                          {book?.authors.join(', ') || 'Unknown Author'}
                          {ann.chapterLabel ? ` · ${ann.chapterLabel}` : ''}
                        </p>
                      </div>
                    </div>

                    <span className="font-mono text-[11px] text-[#6E685F] shrink-0">
                      {formatShortDate(ann.createdAt)}
                    </span>
                  </div>

                  {/* Passage Quote */}
                  <blockquote
                    className="pl-3.5 py-1 border-l-3 font-serif text-[15px] leading-relaxed text-[#EDE7DD]"
                    style={{ borderColor: colorDef.swatch }}
                  >
                    “{ann.text}”
                  </blockquote>

                  {/* Personal Note */}
                  {isEditing ? (
                    <div className="space-y-2 pt-1">
                      <textarea
                        rows={3}
                        value={editingNote}
                        onChange={(e) => setEditingNote(e.target.value)}
                        placeholder="Add personal reflection or annotation..."
                        className="w-full p-2.5 rounded-md bg-[#0B0B0E] border border-white/[0.12] text-xs text-[#F2EDE4] focus:outline-none focus:border-[#D99B43]"
                        autoFocus
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1 text-xs text-[#A69F93] hover:text-[#F2EDE4] cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await onUpdateAnnotation(ann.id, {
                              note: editingNote,
                            });
                            setEditingId(null);
                            onNotify('Saved annotation note.');
                          }}
                          className="px-3 py-1 rounded bg-[#D99B43] hover:bg-[#E8B15C] text-[#08080A] text-xs font-semibold cursor-pointer"
                        >
                          Save Note
                        </button>
                      </div>
                    </div>
                  ) : (
                    ann.note && (
                      <p className="text-xs text-[#C6BFB4] bg-[#0B0B0E] px-3 py-2.5 rounded-md border border-white/[0.06] whitespace-pre-wrap leading-relaxed">
                        {ann.note}
                      </p>
                    )
                  )}
                </div>

                {/* Bottom Actions */}
                <div className="pt-3 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5">
                    {HIGHLIGHT_COLORS.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        aria-label={`Change highlight colour to ${c.label}`}
                        title={c.label}
                        onClick={() =>
                          void onUpdateAnnotation(ann.id, { color: c.id })
                        }
                        className={`w-4 h-4 rounded-full cursor-pointer transition-transform ${
                          (ann.color ?? 'yellow') === c.id
                            ? 'ring-2 ring-white ring-offset-2 ring-offset-[#111116] scale-110'
                            : 'opacity-65 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: c.swatch }}
                      />
                    ))}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(ann.id);
                        setEditingNote(ann.note);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-[#18181F] hover:bg-[#22222C] text-xs text-[#C8C1B6] hover:text-[#F2EDE4] cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>{ann.note ? 'Edit Note' : 'Add Note'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        await onDeleteAnnotation(ann.id);
                        onNotify('Deleted highlight.');
                      }}
                      aria-label="Delete highlight"
                      className="p-1.5 rounded-md bg-[#18181F] hover:bg-red-950/50 text-[#A69F93] hover:text-red-300 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    {book && (
                      <button
                        type="button"
                        onClick={() => onOpenBookAtCfi(book, ann.cfiRange)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#D99B43] hover:bg-[#E8B15C] text-[#08080A] text-xs font-semibold cursor-pointer"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Open</span>
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
