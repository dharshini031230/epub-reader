import type {
  AuthorSummary,
  Book,
  Collection,
  LibraryFilterState,
  LibraryStats,
  ReadingStatus,
  SeriesGroup,
  SeriesRecord,
  TagRecord,
  TagSummary,
} from '../types/library';

export interface ReadingStatusOption {
  value: ReadingStatus;
  label: string;
  shortLabel: string;
}

export const READING_STATUS_OPTIONS: ReadingStatusOption[] = [
  { value: 'to-read', label: 'To Read', shortLabel: 'To Read' },
  { value: 'reading', label: 'Reading', shortLabel: 'Reading' },
  { value: 'finished', label: 'Finished', shortLabel: 'Finished' },
  { value: 'paused', label: 'Paused', shortLabel: 'Paused' },
  { value: 'dropped', label: 'Dropped', shortLabel: 'Dropped' },
];

export function getReadingStatusLabel(status: ReadingStatus): string {
  const match = READING_STATUS_OPTIONS.find((opt) => opt.value === status);
  return match ? match.label : 'To Read';
}

export function normalizeAuthors(raw: string): string[] {
  const items = raw
    .split(/[,;&]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
  return items.length > 0 ? Array.from(new Set(items)) : ['Unknown Author'];
}

export function normalizeTags(raw: string): string[] {
  const items = raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  const seen = new Map<string, string>();
  for (const tag of items) {
    const key = tag.toLowerCase();
    if (!seen.has(key)) {
      seen.set(key, tag);
    }
  }
  return Array.from(seen.values());
}

export function parseSeriesIndex(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100) / 100;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );
  const value = bytes / Math.pow(1024, exponent);
  return `${value >= 10 || exponent === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[exponent]}`;
}

export function formatShortDate(timestamp: number | null): string {
  if (!timestamp) return 'Never';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(timestamp));
}

export function getAuthorInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export async function computeSha256(buffer: ArrayBuffer): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const bytes = new Uint8Array(hashBuffer);
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  const view = new Uint8Array(buffer);
  let acc = 2166136261;
  const step = Math.max(1, Math.floor(view.length / 4096));
  for (let i = 0; i < view.length; i += step) {
    acc ^= view[i];
    acc = Math.imul(acc, 16777619);
  }
  return `fnv-${view.length}-${(acc >>> 0).toString(16)}`;
}

export function computeLibraryStats(books: Book[]): LibraryStats {
  const stats: LibraryStats = {
    totalBooks: books.length,
    toReadCount: 0,
    readingCount: 0,
    finishedCount: 0,
    pausedCount: 0,
    droppedCount: 0,
    totalBytes: 0,
  };

  for (const book of books) {
    stats.totalBytes += book.fileSize;
    switch (book.status) {
      case 'to-read':
        stats.toReadCount += 1;
        break;
      case 'reading':
        stats.readingCount += 1;
        break;
      case 'finished':
        stats.finishedCount += 1;
        break;
      case 'paused':
        stats.pausedCount += 1;
        break;
      case 'dropped':
        stats.droppedCount += 1;
        break;
    }
  }
  return stats;
}

export function buildBookCollectionNamesMap(
  collections: Collection[]
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const col of collections) {
    for (const bookId of col.bookIds) {
      const existing = map.get(bookId);
      if (existing) {
        existing.push(col.name);
      } else {
        map.set(bookId, [col.name]);
      }
    }
  }
  return map;
}

