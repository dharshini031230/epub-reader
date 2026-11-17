import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  Edit3,
  FolderPlus,
  Library,
  Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { groupBooksBySeries } from '../services/libraryDomainService';
import type { Book, SeriesGroup, SeriesRecord } from '../types/library';
import { BookCard, type BookMenuHandlers } from './BookCard';
import { BookCover } from './BookCover';
import { EntityDeleteModal } from './EntityDeleteModal';

interface SeriesViewProps {
  books: Book[];
  seriesRecords: SeriesRecord[];
  coverUrls: Record<string, string>;
  onCreateSeries: (name: string, description: string) => Promise<SeriesRecord>;
  onUpdateSeries: (
    id: string,
    patch: { name?: string; description?: string }
  ) => Promise<SeriesRecord>;
  onDeleteSeries: (id: string) => Promise<void>;
  onSetBookSeries: (
    bookId: string,
    seriesName: string,
    seriesIndex: number | null
  ) => Promise<Book>;
  onReorderSeriesBooks: (
    seriesName: string,
    orderedBookIds: string[]
  ) => Promise<void>;
  onSelectBook: (book: Book) => void;
  bookMenuHandlers: BookMenuHandlers;
  onNotify: (message: string) => void;
}

export function SeriesView({
  books,
  seriesRecords,
  coverUrls,
  onCreateSeries,
  onUpdateSeries,
  onDeleteSeries,
  onSetBookSeries,
  onReorderSeriesBooks,
  onSelectBook,
  bookMenuHandlers,
  onNotify,
}: SeriesViewProps) {
  const seriesGroups = useMemo(
    () => groupBooksBySeries(books, seriesRecords),
    [books, seriesRecords]
  );

  const [selectedSeriesName, setSelectedSeriesName] = useState<string | null>(
    null
  );
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const [isEditingSelected, setIsEditingSelected] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  const [showManageOrder, setShowManageOrder] = useState(false);
  const [seriesPendingDelete, setSeriesPendingDelete] =
    useState<SeriesGroup | null>(null);

  const selectedSeries = useMemo(() => {
    if (!selectedSeriesName) return null;
    return (
      seriesGroups.find(
        (s) => s.name.toLowerCase() === selectedSeriesName.toLowerCase()
      ) ?? null
    );
  }, [seriesGroups, selectedSeriesName]);

  const handleCreateSeries = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!newName.trim()) {
      setFormError('Please provide a series name.');
      return;
    }
    try {
      const created = await onCreateSeries(newName, newDescription);
      setNewName('');
      setNewDescription('');
      setShowCreateForm(false);
      setSelectedSeriesName(created.name);
      onNotify(`Created series "${created.name}".`);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Unable to create series.'
      );
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSeries) return;
    setEditError(null);
    if (!editName.trim()) {
      setEditError('Series name cannot be empty.');
      return;
    }
    try {
      if (selectedSeries.id) {
        const updated = await onUpdateSeries(selectedSeries.id, {
          name: editName,
          description: editDescription,
        });
        setSelectedSeriesName(updated.name);
        onNotify(`Updated series "${updated.name}".`);
      } else {
        // Materialize legacy book-only series record if needed
        const created = await onCreateSeries(editName, editDescription);
        for (const book of selectedSeries.books) {
          await onSetBookSeries(book.id, created.name, book.seriesIndex);
        }
        setSelectedSeriesName(created.name);
        onNotify(`Updated series "${created.name}".`);
      }
      setIsEditingSelected(false);
    } catch (err) {
      setEditError(
        err instanceof Error ? err.message : 'Unable to update series.'
      );
    }
  };

  const handleConfirmDeleteSeries = async () => {
    if (!seriesPendingDelete) return;
    const target = seriesPendingDelete;
    if (target.id) {
      await onDeleteSeries(target.id);
    } else {
      for (const book of target.books) {
        await onSetBookSeries(book.id, '', null);
      }
    }
    setSeriesPendingDelete(null);
    if (
      selectedSeriesName &&
      selectedSeriesName.toLowerCase() === target.name.toLowerCase()
    ) {
      setSelectedSeriesName(null);
    }
    onNotify(
      `Deleted series "${target.name}". All books remain safely in your library.`
    );
  };

  const handleToggleBookInSeries = async (book: Book) => {
    if (!selectedSeries) return;
    const inSeries =
      book.seriesName.trim().toLowerCase() ===
      selectedSeries.name.toLowerCase();
    if (inSeries) {
      await onSetBookSeries(book.id, '', null);
    } else {
      const nextIndex = selectedSeries.books.length + 1;
      await onSetBookSeries(book.id, selectedSeries.name, nextIndex);
    }
  };

  const handleMoveBook = async (index: number, direction: -1 | 1) => {
    if (!selectedSeries) return;
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= selectedSeries.books.length) return;
    const ids = selectedSeries.books.map((b) => b.id);
    const temp = ids[index];
    ids[index] = ids[targetIdx];
    ids[targetIdx] = temp;
    await onReorderSeriesBooks(selectedSeries.name, ids);
  };

  const handleNumberChange = async (book: Book, rawValue: string) => {
    const trimmed = rawValue.trim();
    const nextNum =
      trimmed === ''
        ? null
        : Number.isFinite(Number(trimmed))
          ? Math.round(Number(trimmed) * 100) / 100
          : book.seriesIndex;
    await onSetBookSeries(book.id, selectedSeries?.name ?? book.seriesName, nextNum);
  };

  if (selectedSeries) {
    return (
      <section aria-labelledby="series-detail-title" className="space-y-8">
        <div className="space-y-4 pb-6 border-b border-white/[0.08]">
          <button
            type="button"
            onClick={() => {
              setSelectedSeriesName(null);
              setIsEditingSelected(false);
              setShowManageOrder(false);
              setEditError(null);
            }}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#A69F93] hover:text-[#E8B15C] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>All Series</span>
          </button>

          {isEditingSelected ? (
            <form
              onSubmit={(e) => void handleSaveEdit(e)}
              className="max-w-xl space-y-3"
            >
              {editError && (
                <p className="text-xs text-red-300">{editError}</p>
              )}
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                aria-label="Series name"
                className="w-full h-10 px-3 rounded-md bg-[#131318] border border-white/[0.12] font-serif text-lg text-[#F2EDE4] focus:outline-none focus:border-[#D99B43]"
              />
              <textarea
                rows={2}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Series description..."
                className="w-full p-3 rounded-md bg-[#131318] border border-white/[0.12] text-sm text-[#F2EDE4] placeholder:text-[#6E685F] focus:outline-none focus:border-[#D99B43]"
              />
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-md bg-[#D99B43] hover:bg-[#E8B15C] text-[#08080A] text-xs font-semibold cursor-pointer"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingSelected(false);
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
              <div className="space-y-1.5">
                <h1
                  id="series-detail-title"
                  className="font-serif text-3xl sm:text-4xl font-medium text-[#F2EDE4]"
                >
                  {selectedSeries.name}
                </h1>
                {selectedSeries.description && (
                  <p className="text-sm text-[#A69F93] max-w-2xl">
                    {selectedSeries.description}
                  </p>
                )}
                <p className="text-xs text-[#6E685F] tabular-nums flex items-center gap-2">
                  <span>
                    {selectedSeries.books.length}{' '}
                    {selectedSeries.books.length === 1 ? 'book' : 'books'}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {selectedSeries.finishedCount} finished
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono text-[#D99B43]">
                    {selectedSeries.averageProgress}% overall
                  </span>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowManageOrder((prev) => !prev)}
                  className={`px-3.5 py-2 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                    showManageOrder
                      ? 'bg-[#D99B43]/15 border-[#D99B43]/60 text-[#E8B15C]'
                      : 'bg-[#131318] border-white/[0.1] text-[#F2EDE4] hover:border-white/25'
                  }`}
                >
                  {showManageOrder
                    ? 'Done Arranging'
                    : 'Arrange Order & Books'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditName(selectedSeries.name);
                    setEditDescription(selectedSeries.description);
                    setEditError(null);
                    setIsEditingSelected(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#131318] border border-white/[0.1] text-xs text-[#A69F93] hover:text-[#F2EDE4] cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSeriesPendingDelete(selectedSeries)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#131318] border border-white/[0.1] text-xs text-[#A69F93] hover:text-red-400 hover:border-red-500/40 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Reading Order & Membership Editor */}
        {showManageOrder && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-5 rounded-lg bg-[#111116] border border-white/[0.08] space-y-3">
              <h2 className="text-xs font-medium text-[#A69F93]">
                Reading Order &amp; Book Numbers
              </h2>
              {selectedSeries.books.length === 0 ? (
                <p className="text-xs text-[#6E685F]">
                  Add books from the library list on the right to set their
                  reading order.
                </p>
              ) : (
                <ol className="space-y-2">
                  {selectedSeries.books.map((book, idx) => (
                    <li
                      key={book.id}
                      className="flex items-center gap-2.5 p-2.5 rounded-md bg-[#16161C] border border-white/[0.06]"
                    >
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        defaultValue={
                          book.seriesIndex !== null ? book.seriesIndex : ''
                        }
                        key={`${book.id}-${book.seriesIndex ?? 'none'}`}
                        onBlur={(e) =>
                          void handleNumberChange(book, e.target.value)
                        }
                        aria-label={`Volume number for ${book.title}`}
                        placeholder="#"
                        className="w-14 h-8 px-2 rounded bg-[#0E0E12] border border-white/[0.1] text-xs font-mono tabular-nums text-[#F2EDE4] text-center focus:outline-none focus:border-[#D99B43]"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[#F2EDE4] truncate">
                          {book.title}
                        </p>
                        <p className="text-[11px] text-[#6E685F] truncate">
                          {book.authors.join(', ')}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => void handleMoveBook(idx, -1)}
                          disabled={idx === 0}
                          aria-label={`Move ${book.title} earlier`}
                          className="p-1.5 rounded bg-[#1D1D25] disabled:opacity-30 text-[#A69F93] hover:text-[#F2EDE4] cursor-pointer"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleMoveBook(idx, 1)}
                          disabled={idx === selectedSeries.books.length - 1}
                          aria-label={`Move ${book.title} later`}
                          className="p-1.5 rounded bg-[#1D1D25] disabled:opacity-30 text-[#A69F93] hover:text-[#F2EDE4] cursor-pointer"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            <div className="p-5 rounded-lg bg-[#111116] border border-white/[0.08] space-y-3">
              <h2 className="text-xs font-medium text-[#A69F93]">
                Add or Remove Library Books
              </h2>
              {books.length === 0 ? (
                <p className="text-xs text-[#6E685F]">
                  No books in your library yet.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {books.map((book) => {
                    const included =
                      book.seriesName.trim().toLowerCase() ===
                      selectedSeries.name.toLowerCase();
                    return (
                      <button
                        key={book.id}
                        type="button"
                        onClick={() => void handleToggleBookInSeries(book)}
                        className={`w-full flex items-center gap-3 p-2.5 rounded-md border text-left transition-colors cursor-pointer ${
                          included
                            ? 'bg-[#D99B43]/12 border-[#D99B43]/50 text-[#F2EDE4]'
                            : 'bg-[#16161C] border-white/[0.06] text-[#A69F93] hover:border-white/[0.16]'
                        }`}
                      >
                        <span
                          className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                            included
                              ? 'bg-[#D99B43] border-[#D99B43] text-[#08080A]'
                              : 'border-white/20'
                          }`}
                        >
                          {included && (
                            <Check className="w-3 h-3 stroke-[2.5]" />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium truncate">
                            {book.title}
                          </p>
                          <p className="text-[11px] text-[#6E685F] truncate">
                            {book.seriesName && !included
                              ? `Currently in ${book.seriesName}`
                              : book.authors.join(', ')}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {selectedSeries.books.length === 0 ? (
          <div className="py-16 px-6 rounded-lg border border-white/[0.08] bg-[#0E0E12] text-center">
            <p className="font-serif text-xl text-[#F2EDE4]">
              No books assigned to this series yet
            </p>
            <p className="mt-1.5 text-sm text-[#A69F93]">
              Click &ldquo;Arrange Order &amp; Books&rdquo; above or use
              &ldquo;Manage series&rdquo; from any book&apos;s menu.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-6 gap-y-9">
            {selectedSeries.books.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                coverUrl={coverUrls[book.id]}
                onSelect={onSelectBook}
                menuHandlers={bookMenuHandlers}
                seriesBadgeText={
                  book.seriesIndex !== null
                    ? `Book ${book.seriesIndex}`
                    : 'Unnumbered'
                }
              />
            ))}
          </div>
        )}

        <EntityDeleteModal
          isOpen={Boolean(seriesPendingDelete)}
          entityType="series"
          entityName={seriesPendingDelete?.name ?? ''}
          bookCount={seriesPendingDelete?.books.length ?? 0}
          onCancel={() => setSeriesPendingDelete(null)}
          onConfirm={handleConfirmDeleteSeries}
        />
      </section>
    );
  }

  return (
    <section aria-labelledby="series-heading" className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div className="space-y-2">
          <h1
            id="series-heading"
            className="font-serif text-3xl sm:text-4xl font-medium tracking-tight text-[#F2EDE4]"
          >
            Series
          </h1>
          <p className="text-sm text-[#A69F93] tabular-nums">
            {seriesGroups.length} literary{' '}
            {seriesGroups.length === 1 ? 'series' : 'series'} cataloged
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateForm((prev) => !prev)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#18181F] hover:bg-[#22222C] border border-white/[0.12] text-xs font-medium text-[#F2EDE4] transition-colors self-start sm:self-auto whitespace-nowrap shrink-0 cursor-pointer"
        >
          <FolderPlus className="w-4 h-4 text-[#D99B43]" />
          <span>New Series</span>
        </button>
      </div>

      {showCreateForm && (
        <form
          onSubmit={(e) => void handleCreateSeries(e)}
          className="p-6 rounded-lg bg-[#111116] border border-white/[0.1] max-w-xl space-y-4"
        >
          <h2 className="font-serif text-lg text-[#F2EDE4]">
            Create a New Series
          </h2>
          {formError && <p className="text-xs text-red-300">{formError}</p>}
          <div>
            <label
              htmlFor="new-series-name"
              className="block text-xs text-[#A69F93] mb-1.5"
            >
              Series Name
            </label>
            <input
              id="new-series-name"
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Earthsea Cycle, The Neapolitan Novels"
              className="w-full h-10 px-3 rounded-md bg-[#18181F] border border-white/[0.1] text-sm text-[#F2EDE4] placeholder:text-[#6E685F] focus:outline-none focus:border-[#D99B43]"
            />
          </div>
          <div>
            <label
              htmlFor="new-series-desc"
              className="block text-xs text-[#A69F93] mb-1.5"
            >
              Description <span className="text-[#6E685F]">(optional)</span>
            </label>
            <textarea
              id="new-series-desc"
              rows={2}
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Notes on reading order, scope, or edition..."
              className="w-full p-3 rounded-md bg-[#18181F] border border-white/[0.1] text-sm text-[#F2EDE4] placeholder:text-[#6E685F] focus:outline-none focus:border-[#D99B43]"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="px-4 py-2 rounded-md bg-[#D99B43] hover:bg-[#E8B15C] text-[#08080A] text-xs font-semibold cursor-pointer"
            >
              Create Series
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCreateForm(false);
                setFormError(null);
              }}
              className="px-4 py-2 rounded-md border border-white/[0.12] text-xs text-[#A69F93] hover:text-[#F2EDE4] cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {seriesGroups.length === 0 ? (
        <div className="py-20 px-6 rounded-lg border border-white/[0.08] bg-[#0E0E12] text-center max-w-2xl mx-auto">
          <div className="w-12 h-12 rounded-md bg-[#18181F] border border-white/[0.08] flex items-center justify-center mx-auto mb-5 text-[#D99B43]">
            <Library className="w-5 h-5" aria-hidden="true" />
          </div>
          <h2 className="font-serif text-2xl font-medium text-[#F2EDE4]">
            No book series created yet
          </h2>
          <p className="mt-2 text-sm text-[#A69F93] max-w-md mx-auto">
            Create a literary series to group multi-volume works, assign volume
            numbers, and arrange them in reading order.
          </p>
          <button
            type="button"
            onClick={() => setShowCreateForm(true)}
            className="mt-6 px-5 py-2.5 rounded-md bg-[#D99B43] hover:bg-[#E8B15C] text-[#08080A] text-sm font-semibold transition-colors cursor-pointer"
          >
            Create First Series
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {seriesGroups.map((series) => {
            const previewBooks = series.books.slice(0, 4);
            return (
              <button
                key={series.name}
                type="button"
                onClick={() => setSelectedSeriesName(series.name)}
                className="group text-left p-5 rounded-lg bg-[#111116] border border-white/[0.08] hover:border-[#D99B43]/50 transition-colors flex flex-col gap-4 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D99B43]"
              >
                <div className="h-28 rounded-md bg-[#0B0B0E] border border-white/[0.06] p-2.5 flex items-center gap-2 overflow-hidden">
                  {previewBooks.length > 0 ? (
                    previewBooks.map((book) => (
                      <div
                        key={book.id}
                        className="h-full aspect-[2/3] rounded-xs overflow-hidden border border-white/[0.08] shrink-0"
                      >
                        <BookCover
                          title={book.title}
                          author={book.authors[0] ?? ''}
                          coverUrl={coverUrls[book.id]}
                          size="sm"
                        />
                      </div>
                    ))
                  ) : (
                    <span className="text-xs text-[#6E685F] pl-1">
                      No books assigned
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 className="font-serif text-xl font-medium text-[#F2EDE4] group-hover:text-[#E8B15C] transition-colors truncate">
                      {series.name}
                    </h2>
                    <span className="font-mono text-xs tabular-nums text-[#6E685F] shrink-0">
                      {series.books.length}{' '}
                      {series.books.length === 1 ? 'book' : 'books'}
                    </span>
                  </div>
                  {series.description && (
                    <p className="text-xs text-[#A69F93] line-clamp-2">
                      {series.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 pt-1">
                    <div className="flex-1 h-1 rounded-full bg-white/[0.08] overflow-hidden">
                      <div
                        className="h-full bg-[#D99B43]"
                        style={{ width: `${series.averageProgress}%` }}
                      />
                    </div>
                    <span className="font-mono text-[11px] tabular-nums text-[#A69F93]">
                      {series.averageProgress}%
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
