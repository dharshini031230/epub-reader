export type ReadingStatus =
  | 'to-read'
  | 'reading'
  | 'finished'
  | 'paused'
  | 'dropped';

export type NavigationSection =
  | 'shelf'
  | 'collections'
  | 'series'
  | 'tags'
  | 'authors'
  | 'highlights'
  | 'storage';

export type BookSortField =
  | 'addedAt'
  | 'lastOpenedAt'
  | 'title'
  | 'author'
  | 'publishedYear'
  | 'progress';

export type SortDirection = 'asc' | 'desc';

export type CoverFamilyId =
  | 'atmospheric'
  | 'botanical'
  | 'architectural'
  | 'abstract'
  | 'vintage'
  | 'minimalist'
  | 'illustrated'
  | 'ornamental';

export type CoverLayoutId =
  | 'full-bleed'
  | 'artwork-band'
  | 'centered-literary'
  | 'minimalist-typo'
  | 'framed-artwork'
  | 'split-composition';

export type CoverFontId =
  | 'fraunces'
  | 'cormorant'
  | 'playfair'
  | 'source-serif'
  | 'jakarta'
  | 'dm-sans';

export type CoverVerticalPosition = 'top' | 'middle' | 'bottom';
export type CoverAuthorPosition = 'top' | 'below-title' | 'bottom';
export type CoverTextAlign = 'left' | 'center' | 'right';
export type CoverFontWeight = '400' | '500' | '600' | '700';

export interface CoverColorScheme {
  paletteId: string;
  backgroundColor: string;
  artworkPrimaryColor: string;
  artworkSecondaryColor: string;
  accentColor: string;
  textColor: string;
}

export interface CoverDesignSpec {
  mode: 'procedural' | 'custom-image';
  title: string;
  author: string;
  subtitle: string;
  imprint: string;
  family: CoverFamilyId;
  templateId: string;
  artSeed: number;
  paletteId: string;
  backgroundColor: string;
  artworkPrimaryColor: string;
  artworkSecondaryColor: string;
  accentColor: string;
  fontFamily: CoverFontId;
  titleSize: number;
  fontWeight: CoverFontWeight;
  textAlign: CoverTextAlign;
  textColor: string;
  letterSpacing: number;
  titlePosition: CoverVerticalPosition;
  authorPosition: CoverAuthorPosition;
  layout: CoverLayoutId;
  customImageFit: 'cover' | 'contain';
  customImageScale: number;
  customImageOffsetX: number;
  customImageOffsetY: number;
  customImageShowTextOverlay: boolean;
  originalColors?: CoverColorScheme;
}

export interface CoverDesignRecord {
  bookId: string;
  spec: CoverDesignSpec;
  customImageData: ArrayBuffer | null;
  customImageMimeType: string | null;
  updatedAt: number;
}

export interface CoverPresetRecord {
  id: string;
  name: string;
  spec: CoverDesignSpec;
  createdAt: number;
  updatedAt: number;
}

export interface TocEntry {
  id: string;
  label: string;
  href: string;
  subitems?: TocEntry[];
}

export interface Book {
  id: string;
  title: string;
  authors: string[];
  publisher: string;
  description: string;
  language: string;
  publishedYear: string;
  identifier: string;
  seriesName: string;
  seriesIndex: number | null;
  tagNames: string[];
  status: ReadingStatus;
  progress: number;
  currentCfi: string | null;
  chapterCount: number;
  toc: TocEntry[];
  fileName: string;
  fileSize: number;
  checksum: string;
  hasCover: boolean;
  coverMimeType: string | null;
  addedAt: number;
  updatedAt: number;
  lastOpenedAt: number | null;
  syncVersion: number;
  syncDirty: boolean;
}

export interface BookBinary {
  bookId: string;
  data: ArrayBuffer;
  mimeType: string;
  byteLength: number;
  checksum: string;
  updatedAt: number;
}

export interface BookCover {
  bookId: string;
  data: ArrayBuffer;
  mimeType: string;
  updatedAt: number;
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  bookIds: string[];
  createdAt: number;
  updatedAt: number;
  syncVersion: number;
}

