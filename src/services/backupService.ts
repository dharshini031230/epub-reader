import JSZip from 'jszip';
import { libraryDb } from '../db/libraryDb';
import type {
  AnnotationRecord,
  BackupConflictItem,
  BackupFileEntry,
  BackupInspectionReport,
  BackupManifest,
  BackupProgress,
  Book,
  BookBinary,
  BookCover,
  BookLocationsRecord,
  BookmarkRecord,
  Collection,
  CoverDesignRecord,
  CoverDesignSpec,
  CoverPresetRecord,
  CustomFontRecord,
  MergeConflictPolicy,
  ReaderPreferences,
  RestoreMode,
  RestoreSummary,
  SeriesRecord,
  TagRecord,
} from '../types/library';
import { createDefaultReaderPreferences } from './readerThemeService';
import { recordBackupSuccess } from './storageProtectionService';

export const BACKUP_FORMAT_ID = 'folio-library-backup' as const;
export const BACKUP_FORMAT_VERSION = 1;
export const BACKUP_APP_VERSION = '1.4.0';

interface SerializedCoverMetadata {
  bookId: string;
  kind: 'active' | 'original';
  mimeType: string;
  updatedAt: number;
  path: string;
}

interface SerializedCoverDesign {
  bookId: string;
  spec: CoverDesignSpec;
  customImageMimeType: string | null;
  customImagePath: string | null;
  updatedAt: number;
}

interface SerializedCustomFont {
  id: string;
  name: string;
  familyName: string;
  mimeType: string;
  fileName: string;
  createdAt: number;
  fontPath: string;
}

export interface ValidatedBackupBundle {
  manifest: BackupManifest;
  fileName: string;
  fileSize: number;
  books: Book[];
  bookFiles: BookBinary[];
  activeCovers: BookCover[];
  originalCovers: BookCover[];
  coverDesigns: CoverDesignRecord[];
  coverPresets: CoverPresetRecord[];
  collections: Collection[];
  series: SeriesRecord[];
  tags: TagRecord[];
  bookmarks: BookmarkRecord[];
  annotations: AnnotationRecord[];
  readerPreferences: ReaderPreferences | null;
  customFonts: CustomFontRecord[];
  bookLocations: BookLocationsRecord[];
}

function sanitizePathSegment(value: string, fallback: string): string {
  const clean = value
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return clean || fallback;
}

function extensionFromMime(mimeType: string | null | undefined, fallback: string): string {
  const lower = (mimeType ?? '').toLowerCase();
  if (lower.includes('png')) return 'png';
  if (lower.includes('jpeg') || lower.includes('jpg')) return 'jpg';
  if (lower.includes('webp')) return 'webp';
  if (lower.includes('svg')) return 'svg';
  if (lower.includes('woff2')) return 'woff2';
  if (lower.includes('woff')) return 'woff';
  if (lower.includes('otf') || lower.includes('opentype')) return 'otf';
  if (lower.includes('ttf') || lower.includes('truetype')) return 'ttf';
  return fallback;
}

export async function computeSha256Hex(data: ArrayBuffer): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // Fallback deterministic digest if WebCrypto subtle is unavailable
  const bytes = new Uint8Array(data);
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < bytes.length; i++) {
    h1 ^= bytes[i];
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= bytes[i] + i;
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  return `${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}`;
}

export function generateBackupFileName(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  return `folio-library-backup-${yyyy}-${mm}-${dd}-${hh}${min}.zip`;
}

