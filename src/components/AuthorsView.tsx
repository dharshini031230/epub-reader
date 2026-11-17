import {
  ArrowLeft,
  Check,
  Edit3,
  GitMerge,
  Search,
  Users,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  getAuthorInitials,
  summarizeAuthors,
} from '../services/libraryDomainService';
import type { AuthorSummary, Book } from '../types/library';
import { BookCard, type BookMenuHandlers } from './BookCard';

interface AuthorsViewProps {
  books: Book[];
  coverUrls: Record<string, string>;
  onSelectBook: (book: Book) => void;
  bookMenuHandlers: BookMenuHandlers;
  onRenameAuthor: (oldName: string, newName: string) => Promise<void>;
  onMergeAuthors: (sourceNames: string[], targetName: string) => Promise<void>;
  onNotify: (message: string) => void;
}

export function AuthorsView({
  books,
  coverUrls,
  onSelectBook,
  bookMenuHandlers,
  onRenameAuthor,
  onMergeAuthors,
  onNotify,
}: AuthorsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortByCount, setSortByCount] = useState(false);
  const [openedAuthorName, setOpenedAuthorName] = useState<string | null>(null);

  // Edit Author Name state
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  // Merge Authors modal state
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergeSources, setMergeSources] = useState<string[]>([]);
  const [mergeTarget, setMergeTarget] = useState('');
  const [mergeError, setMergeError] = useState<string | null>(null);

  const authors = useMemo(() => summarizeAuthors(books), [books]);

  const filteredAuthors = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const matched = query
      ? authors.filter((a) => a.name.toLowerCase().includes(query))
      : authors;
    if (sortByCount) {
      return [...matched].sort(
        (a, b) => b.bookCount - a.bookCount || a.name.localeCompare(b.name)
      );
    }
    return matched;
  }, [authors, searchQuery, sortByCount]);

  const openedAuthor: AuthorSummary | null = useMemo(() => {
    if (!openedAuthorName) return null;
    return (
      authors.find(
        (a) => a.name.toLowerCase() === openedAuthorName.toLowerCase()
      ) ?? null
    );
  }, [authors, openedAuthorName]);

  const handleOpenAuthorPage = (authorName: string) => {
    setOpenedAuthorName(authorName);
    setIsEditingName(false);
    setEditError(null);
  };

  const handleSaveRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!openedAuthor) return;
    setEditError(null);
    const clean = editNameValue.trim();
    if (!clean) {
      setEditError('Author name cannot be empty.');
      return;
    }
    try {
      await onRenameAuthor(openedAuthor.name, clean);
      setOpenedAuthorName(clean);
      setIsEditingName(false);
      onNotify(`Updated author name to "${clean}".`);
    } catch (err) {
      setEditError(
        err instanceof Error ? err.message : 'Unable to rename author.'
      );
    }
  };

  const openMergeModal = (initialSource?: string) => {
    setMergeError(null);
    if (initialSource) {
      setMergeSources([initialSource]);
      setMergeTarget(initialSource);
    } else {
      setMergeSources([]);
      setMergeTarget('');
    }
    setShowMergeModal(true);
  };

  const toggleMergeSource = (name: string) => {
    setMergeSources((prev) => {
      const exists = prev.some((n) => n.toLowerCase() === name.toLowerCase());
      const next = exists
        ? prev.filter((n) => n.toLowerCase() !== name.toLowerCase())
        : [...prev, name];
      if (!mergeTarget && next.length > 0) {
        setMergeTarget(next[0]);
      }
      return next;
    });
  };

  const handleConfirmMerge = async (e: React.FormEvent) => {
    e.preventDefault();
    setMergeError(null);
    const cleanTarget = mergeTarget.trim();
    if (mergeSources.length < 2) {
      setMergeError('Select at least two author entries to merge.');
      return;
    }
    if (!cleanTarget) {
      setMergeError('Enter a canonical target author name.');
      return;
    }
    try {
      await onMergeAuthors(mergeSources, cleanTarget);
      if (
        openedAuthorName &&
        mergeSources.some(
          (s) => s.toLowerCase() === openedAuthorName.toLowerCase()
        )
      ) {
        setOpenedAuthorName(cleanTarget);
      }
      setShowMergeModal(false);
      onNotify(
        `Merged ${mergeSources.length} author entries into "${cleanTarget}".`
      );
    } catch (err) {
      setMergeError(
        err instanceof Error ? err.message : 'Unable to merge authors.'
      );
    }
  };

  if (openedAuthor) {
    return (
      <section aria-labelledby="author-page-heading" className="space-y-8">
        <div className="space-y-4 pb-6 border-b border-white/[0.08]">
          <button
            type="button"
            onClick={() => {
              setOpenedAuthorName(null);
              setIsEditingName(false);
              setEditError(null);
            }}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#A69F93] hover:text-[#E8B15C] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>All Authors</span>
          </button>

          {isEditingName ? (
            <form
              onSubmit={(e) => void handleSaveRename(e)}
              className="max-w-lg space-y-3"
            >
              {editError && (
                <p className="text-xs text-red-300">{editError}</p>
              )}
              <label
                htmlFor="edit-author-name"
                className="block text-xs text-[#A69F93]"
              >
                Edit Author Name (updates all {openedAuthor.bookCount}{' '}
                {openedAuthor.bookCount === 1 ? 'book' : 'books'})
              </label>
              <input
                id="edit-author-name"
                type="text"
                value={editNameValue}
                onChange={(e) => setEditNameValue(e.target.value)}
                className="w-full h-10 px-3 rounded-md bg-[#131318] border border-white/[0.12] font-serif text-lg text-[#F2EDE4] focus:outline-none focus:border-[#D99B43]"
              />
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-md bg-[#D99B43] hover:bg-[#E8B15C] text-[#08080A] text-xs font-semibold cursor-pointer"
                >
                  Save Author Name
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingName(false);
                    setEditError(null);
                  }}
                  className="px-4 py-1.5 rounded-md border border-white/[0.12] text-xs text-[#A69F93] hover:text-[#F2EDE4] cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-lg bg-[#18181F] border border-[#D99B43]/40 flex items-center justify-center font-serif text-xl font-medium text-[#E8B15C] shrink-0">
                  {getAuthorInitials(openedAuthor.name)}
                </div>
                <div className="space-y-1">
                  <h1
                    id="author-page-heading"
                    className="font-serif text-3xl sm:text-4xl font-medium text-[#F2EDE4]"
                  >
                    {openedAuthor.name}
                  </h1>
                  <p className="text-xs text-[#A69F93] tabular-nums">
                    {openedAuthor.bookCount}{' '}
                    {openedAuthor.bookCount === 1 ? 'book' : 'books'} ·{' '}
                    {openedAuthor.readingCount} reading ·{' '}
                    {openedAuthor.finishedCount} finished
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditNameValue(openedAuthor.name);
                    setEditError(null);
                    setIsEditingName(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#131318] border border-white/[0.1] text-xs font-medium text-[#F2EDE4] hover:border-[#D99B43]/50 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-[#D99B43]" />
                  <span>Edit Author Name</span>
                </button>

                {authors.length >= 2 && (
                  <button
                    type="button"
                    onClick={() => openMergeModal(openedAuthor.name)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#131318] border border-white/[0.1] text-xs font-medium text-[#A69F93] hover:text-[#F2EDE4] hover:border-white/25 cursor-pointer"
                  >
                    <GitMerge className="w-3.5 h-3.5" />
                    <span>Merge Duplicate</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-6 gap-y-9">
          {openedAuthor.books.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              coverUrl={coverUrls[book.id]}
              onSelect={onSelectBook}
              menuHandlers={bookMenuHandlers}
            />
          ))}
        </div>

        {showMergeModal && (
          <MergeAuthorsDialog
            authors={authors}
            mergeSources={mergeSources}
            mergeTarget={mergeTarget}
            mergeError={mergeError}
            onToggleSource={toggleMergeSource}
            onChangeTarget={setMergeTarget}
            onClose={() => setShowMergeModal(false)}
            onSubmit={handleConfirmMerge}
          />
        )}
      </section>
    );
  }

  return (
    <section aria-labelledby="authors-heading" className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div className="space-y-2">
          <h1
            id="authors-heading"
            className="font-serif text-3xl sm:text-4xl font-medium tracking-tight text-[#F2EDE4]"
          >
            Authors
          </h1>
          <p className="text-sm text-[#A69F93] tabular-nums">
            {authors.length} {authors.length === 1 ? 'author' : 'authors'}{' '}
            indexed from your library
          </p>
        </div>

        {authors.length > 0 && (
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search
                className="w-3.5 h-3.5 text-[#6E685F] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter authors..."
                aria-label="Filter authors"
                className="h-9 pl-9 pr-3 rounded-md bg-[#131318] border border-white/[0.09] text-xs text-[#F2EDE4] placeholder:text-[#6E685F] focus:outline-none focus:border-[#D99B43]/70"
              />
            </div>

            <button
              type="button"
              onClick={() => setSortByCount((prev) => !prev)}
              className={`h-9 px-3 rounded-md border text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                sortByCount
                  ? 'bg-[#202029] border-[#D99B43]/50 text-[#E8B15C]'
                  : 'bg-[#131318] border-white/[0.09] text-[#A69F93] hover:text-[#F2EDE4]'
              }`}
            >
              {sortByCount ? 'Sorted: Most Works' : 'Sorted: A–Z'}
            </button>

            {authors.length >= 2 && (
              <button
                type="button"
                onClick={() => openMergeModal()}
                className="h-9 px-3 inline-flex items-center gap-1.5 rounded-md bg-[#18181F] hover:bg-[#22222C] border border-white/[0.12] text-xs font-medium text-[#F2EDE4] whitespace-nowrap shrink-0 cursor-pointer"
              >
                <GitMerge className="w-3.5 h-3.5 text-[#D99B43]" />
                <span>Merge Authors</span>
              </button>
            )}
          </div>
        )}
      </div>

      {authors.length === 0 ? (
        <div className="py-20 px-6 rounded-lg border border-white/[0.08] bg-[#0E0E12] text-center max-w-2xl mx-auto">
          <div className="w-12 h-12 rounded-md bg-[#18181F] border border-white/[0.08] flex items-center justify-center mx-auto mb-5 text-[#D99B43]">
            <Users className="w-5 h-5" aria-hidden="true" />
          </div>
          <h2 className="font-serif text-2xl font-medium text-[#F2EDE4]">
            No authors indexed yet
          </h2>
          <p className="mt-2 text-sm text-[#A69F93] max-w-md mx-auto">
            Authors are automatically organized from your imported EPUB
            volumes.
          </p>
        </div>
      ) : filteredAuthors.length === 0 ? (
        <div className="py-16 px-6 rounded-lg border border-white/[0.08] bg-[#0E0E12] text-center">
          <p className="font-serif text-xl text-[#F2EDE4]">
            No authors match &ldquo;{searchQuery}&rdquo;
          </p>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="mt-4 px-4 py-2 rounded-md border border-white/[0.14] text-xs text-[#F2EDE4] hover:border-[#D99B43] cursor-pointer"
          >
            Clear Search
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAuthors.map((author) => (
            <button
              key={author.name}
              type="button"
              onClick={() => handleOpenAuthorPage(author.name)}
              className="group p-4 rounded-lg bg-[#111116] border border-white/[0.08] hover:border-[#D99B43]/50 transition-colors flex items-center gap-4 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D99B43]"
            >
              <div className="w-11 h-11 rounded-md bg-[#18181F] border border-white/[0.08] group-hover:border-[#D99B43]/40 flex items-center justify-center font-serif text-sm font-medium text-[#E8B15C] shrink-0">
                {getAuthorInitials(author.name)}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-serif text-lg font-medium text-[#F2EDE4] group-hover:text-[#E8B15C] transition-colors truncate">
                  {author.name}
                </h2>
                <p className="text-xs text-[#A69F93] tabular-nums">
                  {author.bookCount}{' '}
                  {author.bookCount === 1 ? 'book' : 'books'} ·{' '}
                  {author.finishedCount} finished
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {showMergeModal && (
        <MergeAuthorsDialog
          authors={authors}
          mergeSources={mergeSources}
          mergeTarget={mergeTarget}
          mergeError={mergeError}
          onToggleSource={toggleMergeSource}
          onChangeTarget={setMergeTarget}
          onClose={() => setShowMergeModal(false)}
          onSubmit={handleConfirmMerge}
        />
      )}
    </section>
  );
}

interface MergeAuthorsDialogProps {
  authors: AuthorSummary[];
  mergeSources: string[];
  mergeTarget: string;
  mergeError: string | null;
  onToggleSource: (name: string) => void;
  onChangeTarget: (name: string) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
}

function MergeAuthorsDialog({
  authors,
  mergeSources,
  mergeTarget,
  mergeError,
  onToggleSource,
  onChangeTarget,
  onClose,
  onSubmit,
}: MergeAuthorsDialogProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="merge-authors-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={(e) => void onSubmit(e)}
        className="w-full max-w-md rounded-lg bg-[#111116] border border-white/[0.12] shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <GitMerge className="w-4 h-4 text-[#D99B43]" />
            <h2
              id="merge-authors-title"
              className="font-serif text-lg font-medium text-[#F2EDE4]"
            >
              Merge Duplicate Authors
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-md text-[#A69F93] hover:text-[#F2EDE4] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {mergeError && (
            <p className="text-xs text-red-300">{mergeError}</p>
          )}

          <div className="space-y-1.5">
            <span className="block text-xs text-[#A69F93]">
              1. Select duplicate author entries to combine
            </span>
            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
              {authors.map((author) => {
                const checked = mergeSources.some(
                  (s) => s.toLowerCase() === author.name.toLowerCase()
                );
                return (
                  <button
                    key={author.name}
                    type="button"
                    onClick={() => onToggleSource(author.name)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-md border text-left text-xs transition-colors cursor-pointer ${
                      checked
                        ? 'bg-[#D99B43]/12 border-[#D99B43]/50 text-[#F2EDE4]'
                        : 'bg-[#18181F] border-white/[0.06] text-[#A69F93] hover:text-[#F2EDE4]'
                    }`}
                  >
                    <span className="truncate font-medium">
                      {author.name}{' '}
                      <span className="font-mono text-[#6E685F]">
                        ({author.bookCount})
                      </span>
                    </span>
                    <span
                      className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                        checked
                          ? 'bg-[#D99B43] border-[#D99B43] text-[#08080A]'
                          : 'border-white/20'
                      }`}
                    >
                      {checked && <Check className="w-3 h-3 stroke-[2.5]" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label
              htmlFor="merge-target-name"
              className="block text-xs text-[#A69F93] mb-1.5"
            >
              2. Canonical Author Name
            </label>
            <input
              id="merge-target-name"
              type="text"
              value={mergeTarget}
              onChange={(e) => onChangeTarget(e.target.value)}
              placeholder="Enter final unified author name..."
              className="w-full h-10 px-3 rounded-md bg-[#18181F] border border-white/[0.1] text-sm text-[#F2EDE4] placeholder:text-[#6E685F] focus:outline-none focus:border-[#D99B43]"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-white/[0.08] bg-[#0D0D11] flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-md border border-white/[0.12] text-xs text-[#A69F93] hover:text-[#F2EDE4] cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={mergeSources.length < 2 || !mergeTarget.trim()}
            className="px-4 py-2 rounded-md bg-[#D99B43] hover:bg-[#E8B15C] disabled:opacity-40 text-[#08080A] text-xs font-semibold cursor-pointer"
          >
            Merge Authors
          </button>
        </div>
      </form>
    </div>
  );
}
