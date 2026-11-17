import {
  ArrowDownUp,
  BookOpen,
  Download,
  Plus,
  Search,
  Upload,
  X,
} from 'lucide-react';
import { useMemo } from 'react';
import {
  READING_STATUS_OPTIONS,
  buildBookCollectionNamesMap,
  computeLibraryStats,
  filterAndSortBooks,
  formatBytes,
  summarizeTags,
} from '../services/libraryDomainService';
import type {
  Book,
  BookSortField,
  Collection,
  LibraryFilterState,
  ReadingStatus,
  TagRecord,
} from '../types/library';
import { BookCard, type BookMenuHandlers } from './BookCard';

interface ShelfViewProps {
  books: Book[];
  collections: Collection[];
  tagRecords: TagRecord[];
  coverUrls: Record<string, string>;
  filterState: LibraryFilterState;
  onFilterChange: (next: Partial<LibraryFilterState>) => void;
  onResetFilters: () => void;
  onSelectBook: (book: Book) => void;
  bookMenuHandlers: BookMenuHandlers;
  onOpenImport: () => void;
  isLoading: boolean;
  showBackupReminder?: boolean;
  onOpenBackup?: () => void;
  onDismissBackupReminder?: () => void;
}

const SORT_OPTIONS: { value: BookSortField; label: string }[] = [
  { value: 'addedAt', label: 'Recently Added' },
  { value: 'lastOpenedAt', label: 'Recently Opened' },
  { value: 'title', label: 'Alphabetical Title' },
  { value: 'author', label: 'Author' },
  { value: 'publishedYear', label: 'Publication Date' },
  { value: 'progress', label: 'Reading Progress' },
];