export async function exportLibraryBackup(
  onProgress?: (progress: BackupProgress) => void
): Promise<{
  blob: Blob;
  fileName: string;
  manifest: BackupManifest;
}> {
  onProgress?.({
    phase: 'Reading local library snapshot…',
    percent: 5,
  });

  const snapshot = await libraryDb.transaction(
    'r',
    [
      libraryDb.books,
      libraryDb.bookFiles,
      libraryDb.bookCovers,
      libraryDb.originalBookCovers,
      libraryDb.coverDesigns,
      libraryDb.coverPresets,
      libraryDb.collections,
      libraryDb.series,
      libraryDb.tags,
      libraryDb.bookmarks,
      libraryDb.annotations,
      libraryDb.readerPreferences,
      libraryDb.customFonts,
      libraryDb.bookLocations,
    ],
    async () => {
      const [
        books,
        bookFiles,
        bookCovers,
        originalBookCovers,
        coverDesigns,
        coverPresets,
        collections,
        series,
        tags,
        bookmarks,
        annotations,
        readerPreferences,
        customFonts,
        bookLocations,
      ] = await Promise.all([
        libraryDb.books.toArray(),
        libraryDb.bookFiles.toArray(),
        libraryDb.bookCovers.toArray(),
        libraryDb.originalBookCovers.toArray(),
        libraryDb.coverDesigns.toArray(),
        libraryDb.coverPresets.toArray(),
        libraryDb.collections.toArray(),
        libraryDb.series.toArray(),
        libraryDb.tags.toArray(),
        libraryDb.bookmarks.toArray(),
        libraryDb.annotations.toArray(),
        libraryDb.readerPreferences.get('default'),
        libraryDb.customFonts.toArray(),
        libraryDb.bookLocations.toArray(),
      ]);

      return {
        books,
        bookFiles,
        bookCovers,
        originalBookCovers,
        coverDesigns,
        coverPresets,
        collections,
        series,
        tags,
        bookmarks,
        annotations,
        readerPreferences: readerPreferences ?? createDefaultReaderPreferences(),
        customFonts,
        bookLocations,
      };
    }
  );

  const zip = new JSZip();
  const fileEntries: BackupFileEntry[] = [];

  // Package EPUB binaries
  const totalBinarySteps = Math.max(
    1,
    snapshot.bookFiles.length +
      snapshot.bookCovers.length +
      snapshot.originalBookCovers.length +
      snapshot.customFonts.length
  );
  let completedSteps = 0;

  for (const bookFile of snapshot.bookFiles) {
    const book = snapshot.books.find((b) => b.id === bookFile.bookId);
    const safeName = sanitizePathSegment(
      book?.fileName ?? `${bookFile.bookId}.epub`,
      `${bookFile.bookId}.epub`
    );
    const fileNameWithExt = safeName.toLowerCase().endsWith('.epub')
      ? safeName
      : `${safeName}.epub`;
    const path = `epubs/${bookFile.bookId}/${fileNameWithExt}`;
    const bytes = bookFile.data.slice(0);
    const sha256 = await computeSha256Hex(bytes);

    zip.file(path, new Uint8Array(bytes), { compression: 'STORE' });
    fileEntries.push({
      path,
      kind: 'epub',
      recordId: bookFile.bookId,
      mimeType: bookFile.mimeType || 'application/epub+zip',
      byteLength: bytes.byteLength,
      sha256,
    });

    completedSteps++;
    onProgress?.({
      phase: 'Packaging EPUB files…',
      percent: Math.min(60, 10 + Math.round((completedSteps / totalBinarySteps) * 50)),
      detail: book?.title ?? fileNameWithExt,
    });
  }

  // Package active and original covers
  const coverMetadata: SerializedCoverMetadata[] = [];

  for (const cover of snapshot.bookCovers) {
    const ext = extensionFromMime(cover.mimeType, 'png');
    const path = `covers/active/${cover.bookId}.${ext}`;
    const bytes = cover.data.slice(0);
    const sha256 = await computeSha256Hex(bytes);

    zip.file(path, new Uint8Array(bytes), { compression: 'STORE' });
    fileEntries.push({
      path,
      kind: 'active-cover',
      recordId: cover.bookId,
      mimeType: cover.mimeType,
      byteLength: bytes.byteLength,
      sha256,
    });
    coverMetadata.push({
      bookId: cover.bookId,
      kind: 'active',
      mimeType: cover.mimeType,
      updatedAt: cover.updatedAt,
      path,
    });
    completedSteps++;
  }

  for (const orig of snapshot.originalBookCovers) {
    const ext = extensionFromMime(orig.mimeType, 'png');
    const path = `covers/original/${orig.bookId}.${ext}`;
    const bytes = orig.data.slice(0);
    const sha256 = await computeSha256Hex(bytes);

    zip.file(path, new Uint8Array(bytes), { compression: 'STORE' });
    fileEntries.push({
      path,
      kind: 'original-cover',
      recordId: orig.bookId,
      mimeType: orig.mimeType,
      byteLength: bytes.byteLength,
      sha256,
    });
    coverMetadata.push({
      bookId: orig.bookId,
      kind: 'original',
      mimeType: orig.mimeType,
      updatedAt: orig.updatedAt,
      path,
    });
    completedSteps++;
  }

  // Package custom cover design records + uploaded custom cover artwork images
  const serializedDesigns: SerializedCoverDesign[] = [];
  for (const design of snapshot.coverDesigns) {
    let customImagePath: string | null = null;
    if (design.customImageData && design.customImageMimeType) {
      const ext = extensionFromMime(design.customImageMimeType, 'png');
      customImagePath = `covers/design-images/${design.bookId}.${ext}`;
      const bytes = design.customImageData.slice(0);
      const sha256 = await computeSha256Hex(bytes);
      zip.file(customImagePath, new Uint8Array(bytes), { compression: 'STORE' });
      fileEntries.push({
        path: customImagePath,
        kind: 'cover-design-image',
        recordId: design.bookId,
        mimeType: design.customImageMimeType,
        byteLength: bytes.byteLength,
        sha256,
      });
    }
    serializedDesigns.push({
      bookId: design.bookId,
      spec: design.spec,
      customImageMimeType: design.customImageMimeType,
      customImagePath,
      updatedAt: design.updatedAt,
    });
  }

  // Package custom uploaded fonts
  const serializedFonts: SerializedCustomFont[] = [];
  for (const font of snapshot.customFonts) {
    const safeFontName = sanitizePathSegment(font.fileName, `${font.id}.woff2`);
    const fontPath = `fonts/${font.id}/${safeFontName}`;
    const bytes = font.data.slice(0);
    const sha256 = await computeSha256Hex(bytes);
    zip.file(fontPath, new Uint8Array(bytes), { compression: 'STORE' });
    fileEntries.push({
      path: fontPath,
      kind: 'font',
      recordId: font.id,
      mimeType: font.mimeType,
      byteLength: bytes.byteLength,
      sha256,
    });
    serializedFonts.push({
      id: font.id,
      name: font.name,
      familyName: font.familyName,
      mimeType: font.mimeType,
      fileName: font.fileName,
      createdAt: font.createdAt,
      fontPath,
    });
    completedSteps++;
  }

  onProgress?.({
    phase: 'Writing metadata and manifest…',
    percent: 70,
  });

  const now = new Date();
  const manifest: BackupManifest = {
    format: BACKUP_FORMAT_ID,
    formatVersion: BACKUP_FORMAT_VERSION,
    appName: 'Folio',
    appVersion: BACKUP_APP_VERSION,
    exportedAt: now.toISOString(),
    exportedAtMs: now.getTime(),
    recordCounts: {
      books: snapshot.books.length,
      epubs: snapshot.bookFiles.length,
      activeCovers: snapshot.bookCovers.length,
      originalCovers: snapshot.originalBookCovers.length,
      coverDesigns: snapshot.coverDesigns.length,
      coverPresets: snapshot.coverPresets.length,
      collections: snapshot.collections.length,
      series: snapshot.series.length,
      tags: snapshot.tags.length,
      bookmarks: snapshot.bookmarks.length,
      annotations: snapshot.annotations.length,
      customFonts: snapshot.customFonts.length,
      bookLocations: snapshot.bookLocations.length,
    },
    files: fileEntries,
  };

  zip.file('manifest.json', JSON.stringify(manifest, null, 2), {
    compression: 'DEFLATE',
  });
  zip.file('metadata/books.json', JSON.stringify(snapshot.books, null, 2), {
    compression: 'DEFLATE',
  });
  zip.file(
    'metadata/collections.json',
    JSON.stringify(snapshot.collections, null, 2),
    { compression: 'DEFLATE' }
  );
  zip.file('metadata/series.json', JSON.stringify(snapshot.series, null, 2), {
    compression: 'DEFLATE',
  });
  zip.file('metadata/tags.json', JSON.stringify(snapshot.tags, null, 2), {
    compression: 'DEFLATE',
  });
  zip.file(
    'metadata/bookmarks.json',
    JSON.stringify(snapshot.bookmarks, null, 2),
    { compression: 'DEFLATE' }
  );
  zip.file(
    'metadata/annotations.json',
    JSON.stringify(snapshot.annotations, null, 2),
    { compression: 'DEFLATE' }
  );
  zip.file(
    'metadata/cover-designs.json',
    JSON.stringify(serializedDesigns, null, 2),
    { compression: 'DEFLATE' }
  );
  zip.file(
    'metadata/cover-presets.json',
    JSON.stringify(snapshot.coverPresets, null, 2),
    { compression: 'DEFLATE' }
  );
  zip.file(
    'metadata/book-covers.json',
    JSON.stringify(coverMetadata, null, 2),
    { compression: 'DEFLATE' }
  );
  zip.file(
    'metadata/custom-fonts.json',
    JSON.stringify(serializedFonts, null, 2),
    { compression: 'DEFLATE' }
  );
  zip.file(
    'metadata/reader-preferences.json',
    JSON.stringify(snapshot.readerPreferences, null, 2),
    { compression: 'DEFLATE' }
  );
  zip.file(
    'metadata/book-locations.json',
    JSON.stringify(snapshot.bookLocations, null, 2),
    { compression: 'DEFLATE' }
  );

  onProgress?.({
    phase: 'Finalising backup archive…',
    percent: 78,
  });

  const blob = await zip.generateAsync(
    {
      type: 'blob',
      mimeType: 'application/zip',
    },
    (metadata) => {
      const pct = Math.min(99, 78 + Math.round((metadata.percent / 100) * 21));
      onProgress?.({
        phase: 'Finalising backup archive…',
        percent: pct,
      });
    }
  );

  if (!blob || blob.size === 0) {
    throw new Error('Generated backup archive was empty.');
  }

  const fileName = generateBackupFileName(now);
  await recordBackupSuccess({
    fileName,
    bookCount: snapshot.books.length,
  });

  onProgress?.({
    phase: 'Backup archive created.',
    percent: 100,
    detail: fileName,
  });

  return { blob, fileName, manifest };
}