export interface SeriesRecord {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  updatedAt: number;
  syncVersion: number;
}

export interface TagRecord {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}

export type HighlightColor =
  | 'yellow'
  | 'orange'
  | 'pink'
  | 'blue'
  | 'green'
  | 'purple';

export interface BookmarkRecord {
  id: string;
  bookId: string;
  cfi: string;
  label: string;
  createdAt: number;
}

export interface AnnotationRecord {
  id: string;
  bookId: string;
  cfiRange: string;
  text: string;
  note: string;
  color?: HighlightColor;
  chapterLabel?: string;
  createdAt: number;
  updatedAt: number;
}

export type ReadingMode = 'paginated' | 'scrolled';

export type ReaderThemeId =
  | 'light'
  | 'dark'
  | 'sepia'
  | 'warm'
  | 'midnight'
  | 'custom';

export type ReaderTextAlign = 'left' | 'justify' | 'center';

export interface ReaderPreferences {
  id: string;
  readingMode: ReadingMode;
  themeId: ReaderThemeId;
  customBgColor: string;
  customTextColor: string;
  useOriginalStyling: boolean;
  fontId: string;
  fontSizePx: number;
  fontWeight: '400' | '500' | '600' | '700';
  lineHeight: number;
  paragraphSpacingEm: number;
  letterSpacingEm: number;
  textAlign: ReaderTextAlign;
  marginPx: number;
  maxWidthPx: number;
  updatedAt: number;
}

export interface CustomFontRecord {
  id: string;
  name: string;
  familyName: string;
  mimeType: string;
  fileName: string;
  data: ArrayBuffer;
  createdAt: number;
}

export interface BookLocationsRecord {
  bookId: string;
  locationsJson: string;
  updatedAt: number;
}

export interface ImportDraft {
  tempId: string;
  fileName: string;
  fileSize: number;
  checksum: string;
  epubData: ArrayBuffer;
  originalCoverData: ArrayBuffer | null;
  originalCoverMimeType: string | null;
  coverData: ArrayBuffer | null;
  coverMimeType: string | null;
  coverPreviewUrl: string | null;
  customCoverDesign: {
    spec: CoverDesignSpec;
    customImageData: ArrayBuffer | null;
    customImageMimeType: string | null;
  } | null;
  title: string;
  authorsInput: string;
  publisher: string;
  description: string;
  language: string;
  publishedYear: string;
  identifier: string;
  seriesName: string;
  seriesIndex: string;
  tagsInput: string;
  status: ReadingStatus;
  collectionIds: string[];
  chapterCount: number;
  toc: TocEntry[];
  duplicateBookId: string | null;
}

export interface BookMetadataUpdate {
  title: string;
  authors: string[];
  publisher: string;
  description: string;
  language: string;
  publishedYear: string;
  identifier: string;
  seriesName: string;
  seriesIndex: number | null;
  tagNames: string[];
}

export interface CoverReplacement {
  data: ArrayBuffer | null;
  mimeType: string | null;
}

export interface LibraryFilterState {
  searchQuery: string;
  statusFilter: ReadingStatus | 'all';
  sortField: BookSortField;
  sortDirection: SortDirection;
  tagFilter?: string | null;
  authorFilter?: string | null;
  seriesFilter?: string | null;
  collectionIdFilter?: string | null;
}

export interface SeriesGroup {
  id: string | null;
  name: string;
  description: string;
  books: Book[];
  finishedCount: number;
  averageProgress: number;
}

export interface AuthorSummary {
  name: string;
  bookCount: number;
  finishedCount: number;
  readingCount: number;
  books: Book[];
}

export interface TagSummary {
  id: string | null;
  name: string;
  bookCount: number;
  readingCount: number;
  finishedCount: number;
  books: Book[];
}

export interface LibraryStats {
  totalBooks: number;
  toReadCount: number;
  readingCount: number;
  finishedCount: number;
  pausedCount: number;
  droppedCount: number;
  totalBytes: number;
}

