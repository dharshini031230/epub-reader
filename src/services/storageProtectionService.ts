import { libraryDb } from '../db/libraryDb';
import type {
  BackupSettingsRecord,
  Book,
  StorageBreakdown,
  StoragePersistenceStatus,
} from '../types/library';

const REMINDER_DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const BACKUP_STALE_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
const FIRST_BACKUP_AGE_MS = 3 * 24 * 60 * 60 * 1000; // 3 days
const FIFTY_MB = 50 * 1024 * 1024;
const FIFTEEN_MB = 15 * 1024 * 1024;

export function formatStorageSize(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || Number.isNaN(bytes) || bytes < 0) {
    return 'Unavailable';
  }
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(mb >= 100 ? 0 : 1)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
}

export async function checkStoragePersistence(): Promise<{
  supported: boolean;
  status: StoragePersistenceStatus;
}> {
  if (
    typeof navigator === 'undefined' ||
    !navigator.storage ||
    typeof navigator.storage.persisted !== 'function'
  ) {
    return { supported: false, status: 'unsupported' };
  }
  try {
    const granted = await navigator.storage.persisted();
    const canPersist = typeof navigator.storage.persist === 'function';
    if (!granted && !canPersist) {
      return { supported: false, status: 'unsupported' };
    }
    return {
      supported: true,
      status: granted ? 'granted' : 'denied',
    };
  } catch {
    return { supported: false, status: 'unsupported' };
  }
}

export async function requestPersistentStorage(): Promise<{
  supported: boolean;
  status: StoragePersistenceStatus;
}> {
  if (
    typeof navigator === 'undefined' ||
    !navigator.storage ||
    typeof navigator.storage.persist !== 'function'
  ) {
    return checkStoragePersistence();
  }
  try {
    if (typeof navigator.storage.persisted === 'function') {
      const already = await navigator.storage.persisted();
      if (already) {
        return { supported: true, status: 'granted' };
      }
    }
    const granted = await navigator.storage.persist();
    return {
      supported: true,
      status: granted ? 'granted' : 'denied',
    };
  } catch {
    return { supported: false, status: 'unsupported' };
  }
}

export async function getStorageBreakdown(): Promise<StorageBreakdown> {
  const [
    books,
    bookFiles,
    bookCovers,
    originalBookCovers,
    coverDesigns,
    customFonts,
    collections,
    series,
    tags,
    bookmarks,
    annotations,
    coverPresets,
    readerPreferences,
    bookLocations,
    persistence,
  ] = await Promise.all([
    libraryDb.books.toArray(),
    libraryDb.bookFiles.toArray(),
    libraryDb.bookCovers.toArray(),
    libraryDb.originalBookCovers.toArray(),
    libraryDb.coverDesigns.toArray(),
    libraryDb.customFonts.toArray(),
    libraryDb.collections.toArray(),
    libraryDb.series.toArray(),
    libraryDb.tags.toArray(),
    libraryDb.bookmarks.toArray(),
    libraryDb.annotations.toArray(),
    libraryDb.coverPresets.toArray(),
    libraryDb.readerPreferences.toArray(),
    libraryDb.bookLocations.toArray(),
    checkStoragePersistence(),
  ]);

  let epubBytes = 0;
  for (const file of bookFiles) {
    epubBytes += file.data?.byteLength ?? file.byteLength ?? 0;
  }

  let coverBytes = 0;
  for (const cover of bookCovers) {
    coverBytes += cover.data?.byteLength ?? 0;
  }
  for (const orig of originalBookCovers) {
    coverBytes += orig.data?.byteLength ?? 0;
  }
  for (const design of coverDesigns) {
    coverBytes += design.customImageData?.byteLength ?? 0;
  }

  let customFontBytes = 0;
  for (const font of customFonts) {
    customFontBytes += font.data?.byteLength ?? 0;
  }

  const metadataSample = JSON.stringify({
    books,
    collections,
    series,
    tags,
    bookmarks,
    annotations,
    coverPresets,
    readerPreferences,
    bookLocations,
    coverDesignSpecs: coverDesigns.map((d) => ({
      bookId: d.bookId,
      spec: d.spec,
      updatedAt: d.updatedAt,
    })),
  });
  const metadataBytes =
    typeof TextEncoder !== 'undefined'
      ? new TextEncoder().encode(metadataSample).byteLength
      : metadataSample.length * 2;

  const totalLibraryBytes =
    epubBytes + coverBytes + customFontBytes + metadataBytes;

  let browserUsageBytes: number | null = null;
  let browserQuotaBytes: number | null = null;
  let estimateSupported = false;

  if (
    typeof navigator !== 'undefined' &&
    navigator.storage &&
    typeof navigator.storage.estimate === 'function'
  ) {
    try {
      const estimate = await navigator.storage.estimate();
      estimateSupported = true;
      if (typeof estimate.usage === 'number') {
        browserUsageBytes = estimate.usage;
      }
      if (typeof estimate.quota === 'number' && estimate.quota > 0) {
        browserQuotaBytes = estimate.quota;
      }
    } catch {
      estimateSupported = false;
    }
  }

  const effectiveUsage = browserUsageBytes ?? totalLibraryBytes;
  const usageRatio =
    browserQuotaBytes && browserQuotaBytes > 0
      ? Math.min(1, effectiveUsage / browserQuotaBytes)
      : null;
  const remainingBytes =
    browserQuotaBytes && browserQuotaBytes > 0
      ? Math.max(0, browserQuotaBytes - effectiveUsage)
      : null;

  const isCriticalQuota = Boolean(
    (usageRatio !== null && usageRatio >= 0.9) ||
      (remainingBytes !== null && remainingBytes < FIFTEEN_MB)
  );
  const isApproachingQuota = Boolean(
    isCriticalQuota ||
      (usageRatio !== null && usageRatio >= 0.75) ||
      (remainingBytes !== null && remainingBytes < FIFTY_MB)
  );

  return {
    bookCount: books.length,
    epubBytes,
    coverBytes,
    customFontBytes,
    metadataBytes,
    totalLibraryBytes,
    browserUsageBytes,
    browserQuotaBytes,
    usageRatio,
    isApproachingQuota,
    isCriticalQuota,
    estimateSupported,
    persistenceSupported: persistence.supported,
    persistenceStatus: persistence.status,
  };
}