export function triggerBackupDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

async function readJsonFromZip<T>(
  zip: JSZip,
  path: string,
  required: boolean
): Promise<T | null> {
  const entry = zip.file(path);
  if (!entry) {
    if (required) {
      throw new Error(`Backup archive is incomplete: missing "${path}".`);
    }
    return null;
  }
  const text = await entry.async('string');
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Backup archive contains corrupted JSON in "${path}".`);
  }
}

function assertArray<T>(val: unknown, label: string): T[] {
  if (!Array.isArray(val)) {
    throw new Error(`Invalid backup data structure: "${label}" must be a list.`);
  }
  return val as T[];
}

export async function parseAndValidateBackupArchive(
  source: File | Blob | ArrayBuffer | Uint8Array,
  fileNameHint?: string,
  onProgress?: (progress: BackupProgress) => void
): Promise<ValidatedBackupBundle> {
  onProgress?.({
    phase: 'Reading backup archive…',
    percent: 10,
  });

  let rawBuffer: ArrayBuffer;
  let fileName = fileNameHint || 'backup.zip';
  if (source instanceof ArrayBuffer) {
    rawBuffer = source;
  } else if (source instanceof Uint8Array) {
    rawBuffer = source.buffer.slice(
      source.byteOffset,
      source.byteOffset + source.byteLength
    ) as ArrayBuffer;
  } else {
    if ('name' in source && typeof source.name === 'string') {
      fileName = source.name;
    }
    rawBuffer = await source.arrayBuffer();
  }

  if (rawBuffer.byteLength === 0) {
    throw new Error('The selected backup file is empty.');
  }

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(rawBuffer);
  } catch {
    throw new Error(
      'Unable to open backup file. Please select a valid Folio ZIP backup archive.'
    );
  }

  const manifest = await readJsonFromZip<BackupManifest>(
    zip,
    'manifest.json',
    true
  );
  if (
    !manifest ||
    manifest.format !== BACKUP_FORMAT_ID ||
    typeof manifest.formatVersion !== 'number'
  ) {
    throw new Error(
      'This ZIP archive does not contain a recognised Folio backup manifest.'
    );
  }
  if (manifest.formatVersion < 1 || manifest.formatVersion > BACKUP_FORMAT_VERSION) {
    throw new Error(
      `Unsupported backup format version (${manifest.formatVersion}). Please update Folio before restoring this archive.`
    );
  }
  if (!Array.isArray(manifest.files)) {
    throw new Error('Backup manifest is missing its file integrity list.');
  }

  onProgress?.({
    phase: 'Validating metadata tables…',
    percent: 25,
  });

  const books = assertArray<Book>(
    await readJsonFromZip(zip, 'metadata/books.json', true),
    'books'
  );
  const collections = assertArray<Collection>(
    await readJsonFromZip(zip, 'metadata/collections.json', true),
    'collections'
  );
  const series = assertArray<SeriesRecord>(
    await readJsonFromZip(zip, 'metadata/series.json', true),
    'series'
  );
  const tags = assertArray<TagRecord>(
    await readJsonFromZip(zip, 'metadata/tags.json', true),
    'tags'
  );
  const bookmarks = assertArray<BookmarkRecord>(
    await readJsonFromZip(zip, 'metadata/bookmarks.json', true),
    'bookmarks'
  );
  const annotations = assertArray<AnnotationRecord>(
    await readJsonFromZip(zip, 'metadata/annotations.json', true),
    'annotations'
  );
  const serializedDesigns = assertArray<SerializedCoverDesign>(
    await readJsonFromZip(zip, 'metadata/cover-designs.json', true),
    'cover-designs'
  );
  const coverPresets = assertArray<CoverPresetRecord>(
    await readJsonFromZip(zip, 'metadata/cover-presets.json', true),
    'cover-presets'
  );
  const coverMetadata = assertArray<SerializedCoverMetadata>(
    await readJsonFromZip(zip, 'metadata/book-covers.json', true),
    'book-covers'
  );
  const serializedFonts = assertArray<SerializedCustomFont>(
    await readJsonFromZip(zip, 'metadata/custom-fonts.json', true),
    'custom-fonts'
  );
  const readerPreferences = await readJsonFromZip<ReaderPreferences>(
    zip,
    'metadata/reader-preferences.json',
    false
  );
  const bookLocationsRaw = await readJsonFromZip<BookLocationsRecord[]>(
    zip,
    'metadata/book-locations.json',
    false
  );
  const bookLocations = bookLocationsRaw
    ? assertArray<BookLocationsRecord>(bookLocationsRaw, 'book-locations')
    : [];

  for (const book of books) {
    if (!book?.id || typeof book.title !== 'string') {
      throw new Error('Backup contains an invalid book metadata entry.');
    }
  }

  onProgress?.({
    phase: 'Verifying EPUB, cover, and font file integrity…',
    percent: 45,
  });

  const verifiedBuffers = new Map<string, ArrayBuffer>();
  const totalFiles = Math.max(1, manifest.files.length);

  for (let i = 0; i < manifest.files.length; i++) {
    const fileEntry = manifest.files[i];
    const zipFile = zip.file(fileEntry.path);
    if (!zipFile) {
      throw new Error(
        `Backup archive is missing file "${fileEntry.path}" declared in the manifest.`
      );
    }
    const buffer = await zipFile.async('arraybuffer');
    if (buffer.byteLength !== fileEntry.byteLength) {
      throw new Error(
        `Integrity check failed for "${fileEntry.path}": expected ${fileEntry.byteLength} bytes, found ${buffer.byteLength} bytes.`
      );
    }
    if (fileEntry.sha256) {
      const actualHash = await computeSha256Hex(buffer);
      if (actualHash !== fileEntry.sha256) {
        throw new Error(
          `Integrity checksum mismatch for "${fileEntry.path}". The archive may be corrupted or modified.`
        );
      }
    }
    verifiedBuffers.set(fileEntry.path, buffer);

    if (i % 3 === 0 || i === manifest.files.length - 1) {
      onProgress?.({
        phase: 'Verifying archive files…',
        percent: 45 + Math.round(((i + 1) / totalFiles) * 45),
        detail: fileEntry.path,
      });
    }
  }

  // Reconstruct binary records and verify every book has its EPUB file
  const bookFiles: BookBinary[] = [];
  const epubManifestMap = new Map<string, BackupFileEntry>();
  for (const entry of manifest.files) {
    if (entry.kind === 'epub') {
      epubManifestMap.set(entry.recordId, entry);
    }
  }

  for (const book of books) {
    const epubEntry = epubManifestMap.get(book.id);
    if (!epubEntry) {
      throw new Error(
        `Backup is incomplete: EPUB file for "${book.title}" is missing from the manifest.`
      );
    }
    const buf = verifiedBuffers.get(epubEntry.path);
    if (!buf) {
      throw new Error(
        `Backup is incomplete: EPUB binary for "${book.title}" could not be extracted.`
      );
    }
    bookFiles.push({
      bookId: book.id,
      data: buf,
      mimeType: epubEntry.mimeType || 'application/epub+zip',
      byteLength: buf.byteLength,
      checksum: book.checksum,
      updatedAt: book.updatedAt || manifest.exportedAtMs,
    });
  }

  const activeCovers: BookCover[] = [];
  const originalCovers: BookCover[] = [];
  for (const meta of coverMetadata) {
    const buf = verifiedBuffers.get(meta.path);
    if (!buf) {
      throw new Error(`Missing cover binary "${meta.path}" in backup archive.`);
    }
    const record: BookCover = {
      bookId: meta.bookId,
      data: buf,
      mimeType: meta.mimeType,
      updatedAt: meta.updatedAt,
    };
    if (meta.kind === 'original') {
      originalCovers.push(record);
    } else {
      activeCovers.push(record);
    }
  }

  const coverDesigns: CoverDesignRecord[] = serializedDesigns.map((d) => {
    let customImageData: ArrayBuffer | null = null;
    if (d.customImagePath) {
      const buf = verifiedBuffers.get(d.customImagePath);
      if (!buf) {
        throw new Error(
          `Missing custom cover image "${d.customImagePath}" in backup archive.`
        );
      }
      customImageData = buf;
    }
    return {
      bookId: d.bookId,
      spec: d.spec,
      customImageData,
      customImageMimeType: d.customImageMimeType,
      updatedAt: d.updatedAt,
    };
  });

  const customFonts: CustomFontRecord[] = serializedFonts.map((f) => {
    const buf = verifiedBuffers.get(f.fontPath);
    if (!buf) {
      throw new Error(`Missing font binary "${f.fontPath}" in backup archive.`);
    }
    return {
      id: f.id,
      name: f.name,
      familyName: f.familyName,
      mimeType: f.mimeType,
      fileName: f.fileName,
      data: buf,
      createdAt: f.createdAt,
    };
  });

  onProgress?.({
    phase: 'Backup archive validated.',
    percent: 100,
  });

  return {
    manifest,
    fileName,
    fileSize: rawBuffer.byteLength,
    books,
    bookFiles,
    activeCovers,
    originalCovers,
    coverDesigns,
    coverPresets,
    collections,
    series,
    tags,
    bookmarks,
    annotations,
    readerPreferences,
    customFonts,
    bookLocations,
  };
}

function findMatchingExistingBook(
  backupBook: Book,
  existingBooks: Book[]
): { book: Book; matchReason: 'id' | 'checksum' | 'metadata' } | null {
  const byId = existingBooks.find((b) => b.id === backupBook.id);
  if (byId) return { book: byId, matchReason: 'id' };

  if (backupBook.checksum) {
    const byChecksum = existingBooks.find(
      (b) => b.checksum && b.checksum === backupBook.checksum
    );
    if (byChecksum) return { book: byChecksum, matchReason: 'checksum' };
  }

  const targetTitle = backupBook.title.trim().toLowerCase();
  const targetAuthor = (backupBook.authors[0] ?? '').trim().toLowerCase();
  const byMeta = existingBooks.find((b) => {
    const t = b.title.trim().toLowerCase();
    const a = (b.authors[0] ?? '').trim().toLowerCase();
    return (
      t === targetTitle &&
      a === targetAuthor &&
      b.fileSize === backupBook.fileSize
    );
  });
  if (byMeta) return { book: byMeta, matchReason: 'metadata' };

  return null;
}

export async function inspectBackupAgainstLibrary(
  bundle: ValidatedBackupBundle
): Promise<BackupInspectionReport> {
  const [
    existingBooks,
    existingCollections,
    existingSeries,
    existingTags,
    existingBookmarks,
    existingAnnotations,
    existingFonts,
    existingPresets,
  ] = await Promise.all([
    libraryDb.books.toArray(),
    libraryDb.collections.toArray(),
    libraryDb.series.toArray(),
    libraryDb.tags.toArray(),
    libraryDb.bookmarks.toArray(),
    libraryDb.annotations.toArray(),
    libraryDb.customFonts.toArray(),
    libraryDb.coverPresets.toArray(),
  ]);

  const newBooks: Book[] = [];
  const conflicts: BackupConflictItem[] = [];

  for (const backupBook of bundle.books) {
    const match = findMatchingExistingBook(backupBook, existingBooks);
    if (!match) {
      newBooks.push(backupBook);
    } else {
      conflicts.push({
        backupBook,
        existingBook: match.book,
        matchReason: match.matchReason,
        backupBookmarkCount: bundle.bookmarks.filter(
          (bm) => bm.bookId === backupBook.id
        ).length,
        existingBookmarkCount: existingBookmarks.filter(
          (bm) => bm.bookId === match.book.id
        ).length,
        backupAnnotationCount: bundle.annotations.filter(
          (a) => a.bookId === backupBook.id
        ).length,
        existingAnnotationCount: existingAnnotations.filter(
          (a) => a.bookId === match.book.id
        ).length,
      });
    }
  }

  const existingCollectionKeys = new Set(
    existingCollections.map((c) => c.name.trim().toLowerCase())
  );
  const existingCollectionIds = new Set(existingCollections.map((c) => c.id));
  let newCollectionsCount = 0;
  let mergedCollectionsCount = 0;
  for (const col of bundle.collections) {
    if (
      existingCollectionIds.has(col.id) ||
      existingCollectionKeys.has(col.name.trim().toLowerCase())
    ) {
      mergedCollectionsCount++;
    } else {
      newCollectionsCount++;
    }
  }

  const existingSeriesKeys = new Set(
    existingSeries.map((s) => s.name.trim().toLowerCase())
  );
  const newSeriesCount = bundle.series.filter(
    (s) => !existingSeriesKeys.has(s.name.trim().toLowerCase())
  ).length;

  const existingTagKeys = new Set(
    existingTags.map((t) => t.name.trim().toLowerCase())
  );
  const newTagsCount = bundle.tags.filter(
    (t) => !existingTagKeys.has(t.name.trim().toLowerCase())
  ).length;

  const existingFontIds = new Set(existingFonts.map((f) => f.id));
  const existingFontKeys = new Set(
    existingFonts.map(
      (f) => `${f.name.trim().toLowerCase()}::${f.data?.byteLength ?? 0}`
    )
  );
  const newFontsCount = bundle.customFonts.filter(
    (f) =>
      !existingFontIds.has(f.id) &&
      !existingFontKeys.has(
        `${f.name.trim().toLowerCase()}::${f.data?.byteLength ?? 0}`
      )
  ).length;

  const existingPresetIds = new Set(existingPresets.map((p) => p.id));
  const newPresetsCount = bundle.coverPresets.filter(
    (p) => !existingPresetIds.has(p.id)
  ).length;

  return {
    manifest: bundle.manifest,
    fileName: bundle.fileName,
    fileSize: bundle.fileSize,
    currentCounts: {
      books: existingBooks.length,
      collections: existingCollections.length,
      series: existingSeries.length,
      tags: existingTags.length,
      bookmarks: existingBookmarks.length,
      annotations: existingAnnotations.length,
      customFonts: existingFonts.length,
      coverPresets: existingPresets.length,
    },
    newBooks,
    conflicts,
    newCollectionsCount,
    mergedCollectionsCount,
    newSeriesCount,
    newTagsCount,
    newFontsCount,
    newPresetsCount,
    totalIncomingBookmarks: bundle.bookmarks.length,
    totalIncomingAnnotations: bundle.annotations.length,
  };
}

export async function executeBackupRestore(
  bundle: ValidatedBackupBundle,
  options: {
    mode: RestoreMode;
    conflictPolicy?: MergeConflictPolicy;
    onProgress?: (progress: BackupProgress) => void;
    /** Optional verification hook run inside the atomic transaction before completion */
    beforeTransactionCommitHook?: () => void;
  }
): Promise<RestoreSummary> {
  const mode = options.mode;
  const conflictPolicy: MergeConflictPolicy =
    options.conflictPolicy ?? 'keep-existing';

  options.onProgress?.({
    phase:
      mode === 'full'
        ? 'Restoring complete library atomically…'
        : 'Merging backup into existing library…',
    percent: 15,
  });

  const summary: RestoreSummary = {
    mode,
    conflictPolicy: mode === 'merge' ? conflictPolicy : undefined,
    importedBooks: 0,
    mergedBooks: 0,
    overwrittenBooks: 0,
    skippedBooks: 0,
    importedCollections: 0,
    mergedCollections: 0,
    importedSeries: 0,
    importedTags: 0,
    importedBookmarks: 0,
    skippedBookmarks: 0,
    importedAnnotations: 0,
    skippedAnnotations: 0,
    importedFonts: 0,
    importedPresets: 0,
  };

  await libraryDb.transaction(
    'rw',
    [
      libraryDb.books,
      libraryDb.bookFiles,
      libraryDb.bookCovers,
      libraryDb.originalBookCovers,
      libraryDb.coverDesigns,
      libraryDb.coverPresets,
      libraryDb.collections,
      libraryDb.series,
      libraryDb.tags,
      libraryDb.bookmarks,
      libraryDb.annotations,
      libraryDb.readerPreferences,
      libraryDb.customFonts,
      libraryDb.bookLocations,
    ],
    async () => {
      if (mode === 'full') {
        await Promise.all([
          libraryDb.books.clear(),
          libraryDb.bookFiles.clear(),
          libraryDb.bookCovers.clear(),
          libraryDb.originalBookCovers.clear(),
          libraryDb.coverDesigns.clear(),
          libraryDb.coverPresets.clear(),
          libraryDb.collections.clear(),
          libraryDb.series.clear(),
          libraryDb.tags.clear(),
          libraryDb.bookmarks.clear(),
          libraryDb.annotations.clear(),
          libraryDb.readerPreferences.clear(),
          libraryDb.customFonts.clear(),
          libraryDb.bookLocations.clear(),
        ]);

        if (bundle.books.length > 0) {
          await libraryDb.books.bulkPut(bundle.books);
        }
        if (bundle.bookFiles.length > 0) {
          await libraryDb.bookFiles.bulkPut(bundle.bookFiles);
        }
        if (bundle.activeCovers.length > 0) {
          await libraryDb.bookCovers.bulkPut(bundle.activeCovers);
        }
        if (bundle.originalCovers.length > 0) {
          await libraryDb.originalBookCovers.bulkPut(bundle.originalCovers);
        }
        if (bundle.coverDesigns.length > 0) {
          await libraryDb.coverDesigns.bulkPut(bundle.coverDesigns);
        }
        if (bundle.coverPresets.length > 0) {
          await libraryDb.coverPresets.bulkPut(bundle.coverPresets);
        }
        if (bundle.collections.length > 0) {
          await libraryDb.collections.bulkPut(bundle.collections);
        }
        if (bundle.series.length > 0) {
          await libraryDb.series.bulkPut(bundle.series);
        }
        if (bundle.tags.length > 0) {
          await libraryDb.tags.bulkPut(bundle.tags);
        }
        if (bundle.bookmarks.length > 0) {
          await libraryDb.bookmarks.bulkPut(bundle.bookmarks);
        }
        if (bundle.annotations.length > 0) {
          await libraryDb.annotations.bulkPut(bundle.annotations);
        }
        if (bundle.readerPreferences) {
          await libraryDb.readerPreferences.put(bundle.readerPreferences);
        }
        if (bundle.customFonts.length > 0) {
          await libraryDb.customFonts.bulkPut(bundle.customFonts);
        }
        if (bundle.bookLocations.length > 0) {
          await libraryDb.bookLocations.bulkPut(bundle.bookLocations);
        }

        summary.importedBooks = bundle.books.length;
        summary.importedCollections = bundle.collections.length;
        summary.importedSeries = bundle.series.length;
        summary.importedTags = bundle.tags.length;
        summary.importedBookmarks = bundle.bookmarks.length;
        summary.importedAnnotations = bundle.annotations.length;
        summary.importedFonts = bundle.customFonts.length;
        summary.importedPresets = bundle.coverPresets.length;
      } else {
        // MERGE MODE
        const [
          existingBooks,
          existingCollections,
          existingSeries,
          existingTags,
          existingBookmarks,
          existingAnnotations,
          existingFonts,
          existingPresets,
        ] = await Promise.all([
          libraryDb.books.toArray(),
          libraryDb.collections.toArray(),
          libraryDb.series.toArray(),
          libraryDb.tags.toArray(),
          libraryDb.bookmarks.toArray(),
          libraryDb.annotations.toArray(),
          libraryDb.customFonts.toArray(),
          libraryDb.coverPresets.toArray(),
        ]);

        // Map backupBookId -> resolvedBookId (or null if skipped)
        const bookIdMap = new Map<string, string | null>();
        const activeCoverByBook = new Map(
          bundle.activeCovers.map((c) => [c.bookId, c])
        );
        const origCoverByBook = new Map(
          bundle.originalCovers.map((c) => [c.bookId, c])
        );
        const designByBook = new Map(
          bundle.coverDesigns.map((d) => [d.bookId, d])
        );
        const fileByBook = new Map(
          bundle.bookFiles.map((f) => [f.bookId, f])
        );
        const locationByBook = new Map(
          bundle.bookLocations.map((l) => [l.bookId, l])
        );

        for (const backupBook of bundle.books) {
          const match = findMatchingExistingBook(backupBook, existingBooks);
          if (!match) {
            const targetId = backupBook.id;
            bookIdMap.set(backupBook.id, targetId);
            await libraryDb.books.put(backupBook);

            const epubFile = fileByBook.get(backupBook.id);
            if (epubFile) await libraryDb.bookFiles.put(epubFile);

            const activeCov = activeCoverByBook.get(backupBook.id);
            if (activeCov) await libraryDb.bookCovers.put(activeCov);

            const origCov = origCoverByBook.get(backupBook.id);
            if (origCov) await libraryDb.originalBookCovers.put(origCov);

            const design = designByBook.get(backupBook.id);
            if (design) await libraryDb.coverDesigns.put(design);

            const loc = locationByBook.get(backupBook.id);
            if (loc) await libraryDb.bookLocations.put(loc);

            summary.importedBooks++;
          } else if (conflictPolicy === 'skip-matching') {
            bookIdMap.set(backupBook.id, null);
            summary.skippedBooks++;
          } else if (conflictPolicy === 'overwrite-matching') {
            const targetId = match.book.id;
            bookIdMap.set(backupBook.id, targetId);
            await libraryDb.books.put({
              ...backupBook,
              id: targetId,
            });

            const epubFile = fileByBook.get(backupBook.id);
            if (epubFile) {
              await libraryDb.bookFiles.put({ ...epubFile, bookId: targetId });
            }

            const activeCov = activeCoverByBook.get(backupBook.id);
            if (activeCov) {
              await libraryDb.bookCovers.put({ ...activeCov, bookId: targetId });
            } else {
              await libraryDb.bookCovers.delete(targetId);
            }

            const origCov = origCoverByBook.get(backupBook.id);
            if (origCov) {
              await libraryDb.originalBookCovers.put({
                ...origCov,
                bookId: targetId,
              });
            }

            const design = designByBook.get(backupBook.id);
            if (design) {
              await libraryDb.coverDesigns.put({ ...design, bookId: targetId });
            } else {
              await libraryDb.coverDesigns.delete(targetId);
            }

            const loc = locationByBook.get(backupBook.id);
            if (loc) {
              await libraryDb.bookLocations.put({ ...loc, bookId: targetId });
            }

            summary.overwrittenBooks++;
          } else {
            // 'keep-existing': keep existing book record, cover, progress & personal state intact
            bookIdMap.set(backupBook.id, match.book.id);
            summary.mergedBooks++;
          }
        }

        // Merge Bookmarks without duplicates or overwriting existing ones
        const existingBookmarkSet = new Set(
          existingBookmarks.map((bm) => `${bm.bookId}::${bm.cfi}::${bm.label}`)
        );
        const existingBookmarkIds = new Set(existingBookmarks.map((b) => b.id));
        for (const bm of bundle.bookmarks) {
          const targetBookId = bookIdMap.get(bm.bookId);
          if (!targetBookId) {
            summary.skippedBookmarks++;
            continue;
          }
          const sig = `${targetBookId}::${bm.cfi}::${bm.label}`;
          if (existingBookmarkSet.has(sig)) {
            summary.skippedBookmarks++;
            continue;
          }
          existingBookmarkSet.add(sig);
          const nextId = existingBookmarkIds.has(bm.id)
            ? crypto.randomUUID()
            : bm.id;
          existingBookmarkIds.add(nextId);
          await libraryDb.bookmarks.put({
            ...bm,
            id: nextId,
            bookId: targetBookId,
          });
          summary.importedBookmarks++;
        }

        // Merge Annotations / Highlights without duplicates or overwriting existing notes
        const existingAnnotationSet = new Set(
          existingAnnotations.map(
            (a) => `${a.bookId}::${a.cfiRange}::${a.text}`
          )
        );
        const existingAnnotationIds = new Set(
          existingAnnotations.map((a) => a.id)
        );
        for (const ann of bundle.annotations) {
          const targetBookId = bookIdMap.get(ann.bookId);
          if (!targetBookId) {
            summary.skippedAnnotations++;
            continue;
          }
          const sig = `${targetBookId}::${ann.cfiRange}::${ann.text}`;
          if (existingAnnotationSet.has(sig)) {
            summary.skippedAnnotations++;
            continue;
          }
          existingAnnotationSet.add(sig);
          const nextId = existingAnnotationIds.has(ann.id)
            ? crypto.randomUUID()
            : ann.id;
          existingAnnotationIds.add(nextId);
          await libraryDb.annotations.put({
            ...ann,
            id: nextId,
            bookId: targetBookId,
          });
          summary.importedAnnotations++;
        }

        // Merge Collections safely
        for (const col of bundle.collections) {
          const mappedBookIds: string[] = [];
          for (const rawBookId of col.bookIds) {
            const resolved = bookIdMap.get(rawBookId);
            if (resolved) mappedBookIds.push(resolved);
          }

          const existingMatch = existingCollections.find(
            (c) =>
              c.id === col.id ||
              c.name.trim().toLowerCase() === col.name.trim().toLowerCase()
          );

          if (existingMatch) {
            const unionIds = Array.from(
              new Set([...existingMatch.bookIds, ...mappedBookIds])
            );
            await libraryDb.collections.put({
              ...existingMatch,
              description: existingMatch.description || col.description,
              bookIds: unionIds,
              updatedAt: Date.now(),
              syncVersion: existingMatch.syncVersion + 1,
            });
            summary.mergedCollections++;
          } else {
            await libraryDb.collections.put({
              ...col,
              bookIds: Array.from(new Set(mappedBookIds)),
            });
            summary.importedCollections++;
          }
        }

        // Merge Series safely
        const existingSeriesByName = new Map(
          existingSeries.map((s) => [s.name.trim().toLowerCase(), s])
        );
        for (const s of bundle.series) {
          const key = s.name.trim().toLowerCase();
          if (!key) continue;
          const existing = existingSeriesByName.get(key);
          if (!existing) {
            await libraryDb.series.put(s);
            existingSeriesByName.set(key, s);
            summary.importedSeries++;
          } else if (!existing.description && s.description) {
            await libraryDb.series.put({
              ...existing,
              description: s.description,
              updatedAt: Date.now(),
            });
          }
        }

        // Merge Tags safely
        const existingTagKeys = new Set(
          existingTags.map((t) => t.name.trim().toLowerCase())
        );
        for (const t of bundle.tags) {
          const key = t.name.trim().toLowerCase();
          if (key && !existingTagKeys.has(key)) {
            existingTagKeys.add(key);
            await libraryDb.tags.put(t);
            summary.importedTags++;
          }
        }

        // Merge Custom Fonts safely
        const existingFontIds = new Set(existingFonts.map((f) => f.id));
        const existingFontSigs = new Set(
          existingFonts.map(
            (f) => `${f.name.trim().toLowerCase()}::${f.data?.byteLength ?? 0}`
          )
        );
        for (const font of bundle.customFonts) {
          const sig = `${font.name.trim().toLowerCase()}::${font.data.byteLength}`;
          if (existingFontIds.has(font.id) || existingFontSigs.has(sig)) {
            continue;
          }
          existingFontIds.add(font.id);
          existingFontSigs.add(sig);
          await libraryDb.customFonts.put(font);
          summary.importedFonts++;
        }

        // Merge Cover Presets safely
        const existingPresetIds = new Set(existingPresets.map((p) => p.id));
        const existingPresetNames = new Set(
          existingPresets.map((p) => p.name.trim().toLowerCase())
        );
        for (const preset of bundle.coverPresets) {
          if (
            existingPresetIds.has(preset.id) ||
            existingPresetNames.has(preset.name.trim().toLowerCase())
          ) {
            continue;
          }
          existingPresetIds.add(preset.id);
          existingPresetNames.add(preset.name.trim().toLowerCase());
          await libraryDb.coverPresets.put(preset);
          summary.importedPresets++;
        }
      }

      if (options.beforeTransactionCommitHook) {
        options.beforeTransactionCommitHook();
      }
    }
  );

  options.onProgress?.({
    phase: 'Restoration complete.',
    percent: 100,
  });

  return summary;
}
