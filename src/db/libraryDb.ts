import Dexie, { type Table } from 'dexie';
import type {
  AnnotationRecord,
  BackupSettingsRecord,
  Book,
  BookBinary,
  BookCover,
  BookLocationsRecord,
  BookmarkRecord,
  Collection,
  CoverDesignRecord,
  CoverPresetRecord,
  CustomFontRecord,
  ReaderPreferences,
  SeriesRecord,
  TagRecord,
} from '../types/library';

export class FolioDatabase extends Dexie {
  books!: Table<Book, string>;
  bookFiles!: Table<BookBinary, string>;
  bookCovers!: Table<BookCover, string>;
  originalBookCovers!: Table<BookCover, string>;
  coverDesigns!: Table<CoverDesignRecord, string>;
  coverPresets!: Table<CoverPresetRecord, string>;
  collections!: Table<Collection, string>;
  series!: Table<SeriesRecord, string>;
  tags!: Table<TagRecord, string>;
  bookmarks!: Table<BookmarkRecord, string>;
  annotations!: Table<AnnotationRecord, string>;
  readerPreferences!: Table<ReaderPreferences, string>;
  customFonts!: Table<CustomFontRecord, string>;
  bookLocations!: Table<BookLocationsRecord, string>;
  backupSettings!: Table<BackupSettingsRecord, string>;

  constructor() {
    super('folio_epub_library');

    this.version(1).stores({
      books:
        'id, title, *authors, *tagNames, seriesName, status, progress, addedAt, updatedAt, lastOpenedAt, checksum',
      bookFiles: 'bookId, checksum, updatedAt',
      bookCovers: 'bookId, updatedAt',
      collections: 'id, name, updatedAt',
    });

    this.version(2)
      .stores({
        books:
          'id, title, *authors, *tagNames, seriesName, status, progress, addedAt, updatedAt, lastOpenedAt, checksum',
        bookFiles: 'bookId, checksum, updatedAt',
        bookCovers: 'bookId, updatedAt',
        collections: 'id, name, updatedAt',
        series: 'id, name, updatedAt',
        tags: 'id, name, updatedAt',
        bookmarks: 'id, bookId, createdAt',
        annotations: 'id, bookId, createdAt',
      })
      .upgrade(async (tx) => {
        const now = Date.now();
        const existingBooks = await tx.table<Book, string>('books').toArray();
        const seriesTable = tx.table<SeriesRecord, string>('series');
        const tagsTable = tx.table<TagRecord, string>('tags');

        const seenSeries = new Set<string>();
        const seenTags = new Set<string>();

        const existingSeries = await seriesTable.toArray();
        for (const s of existingSeries) {
          seenSeries.add(s.name.toLowerCase());
        }

        const existingTags = await tagsTable.toArray();
        for (const t of existingTags) {
          seenTags.add(t.name.toLowerCase());
        }

        for (const book of existingBooks) {
          const sName = (book.seriesName ?? '').trim();
          if (sName && !seenSeries.has(sName.toLowerCase())) {
            seenSeries.add(sName.toLowerCase());
            await seriesTable.put({
              id: crypto.randomUUID(),
              name: sName,
              description: '',
              createdAt: book.addedAt || now,
              updatedAt: now,
              syncVersion: 1,
            });
          }

          for (const rawTag of book.tagNames ?? []) {
            const tName = rawTag.trim();
            if (tName && !seenTags.has(tName.toLowerCase())) {
              seenTags.add(tName.toLowerCase());
              await tagsTable.put({
                id: crypto.randomUUID(),
                name: tName,
                createdAt: book.addedAt || now,
                updatedAt: now,
              });
            }
          }
        }
      });

    this.version(3)
      .stores({
        books:
          'id, title, *authors, *tagNames, seriesName, status, progress, addedAt, updatedAt, lastOpenedAt, checksum',
        bookFiles: 'bookId, checksum, updatedAt',
        bookCovers: 'bookId, updatedAt',
        originalBookCovers: 'bookId, updatedAt',
        coverDesigns: 'bookId, updatedAt',
        coverPresets: 'id, name, updatedAt',
        collections: 'id, name, updatedAt',
        series: 'id, name, updatedAt',
        tags: 'id, name, updatedAt',
        bookmarks: 'id, bookId, createdAt',
        annotations: 'id, bookId, createdAt',
      })
      .upgrade(async (tx) => {
        const existingCovers = await tx
          .table<BookCover, string>('bookCovers')
          .toArray();
        const originalCoversTable = tx.table<BookCover, string>(
          'originalBookCovers'
        );
        for (const cover of existingCovers) {
          const alreadyExists = await originalCoversTable.get(cover.bookId);
          if (!alreadyExists) {
            await originalCoversTable.put(cover);
          }
        }
      });

    this.version(4).stores({
      books:
        'id, title, *authors, *tagNames, seriesName, status, progress, addedAt, updatedAt, lastOpenedAt, checksum',
      bookFiles: 'bookId, checksum, updatedAt',
      bookCovers: 'bookId, updatedAt',
      originalBookCovers: 'bookId, updatedAt',
      coverDesigns: 'bookId, updatedAt',
      coverPresets: 'id, name, updatedAt',
      collections: 'id, name, updatedAt',
      series: 'id, name, updatedAt',
      tags: 'id, name, updatedAt',
      bookmarks: 'id, bookId, createdAt',
      annotations: 'id, bookId, color, createdAt, updatedAt',
      readerPreferences: 'id, updatedAt',
      customFonts: 'id, name, createdAt',
      bookLocations: 'bookId, updatedAt',
    });

    this.version(5).stores({
      books:
        'id, title, *authors, *tagNames, seriesName, status, progress, addedAt, updatedAt, lastOpenedAt, checksum',
      bookFiles: 'bookId, checksum, updatedAt',
      bookCovers: 'bookId, updatedAt',
      originalBookCovers: 'bookId, updatedAt',
      coverDesigns: 'bookId, updatedAt',
      coverPresets: 'id, name, updatedAt',
      collections: 'id, name, updatedAt',
      series: 'id, name, updatedAt',
      tags: 'id, name, updatedAt',
      bookmarks: 'id, bookId, createdAt',
      annotations: 'id, bookId, color, createdAt, updatedAt',
      readerPreferences: 'id, updatedAt',
      customFonts: 'id, name, createdAt',
      bookLocations: 'bookId, updatedAt',
      backupSettings: 'id, updatedAt',
    });
  }
}

export const libraryDb = new FolioDatabase();