export interface ILibraryStorageService {
  getAllBooks(): Promise<Book[]>;
  getBookById(id: string): Promise<Book | undefined>;
  findBookByChecksum(checksum: string): Promise<Book | undefined>;
  saveImportedBook(draft: ImportDraft): Promise<Book>;
  updateBookMetadata(
    bookId: string,
    updates: BookMetadataUpdate,
    coverUpdate?: CoverReplacement
  ): Promise<Book>;
  updateReadingState(
    bookId: string,
    status: ReadingStatus,
    progress: number
  ): Promise<Book>;
  markBookOpened(bookId: string): Promise<Book>;
  deleteBook(bookId: string): Promise<void>;
  getAllCoverData(): Promise<BookCover[]>;
  getBookFileBlob(
    bookId: string
  ): Promise<{ blob: Blob; fileName: string } | null>;

  // Cover Designer & Original Cover Management
  getCoverDesign(bookId: string): Promise<CoverDesignRecord | undefined>;
  getAllCoverDesigns(): Promise<CoverDesignRecord[]>;
  getOriginalBookCover(bookId: string): Promise<BookCover | undefined>;
  hasOriginalBookCover(bookId: string): Promise<boolean>;
  saveCustomCover(
    bookId: string,
    renderedData: ArrayBuffer,
    renderedMimeType: string,
    designRecord: Omit<CoverDesignRecord, 'bookId' | 'updatedAt'>
  ): Promise<Book>;
  restoreOriginalCover(bookId: string): Promise<Book>;
  getAllCoverPresets(): Promise<CoverPresetRecord[]>;
  saveCoverPreset(name: string, spec: CoverDesignSpec): Promise<CoverPresetRecord>;
  deleteCoverPreset(id: string): Promise<void>;

  // Collections
  getAllCollections(): Promise<Collection[]>;
  createCollection(name: string, description: string): Promise<Collection>;
  updateCollection(
    id: string,
    patch: { name?: string; description?: string }
  ): Promise<Collection>;
  deleteCollection(id: string): Promise<void>;
  setBookCollections(bookId: string, collectionIds: string[]): Promise<void>;

  // Series
  getAllSeries(): Promise<SeriesRecord[]>;
  createSeries(name: string, description: string): Promise<SeriesRecord>;
  updateSeries(
    id: string,
    patch: { name?: string; description?: string }
  ): Promise<SeriesRecord>;
  deleteSeries(id: string): Promise<void>;
  setBookSeries(
    bookId: string,
    seriesName: string,
    seriesIndex: number | null
  ): Promise<Book>;
  reorderSeriesBooks(
    seriesName: string,
    orderedBookIds: string[]
  ): Promise<void>;

  // Tags
  getAllTags(): Promise<TagRecord[]>;
  createTag(name: string): Promise<TagRecord>;
  renameTagAcrossLibrary(oldTag: string, newTag: string): Promise<void>;
  deleteTagAcrossLibrary(tag: string): Promise<void>;
  setBookTags(bookId: string, tagNames: string[]): Promise<Book>;

  // Authors
  renameAuthorAcrossLibrary(oldName: string, newName: string): Promise<void>;
  mergeAuthors(sourceNames: string[], targetName: string): Promise<void>;

  // Reader Position, Bookmarks, Annotations, Preferences, Custom Fonts & Locations
  updateReadingPosition(
    bookId: string,
    payload: {
      currentCfi: string | null;
      progress: number;
      status?: ReadingStatus;
    }
  ): Promise<Book>;
  getAllBookmarks(): Promise<BookmarkRecord[]>;
  getBookmarksForBook(bookId: string): Promise<BookmarkRecord[]>;
  createBookmark(
    bookId: string,
    cfi: string,
    label: string
  ): Promise<BookmarkRecord>;
  updateBookmark(id: string, label: string): Promise<BookmarkRecord>;
  deleteBookmark(id: string): Promise<void>;
  getAllAnnotations(): Promise<AnnotationRecord[]>;
  getAnnotationsForBook(bookId: string): Promise<AnnotationRecord[]>;
  createAnnotation(payload: {
    bookId: string;
    cfiRange: string;
    text: string;
    note?: string;
    color?: HighlightColor;
    chapterLabel?: string;
  }): Promise<AnnotationRecord>;
  updateAnnotation(
    id: string,
    patch: {
      note?: string;
      color?: HighlightColor;
    }
  ): Promise<AnnotationRecord>;
  deleteAnnotation(id: string): Promise<void>;
  getReaderPreferences(): Promise<ReaderPreferences>;
  saveReaderPreferences(
    prefs: Omit<ReaderPreferences, 'id' | 'updatedAt'>
  ): Promise<ReaderPreferences>;
  getAllCustomFonts(): Promise<CustomFontRecord[]>;
  saveCustomFont(
    fileName: string,
    mimeType: string,
    data: ArrayBuffer
  ): Promise<CustomFontRecord>;
  deleteCustomFont(id: string): Promise<void>;
  getBookLocations(bookId: string): Promise<BookLocationsRecord | undefined>;
  saveBookLocations(
    bookId: string,
    locationsJson: string
  ): Promise<BookLocationsRecord>;
}

