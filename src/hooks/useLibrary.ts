import { useCallback, useEffect, useRef, useState } from 'react';
import { bookStorageService } from '../services/bookStorageService';
import { createDefaultReaderPreferences } from '../services/readerThemeService';
import {
  createDefaultBackupSettings,
  dismissBackupReminder,
  getBackupSettings,
  getStorageBreakdown,
  requestPersistentStorage,
} from '../services/storageProtectionService';
import type {
  AnnotationRecord,
  BackupSettingsRecord,
  Book,
  BookMetadataUpdate,
  BookmarkRecord,
  Collection,
  CoverDesignRecord,
  CoverDesignSpec,
  CoverPresetRecord,
  CoverReplacement,
  CustomFontRecord,
  HighlightColor,
  ImportDraft,
  ReaderPreferences,
  ReadingStatus,
  SeriesRecord,
  StorageBreakdown,
  TagRecord,
} from '../types/library';

export function useLibrary() {
  const [books, setBooks] = useState<Book[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [seriesRecords, setSeriesRecords] = useState<SeriesRecord[]>([]);
  const [tagRecords, setTagRecords] = useState<TagRecord[]>([]);
  const [coverDesigns, setCoverDesigns] = useState<CoverDesignRecord[]>([]);
  const [coverPresets, setCoverPresets] = useState<CoverPresetRecord[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkRecord[]>([]);
  const [annotations, setAnnotations] = useState<AnnotationRecord[]>([]);
  const [readerPreferences, setReaderPreferences] =
    useState<ReaderPreferences>(() => createDefaultReaderPreferences());
  const [customFonts, setCustomFonts] = useState<CustomFontRecord[]>([]);
  const [backupSettings, setBackupSettings] = useState<BackupSettingsRecord>(
    () => createDefaultBackupSettings()
  );
  const [storageBreakdown, setStorageBreakdown] =
    useState<StorageBreakdown | null>(null);
  const [coverUrls, setCoverUrls] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const activeUrlsRef = useRef<string[]>([]);

  const revokeActiveUrls = useCallback(() => {
    for (const url of activeUrlsRef.current) {
      URL.revokeObjectURL(url);
    }
    activeUrlsRef.current = [];
  }, []);

  const refreshLibrary = useCallback(async () => {
    try {
      const [
        loadedBooks,
        loadedCollections,
        loadedSeries,
        loadedTags,
        loadedCovers,
        loadedCoverDesigns,
        loadedCoverPresets,
        loadedBookmarks,
        loadedAnnotations,
        loadedPrefs,
        loadedCustomFonts,
        loadedBackupSettings,
        loadedStorageBreakdown,
      ] = await Promise.all([
        bookStorageService.getAllBooks(),
        bookStorageService.getAllCollections(),
        bookStorageService.getAllSeries(),
        bookStorageService.getAllTags(),
        bookStorageService.getAllCoverData(),
        bookStorageService.getAllCoverDesigns(),
        bookStorageService.getAllCoverPresets(),
        bookStorageService.getAllBookmarks(),
        bookStorageService.getAllAnnotations(),
        bookStorageService.getReaderPreferences(),
        bookStorageService.getAllCustomFonts(),
        getBackupSettings(),
        getStorageBreakdown(),
      ]);

      const nextUrls: Record<string, string> = {};
      const createdList: string[] = [];
      for (const cover of loadedCovers) {
        const blob = new Blob([cover.data], { type: cover.mimeType });
        const url = URL.createObjectURL(blob);
        nextUrls[cover.bookId] = url;
        createdList.push(url);
      }

      revokeActiveUrls();
      activeUrlsRef.current = createdList;

      setBooks(loadedBooks);
      setCollections(loadedCollections);
      setSeriesRecords(loadedSeries);
      setTagRecords(loadedTags);
      setCoverDesigns(loadedCoverDesigns);
      setCoverPresets(loadedCoverPresets);
      setBookmarks(loadedBookmarks);
      setAnnotations(loadedAnnotations);
      setReaderPreferences(loadedPrefs);
      setCustomFonts(loadedCustomFonts);
      setBackupSettings(loadedBackupSettings);
      setStorageBreakdown(loadedStorageBreakdown);
      setCoverUrls(nextUrls);
      setError(null);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to load library from IndexedDB.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [revokeActiveUrls]);

  useEffect(() => {
    void (async () => {
      await requestPersistentStorage().catch(() => undefined);
      await refreshLibrary();
    })();
    return () => {
      revokeActiveUrls();
    };
  }, [refreshLibrary, revokeActiveUrls]);

  const saveImportedDrafts = useCallback(
    async (drafts: ImportDraft[]): Promise<Book[]> => {
      const saved: Book[] = [];
      for (const draft of drafts) {
        const book = await bookStorageService.saveImportedBook(draft);
        saved.push(book);
      }
      await refreshLibrary();
      return saved;
    },
    [refreshLibrary]
  );

  const updateBookMetadata = useCallback(
    async (
      bookId: string,
      updates: BookMetadataUpdate,
      coverUpdate?: CoverReplacement
    ): Promise<Book> => {
      const updated = await bookStorageService.updateBookMetadata(
        bookId,
        updates,
        coverUpdate
      );
      await refreshLibrary();
      return updated;
    },
    [refreshLibrary]
  );

  const updateReadingState = useCallback(
    async (
      bookId: string,
      status: ReadingStatus,
      progress: number
    ): Promise<Book> => {
      const updated = await bookStorageService.updateReadingState(
        bookId,
        status,
        progress
      );
      setBooks((prev) =>
        prev.map((item) => (item.id === bookId ? updated : item))
      );
      return updated;
    },
    []
  );

  const markBookOpened = useCallback(async (bookId: string): Promise<Book> => {
    const updated = await bookStorageService.markBookOpened(bookId);
    setBooks((prev) =>
      prev.map((item) => (item.id === bookId ? updated : item))
    );
    return updated;
  }, []);

  const deleteBook = useCallback(
    async (bookId: string): Promise<void> => {
      await bookStorageService.deleteBook(bookId);
      await refreshLibrary();
    },
    [refreshLibrary]
  );

  // Collections
  const createCollection = useCallback(
    async (name: string, description: string): Promise<Collection> => {
      const created = await bookStorageService.createCollection(
        name,
        description
      );
      await refreshLibrary();
      return created;
    },
    [refreshLibrary]
  );

  const updateCollection = useCallback(
    async (
      id: string,
      patch: { name?: string; description?: string }
    ): Promise<Collection> => {
      const updated = await bookStorageService.updateCollection(id, patch);
      await refreshLibrary();
      return updated;
    },
    [refreshLibrary]
  );

  const deleteCollection = useCallback(
    async (id: string): Promise<void> => {
      await bookStorageService.deleteCollection(id);
      await refreshLibrary();
    },
    [refreshLibrary]
  );

  const setBookCollections = useCallback(
    async (bookId: string, collectionIds: string[]): Promise<void> => {
      await bookStorageService.setBookCollections(bookId, collectionIds);
      await refreshLibrary();
    },
    [refreshLibrary]
  );

  // Series
  const createSeries = useCallback(
    async (name: string, description: string): Promise<SeriesRecord> => {
      const created = await bookStorageService.createSeries(name, description);
      await refreshLibrary();
      return created;
    },
    [refreshLibrary]
  );

  const updateSeries = useCallback(
    async (
      id: string,
      patch: { name?: string; description?: string }
    ): Promise<SeriesRecord> => {
      const updated = await bookStorageService.updateSeries(id, patch);
      await refreshLibrary();
      return updated;
    },
    [refreshLibrary]
  );

  const deleteSeries = useCallback(
    async (id: string): Promise<void> => {
      await bookStorageService.deleteSeries(id);
      await refreshLibrary();
    },
    [refreshLibrary]
  );

  const setBookSeries = useCallback(
    async (
      bookId: string,
      seriesName: string,
      seriesIndex: number | null
    ): Promise<Book> => {
      const updated = await bookStorageService.setBookSeries(
        bookId,
        seriesName,
        seriesIndex
      );
      await refreshLibrary();
      return updated;
    },
    [refreshLibrary]
  );

  const reorderSeriesBooks = useCallback(
    async (seriesName: string, orderedBookIds: string[]): Promise<void> => {
      await bookStorageService.reorderSeriesBooks(seriesName, orderedBookIds);
      await refreshLibrary();
    },
    [refreshLibrary]
  );

  // Tags
  const createTag = useCallback(
    async (name: string): Promise<TagRecord> => {
      const created = await bookStorageService.createTag(name);
      await refreshLibrary();
      return created;
    },
    [refreshLibrary]
  );

  const renameTag = useCallback(
    async (oldTag: string, newTag: string): Promise<void> => {
      await bookStorageService.renameTagAcrossLibrary(oldTag, newTag);
      await refreshLibrary();
    },
    [refreshLibrary]
  );

  const deleteTag = useCallback(
    async (tag: string): Promise<void> => {
      await bookStorageService.deleteTagAcrossLibrary(tag);
      await refreshLibrary();
    },
    [refreshLibrary]
  );

  const setBookTags = useCallback(
    async (bookId: string, tagNames: string[]): Promise<Book> => {
      const updated = await bookStorageService.setBookTags(bookId, tagNames);
      await refreshLibrary();
      return updated;
    },
    [refreshLibrary]
  );

  // Authors
  const renameAuthor = useCallback(
    async (oldName: string, newName: string): Promise<void> => {
      await bookStorageService.renameAuthorAcrossLibrary(oldName, newName);
      await refreshLibrary();
    },
    [refreshLibrary]
  );

  const mergeAuthors = useCallback(
    async (sourceNames: string[], targetName: string): Promise<void> => {
      await bookStorageService.mergeAuthors(sourceNames, targetName);
      await refreshLibrary();
    },
    [refreshLibrary]
  );

  const downloadBookFile = useCallback(async (bookId: string) => {
    const fileResult = await bookStorageService.getBookFileBlob(bookId);
    if (!fileResult) {
      throw new Error('EPUB binary file not found in local storage.');
    }
    const url = URL.createObjectURL(fileResult.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileResult.fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, []);

  // Cover Designer
  const saveCustomCover = useCallback(
    async (
      bookId: string,
      renderedData: ArrayBuffer,
      renderedMimeType: string,
      designRecord: Omit<CoverDesignRecord, 'bookId' | 'updatedAt'>
    ): Promise<Book> => {
      const updated = await bookStorageService.saveCustomCover(
        bookId,
        renderedData,
        renderedMimeType,
        designRecord
      );
      await refreshLibrary();
      return updated;
    },
    [refreshLibrary]
  );

  const restoreOriginalCover = useCallback(
    async (bookId: string): Promise<Book> => {
      const updated = await bookStorageService.restoreOriginalCover(bookId);
      await refreshLibrary();
      return updated;
    },
    [refreshLibrary]
  );

  const saveCoverPreset = useCallback(
    async (name: string, spec: CoverDesignSpec): Promise<CoverPresetRecord> => {
      const preset = await bookStorageService.saveCoverPreset(name, spec);
      await refreshLibrary();
      return preset;
    },
    [refreshLibrary]
  );

  const deleteCoverPreset = useCallback(
    async (id: string): Promise<void> => {
      await bookStorageService.deleteCoverPreset(id);
      await refreshLibrary();
    },
    [refreshLibrary]
  );

  // Reader Position, Bookmarks, Annotations, Preferences & Custom Fonts
  const updateReadingPosition = useCallback(
    async (
      bookId: string,
      payload: {
        currentCfi: string | null;
        progress: number;
        status?: ReadingStatus;
      }
    ): Promise<Book> => {
      const updated = await bookStorageService.updateReadingPosition(
        bookId,
        payload
      );
      setBooks((prev) =>
        prev.map((item) => (item.id === bookId ? updated : item))
      );
      return updated;
    },
    []
  );

  const createBookmark = useCallback(
    async (
      bookId: string,
      cfi: string,
      label: string
    ): Promise<BookmarkRecord> => {
      const created = await bookStorageService.createBookmark(
        bookId,
        cfi,
        label
      );
      setBookmarks((prev) => [created, ...prev]);
      return created;
    },
    []
  );

  const updateBookmark = useCallback(
    async (id: string, label: string): Promise<BookmarkRecord> => {
      const updated = await bookStorageService.updateBookmark(id, label);
      setBookmarks((prev) =>
        prev.map((item) => (item.id === id ? updated : item))
      );
      return updated;
    },
    []
  );

  const deleteBookmark = useCallback(async (id: string): Promise<void> => {
    await bookStorageService.deleteBookmark(id);
    setBookmarks((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const createAnnotation = useCallback(
    async (payload: {
      bookId: string;
      cfiRange: string;
      text: string;
      note?: string;
      color?: HighlightColor;
      chapterLabel?: string;
    }): Promise<AnnotationRecord> => {
      const created = await bookStorageService.createAnnotation(payload);
      setAnnotations((prev) => [created, ...prev]);
      return created;
    },
    []
  );

  const updateAnnotation = useCallback(
    async (
      id: string,
      patch: {
        note?: string;
        color?: HighlightColor;
      }
    ): Promise<AnnotationRecord> => {
      const updated = await bookStorageService.updateAnnotation(id, patch);
      setAnnotations((prev) =>
        prev.map((item) => (item.id === id ? updated : item))
      );
      return updated;
    },
    []
  );

  const deleteAnnotation = useCallback(async (id: string): Promise<void> => {
    await bookStorageService.deleteAnnotation(id);
    setAnnotations((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const saveReaderPreferences = useCallback(
    async (
      prefs: Omit<ReaderPreferences, 'id' | 'updatedAt'>
    ): Promise<ReaderPreferences> => {
      const saved = await bookStorageService.saveReaderPreferences(prefs);
      setReaderPreferences(saved);
      return saved;
    },
    []
  );

  const uploadCustomFont = useCallback(
    async (file: File): Promise<CustomFontRecord> => {
      const data = await file.arrayBuffer();
      const created = await bookStorageService.saveCustomFont(
        file.name,
        file.type,
        data
      );
      setCustomFonts((prev) => [created, ...prev]);
      return created;
    },
    []
  );

  const deleteCustomFont = useCallback(
    async (id: string): Promise<void> => {
      await bookStorageService.deleteCustomFont(id);
      setCustomFonts((prev) => prev.filter((item) => item.id !== id));
      setReaderPreferences((prev) => {
        if (prev.fontId === `custom:${id}`) {
          const fallback = { ...prev, fontId: 'source-serif' };
          void bookStorageService.saveReaderPreferences({
            readingMode: fallback.readingMode,
            themeId: fallback.themeId,
            customBgColor: fallback.customBgColor,
            customTextColor: fallback.customTextColor,
            useOriginalStyling: fallback.useOriginalStyling,
            fontId: fallback.fontId,
            fontSizePx: fallback.fontSizePx,
            fontWeight: fallback.fontWeight,
            lineHeight: fallback.lineHeight,
            paragraphSpacingEm: fallback.paragraphSpacingEm,
            letterSpacingEm: fallback.letterSpacingEm,
            textAlign: fallback.textAlign,
            marginPx: fallback.marginPx,
            maxWidthPx: fallback.maxWidthPx,
          });
          return fallback;
        }
        return prev;
      });
    },
    []
  );

  const refreshStorageState = useCallback(async () => {
    const [breakdown, settings] = await Promise.all([
      getStorageBreakdown(),
      getBackupSettings(),
    ]);
    setStorageBreakdown(breakdown);
    setBackupSettings(settings);
    return breakdown;
  }, []);

  const requestPersistence = useCallback(async () => {
    await requestPersistentStorage();
    return refreshStorageState();
  }, [refreshStorageState]);

  const dismissReminder = useCallback(async () => {
    const updated = await dismissBackupReminder();
    setBackupSettings(updated);
  }, []);

  return {
    books,
    collections,
    seriesRecords,
    tagRecords,
    coverDesigns,
    coverPresets,
    bookmarks,
    annotations,
    readerPreferences,
    customFonts,
    backupSettings,
    storageBreakdown,
    coverUrls,
    isLoading,
    error,
    refreshLibrary,
    saveImportedDrafts,
    updateBookMetadata,
    updateReadingState,
    markBookOpened,
    deleteBook,
    createCollection,
    updateCollection,
    deleteCollection,
    setBookCollections,
    createSeries,
    updateSeries,
    deleteSeries,
    setBookSeries,
    reorderSeriesBooks,
    createTag,
    renameTag,
    deleteTag,
    setBookTags,
    renameAuthor,
    mergeAuthors,
    downloadBookFile,
    saveCustomCover,
    restoreOriginalCover,
    saveCoverPreset,
    deleteCoverPreset,
    updateReadingPosition,
    createBookmark,
    updateBookmark,
    deleteBookmark,
    createAnnotation,
    updateAnnotation,
    deleteAnnotation,
    saveReaderPreferences,
    uploadCustomFont,
    deleteCustomFont,
    refreshStorageState,
    requestPersistence,
    dismissReminder,
  };
}
