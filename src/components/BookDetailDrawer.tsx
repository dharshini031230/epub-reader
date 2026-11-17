import {
  BookOpen,
  Check,
  Download,
  Edit3,
  ImagePlus,
  ListTree,
  Palette,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  READING_STATUS_OPTIONS,
  formatBytes,
  formatShortDate,
  normalizeAuthors,
  normalizeTags,
  parseSeriesIndex,
} from '../services/libraryDomainService';
import type {
  Book,
  BookMetadataUpdate,
  Collection,
  CoverReplacement,
  ReadingStatus,
} from '../types/library';
import { BookCover } from './BookCover';

interface BookDetailDrawerProps {
  book: Book | null;
  initialMode?: 'overview' | 'edit';
  coverUrl?: string | null;
  collections: Collection[];
  onClose: () => void;
  onUpdateReadingState: (
    bookId: string,
    status: ReadingStatus,
    progress: number
  ) => Promise<void>;
  onUpdateMetadata: (
    bookId: string,
    updates: BookMetadataUpdate,
    coverUpdate?: CoverReplacement
  ) => Promise<void>;
  onSetBookCollections: (
    bookId: string,
    collectionIds: string[]
  ) => Promise<void>;
  onRequestDeleteBook: (book: Book) => void;
  onDownloadBook: (bookId: string) => Promise<void>;
  onFilterByAuthor: (author: string) => void;
  onFilterByTag: (tag: string) => void;
  onManageSeries: (book: Book) => void;
  onManageTags: (book: Book) => void;
  onCustomiseCover: (book: Book) => void;
  onOpenReader: (book: Book) => void;
}

