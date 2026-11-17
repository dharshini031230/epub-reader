import { CheckCircle2, AlertCircle, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AuthorsView } from './components/AuthorsView';
import { BackupStorageView } from './components/BackupStorageView';
import {
  ManageCollectionsModal,
  ManageSeriesModal,
  ManageTagsModal,
} from './components/BookActionModals';
import type { BookMenuHandlers } from './components/BookCard';
import { BookDetailDrawer } from './components/BookDetailDrawer';
import { CollectionsView } from './components/CollectionsView';
import { CoverDesignerModal } from './components/CoverDesignerModal';
import { DeleteBookModal } from './components/DeleteBookModal';
import { HighlightsView } from './components/HighlightsView';
import { ImportModal } from './components/ImportModal';
import { ReaderView } from './components/reader/ReaderView';
import { SeriesView } from './components/SeriesView';
import { ShelfView } from './components/ShelfView';
import { TagsView } from './components/TagsView';
import { TopNav } from './components/TopNav';
import { useLibrary } from './hooks/useLibrary';
import { getReadingStatusLabel } from './services/libraryDomainService';
import { shouldShowBackupReminder } from './services/storageProtectionService';
import type {
  Book,
  LibraryFilterState,
  NavigationSection,
  ReadingStatus,
} from './types/library';

const DEFAULT_FILTER_STATE: LibraryFilterState = {
  searchQuery: '',
  statusFilter: 'all',
  sortField: 'addedAt',
  sortDirection: 'desc',
  tagFilter: null,
  authorFilter: null,
  seriesFilter: null,
  collectionIdFilter: null,
};

interface ToastState {
  id: number;
  message: string;
  tone: 'success' | 'error';
}