export function ShelfView({
  books,
  collections,
  tagRecords,
  coverUrls,
  filterState,
  onFilterChange,
  onResetFilters,
  onSelectBook,
  bookMenuHandlers,
  onOpenImport,
  isLoading,
  showBackupReminder = false,
  onOpenBackup,
  onDismissBackupReminder,
}: ShelfViewProps) {
  const stats = useMemo(() => computeLibraryStats(books), [books]);

  const bookCollectionNamesMap = useMemo(
    () => buildBookCollectionNamesMap(collections),
    [collections]
  );

  const selectedCollectionBookIds = useMemo(() => {
    if (!filterState.collectionIdFilter) return undefined;
    const match = collections.find(
      (c) => c.id === filterState.collectionIdFilter
    );
    return match ? new Set(match.bookIds) : new Set<string>();
  }, [collections, filterState.collectionIdFilter]);

  const availableTags = useMemo(
    () => summarizeTags(books, tagRecords),
    [books, tagRecords]
  );

  const filteredBooks = useMemo(
    () =>
      filterAndSortBooks(
        books,
        filterState,
        selectedCollectionBookIds,
        bookCollectionNamesMap
      ),
    [books, filterState, selectedCollectionBookIds, bookCollectionNamesMap]
  );

  const statusTabs: {
    value: ReadingStatus | 'all';
    label: string;
    count: number;
  }[] = [
    { value: 'all', label: 'All', count: stats.totalBooks },
    { value: 'to-read', label: 'To Read', count: stats.toReadCount },
    { value: 'reading', label: 'Reading', count: stats.readingCount },
    { value: 'finished', label: 'Finished', count: stats.finishedCount },
    { value: 'paused', label: 'Paused', count: stats.pausedCount },
    { value: 'dropped', label: 'Dropped', count: stats.droppedCount },
  ];

  const hasActiveScope = Boolean(
    filterState.tagFilter ||
      filterState.authorFilter ||
      filterState.seriesFilter ||
      filterState.collectionIdFilter ||
      filterState.searchQuery.trim() ||
      filterState.statusFilter !== 'all'
  );

  const activeCollectionName = filterState.collectionIdFilter
    ? collections.find((c) => c.id === filterState.collectionIdFilter)?.name
    : null;

  const headingTitle = filterState.authorFilter
    ? `Works by ${filterState.authorFilter}`
    : filterState.seriesFilter
      ? `Series: ${filterState.seriesFilter}`
      : activeCollectionName
        ? `Collection: ${activeCollectionName}`
        : filterState.tagFilter
          ? `Tagged: ${filterState.tagFilter}`
          : 'Shelf';

  return (
    <section aria-labelledby="shelf-heading" className="space-y-8">
      {/* Editorial Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div className="space-y-2">
          <h1
            id="shelf-heading"
            className="font-serif text-3xl sm:text-4xl font-medium tracking-tight text-[#F2EDE4]"
          >
            {headingTitle}
          </h1>
          <p className="text-sm text-[#A69F93] tabular-nums flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>
              {stats.totalBooks}{' '}
              {stats.totalBooks === 1 ? 'volume' : 'volumes'}
            </span>
            <span aria-hidden="true">·</span>
            <span>{stats.readingCount} reading</span>
            <span aria-hidden="true">·</span>
            <span>{stats.finishedCount} finished</span>
            {stats.totalBytes > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono text-xs text-[#6E685F]">
                  {formatBytes(stats.totalBytes)} local archive
                </span>
              </>
            )}
          </p>
        </div>

        {(filterState.authorFilter ||
          filterState.tagFilter ||
          filterState.seriesFilter ||
          filterState.collectionIdFilter) && (
          <button
            type="button"
            onClick={() =>
              onFilterChange({
                authorFilter: null,
                tagFilter: null,
                seriesFilter: null,
                collectionIdFilter: null,
              })
            }
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-white/[0.12] text-xs font-medium text-[#F2EDE4] hover:border-[#D99B43]/60 hover:text-[#E8B15C] transition-colors self-start sm:self-auto whitespace-nowrap shrink-0 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Clear scope</span>
          </button>
        )}
      </div>

      {/* Non-intrusive Backup Reminder Banner */}
      {showBackupReminder && onOpenBackup && onDismissBackupReminder && (
        <div
          role="region"
          aria-label="Library backup reminder"
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 rounded-md bg-[#121217] border border-[#D99B43]/30 text-xs"
        >
          <p className="text-[#C8C1B6] leading-relaxed">
            Keep your local books, customised covers, reading progress, and
            notes safe by saving a periodic ZIP backup.
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onOpenBackup}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#D99B43] hover:bg-[#E8B15C] text-[#08080A] font-semibold cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Backup</span>
            </button>
            <button
              type="button"
              onClick={onDismissBackupReminder}
              className="px-2.5 py-1.5 rounded-md text-[#A69F93] hover:text-[#F2EDE4] cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Controls Toolbar */}
      {books.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Global Search */}
            <div className="relative flex-1 max-w-lg">
              <Search
                className="w-4 h-4 text-[#6E685F] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                value={filterState.searchQuery}
                onChange={(e) =>
                  onFilterChange({ searchQuery: e.target.value })
                }
                placeholder="Search title, author, series, collection, or tag..."
                aria-label="Search library"
                className="w-full h-10 pl-10 pr-9 rounded-md bg-[#131318] border border-white/[0.09] text-sm text-[#F2EDE4] placeholder:text-[#6E685F] focus:outline-none focus:border-[#D99B43]/70 focus:ring-1 focus:ring-[#D99B43]/40 transition-colors"
              />
              {filterState.searchQuery && (
                <button
                  type="button"
                  onClick={() => onFilterChange({ searchQuery: '' })}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#6E685F] hover:text-[#F2EDE4] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Tag Filter & Sort Controls */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              {availableTags.length > 0 && (
                <select
                  aria-label="Filter by tag"
                  value={filterState.tagFilter ?? ''}
                  onChange={(e) =>
                    onFilterChange({ tagFilter: e.target.value || null })
                  }
                  className="h-10 px-3 rounded-md bg-[#131318] border border-white/[0.09] text-xs text-[#F2EDE4] focus:outline-none focus:border-[#D99B43]/70 cursor-pointer max-w-[170px]"
                >
                  <option value="">All Tags</option>
                  {availableTags.map((tag) => (
                    <option key={tag.name} value={tag.name}>
                      {tag.name} ({tag.bookCount})
                    </option>
                  ))}
                </select>
              )}

              <div className="flex items-center gap-2">
                <label
                  htmlFor="shelf-sort-select"
                  className="text-xs text-[#6E685F] whitespace-nowrap"
                >
                  Sort
                </label>
                <select
                  id="shelf-sort-select"
                  value={filterState.sortField}
                  onChange={(e) =>
                    onFilterChange({
                      sortField: e.target.value as BookSortField,
                    })
                  }
                  className="h-10 px-3 rounded-md bg-[#131318] border border-white/[0.09] text-sm text-[#F2EDE4] focus:outline-none focus:border-[#D99B43]/70 cursor-pointer"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() =>
                    onFilterChange({
                      sortDirection:
                        filterState.sortDirection === 'asc' ? 'desc' : 'asc',
                    })
                  }
                  aria-label={`Sort direction: ${
                    filterState.sortDirection === 'asc'
                      ? 'Ascending'
                      : 'Descending'
                  }`}
                  title={
                    filterState.sortDirection === 'asc'
                      ? 'Ascending (click to reverse)'
                      : 'Descending (click to reverse)'
                  }
                  className="h-10 px-3 inline-flex items-center gap-1.5 rounded-md bg-[#131318] border border-white/[0.09] text-xs font-medium text-[#A69F93] hover:text-[#F2EDE4] hover:border-white/20 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <ArrowDownUp className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>
                    {filterState.sortDirection === 'asc' ? 'Asc' : 'Desc'}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Reading Status Filter Tabs */}
          <div
            role="tablist"
            aria-label="Filter by reading status"
            className="flex items-center gap-1.5 overflow-x-auto pb-1"
          >
            {statusTabs.map((tab) => {
              const isSelected = filterState.statusFilter === tab.value;
              return (
                <button
                  key={tab.value}
                  role="tab"
                  type="button"
                  aria-selected={isSelected}
                  onClick={() => onFilterChange({ statusFilter: tab.value })}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D99B43] ${
                    isSelected
                      ? 'bg-[#202029] text-[#F2EDE4] border border-[#D99B43]/50'
                      : 'bg-transparent text-[#A69F93] border border-transparent hover:bg-[#131318] hover:text-[#F2EDE4]'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`font-mono text-[11px] tabular-nums ${
                      isSelected ? 'text-[#D99B43]' : 'text-[#6E685F]'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Content Area */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-6 gap-y-8">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="space-y-3 animate-pulse">
              <div className="aspect-[2/3] rounded-md bg-[#131318] border border-white/[0.06]" />
              <div className="h-4 w-4/5 rounded bg-[#18181F]" />
              <div className="h-3 w-3/5 rounded bg-[#131318]" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-6 gap-y-9">
            {/* Permanent First Grid Item: Book-Shaped Import Shortcut */}
            <div className="group relative flex flex-col">
              <button
                type="button"
                onClick={onOpenImport}
                aria-label="Import EPUB volume"
                title="Import EPUB"
                className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D99B43] focus-visible:ring-offset-4 focus-visible:ring-offset-[#08080A] rounded-md cursor-pointer"
              >
                <div className="relative aspect-[2/3] w-full rounded-md bg-[#131318] border border-white/[0.08] group-hover:border-[#D99B43]/50 group-hover:-translate-y-1 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] shadow-[0_10px_28px_-14px_rgba(0,0,0,0.85)] flex items-center justify-center overflow-hidden">
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 ring-1 ring-inset ring-white/[0.05] pointer-events-none"
                  />
                  <Plus
                    className="w-10 h-10 stroke-[1.5] text-[#6E685F] group-hover:text-[#A69F93] transition-colors"
                    aria-hidden="true"
                  />
                </div>
              </button>
            </div>

            {filteredBooks.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                coverUrl={coverUrls[book.id]}
                onSelect={onSelectBook}
                menuHandlers={bookMenuHandlers}
                seriesBadgeText={
                  book.seriesName
                    ? book.seriesIndex !== null
                      ? `${book.seriesName} · #${book.seriesIndex}`
                      : book.seriesName
                    : undefined
                }
              />
            ))}
          </div>

          {books.length === 0 ? (
            <div className="py-12 px-6 rounded-lg border border-white/[0.08] bg-[#0E0E12] text-center max-w-2xl mx-auto">
              <div className="w-12 h-12 rounded-md bg-[#18181F] border border-white/[0.08] flex items-center justify-center mx-auto mb-4 text-[#D99B43]">
                <BookOpen className="w-5 h-5" aria-hidden="true" />
              </div>
              <h2 className="font-serif text-2xl font-medium text-[#F2EDE4]">
                Your library awaits its first volume
              </h2>
              <p className="mt-2.5 text-sm text-[#A69F93] max-w-md mx-auto leading-relaxed">
                Import DRM-free EPUB files from your device. Folio extracts
                covers, chapters, and bibliographic metadata, storing every book
                privately in your browser&apos;s IndexedDB archive.
              </p>
              <div className="mt-6">
                <button
                  type="button"
                  onClick={onOpenImport}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-[#D99B43] hover:bg-[#E8B15C] text-[#08080A] text-sm font-semibold transition-colors cursor-pointer"
                >
                  <Upload className="w-4 h-4" aria-hidden="true" />
                  <span>Import EPUB Files</span>
                </button>
              </div>
            </div>
          ) : (
            filteredBooks.length === 0 && (
              <div className="py-12 px-6 rounded-lg border border-white/[0.08] bg-[#0E0E12] text-center">
                <p className="font-serif text-xl text-[#F2EDE4]">
                  No volumes match your current search or filters
                </p>
                <p className="mt-2 text-sm text-[#A69F93]">
                  {hasActiveScope
                    ? 'Try another title, author, series, collection, or tag—or reset your active filters.'
                    : 'No books found.'}
                </p>
                <button
                  type="button"
                  onClick={onResetFilters}
                  className="mt-5 px-4 py-2 rounded-md border border-white/[0.14] text-xs font-medium text-[#F2EDE4] hover:border-[#D99B43] hover:text-[#E8B15C] transition-colors cursor-pointer"
                >
                  Reset Filters
                </button>
              </div>
            )
          )}
        </div>
      )}
    </section>
  );
}

export { READING_STATUS_OPTIONS };