export function BookDetailDrawer({
  book,
  initialMode = 'overview',
  coverUrl,
  collections,
  onClose,
  onUpdateReadingState,
  onUpdateMetadata,
  onSetBookCollections,
  onRequestDeleteBook,
  onDownloadBook,
  onFilterByAuthor,
  onFilterByTag,
  onManageSeries,
  onManageTags,
  onCustomiseCover,
  onOpenReader,
}: BookDetailDrawerProps) {
  const [isEditing, setIsEditing] = useState(initialMode === 'edit');
  const [isSaving, setIsSaving] = useState(false);
  const [showToc, setShowToc] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [authorsInput, setAuthorsInput] = useState('');
  const [publisher, setPublisher] = useState('');
  const [seriesName, setSeriesName] = useState('');
  const [seriesIndex, setSeriesIndex] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [publishedYear, setPublishedYear] = useState('');
  const [language, setLanguage] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [description, setDescription] = useState('');

  const [pendingCover, setPendingCover] = useState<{
    changed: boolean;
    data: ArrayBuffer | null;
    mimeType: string | null;
    previewUrl: string | null;
  }>({ changed: false, data: null, mimeType: null, previewUrl: null });

  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!book) return;
    setIsEditing(initialMode === 'edit');
    setActionError(null);
    setTitle(book.title);
    setAuthorsInput(book.authors.join(', '));
    setPublisher(book.publisher);
    setSeriesName(book.seriesName);
    setSeriesIndex(book.seriesIndex !== null ? String(book.seriesIndex) : '');
    setTagsInput(book.tagNames.join(', '));
    setPublishedYear(book.publishedYear);
    setLanguage(book.language);
    setIdentifier(book.identifier);
    setDescription(book.description);
    setPendingCover((prev) => {
      if (prev.previewUrl) URL.revokeObjectURL(prev.previewUrl);
      return { changed: false, data: null, mimeType: null, previewUrl: null };
    });
  }, [book, initialMode]);

  useEffect(() => {
    if (!book) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [book, onClose]);

  if (!book) return null;

  const bookCollectionIds = collections
    .filter((c) => c.bookIds.includes(book.id))
    .map((c) => c.id);

  const handleStatusChange = async (nextStatus: ReadingStatus) => {
    setActionError(null);
    try {
      const nextProgress =
        nextStatus === 'finished'
          ? 100
          : nextStatus === 'to-read'
            ? 0
            : book.progress;
      await onUpdateReadingState(book.id, nextStatus, nextProgress);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Unable to update reading status.'
      );
    }
  };

  const handleProgressChange = async (nextProgress: number) => {
    setActionError(null);
    try {
      let nextStatus = book.status;
      if (nextProgress >= 100) {
        nextStatus = 'finished';
      } else if (nextProgress > 0 && book.status === 'to-read') {
        nextStatus = 'reading';
      }
      await onUpdateReadingState(book.id, nextStatus, nextProgress);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Unable to update progress.'
      );
    }
  };

  const handleToggleCollection = async (collectionId: string) => {
    const exists = bookCollectionIds.includes(collectionId);
    const nextIds = exists
      ? bookCollectionIds.filter((id) => id !== collectionId)
      : [...bookCollectionIds, collectionId];
    await onSetBookCollections(book.id, nextIds);
  };

  const handleCoverUpload = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setActionError('Please choose a JPEG, PNG, or WebP cover image.');
      return;
    }
    const data = await file.arrayBuffer();
    if (pendingCover.previewUrl) {
      URL.revokeObjectURL(pendingCover.previewUrl);
    }
    const previewUrl = URL.createObjectURL(
      new Blob([data], { type: file.type })
    );
    setPendingCover({
      changed: true,
      data,
      mimeType: file.type,
      previewUrl,
    });
  };

  const handleSaveMetadata = async () => {
    setIsSaving(true);
    setActionError(null);
    try {
      await onUpdateMetadata(
        book.id,
        {
          title: title.trim() || book.title,
          authors: normalizeAuthors(authorsInput),
          publisher,
          description,
          language,
          publishedYear,
          identifier,
          seriesName,
          seriesIndex: parseSeriesIndex(seriesIndex),
          tagNames: normalizeTags(tagsInput),
        },
        pendingCover.changed
          ? { data: pendingCover.data, mimeType: pendingCover.mimeType }
          : undefined
      );
      setIsEditing(false);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Failed to save metadata.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const displayedCoverUrl = pendingCover.changed
    ? pendingCover.previewUrl
    : coverUrl;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-book-title"
      className="fixed inset-0 z-40 flex justify-end bg-black/75 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <aside className="w-full max-w-2xl h-full bg-[#111116] border-l border-white/[0.1] flex flex-col shadow-2xl overflow-hidden">
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08]">
          <span className="text-xs font-medium text-[#A69F93]">
            {isEditing ? 'Edit Volume Metadata' : 'Volume Details'}
          </span>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#18181F] hover:bg-[#22222C] border border-white/[0.09] text-xs font-medium text-[#F2EDE4] transition-colors cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close volume details"
              className="p-2 rounded-md text-[#A69F93] hover:text-[#F2EDE4] hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {actionError && (
            <div
              role="alert"
              className="p-3 rounded-md bg-red-950/40 border border-red-500/30 text-xs text-red-200"
            >
              {actionError}
            </div>
          )}

          {/* Top Hero */}
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="w-40 sm:w-44 shrink-0 space-y-3 mx-auto sm:mx-0">
              <div className="rounded-md overflow-hidden border border-white/[0.1] shadow-xl">
                <BookCover
                  title={isEditing ? title : book.title}
                  author={
                    isEditing ? authorsInput : book.authors.join(', ')
                  }
                  publisher={isEditing ? publisher : book.publisher}
                  coverUrl={displayedCoverUrl}
                  size="lg"
                />
              </div>

              {!isEditing && (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => onOpenReader(book)}
                    className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-md bg-[#D99B43] hover:bg-[#E8B15C] text-[#08080A] text-xs font-semibold transition-colors cursor-pointer shadow-sm"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>
                      {book.currentCfi || book.progress > 0
                        ? 'Continue Reading'
                        : 'Read Book'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onCustomiseCover(book)}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-md bg-[#18181F] hover:bg-[#22222C] border border-white/[0.1] hover:border-[#D99B43]/50 text-xs font-medium text-[#F2EDE4] transition-colors cursor-pointer"
                  >
                    <Palette className="w-3.5 h-3.5 text-[#D99B43]" />
                    <span>Customise Cover</span>
                  </button>
                </div>
              )}

              {isEditing && (
                <div className="flex flex-col gap-1.5">
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      void handleCoverUpload(e.target.files);
                      e.target.value = '';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#18181F] hover:bg-[#22222C] border border-white/[0.1] text-xs text-[#F2EDE4] transition-colors cursor-pointer"
                  >
                    <ImagePlus className="w-3.5 h-3.5" />
                    <span>Replace Cover</span>
                  </button>
                  {displayedCoverUrl && (
                    <button
                      type="button"
                      onClick={() =>
                        setPendingCover({
                          changed: true,
                          data: null,
                          mimeType: null,
                          previewUrl: null,
                        })
                      }
                      className="text-xs text-[#A69F93] hover:text-red-400 py-1 cursor-pointer"
                    >
                      Remove Cover
                    </button>
                  )}
                </div>
              )}
            </div>

            {!isEditing ? (
              <div className="flex-1 min-w-0 space-y-3">
                <div className="flex items-center gap-2">
                  {book.seriesName ? (
                    <button
                      type="button"
                      onClick={() => onManageSeries(book)}
                      className="text-xs font-mono tabular-nums text-[#D99B43] hover:text-[#E8B15C] hover:underline underline-offset-4 cursor-pointer"
                    >
                      {book.seriesName}
                      {book.seriesIndex !== null
                        ? ` · Volume ${book.seriesIndex}`
                        : ''}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onManageSeries(book)}
                      className="text-xs text-[#6E685F] hover:text-[#D99B43] transition-colors cursor-pointer"
                    >
                      + Assign to Series
                    </button>
                  )}
                </div>

                <h2
                  id="drawer-book-title"
                  className="font-serif text-2xl sm:text-3xl font-medium text-[#F2EDE4] leading-tight"
                >
                  {book.title}
                </h2>

                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[#A69F93]">
                  {book.authors.map((author, idx) => (
                    <span key={author} className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onFilterByAuthor(author);
                          onClose();
                        }}
                        className="hover:text-[#E8B15C] underline-offset-4 hover:underline transition-colors cursor-pointer"
                      >
                        {author}
                      </button>
                      {idx < book.authors.length - 1 && (
                        <span aria-hidden="true">·</span>
                      )}
                    </span>
                  ))}
                </div>

                {(book.publisher || book.publishedYear || book.language) && (
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#6E685F] pt-1">
                    {book.publisher && <span>{book.publisher}</span>}
                    {book.publisher && book.publishedYear && (
                      <span aria-hidden="true">·</span>
                    )}
                    {book.publishedYear && (
                      <span className="font-mono tabular-nums">
                        {book.publishedYear}
                      </span>
                    )}
                    {(book.publisher || book.publishedYear) &&
                      book.language && <span aria-hidden="true">·</span>}
                    {book.language && (
                      <span className="font-mono uppercase">{book.language}</span>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-2 text-xs text-[#A69F93]">
                  <span className="text-[#6E685F]">Tags:</span>
                  {book.tagNames.length > 0 ? (
                    book.tagNames.map((tag, idx) => (
                      <span key={tag} className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            onFilterByTag(tag);
                            onClose();
                          }}
                          className="text-[#D99B43] hover:text-[#E8B15C] hover:underline underline-offset-4 cursor-pointer"
                        >
                          {tag}
                        </button>
                        {idx < book.tagNames.length - 1 && (
                          <span aria-hidden="true" className="text-[#6E685F]">
                            /
                          </span>
                        )}
                      </span>
                    ))
                  ) : (
                    <span className="text-[#6E685F]">None</span>
                  )}
                  <button
                    type="button"
                    onClick={() => onManageTags(book)}
                    className="ml-1 text-[11px] text-[#A69F93] hover:text-[#F2EDE4] underline underline-offset-4 cursor-pointer"
                  >
                    Manage
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 space-y-3.5">
                <div>
                  <label className="block text-xs text-[#A69F93] mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full h-9 px-3 rounded-md bg-[#18181F] border border-white/[0.1] text-sm font-serif text-[#F2EDE4] focus:outline-none focus:border-[#D99B43]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#A69F93] mb-1">
                    Author(s) (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={authorsInput}
                    onChange={(e) => setAuthorsInput(e.target.value)}
                    className="w-full h-9 px-3 rounded-md bg-[#18181F] border border-white/[0.1] text-sm text-[#F2EDE4] focus:outline-none focus:border-[#D99B43]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[#A69F93] mb-1">
                      Publisher
                    </label>
                    <input
                      type="text"
                      value={publisher}
                      onChange={(e) => setPublisher(e.target.value)}
                      className="w-full h-9 px-3 rounded-md bg-[#18181F] border border-white/[0.1] text-sm text-[#F2EDE4] focus:outline-none focus:border-[#D99B43]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#A69F93] mb-1">
                      Year
                    </label>
                    <input
                      type="text"
                      value={publishedYear}
                      onChange={(e) => setPublishedYear(e.target.value)}
                      className="w-full h-9 px-3 rounded-md bg-[#18181F] border border-white/[0.1] text-sm font-mono text-[#F2EDE4] focus:outline-none focus:border-[#D99B43]"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-4 pt-4 border-t border-white/[0.08]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#A69F93] mb-1">
                    Series
                  </label>
                  <input
                    type="text"
                    value={seriesName}
                    onChange={(e) => setSeriesName(e.target.value)}
                    className="w-full h-9 px-3 rounded-md bg-[#18181F] border border-white/[0.1] text-sm text-[#F2EDE4] focus:outline-none focus:border-[#D99B43]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#A69F93] mb-1">
                    Series Volume #
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={seriesIndex}
                    onChange={(e) => setSeriesIndex(e.target.value)}
                    className="w-full h-9 px-3 rounded-md bg-[#18181F] border border-white/[0.1] text-sm font-mono text-[#F2EDE4] focus:outline-none focus:border-[#D99B43]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs text-[#A69F93] mb-1">
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    className="w-full h-9 px-3 rounded-md bg-[#18181F] border border-white/[0.1] text-sm text-[#F2EDE4] focus:outline-none focus:border-[#D99B43]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#A69F93] mb-1">
                    Language
                  </label>
                  <input
                    type="text"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full h-9 px-3 rounded-md bg-[#18181F] border border-white/[0.1] text-sm font-mono text-[#F2EDE4] focus:outline-none focus:border-[#D99B43]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#A69F93] mb-1">
                    Identifier (ISBN / UUID)
                  </label>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full h-9 px-3 rounded-md bg-[#18181F] border border-white/[0.1] text-sm font-mono text-[#F2EDE4] focus:outline-none focus:border-[#D99B43]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs text-[#A69F93] mb-1">
                    Synopsis
                  </label>
                  <textarea
                    rows={5}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full p-3 rounded-md bg-[#18181F] border border-white/[0.1] text-sm text-[#F2EDE4] leading-relaxed focus:outline-none focus:border-[#D99B43]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-md border border-white/[0.12] text-xs font-medium text-[#A69F93] hover:text-[#F2EDE4] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleSaveMetadata()}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-md bg-[#D99B43] hover:bg-[#E8B15C] text-[#08080A] text-xs font-semibold cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Reading Status & Progress Section */}
              <div className="pt-6 border-t border-white/[0.08] space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-medium text-[#A69F93]">
                    Reading Status &amp; Progress
                  </h3>
                  <span className="font-mono text-xs tabular-nums text-[#D99B43]">
                    {book.progress}% complete
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {READING_STATUS_OPTIONS.map((opt) => {
                    const active = book.status === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => void handleStatusChange(opt.value)}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                          active
                            ? 'bg-[#D99B43] text-[#08080A] font-semibold'
                            : 'bg-[#18181F] text-[#A69F93] hover:text-[#F2EDE4] border border-white/[0.08]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>

                <div className="space-y-2 pt-1">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={book.progress}
                    aria-label="Reading progress percentage"
                    onChange={(e) =>
                      void handleProgressChange(Number(e.target.value))
                    }
                    className="folio-slider w-full"
                  />
                  <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-[#6E685F]">
                    {[0, 25, 50, 75, 100].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => void handleProgressChange(preset)}
                        className="hover:text-[#D99B43] transition-colors cursor-pointer"
                      >
                        {preset}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Collections Assignment */}
              {collections.length > 0 && (
                <div className="pt-6 border-t border-white/[0.08] space-y-3">
                  <h3 className="text-xs font-medium text-[#A69F93]">
                    Collections
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {collections.map((col) => {
                      const inCollection = bookCollectionIds.includes(col.id);
                      return (
                        <button
                          key={col.id}
                          type="button"
                          onClick={() => void handleToggleCollection(col.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs border transition-colors cursor-pointer ${
                            inCollection
                              ? 'bg-[#D99B43]/15 border-[#D99B43]/60 text-[#E8B15C]'
                              : 'bg-[#18181F] border-white/[0.08] text-[#A69F93] hover:text-[#F2EDE4]'
                          }`}
                        >
                          {inCollection && <Check className="w-3 h-3" />}
                          <span>{col.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Synopsis */}
              {book.description && (
                <div className="pt-6 border-t border-white/[0.08] space-y-2.5">
                  <h3 className="text-xs font-medium text-[#A69F93]">
                    Synopsis
                  </h3>
                  <p className="font-serif text-[15px] leading-relaxed text-[#E2DDD5] whitespace-pre-line">
                    {book.description}
                  </p>
                </div>
              )}

              {/* Extracted Table of Contents */}
              {book.toc.length > 0 && (
                <div className="pt-6 border-t border-white/[0.08] space-y-3">
                  <button
                    type="button"
                    onClick={() => setShowToc((prev) => !prev)}
                    className="w-full flex items-center justify-between text-left text-xs font-medium text-[#A69F93] hover:text-[#F2EDE4] cursor-pointer"
                  >
                    <span className="inline-flex items-center gap-2">
                      <ListTree className="w-4 h-4 text-[#D99B43]" />
                      <span>
                        Contents ({book.toc.length}{' '}
                        {book.toc.length === 1 ? 'chapter' : 'chapters'})
                      </span>
                    </span>
                    <span className="text-[#6E685F]">
                      {showToc ? 'Hide' : 'Show'}
                    </span>
                  </button>

                  {showToc && (
                    <ol className="space-y-1.5 pl-1 max-h-56 overflow-y-auto border-l border-white/[0.08] ml-1.5">
                      {book.toc.map((entry, idx) => (
                        <li
                          key={entry.id}
                          className="pl-3 text-xs text-[#A69F93] flex items-baseline gap-2"
                        >
                          <span className="font-mono text-[10px] text-[#6E685F] tabular-nums w-6 shrink-0">
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                          <span className="truncate">{entry.label}</span>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              )}

              {/* Archive & File Metadata */}
              <div className="pt-6 border-t border-white/[0.08] space-y-3">
                <h3 className="text-xs font-medium text-[#A69F93]">
                  Archive Record
                </h3>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-xs">
                  <div>
                    <dt className="text-[#6E685F]">File</dt>
                    <dd className="text-[#F2EDE4] truncate mt-0.5">
                      {book.fileName}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#6E685F]">Size</dt>
                    <dd className="font-mono tabular-nums text-[#F2EDE4] mt-0.5">
                      {formatBytes(book.fileSize)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#6E685F]">Added</dt>
                    <dd className="font-mono tabular-nums text-[#F2EDE4] mt-0.5">
                      {formatShortDate(book.addedAt)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#6E685F]">Last Opened</dt>
                    <dd className="font-mono tabular-nums text-[#F2EDE4] mt-0.5">
                      {formatShortDate(book.lastOpenedAt)}
                    </dd>
                  </div>
                  {book.identifier && (
                    <div className="col-span-2">
                      <dt className="text-[#6E685F]">Identifier</dt>
                      <dd className="font-mono text-[#A69F93] truncate mt-0.5">
                        {book.identifier}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </>
          )}
        </div>

        {/* Drawer Footer */}
        {!isEditing && (
          <div className="px-6 py-4 border-t border-white/[0.08] bg-[#0D0D11] flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => void onDownloadBook(book.id)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#18181F] hover:bg-[#22222C] border border-white/[0.1] text-xs font-medium text-[#F2EDE4] transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#D99B43]" />
              <span>Export EPUB</span>
            </button>

            <button
              type="button"
              onClick={() => onRequestDeleteBook(book)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium text-[#A69F93] hover:text-red-400 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Book</span>
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