export function createDefaultBackupSettings(): BackupSettingsRecord {
  return {
    id: 'default',
    lastBackupAt: null,
    lastBackupFileName: null,
    lastBackupBookCount: null,
    lastReminderDismissedAt: null,
    updatedAt: Date.now(),
  };
}

export async function getBackupSettings(): Promise<BackupSettingsRecord> {
  const existing = await libraryDb.backupSettings.get('default');
  if (existing) return existing;
  const defaults = createDefaultBackupSettings();
  await libraryDb.backupSettings.put(defaults);
  return defaults;
}

export async function recordBackupSuccess(payload: {
  fileName: string;
  bookCount: number;
}): Promise<BackupSettingsRecord> {
  const current = await getBackupSettings();
  const now = Date.now();
  const next: BackupSettingsRecord = {
    ...current,
    lastBackupAt: now,
    lastBackupFileName: payload.fileName,
    lastBackupBookCount: payload.bookCount,
    updatedAt: now,
  };
  await libraryDb.backupSettings.put(next);
  return next;
}

export async function dismissBackupReminder(): Promise<BackupSettingsRecord> {
  const current = await getBackupSettings();
  const now = Date.now();
  const next: BackupSettingsRecord = {
    ...current,
    lastReminderDismissedAt: now,
    updatedAt: now,
  };
  await libraryDb.backupSettings.put(next);
  return next;
}

export function shouldShowBackupReminder(
  books: Book[],
  settings: BackupSettingsRecord,
  now: number = Date.now()
): boolean {
  if (books.length === 0) return false;
  if (
    settings.lastReminderDismissedAt !== null &&
    now - settings.lastReminderDismissedAt < REMINDER_DISMISS_COOLDOWN_MS
  ) {
    return false;
  }

  if (settings.lastBackupAt === null) {
    if (books.length >= 3) return true;
    const oldestAddedAt = books.reduce(
      (min, b) => (b.addedAt < min ? b.addedAt : min),
      books[0].addedAt
    );
    return now - oldestAddedAt >= FIRST_BACKUP_AGE_MS;
  }

  if (now - settings.lastBackupAt >= BACKUP_STALE_MS) {
    return true;
  }

  if (
    settings.lastBackupBookCount !== null &&
    books.length >= settings.lastBackupBookCount + 5
  ) {
    return true;
  }

  return false;
}