export default function App() {
  const {
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
  } = useLibrary();

  const [activeSection, setActiveSection] =
    useState<NavigationSection>('shelf');
  const [filterState, setFilterState] =
    useState<LibraryFilterState>(DEFAULT_FILTER_STATE);

  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [drawerInitialMode, setDrawerInitialMode] = useState<
    'overview' | 'edit'
  >('overview');
  const [isImportOpen, setIsImportOpen] = useState<boolean>(false);

  // Action modal targets
  const [collectionsBookId, setCollectionsBookId] = useState<string | null>(
    null
  );
  const [seriesBookId, setSeriesBookId] = useState<string | null>(null);
  const [tagsBookId, setTagsBookId] = useState<string | null>(null);
  const [customiseCoverBookId, setCustomiseCoverBookId] = useState<
    string | null
  >(null);
  const [deleteBookId, setDeleteBookId] = useState<string | null>(null);
  const [activeReader, setActiveReader] = useState<{
    bookId: string;
    initialCfi?: string | null;
  } | null>(null);

  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback(
    (message: string, tone: 'success' | 'error' = 'success') => {
      setToast({ id: Date.now(), message, tone });
    },
    []
  );

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast((current) => (current?.id === toast.id ? null : current));
    }, 4500);
    return () => clearTimeout(timer);
  }, [toast]);

  const selectedBook = useMemo(
    () => books.find((b) => b.id === selectedBookId) ?? null,
    [books, selectedBookId]
  );

  const collectionsTargetBook = useMemo(
    () => books.find((b) => b.id === collectionsBookId) ?? null,
    [books, collectionsBookId]
  );

  const seriesTargetBook = useMemo(
    () => books.find((b) => b.id === seriesBookId) ?? null,
    [books, seriesBookId]
  );

  const tagsTargetBook = useMemo(
    () => books.find((b) => b.id === tagsBookId) ?? null,
    [books, tagsBookId]
  );

  const coverTargetBook = useMemo(
    () => books.find((b) => b.id === customiseCoverBookId) ?? null,
    [books, customiseCoverBookId]
  );

  const coverDesignerTarget = useMemo(() => {
    if (!coverTargetBook) return null;
    const existingDesign = coverDesigns.find(
      (d) => d.bookId === coverTargetBook.id
    );
    return {
      kind: 'book' as const,
      book: coverTargetBook,
      existingDesign,
    };
  }, [coverTargetBook, coverDesigns]);

  const deleteTargetBook = useMemo(
    () => books.find((b) => b.id === deleteBookId) ?? null,
    [books, deleteBookId]
  );

  const readerBook = useMemo(
    () =>
      activeReader
        ? books.find((b) => b.id === activeReader.bookId) ?? null
        : null,
    [books, activeReader]
  );

  const allBookTags = useMemo(() => {
    const list: string[] = [];
    for (const book of books) {
      list.push(...book.tagNames);
    }
    return list;
  }, [books]);

  const handleFilterChange = useCallback(
    (patch: Partial<LibraryFilterState>) => {
      setFilterState((prev) => ({ ...prev, ...patch }));
    },
    []
  );

  const handleResetFilters = useCallback(() => {
    setFilterState(DEFAULT_FILTER_STATE);
  }, []);

  const handleSelectBook = useCallback((book: Book) => {
    setDrawerInitialMode('overview');
    setSelectedBookId(book.id);
  }, []);

  const handleFilterByAuthor = useCallback((author: string) => {
    setFilterState((prev) => ({
      ...prev,
      authorFilter: author,
      tagFilter: null,
      seriesFilter: null,
      collectionIdFilter: null,
      statusFilter: 'all',
    }));
    setActiveSection('shelf');
  }, []);

  const handleFilterByTag = useCallback((tag: string) => {
    setFilterState((prev) => ({
      ...prev,
      tagFilter: tag,
      authorFilter: null,
      seriesFilter: null,
      collectionIdFilter: null,
      statusFilter: 'all',
    }));
    setActiveSection('shelf');
  }, []);

  const handleChangeReadingStatusFromMenu = useCallback(
    async (book: Book, status: ReadingStatus) => {
      try {
        const nextProgress =
          status === 'finished'
            ? 100
            : status === 'to-read'
              ? 0
              : book.progress;
        await updateReadingState(book.id, status, nextProgress);
        showToast(
          `Marked "${book.title}" as ${getReadingStatusLabel(status)}.`
        );
      } catch (err) {
        showToast(
          err instanceof Error
            ? err.message
            : 'Unable to update reading status.',
          'error'
        );
      }
    },
    [updateReadingState, showToast]
  );

  const openReaderForBook = useCallback(
    (book: Book, cfi?: string | null) => {
      void markBookOpened(book.id).catch(() => undefined);
      setSelectedBookId(null);
      setActiveReader({
        bookId: book.id,
        initialCfi: cfi ?? null,
      });
    },
    [markBookOpened]
  );

  const bookMenuHandlers: BookMenuHandlers = useMemo(
    () => ({
      onOpenBook: (book) => {
        openReaderForBook(book);
      },
      onViewDetails: (book) => {
        setDrawerInitialMode('overview');
        setSelectedBookId(book.id);
      },
      onEditMetadata: (book) => {
        setDrawerInitialMode('edit');
        setSelectedBookId(book.id);
      },
      onChangeReadingStatus: (book, status) => {
        void handleChangeReadingStatusFromMenu(book, status);
      },
      onManageCollections: (book) => {
        setCollectionsBookId(book.id);
      },
      onManageSeries: (book) => {
        setSeriesBookId(book.id);
      },
      onManageTags: (book) => {
        setTagsBookId(book.id);
      },
      onCustomiseCover: (book) => {
        setCustomiseCoverBookId(book.id);
      },
      onExportBook: (book) => {
        void downloadBookFile(book.id).catch((err) => {
          showToast(
            err instanceof Error ? err.message : 'Unable to export EPUB file.',
            'error'
          );
        });
      },
      onRequestDeleteBook: (book) => {
        setDeleteBookId(book.id);
      },
    }),
    [
      openReaderForBook,
      handleChangeReadingStatusFromMenu,
      downloadBookFile,
      showToast,
    ]
  );

  const handleConfirmPermanentDelete = useCallback(
    async (book: Book) => {
      await deleteBook(book.id);
      setDeleteBookId(null);
      if (selectedBookId === book.id) {
        setSelectedBookId(null);
      }
      showToast(
        `Permanently deleted "${book.title}" and its local data from your library.`
      );
    },
    [deleteBook, selectedBookId, showToast]
  );

  return (
    <div className="min-h-screen bg-[#08080A] text-[#F2EDE4] flex flex-col">
      <TopNav
        activeSection={activeSection}
        onNavigate={setActiveSection}
        onOpenImport={() => setIsImportOpen(true)}
      />

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-8 py-8 sm:py-10">
        {error && (
          <div
            role="alert"
            className="mb-8 p-4 rounded-md bg-red-950/40 border border-red-500/30 text-sm text-red-200"
          >
            {error}
          </div>
        )}

        {activeSection === 'shelf' && (
          <ShelfView
            books={books}
            collections={collections}
            tagRecords={tagRecords}
            coverUrls={coverUrls}
            filterState={filterState}
            onFilterChange={handleFilterChange}
            onResetFilters={handleResetFilters}
            onSelectBook={handleSelectBook}
            bookMenuHandlers={bookMenuHandlers}
            onOpenImport={() => setIsImportOpen(true)}
            isLoading={isLoading}
            showBackupReminder={
              !readerBook && shouldShowBackupReminder(books, backupSettings)
            }
            onOpenBackup={() => setActiveSection('storage')}
            onDismissBackupReminder={() => void dismissReminder()}
          />
        )}

        {activeSection === 'collections' && (
          <CollectionsView
            collections={collections}
            books={books}
            coverUrls={coverUrls}
            onCreateCollection={createCollection}
            onUpdateCollection={updateCollection}
            onDeleteCollection={deleteCollection}
            onSetBookCollections={setBookCollections}
            onSelectBook={handleSelectBook}
            bookMenuHandlers={bookMenuHandlers}
            onNotify={(msg) => showToast(msg)}
          />
        )}

        {activeSection === 'series' && (
          <SeriesView
            books={books}
            seriesRecords={seriesRecords}
            coverUrls={coverUrls}
            onCreateSeries={createSeries}
            onUpdateSeries={updateSeries}
            onDeleteSeries={deleteSeries}
            onSetBookSeries={setBookSeries}
            onReorderSeriesBooks={reorderSeriesBooks}
            onSelectBook={handleSelectBook}
            bookMenuHandlers={bookMenuHandlers}
            onNotify={(msg) => showToast(msg)}
          />
        )}

        {activeSection === 'tags' && (
          <TagsView
            books={books}
            tagRecords={tagRecords}
            coverUrls={coverUrls}
            onSelectBook={handleSelectBook}
            bookMenuHandlers={bookMenuHandlers}
            onCreateTag={createTag}
            onRenameTag={renameTag}
            onDeleteTag={deleteTag}
            onNotify={(msg) => showToast(msg)}
          />
        )}

        {activeSection === 'authors' && (
          <AuthorsView
            books={books}
            coverUrls={coverUrls}
            onSelectBook={handleSelectBook}
            bookMenuHandlers={bookMenuHandlers}
            onRenameAuthor={renameAuthor}
            onMergeAuthors={mergeAuthors}
            onNotify={(msg) => showToast(msg)}
          />
        )}

        {activeSection === 'highlights' && (
          <HighlightsView
            annotations={annotations}
            books={books}
            coverUrls={coverUrls}
            onOpenBookAtCfi={(book, cfiRange) =>
              openReaderForBook(book, cfiRange)
            }
            onUpdateAnnotation={updateAnnotation}
            onDeleteAnnotation={deleteAnnotation}
            onNotify={(msg) => showToast(msg)}
          />
        )}

        {activeSection === 'storage' && (
          <BackupStorageView
            backupSettings={backupSettings}
            storageBreakdown={storageBreakdown}
            onRefreshLibrary={refreshLibrary}
            onRefreshStorageState={refreshStorageState}
            onRequestPersistence={requestPersistence}
            onNotify={(msg, tone) => showToast(msg, tone)}
          />
        )}
      </main>

      <ImportModal
        isOpen={isImportOpen}
        collections={collections}
        coverPresets={coverPresets}
        onClose={() => setIsImportOpen(false)}
        onSaveDrafts={async (drafts) => {
          const saved = await saveImportedDrafts(drafts);
          showToast(
            `Imported ${saved.length} ${saved.length === 1 ? 'book' : 'books'} into your library.`
          );
        }}
        onCreateCollection={createCollection}
        onSaveCoverPreset={saveCoverPreset}
        onDeleteCoverPreset={deleteCoverPreset}
      />

      <BookDetailDrawer
        book={selectedBook}
        initialMode={drawerInitialMode}
        coverUrl={selectedBook ? coverUrls[selectedBook.id] : null}
        collections={collections}
        onClose={() => setSelectedBookId(null)}
        onUpdateReadingState={async (bookId, status, progress) => {
          await updateReadingState(bookId, status, progress);
        }}
        onUpdateMetadata={async (bookId, updates, coverUpdate) => {
          await updateBookMetadata(bookId, updates, coverUpdate);
          showToast('Saved updated book metadata.');
        }}
        onSetBookCollections={setBookCollections}
        onRequestDeleteBook={(book) => setDeleteBookId(book.id)}
        onDownloadBook={downloadBookFile}
        onFilterByAuthor={handleFilterByAuthor}
        onFilterByTag={handleFilterByTag}
        onManageSeries={(book) => setSeriesBookId(book.id)}
        onManageTags={(book) => setTagsBookId(book.id)}
        onCustomiseCover={(book) => setCustomiseCoverBookId(book.id)}
        onOpenReader={(book) => openReaderForBook(book)}
      />

      <ManageCollectionsModal
        book={collectionsTargetBook}
        collections={collections}
        onClose={() => setCollectionsBookId(null)}
        onSetBookCollections={setBookCollections}
        onCreateCollection={createCollection}
      />

      <ManageSeriesModal
        book={seriesTargetBook}
        seriesList={seriesRecords}
        onClose={() => setSeriesBookId(null)}
        onSetBookSeries={async (bookId, seriesName, seriesIndex) => {
          await setBookSeries(bookId, seriesName, seriesIndex);
          showToast(
            seriesName
              ? `Updated series assignment to "${seriesName}".`
              : 'Removed book from series.'
          );
        }}
      />

      <ManageTagsModal
        book={tagsTargetBook}
        tagRecords={tagRecords}
        allBookTags={allBookTags}
        onClose={() => setTagsBookId(null)}
        onSetBookTags={async (bookId, tagNames) => {
          await setBookTags(bookId, tagNames);
          showToast('Updated book tags.');
        }}
      />

      <CoverDesignerModal
        target={coverDesignerTarget}
        presets={coverPresets}
        onClose={() => setCustomiseCoverBookId(null)}
        onSaveForBook={async (bookId, payload) => {
          await saveCustomCover(
            bookId,
            payload.renderedData,
            payload.renderedMimeType,
            {
              spec: payload.spec,
              customImageData: payload.customImageData,
              customImageMimeType: payload.customImageMimeType,
            }
          );
          showToast('Saved custom book cover.');
        }}
        onRestoreOriginalForBook={async (bookId) => {
          await restoreOriginalCover(bookId);
          showToast('Restored original EPUB cover.');
        }}
        onSavePreset={saveCoverPreset}
        onDeletePreset={deleteCoverPreset}
      />

      <DeleteBookModal
        book={deleteTargetBook}
        onCancel={() => setDeleteBookId(null)}
        onConfirmPermanentDelete={handleConfirmPermanentDelete}
      />

      {readerBook && (
        <ReaderView
          book={readerBook}
          initialCfi={activeReader?.initialCfi}
          bookmarks={bookmarks}
          annotations={annotations}
          preferences={readerPreferences}
          customFonts={customFonts}
          onClose={() => setActiveReader(null)}
          onUpdateReadingPosition={updateReadingPosition}
          onUpdateReadingState={updateReadingState}
          onCreateBookmark={createBookmark}
          onUpdateBookmark={updateBookmark}
          onDeleteBookmark={deleteBookmark}
          onCreateAnnotation={createAnnotation}
          onUpdateAnnotation={updateAnnotation}
          onDeleteAnnotation={deleteAnnotation}
          onSavePreferences={saveReaderPreferences}
          onUploadCustomFont={uploadCustomFont}
          onDeleteCustomFont={deleteCustomFont}
          storageBreakdown={storageBreakdown}
          backupSettings={backupSettings}
          onOpenStorageSettings={() => {
            setActiveReader(null);
            setActiveSection('storage');
          }}
        />
      )}

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-5 right-5 z-50 max-w-sm flex items-start gap-3 px-4 py-3 rounded-lg border shadow-2xl text-xs ${
            toast.tone === 'error'
              ? 'bg-red-950/90 border-red-500/40 text-red-100'
              : 'bg-[#16161C]/95 border-[#D99B43]/40 text-[#F2EDE4]'
          }`}
        >
          {toast.tone === 'error' ? (
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-[#D99B43] shrink-0 mt-0.5" />
          )}
          <span className="flex-1 leading-relaxed">{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Dismiss notification"
            className="text-[#A69F93] hover:text-[#F2EDE4] shrink-0 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