export type StoragePersistenceStatus = 'granted' | 'denied' | 'unsupported';

export interface BackupSettingsRecord {
  id: 'default';
  lastBackupAt: number | null;
  lastBackupFileName: string | null;
  lastBackupBookCount: number | null;
  lastReminderDismissedAt: number | null;
  updatedAt: number;
}

export interface StorageBreakdown {
  bookCount: number;
  epubBytes: number;
  coverBytes: number;
  customFontBytes: number;
  metadataBytes: number;
  totalLibraryBytes: number;
  browserUsageBytes: number | null;
  browserQuotaBytes: number | null;
  usageRatio: number | null;
  isApproachingQuota: boolean;
  isCriticalQuota: boolean;
  estimateSupported: boolean;
  persistenceSupported: boolean;
  persistenceStatus: StoragePersistenceStatus;
}

export interface BackupProgress {
  phase: string;
  percent: number;
  detail?: string;
}

export interface BackupFileEntry {
  path: string;
  kind: 'epub' | 'active-cover' | 'original-cover' | 'cover-design-image' | 'font';
  recordId: string;
  mimeType: string;
  byteLength: number;
  sha256: string;
}

export interface BackupManifest {
  format: 'folio-library-backup';
  formatVersion: number;
  appName: 'Folio';
  appVersion: string;
  exportedAt: string;
  exportedAtMs: number;
  recordCounts: {
    books: number;
    epubs: number;
    activeCovers: number;
    originalCovers: number;
    coverDesigns: number;
    coverPresets: number;
    collections: number;
    series: number;
    tags: number;
    bookmarks: number;
    annotations: number;
    customFonts: number;
    bookLocations: number;
  };
  files: BackupFileEntry[];
}

export type RestoreMode = 'full' | 'merge';

export type MergeConflictPolicy =
  | 'keep-existing'
  | 'overwrite-matching'
  | 'skip-matching';

export interface BackupConflictItem {
  backupBook: Book;
  existingBook: Book;
  matchReason: 'id' | 'checksum' | 'metadata';
  backupBookmarkCount: number;
  existingBookmarkCount: number;
  backupAnnotationCount: number;
  existingAnnotationCount: number;
}

export interface BackupInspectionReport {
  manifest: BackupManifest;
  fileName: string;
  fileSize: number;
  currentCounts: {
    books: number;
    collections: number;
    series: number;
    tags: number;
    bookmarks: number;
    annotations: number;
    customFonts: number;
    coverPresets: number;
  };
  newBooks: Book[];
  conflicts: BackupConflictItem[];
  newCollectionsCount: number;
  mergedCollectionsCount: number;
  newSeriesCount: number;
  newTagsCount: number;
  newFontsCount: number;
  newPresetsCount: number;
  totalIncomingBookmarks: number;
  totalIncomingAnnotations: number;
}

export interface RestoreSummary {
  mode: RestoreMode;
  conflictPolicy?: MergeConflictPolicy;
  importedBooks: number;
  mergedBooks: number;
  overwrittenBooks: number;
  skippedBooks: number;
  importedCollections: number;
  mergedCollections: number;
  importedSeries: number;
  importedTags: number;
  importedBookmarks: number;
  skippedBookmarks: number;
  importedAnnotations: number;
  skippedAnnotations: number;
  importedFonts: number;
  importedPresets: number;
}
