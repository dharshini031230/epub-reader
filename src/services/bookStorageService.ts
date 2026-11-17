import { libraryDb } from '../db/libraryDb';
import type {
  AnnotationRecord,
  Book,
  BookCover,
  BookLocationsRecord,
  BookMetadataUpdate,
  BookmarkRecord,
  Collection,
  CoverDesignRecord,
  CoverDesignSpec,
  CoverPresetRecord,
  CoverReplacement,
  CustomFontRecord,
  HighlightColor,
  ILibraryStorageService,
  ImportDraft,
  ReaderPreferences,
  ReadingStatus,
  SeriesRecord,
  TagRecord,
} from '../types/library';
import { createDefaultReaderPreferences } from './readerThemeService';
import {
  normalizeAuthors,
  normalizeTags,
  parseSeriesIndex,
} from './libraryDomainService';

async function ensureSeriesAndTags(
  seriesName: string,
  tagNames: string[],
  now: number
): Promise<void> {
  const cleanSeries = seriesName.trim();
  if (cleanSeries) {
    const allSeries = await libraryDb.series.toArray();
    const exists = allSeries.some(
      (s) => s.name.toLowerCase() === cleanSeries.toLowerCase()
    );
    if (!exists) {
      await libraryDb.series.put({
        id: crypto.randomUUID(),
        name: cleanSeries,
        description: '',
        createdAt: now,
        updatedAt: now,
        syncVersion: 1,
      });
    }
  }

  if (tagNames.length > 0) {
    const allTags = await libraryDb.tags.toArray();
    const existingKeys = new Set(allTags.map((t) => t.name.toLowerCase()));
    for (const rawTag of tagNames) {
      const cleanTag = rawTag.trim();
      if (cleanTag && !existingKeys.has(cleanTag.toLowerCase())) {
        existingKeys.add(cleanTag.toLowerCase());
        await libraryDb.tags.put({
          id: crypto.randomUUID(),
          name: cleanTag,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
  }
}

export class DexieLibraryStorageService implements ILibraryStorageService {
  async getAllBooks(): Promise<Book[]> {
    return libraryDb.books.orderBy('addedAt').reverse().toArray();
  }

  async getBookById(id: string): Promise<Book | undefined> {
    return libraryDb.books.get(id);
  }

  async findBookByChecksum(checksum: string): Promise<Book | undefined> {
    return libraryDb.books.where('checksum').equals(checksum).first();
  }

  async saveImportedBook(draft: ImportDraft): Promise<Book> {
    const now = Date.now();
    const bookId = crypto.randomUUID();
    const normalizedSeriesName = draft.seriesName.trim();
    const normalizedTags = normalizeTags(draft.tagsInput);

    const bookRecord: Book = {
      id: bookId,
      title: draft.title.trim() || 'Untitled Volume',
      authors: normalizeAuthors(draft.authorsInput),
      publisher: draft.publisher.trim(),
      description: draft.description.trim(),
      language: draft.language.trim() || 'en',
      publishedYear: draft.publishedYear.trim(),
      identifier: draft.identifier.trim(),
      seriesName: normalizedSeriesName,
      seriesIndex: parseSeriesIndex(draft.seriesIndex),
      tagNames: normalizedTags,
      status: draft.status,
      progress: draft.status === 'finished' ? 100 : 0,
      currentCfi: null,
      chapterCount: draft.chapterCount,
      toc: draft.toc,
      fileName: draft.fileName,
      fileSize: draft.fileSize,
      checksum: draft.checksum,
      hasCover: Boolean(draft.coverData && draft.coverMimeType),
      coverMimeType: draft.coverMimeType,
      addedAt: now,
      updatedAt: now,
      lastOpenedAt: draft.status === 'reading' ? now : null,
      syncVersion: 1,
      syncDirty: true,
    };

    await libraryDb.transaction(
      'rw',
      [
        libraryDb.books,
        libraryDb.bookFiles,
        libraryDb.bookCovers,
        libraryDb.originalBookCovers,
        libraryDb.coverDesigns,
        libraryDb.collections,
        libraryDb.series,
        libraryDb.tags,
      ],
      async () => {
        await libraryDb.books.put(bookRecord);

        await libraryDb.bookFiles.put({
          bookId,
          data: draft.epubData,
          mimeType: 'application/epub+zip',
          byteLength: draft.fileSize,
          checksum: draft.checksum,
          updatedAt: now,
        });

        if (draft.originalCoverData && draft.originalCoverMimeType) {
          await libraryDb.originalBookCovers.put({
            bookId,
            data: draft.originalCoverData,
            mimeType: draft.originalCoverMimeType,
            updatedAt: now,
          });
        }

        if (draft.coverData && draft.coverMimeType) {
          await libraryDb.bookCovers.put({
            bookId,
            data: draft.coverData,
            mimeType: draft.coverMimeType,
            updatedAt: now,
          });
        }

        if (draft.customCoverDesign) {
          await libraryDb.coverDesigns.put({
            bookId,
            spec: draft.customCoverDesign.spec,
            customImageData: draft.customCoverDesign.customImageData,
            customImageMimeType: draft.customCoverDesign.customImageMimeType,
            updatedAt: now,
          });
        }

        await ensureSeriesAndTags(normalizedSeriesName, normalizedTags, now);

        if (draft.collectionIds.length > 0) {
          for (const collectionId of draft.collectionIds) {
            const col = await libraryDb.collections.get(collectionId);
            if (col && !col.bookIds.includes(bookId)) {
              await libraryDb.collections.put({
                ...col,
                bookIds: [...col.bookIds, bookId],
                updatedAt: now,
                syncVersion: col.syncVersion + 1,
              });
            }
          }
        }
      }
    );

    return bookRecord;
  }

  async updateBookMetadata(
    bookId: string,
    updates: BookMetadataUpdate,
    coverUpdate?: CoverReplacement
  ): Promise<Book> {
    const now = Date.now();
    let updatedBook: Book | undefined;

    await libraryDb.transaction(
      'rw',
      [
        libraryDb.books,
        libraryDb.bookCovers,
        libraryDb.series,
        libraryDb.tags,
      ],
      async () => {
        const existing = await libraryDb.books.get(bookId);
        if (!existing) {
          throw new Error('Book not found in library.');
        }

        let hasCover = existing.hasCover;
        let coverMimeType = existing.coverMimeType;

        if (coverUpdate) {
          if (coverUpdate.data && coverUpdate.mimeType) {
            await libraryDb.bookCovers.put({
              bookId,
              data: coverUpdate.data,
              mimeType: coverUpdate.mimeType,
              updatedAt: now,
            });
            hasCover = true;
            coverMimeType = coverUpdate.mimeType;
          } else {
            await libraryDb.bookCovers.delete(bookId);
            hasCover = false;
            coverMimeType = null;
          }
        }

        const cleanSeries = updates.seriesName.trim();
        updatedBook = {
          ...existing,
          title: updates.title.trim() || existing.title,
          authors:
            updates.authors.length > 0 ? updates.authors : ['Unknown Author'],
          publisher: updates.publisher.trim(),
          description: updates.description.trim(),
          language: updates.language.trim() || 'en',
          publishedYear: updates.publishedYear.trim(),
          identifier: updates.identifier.trim(),
          seriesName: cleanSeries,
          seriesIndex: cleanSeries ? updates.seriesIndex : null,
          tagNames: updates.tagNames,
          hasCover,
          coverMimeType,
          updatedAt: now,
          syncVersion: existing.syncVersion + 1,
          syncDirty: true,
        };

        await libraryDb.books.put(updatedBook);
        await ensureSeriesAndTags(cleanSeries, updates.tagNames, now);
      }
    );

    if (!updatedBook) {
      throw new Error('Failed to update book metadata.');
    }

    return updatedBook;
  }

  async updateReadingState(
    bookId: string,
    status: ReadingStatus,
    progress: number
  ): Promise<Book> {
    const existing = await libraryDb.books.get(bookId);
    if (!existing) {
      throw new Error('Book not found in library.');
    }

    const now = Date.now();
    const clampedProgress = Math.max(0, Math.min(100, Math.round(progress)));
    const nextProgress =
      status === 'finished' && clampedProgress < 100 ? 100 : clampedProgress;

    const updated: Book = {
      ...existing,
      status,
      progress: nextProgress,
      lastOpenedAt:
        status === 'reading' || status === 'finished'
          ? now
          : existing.lastOpenedAt,
      updatedAt: now,
      syncVersion: existing.syncVersion + 1,
      syncDirty: true,
    };

    await libraryDb.books.put(updated);
    return updated;
  }

  async markBookOpened(bookId: string): Promise<Book> {
    const existing = await libraryDb.books.get(bookId);
    if (!existing) {
      throw new Error('Book not found in library.');
    }
    const now = Date.now();
    const updated: Book = {
      ...existing,
      lastOpenedAt: now,
      updatedAt: now,
      syncVersion: existing.syncVersion + 1,
      syncDirty: true,
    };
    await libraryDb.books.put(updated);
    return updated;
  }

  async deleteBook(bookId: string): Promise<void> {
    const now = Date.now();
    await libraryDb.transaction(
      'rw',
      [
        libraryDb.books,
        libraryDb.bookFiles,
        libraryDb.bookCovers,
        libraryDb.originalBookCovers,
        libraryDb.coverDesigns,
        libraryDb.collections,
        libraryDb.bookmarks,
        libraryDb.annotations,
        libraryDb.bookLocations,
      ],
      async () => {
        await libraryDb.books.delete(bookId);
        await libraryDb.bookFiles.delete(bookId);
        await libraryDb.bookCovers.delete(bookId);
        await libraryDb.originalBookCovers.delete(bookId);
        await libraryDb.coverDesigns.delete(bookId);
        await libraryDb.bookmarks.where('bookId').equals(bookId).delete();
        await libraryDb.annotations.where('bookId').equals(bookId).delete();
        await libraryDb.bookLocations.delete(bookId);

        const allCollections = await libraryDb.collections.toArray();
        for (const col of allCollections) {
          if (col.bookIds.includes(bookId)) {
            await libraryDb.collections.put({
              ...col,
              bookIds: col.bookIds.filter((id) => id !== bookId),
              updatedAt: now,
              syncVersion: col.syncVersion + 1,
            });
          }
        }
      }
    );
  }

  async getAllCoverData(): Promise<BookCover[]> {
    return libraryDb.bookCovers.toArray();
  }

  async getBookFileBlob(
    bookId: string
  ): Promise<{ blob: Blob; fileName: string } | null> {
    const [book, binary] = await Promise.all([
      libraryDb.books.get(bookId),
      libraryDb.bookFiles.get(bookId),
    ]);
    if (!book || !binary) return null;
    return {
      blob: new Blob([binary.data], { type: binary.mimeType }),
      fileName: book.fileName,
    };
  }

  // ---- COVER DESIGNER & ORIGINAL COVER MANAGEMENT ----

  async getCoverDesign(
    bookId: string
  ): Promise<CoverDesignRecord | undefined> {
    return libraryDb.coverDesigns.get(bookId);
  }

  async getAllCoverDesigns(): Promise<CoverDesignRecord[]> {
    return libraryDb.coverDesigns.toArray();
  }

  async getOriginalBookCover(bookId: string): Promise<BookCover | undefined> {
    return libraryDb.originalBookCovers.get(bookId);
  }

  async hasOriginalBookCover(bookId: string): Promise<boolean> {
    const orig = await libraryDb.originalBookCovers.get(bookId);
    return Boolean(orig);
  }

  async saveCustomCover(
    bookId: string,
    renderedData: ArrayBuffer,
    renderedMimeType: string,
    designRecord: Omit<CoverDesignRecord, 'bookId' | 'updatedAt'>
  ): Promise<Book> {
    const now = Date.now();
    let updatedBook: Book | undefined;

    await libraryDb.transaction(
      'rw',
      [libraryDb.books, libraryDb.bookCovers, libraryDb.coverDesigns],
      async () => {
        const existing = await libraryDb.books.get(bookId);
        if (!existing) {
          throw new Error('Book not found in library.');
        }

        await libraryDb.bookCovers.put({
          bookId,
          data: renderedData,
          mimeType: renderedMimeType,
          updatedAt: now,
        });

        await libraryDb.coverDesigns.put({
          bookId,
          spec: designRecord.spec,
          customImageData: designRecord.customImageData,
          customImageMimeType: designRecord.customImageMimeType,
          updatedAt: now,
        });

        updatedBook = {
          ...existing,
          hasCover: true,
          coverMimeType: renderedMimeType,
          updatedAt: now,
          syncVersion: existing.syncVersion + 1,
          syncDirty: true,
        };
        await libraryDb.books.put(updatedBook);
      }
    );

    if (!updatedBook) {
      throw new Error('Failed to save custom cover.');
    }
    return updatedBook;
  }

  async restoreOriginalCover(bookId: string): Promise<Book> {
    const now = Date.now();
    let updatedBook: Book | undefined;

    await libraryDb.transaction(
      'rw',
      [
        libraryDb.books,
        libraryDb.bookCovers,
        libraryDb.originalBookCovers,
        libraryDb.coverDesigns,
      ],
      async () => {
        const existing = await libraryDb.books.get(bookId);
        if (!existing) {
          throw new Error('Book not found in library.');
        }

        const originalCover = await libraryDb.originalBookCovers.get(bookId);
        await libraryDb.coverDesigns.delete(bookId);

        if (originalCover) {
          await libraryDb.bookCovers.put({
            bookId,
            data: originalCover.data,
            mimeType: originalCover.mimeType,
            updatedAt: now,
          });
          updatedBook = {
            ...existing,
            hasCover: true,
            coverMimeType: originalCover.mimeType,
            updatedAt: now,
            syncVersion: existing.syncVersion + 1,
            syncDirty: true,
          };
        } else {
          await libraryDb.bookCovers.delete(bookId);
          updatedBook = {
            ...existing,
            hasCover: false,
            coverMimeType: null,
            updatedAt: now,
            syncVersion: existing.syncVersion + 1,
            syncDirty: true,
          };
        }

        await libraryDb.books.put(updatedBook);
      }
    );

    if (!updatedBook) {
      throw new Error('Failed to restore original cover.');
    }
    return updatedBook;
  }

  async getAllCoverPresets(): Promise<CoverPresetRecord[]> {
    return libraryDb.coverPresets.orderBy('updatedAt').reverse().toArray();
  }

  async saveCoverPreset(
    name: string,
    spec: CoverDesignSpec
  ): Promise<CoverPresetRecord> {
    const cleanName = name.trim();
    if (!cleanName) {
      throw new Error('Design name is required.');
    }
    const now = Date.now();
    const record: CoverPresetRecord = {
      id: crypto.randomUUID(),
      name: cleanName,
      spec: { ...spec },
      createdAt: now,
      updatedAt: now,
    };
    await libraryDb.coverPresets.put(record);
    return record;
  }

  async deleteCoverPreset(id: string): Promise<void> {
    await libraryDb.coverPresets.delete(id);
  }

  // ---- COLLECTIONS ----

  async getAllCollections(): Promise<Collection[]> {
    return libraryDb.collections.orderBy('name').toArray();
  }

  async createCollection(
    name: string,
    description: string
  ): Promise<Collection> {
    const cleanName = name.trim();
    if (!cleanName) {
      throw new Error('Collection name is required.');
    }
    const existing = await libraryDb.collections.toArray();
    if (
      existing.some((c) => c.name.toLowerCase() === cleanName.toLowerCase())
    ) {
      throw new Error(`A collection named "${cleanName}" already exists.`);
    }
    const now = Date.now();
    const collection: Collection = {
      id: crypto.randomUUID(),
      name: cleanName,
      description: description.trim(),
      bookIds: [],
      createdAt: now,
      updatedAt: now,
      syncVersion: 1,
    };
    await libraryDb.collections.put(collection);
    return collection;
  }

  async updateCollection(
    id: string,
    patch: { name?: string; description?: string }
  ): Promise<Collection> {
    const existing = await libraryDb.collections.get(id);
    if (!existing) {
      throw new Error('Collection not found.');
    }
    const nextName =
      patch.name !== undefined ? patch.name.trim() : existing.name;
    if (!nextName) {
      throw new Error('Collection name cannot be empty.');
    }
    const all = await libraryDb.collections.toArray();
    if (
      all.some(
        (c) => c.id !== id && c.name.toLowerCase() === nextName.toLowerCase()
      )
    ) {
      throw new Error(`A collection named "${nextName}" already exists.`);
    }
    const updated: Collection = {
      ...existing,
      name: nextName,
      description:
        patch.description !== undefined
          ? patch.description.trim()
          : existing.description,
      updatedAt: Date.now(),
      syncVersion: existing.syncVersion + 1,
    };
    await libraryDb.collections.put(updated);
    return updated;
  }

  async deleteCollection(id: string): Promise<void> {
    await libraryDb.collections.delete(id);
  }

  async setBookCollections(
    bookId: string,
    collectionIds: string[]
  ): Promise<void> {
    const now = Date.now();
    const selectedSet = new Set(collectionIds);

    await libraryDb.transaction('rw', [libraryDb.collections], async () => {
      const allCollections = await libraryDb.collections.toArray();
      for (const col of allCollections) {
        const hasBook = col.bookIds.includes(bookId);
        const shouldHave = selectedSet.has(col.id);
        if (hasBook && !shouldHave) {
          await libraryDb.collections.put({
            ...col,
            bookIds: col.bookIds.filter((id) => id !== bookId),
            updatedAt: now,
            syncVersion: col.syncVersion + 1,
          });
        } else if (!hasBook && shouldHave) {
          await libraryDb.collections.put({
            ...col,
            bookIds: [...col.bookIds, bookId],
            updatedAt: now,
            syncVersion: col.syncVersion + 1,
          });
        }
      }
    });
  }

  // ---- SERIES ----

  async getAllSeries(): Promise<SeriesRecord[]> {
    return libraryDb.series.orderBy('name').toArray();
  }

  async createSeries(
    name: string,
    description: string
  ): Promise<SeriesRecord> {
    const cleanName = name.trim();
    if (!cleanName) {
      throw new Error('Series name is required.');
    }
    const existing = await libraryDb.series.toArray();
    if (
      existing.some((s) => s.name.toLowerCase() === cleanName.toLowerCase())
    ) {
      throw new Error(`A series named "${cleanName}" already exists.`);
    }
    const now = Date.now();
    const record: SeriesRecord = {
      id: crypto.randomUUID(),
      name: cleanName,
      description: description.trim(),
      createdAt: now,
      updatedAt: now,
      syncVersion: 1,
    };
    await libraryDb.series.put(record);
    return record;
  }

  async updateSeries(
    id: string,
    patch: { name?: string; description?: string }
  ): Promise<SeriesRecord> {
    const now = Date.now();
    let updatedRecord: SeriesRecord | undefined;

    await libraryDb.transaction(
      'rw',
      [libraryDb.series, libraryDb.books],
      async () => {
        const existing = await libraryDb.series.get(id);
        if (!existing) {
          throw new Error('Series not found.');
        }

        const nextName =
          patch.name !== undefined ? patch.name.trim() : existing.name;
        if (!nextName) {
          throw new Error('Series name cannot be empty.');
        }

        const allSeries = await libraryDb.series.toArray();
        if (
          allSeries.some(
            (s) =>
              s.id !== id && s.name.toLowerCase() === nextName.toLowerCase()
          )
        ) {
          throw new Error(`A series named "${nextName}" already exists.`);
        }

        updatedRecord = {
          ...existing,
          name: nextName,
          description:
            patch.description !== undefined
              ? patch.description.trim()
              : existing.description,
          updatedAt: now,
          syncVersion: existing.syncVersion + 1,
        };
        await libraryDb.series.put(updatedRecord);

        if (nextName !== existing.name) {
          const oldLower = existing.name.toLowerCase();
          const books = await libraryDb.books.toArray();
          for (const book of books) {
            if (book.seriesName.trim().toLowerCase() === oldLower) {
              await libraryDb.books.put({
                ...book,
                seriesName: nextName,
                updatedAt: now,
                syncVersion: book.syncVersion + 1,
                syncDirty: true,
              });
            }
          }
        }
      }
    );

    if (!updatedRecord) {
      throw new Error('Failed to update series.');
    }
    return updatedRecord;
  }

  async deleteSeries(id: string): Promise<void> {
    const now = Date.now();
    await libraryDb.transaction(
      'rw',
      [libraryDb.series, libraryDb.books],
      async () => {
        const existing = await libraryDb.series.get(id);
        if (!existing) return;

        await libraryDb.series.delete(id);

        const targetLower = existing.name.toLowerCase();
        const books = await libraryDb.books.toArray();
        for (const book of books) {
          if (book.seriesName.trim().toLowerCase() === targetLower) {
            await libraryDb.books.put({
              ...book,
              seriesName: '',
              seriesIndex: null,
              updatedAt: now,
              syncVersion: book.syncVersion + 1,
              syncDirty: true,
            });
          }
        }
      }
    );
  }

  async setBookSeries(
    bookId: string,
    seriesName: string,
    seriesIndex: number | null
  ): Promise<Book> {
    const now = Date.now();
    const cleanSeries = seriesName.trim();
    let updatedBook: Book | undefined;

    await libraryDb.transaction(
      'rw',
      [libraryDb.books, libraryDb.series],
      async () => {
        const existing = await libraryDb.books.get(bookId);
        if (!existing) {
          throw new Error('Book not found.');
        }

        updatedBook = {
          ...existing,
          seriesName: cleanSeries,
          seriesIndex: cleanSeries ? seriesIndex : null,
          updatedAt: now,
          syncVersion: existing.syncVersion + 1,
          syncDirty: true,
        };
        await libraryDb.books.put(updatedBook);

        if (cleanSeries) {
          await ensureSeriesAndTags(cleanSeries, [], now);
        }
      }
    );

    if (!updatedBook) {
      throw new Error('Failed to update book series.');
    }
    return updatedBook;
  }

  async reorderSeriesBooks(
    seriesName: string,
    orderedBookIds: string[]
  ): Promise<void> {
    const now = Date.now();
    const cleanSeries = seriesName.trim();
    if (!cleanSeries) return;

    await libraryDb.transaction('rw', [libraryDb.books], async () => {
      for (let idx = 0; idx < orderedBookIds.length; idx++) {
        const book = await libraryDb.books.get(orderedBookIds[idx]);
        if (
          book &&
          book.seriesName.trim().toLowerCase() === cleanSeries.toLowerCase()
        ) {
          await libraryDb.books.put({
            ...book,
            seriesIndex: idx + 1,
            updatedAt: now,
            syncVersion: book.syncVersion + 1,
            syncDirty: true,
          });
        }
      }
    });
  }

  // ---- TAGS ----

  async getAllTags(): Promise<TagRecord[]> {
    return libraryDb.tags.orderBy('name').toArray();
  }

  async createTag(name: string): Promise<TagRecord> {
    const clean = name.trim();
    if (!clean) {
      throw new Error('Tag name is required.');
    }
    const existing = await libraryDb.tags.toArray();
    const duplicate = existing.find(
      (t) => t.name.toLowerCase() === clean.toLowerCase()
    );
    if (duplicate) {
      throw new Error(`Tag "${duplicate.name}" already exists.`);
    }
    const now = Date.now();
    const record: TagRecord = {
      id: crypto.randomUUID(),
      name: clean,
      createdAt: now,
      updatedAt: now,
    };
    await libraryDb.tags.put(record);
    return record;
  }

  async renameTagAcrossLibrary(oldTag: string, newTag: string): Promise<void> {
    const cleanNew = newTag.trim();
    if (!cleanNew) return;
    const now = Date.now();
    const targetLower = oldTag.toLowerCase();
    const newLower = cleanNew.toLowerCase();

    await libraryDb.transaction(
      'rw',
      [libraryDb.books, libraryDb.tags],
      async () => {
        const allTags = await libraryDb.tags.toArray();
        const oldRecord = allTags.find(
          (t) => t.name.toLowerCase() === targetLower
        );
        const existingTargetRecord = allTags.find(
          (t) => t.name.toLowerCase() === newLower
        );

        if (oldRecord) {
          if (existingTargetRecord && existingTargetRecord.id !== oldRecord.id) {
            await libraryDb.tags.delete(oldRecord.id);
          } else {
            await libraryDb.tags.put({
              ...oldRecord,
              name: cleanNew,
              updatedAt: now,
            });
          }
        } else if (!existingTargetRecord) {
          await libraryDb.tags.put({
            id: crypto.randomUUID(),
            name: cleanNew,
            createdAt: now,
            updatedAt: now,
          });
        }

        const books = await libraryDb.books.toArray();
        for (const book of books) {
          const hasOld = book.tagNames.some(
            (t) => t.toLowerCase() === targetLower
          );
          if (!hasOld) continue;

          const nextTags: string[] = [];
          const seen = new Set<string>();
          for (const tag of book.tagNames) {
            const replacement =
              tag.toLowerCase() === targetLower ? cleanNew : tag;
            const key = replacement.toLowerCase();
            if (!seen.has(key)) {
              seen.add(key);
              nextTags.push(replacement);
            }
          }

          await libraryDb.books.put({
            ...book,
            tagNames: nextTags,
            updatedAt: now,
            syncVersion: book.syncVersion + 1,
            syncDirty: true,
          });
        }
      }
    );
  }

  async deleteTagAcrossLibrary(tag: string): Promise<void> {
    const now = Date.now();
    const targetLower = tag.toLowerCase();

    await libraryDb.transaction(
      'rw',
      [libraryDb.books, libraryDb.tags],
      async () => {
        const allTags = await libraryDb.tags.toArray();
        for (const record of allTags) {
          if (record.name.toLowerCase() === targetLower) {
            await libraryDb.tags.delete(record.id);
          }
        }

        const books = await libraryDb.books.toArray();
        for (const book of books) {
          const filtered = book.tagNames.filter(
            (t) => t.toLowerCase() !== targetLower
          );
          if (filtered.length !== book.tagNames.length) {
            await libraryDb.books.put({
              ...book,
              tagNames: filtered,
              updatedAt: now,
              syncVersion: book.syncVersion + 1,
              syncDirty: true,
            });
          }
        }
      }
    );
  }

  async setBookTags(bookId: string, tagNames: string[]): Promise<Book> {
    const now = Date.now();
    const deduplicated: string[] = [];
    const seen = new Set<string>();
    for (const raw of tagNames) {
      const clean = raw.trim();
      if (clean && !seen.has(clean.toLowerCase())) {
        seen.add(clean.toLowerCase());
        deduplicated.push(clean);
      }
    }

    let updatedBook: Book | undefined;
    await libraryDb.transaction(
      'rw',
      [libraryDb.books, libraryDb.tags],
      async () => {
        const existing = await libraryDb.books.get(bookId);
        if (!existing) {
          throw new Error('Book not found.');
        }

        updatedBook = {
          ...existing,
          tagNames: deduplicated,
          updatedAt: now,
          syncVersion: existing.syncVersion + 1,
          syncDirty: true,
        };
        await libraryDb.books.put(updatedBook);
        await ensureSeriesAndTags('', deduplicated, now);
      }
    );

    if (!updatedBook) {
      throw new Error('Failed to update book tags.');
    }
    return updatedBook;
  }

  // ---- AUTHORS ----

  async renameAuthorAcrossLibrary(
    oldName: string,
    newName: string
  ): Promise<void> {
    const cleanNew = newName.trim();
    if (!cleanNew) {
      throw new Error('Author name cannot be empty.');
    }
    await this.mergeAuthors([oldName], cleanNew);
  }

  async mergeAuthors(
    sourceNames: string[],
    targetName: string
  ): Promise<void> {
    const cleanTarget = targetName.trim();
    if (!cleanTarget) {
      throw new Error('Target author name cannot be empty.');
    }
    const sourceKeys = new Set(
      sourceNames.map((n) => n.trim().toLowerCase()).filter(Boolean)
    );
    if (sourceKeys.size === 0) return;

    const now = Date.now();

    await libraryDb.transaction('rw', [libraryDb.books], async () => {
      const books = await libraryDb.books.toArray();
      for (const book of books) {
        const hasMatch = book.authors.some((a) =>
          sourceKeys.has(a.trim().toLowerCase())
        );
        if (!hasMatch) continue;

        const nextAuthors: string[] = [];
        const seen = new Set<string>();
        for (const author of book.authors) {
          const replacement = sourceKeys.has(author.trim().toLowerCase())
            ? cleanTarget
            : author.trim();
          const key = replacement.toLowerCase();
          if (replacement && !seen.has(key)) {
            seen.add(key);
            nextAuthors.push(replacement);
          }
        }

        await libraryDb.books.put({
          ...book,
          authors:
            nextAuthors.length > 0 ? nextAuthors : ['Unknown Author'],
          updatedAt: now,
          syncVersion: book.syncVersion + 1,
          syncDirty: true,
        });
      }
    });
  }

  // ---- READER POSITION, BOOKMARKS, ANNOTATIONS, PREFERENCES & CUSTOM FONTS ----

  async updateReadingPosition(
    bookId: string,
    payload: {
      currentCfi: string | null;
      progress: number;
      status?: ReadingStatus;
    }
  ): Promise<Book> {
    const existing = await libraryDb.books.get(bookId);
    if (!existing) {
      throw new Error('Book not found in library.');
    }
    const now = Date.now();
    const clampedProgress = Math.max(
      0,
      Math.min(100, Math.round(payload.progress))
    );
    const nextStatus = payload.status ?? existing.status;

    const updated: Book = {
      ...existing,
      currentCfi: payload.currentCfi,
      progress: clampedProgress,
      status: nextStatus,
      lastOpenedAt: now,
      updatedAt: now,
      syncVersion: existing.syncVersion + 1,
      syncDirty: true,
    };
    await libraryDb.books.put(updated);
    return updated;
  }

  async getAllBookmarks(): Promise<BookmarkRecord[]> {
    return libraryDb.bookmarks.orderBy('createdAt').reverse().toArray();
  }

  async getBookmarksForBook(bookId: string): Promise<BookmarkRecord[]> {
    const rows = await libraryDb.bookmarks
      .where('bookId')
      .equals(bookId)
      .toArray();
    return rows.sort((a, b) => b.createdAt - a.createdAt);
  }

  async createBookmark(
    bookId: string,
    cfi: string,
    label: string
  ): Promise<BookmarkRecord> {
    const cleanCfi = cfi.trim();
    if (!cleanCfi) {
      throw new Error('Valid reading position is required to add a bookmark.');
    }
    const cleanLabel = label.trim() || 'Bookmark';
    const record: BookmarkRecord = {
      id: crypto.randomUUID(),
      bookId,
      cfi: cleanCfi,
      label: cleanLabel,
      createdAt: Date.now(),
    };
    await libraryDb.bookmarks.put(record);
    return record;
  }

  async updateBookmark(id: string, label: string): Promise<BookmarkRecord> {
    const existing = await libraryDb.bookmarks.get(id);
    if (!existing) {
      throw new Error('Bookmark not found.');
    }
    const cleanLabel = label.trim() || 'Bookmark';
    const updated: BookmarkRecord = {
      ...existing,
      label: cleanLabel,
    };
    await libraryDb.bookmarks.put(updated);
    return updated;
  }

  async deleteBookmark(id: string): Promise<void> {
    await libraryDb.bookmarks.delete(id);
  }

  async getAllAnnotations(): Promise<AnnotationRecord[]> {
    return libraryDb.annotations.orderBy('createdAt').reverse().toArray();
  }

  async getAnnotationsForBook(bookId: string): Promise<AnnotationRecord[]> {
    const rows = await libraryDb.annotations
      .where('bookId')
      .equals(bookId)
      .toArray();
    return rows.sort((a, b) => b.createdAt - a.createdAt);
  }

  async createAnnotation(payload: {
    bookId: string;
    cfiRange: string;
    text: string;
    note?: string;
    color?: HighlightColor;
    chapterLabel?: string;
  }): Promise<AnnotationRecord> {
    const now = Date.now();
    const record: AnnotationRecord = {
      id: crypto.randomUUID(),
      bookId: payload.bookId,
      cfiRange: payload.cfiRange,
      text: payload.text.trim(),
      note: (payload.note ?? '').trim(),
      color: payload.color ?? 'yellow',
      chapterLabel: payload.chapterLabel?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    };
    await libraryDb.annotations.put(record);
    return record;
  }

  async updateAnnotation(
    id: string,
    patch: {
      note?: string;
      color?: HighlightColor;
    }
  ): Promise<AnnotationRecord> {
    const existing = await libraryDb.annotations.get(id);
    if (!existing) {
      throw new Error('Highlight not found.');
    }
    const updated: AnnotationRecord = {
      ...existing,
      note: patch.note !== undefined ? patch.note.trim() : existing.note,
      color: patch.color !== undefined ? patch.color : existing.color ?? 'yellow',
      updatedAt: Date.now(),
    };
    await libraryDb.annotations.put(updated);
    return updated;
  }

  async deleteAnnotation(id: string): Promise<void> {
    await libraryDb.annotations.delete(id);
  }

  async getReaderPreferences(): Promise<ReaderPreferences> {
    const existing = await libraryDb.readerPreferences.get('default');
    if (existing) {
      return {
        ...createDefaultReaderPreferences(),
        ...existing,
      };
    }
    const defaults = createDefaultReaderPreferences();
    await libraryDb.readerPreferences.put(defaults);
    return defaults;
  }

  async saveReaderPreferences(
    prefs: Omit<ReaderPreferences, 'id' | 'updatedAt'>
  ): Promise<ReaderPreferences> {
    const record: ReaderPreferences = {
      ...prefs,
      id: 'default',
      updatedAt: Date.now(),
    };
    await libraryDb.readerPreferences.put(record);
    return record;
  }

  async getAllCustomFonts(): Promise<CustomFontRecord[]> {
    return libraryDb.customFonts.orderBy('createdAt').reverse().toArray();
  }

  async saveCustomFont(
    fileName: string,
    mimeType: string,
    data: ArrayBuffer
  ): Promise<CustomFontRecord> {
    const cleanFile = fileName.trim();
    if (!/\.(ttf|otf|woff2?)$/i.test(cleanFile)) {
      throw new Error(
        'Unsupported font format. Please upload a .ttf, .otf, .woff, or .woff2 font file.'
      );
    }
    const baseName = cleanFile
      .replace(/\.(ttf|otf|woff2?)$/i, '')
      .replace(/[-_]+/g, ' ')
      .trim();
    const displayName = baseName || 'Custom Font';
    const id = crypto.randomUUID();
    const familyName = `FolioCustom_${id.replace(/-/g, '').slice(0, 10)}`;
    const record: CustomFontRecord = {
      id,
      name: displayName,
      familyName,
      mimeType,
      fileName: cleanFile,
      data,
      createdAt: Date.now(),
    };
    await libraryDb.customFonts.put(record);
    return record;
  }

  async deleteCustomFont(id: string): Promise<void> {
    await libraryDb.customFonts.delete(id);
  }

  async getBookLocations(
    bookId: string
  ): Promise<BookLocationsRecord | undefined> {
    return libraryDb.bookLocations.get(bookId);
  }

  async saveBookLocations(
    bookId: string,
    locationsJson: string
  ): Promise<BookLocationsRecord> {
    const record: BookLocationsRecord = {
      bookId,
      locationsJson,
      updatedAt: Date.now(),
    };
    await libraryDb.bookLocations.put(record);
    return record;
  }
}

export const bookStorageService = new DexieLibraryStorageService();