export function filterAndSortBooks(
  books: Book[],
  filter: LibraryFilterState,
  collectionBookIds?: Set<string>,
  bookCollectionNamesMap?: Map<string, string[]>
): Book[] {
  const query = filter.searchQuery.trim().toLowerCase();

  const filtered = books.filter((book) => {
    if (filter.statusFilter !== 'all' && book.status !== filter.statusFilter) {
      return false;
    }

    if (
      filter.tagFilter &&
      !book.tagNames.some(
        (tag) => tag.toLowerCase() === filter.tagFilter!.toLowerCase()
      )
    ) {
      return false;
    }

    if (
      filter.authorFilter &&
      !book.authors.some(
        (author) => author.toLowerCase() === filter.authorFilter!.toLowerCase()
      )
    ) {
      return false;
    }

    if (
      filter.seriesFilter &&
      book.seriesName.trim().toLowerCase() !==
        filter.seriesFilter.trim().toLowerCase()
    ) {
      return false;
    }

    if (collectionBookIds && !collectionBookIds.has(book.id)) {
      return false;
    }

    if (!query) return true;

    const collectionNames = bookCollectionNamesMap?.get(book.id) ?? [];

    const haystack = [
      book.title,
      ...book.authors,
      book.publisher,
      book.seriesName,
      ...collectionNames,
      ...book.tagNames,
      book.identifier,
      book.publishedYear,
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(query);
  });

  const multiplier = filter.sortDirection === 'asc' ? 1 : -1;

  return [...filtered].sort((a, b) => {
    switch (filter.sortField) {
      case 'title':
        return a.title.localeCompare(b.title) * multiplier;
      case 'author': {
        const authorA = a.authors[0] ?? '';
        const authorB = b.authors[0] ?? '';
        const cmp = authorA.localeCompare(authorB);
        return (cmp !== 0 ? cmp : a.title.localeCompare(b.title)) * multiplier;
      }
      case 'lastOpenedAt':
        return ((a.lastOpenedAt ?? 0) - (b.lastOpenedAt ?? 0)) * multiplier;
      case 'progress':
        return (a.progress - b.progress) * multiplier;
      case 'publishedYear': {
        const yearA = parseInt(a.publishedYear, 10) || 0;
        const yearB = parseInt(b.publishedYear, 10) || 0;
        return (yearA - yearB) * multiplier;
      }
      case 'addedAt':
      default:
        return (a.addedAt - b.addedAt) * multiplier;
    }
  });
}

export function groupBooksBySeries(
  books: Book[],
  seriesRecords: SeriesRecord[] = []
): SeriesGroup[] {
  const byKey = new Map<
    string,
    { id: string | null; name: string; description: string; books: Book[] }
  >();

  for (const record of seriesRecords) {
    const cleanName = record.name.trim();
    if (!cleanName) continue;
    byKey.set(cleanName.toLowerCase(), {
      id: record.id,
      name: cleanName,
      description: record.description ?? '',
      books: [],
    });
  }

  for (const book of books) {
    const seriesName = book.seriesName.trim();
    if (!seriesName) continue;
    const key = seriesName.toLowerCase();
    const existing = byKey.get(key);
    if (existing) {
      existing.books.push(book);
    } else {
      byKey.set(key, {
        id: null,
        name: seriesName,
        description: '',
        books: [book],
      });
    }
  }

  const groups: SeriesGroup[] = [];
  for (const entry of byKey.values()) {
    const sortedBooks = [...entry.books].sort((a, b) => {
      const idxA = a.seriesIndex ?? Number.MAX_SAFE_INTEGER;
      const idxB = b.seriesIndex ?? Number.MAX_SAFE_INTEGER;
      if (idxA !== idxB) return idxA - idxB;
      return a.title.localeCompare(b.title);
    });

    const finishedCount = sortedBooks.filter(
      (b) => b.status === 'finished'
    ).length;
    const averageProgress =
      sortedBooks.length > 0
        ? Math.round(
            sortedBooks.reduce((acc, b) => acc + b.progress, 0) /
              sortedBooks.length
          )
        : 0;

    groups.push({
      id: entry.id,
      name: entry.name,
      description: entry.description,
      books: sortedBooks,
      finishedCount,
      averageProgress,
    });
  }

  return groups.sort((a, b) => a.name.localeCompare(b.name));
}

export function summarizeAuthors(books: Book[]): AuthorSummary[] {
  const map = new Map<string, { display: string; books: Book[] }>();

  for (const book of books) {
    const authorList =
      book.authors.length > 0 ? book.authors : ['Unknown Author'];
    for (const rawAuthor of authorList) {
      const clean = rawAuthor.trim() || 'Unknown Author';
      const key = clean.toLowerCase();
      const entry = map.get(key);
      if (entry) {
        entry.books.push(book);
      } else {
        map.set(key, { display: clean, books: [book] });
      }
    }
  }

  const summaries: AuthorSummary[] = [];
  for (const { display, books: authorBooks } of map.values()) {
    const sorted = [...authorBooks].sort((a, b) =>
      a.title.localeCompare(b.title)
    );
    summaries.push({
      name: display,
      bookCount: sorted.length,
      finishedCount: sorted.filter((b) => b.status === 'finished').length,
      readingCount: sorted.filter((b) => b.status === 'reading').length,
      books: sorted,
    });
  }

  return summaries.sort((a, b) => a.name.localeCompare(b.name));
}

export function summarizeTags(
  books: Book[],
  tagRecords: TagRecord[] = []
): TagSummary[] {
  const map = new Map<
    string,
    { id: string | null; display: string; books: Book[] }
  >();

  for (const record of tagRecords) {
    const clean = record.name.trim();
    if (!clean) continue;
    map.set(clean.toLowerCase(), {
      id: record.id,
      display: clean,
      books: [],
    });
  }

  for (const book of books) {
    for (const rawTag of book.tagNames) {
      const clean = rawTag.trim();
      if (!clean) continue;
      const key = clean.toLowerCase();
      const entry = map.get(key);
      if (entry) {
        entry.books.push(book);
      } else {
        map.set(key, { id: null, display: clean, books: [book] });
      }
    }
  }

  const summaries: TagSummary[] = [];
  for (const { id, display, books: tagBooks } of map.values()) {
    summaries.push({
      id,
      name: display,
      bookCount: tagBooks.length,
      readingCount: tagBooks.filter((b) => b.status === 'reading').length,
      finishedCount: tagBooks.filter((b) => b.status === 'finished').length,
      books: [...tagBooks].sort((a, b) => a.title.localeCompare(b.title)),
    });
  }

  return summaries.sort(
    (a, b) => b.bookCount - a.bookCount || a.name.localeCompare(b.name)
  );
}

export function getBookAccentTone(title: string): {
  bg: string;
  accent: string;
} {
  const palettes = [
    { bg: '#16141A', accent: '#C89242' },
    { bg: '#131718', accent: '#B8894B' },
    { bg: '#181314', accent: '#D18E4B' },
    { bg: '#12151B', accent: '#C59A5B' },
    { bg: '#161613', accent: '#D4A14D' },
  ];
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = (hash * 31 + title.charCodeAt(i)) | 0;
  }
  return palettes[Math.abs(hash) % palettes.length];
}
