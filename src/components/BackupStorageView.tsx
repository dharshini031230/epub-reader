import {
  AlertTriangle,
  CheckCircle2,
  Download,
  HardDrive,
  Loader2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react';
import { useRef, useState } from 'react';
import {
  executeBackupRestore,
  inspectBackupAgainstLibrary,
  parseAndValidateBackupArchive,
  exportLibraryBackup,
  triggerBackupDownload,
  type ValidatedBackupBundle,
} from '../services/backupService';
import { formatShortDate } from '../services/libraryDomainService';
import { formatStorageSize } from '../services/storageProtectionService';
import type {
  BackupInspectionReport,
  BackupProgress,
  BackupSettingsRecord,
  MergeConflictPolicy,
  RestoreMode,
  RestoreSummary,
  StorageBreakdown,
} from '../types/library';

interface BackupStorageViewProps {
  backupSettings: BackupSettingsRecord;
  storageBreakdown: StorageBreakdown | null;
  onRefreshLibrary: () => Promise<void>;
  onRefreshStorageState: () => Promise<StorageBreakdown>;
  onRequestPersistence: () => Promise<StorageBreakdown>;
  onNotify: (msg: string, tone?: 'success' | 'error') => void;
}

export function BackupStorageView({
  backupSettings,
  storageBreakdown,
  onRefreshLibrary,
  onRefreshStorageState,
  onRequestPersistence,
  onNotify,
}: BackupStorageViewProps) {
  const restoreInputRef = useRef<HTMLInputElement>(null);

  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<BackupProgress | null>(
    null
  );
  const [exportError, setExportError] = useState<string | null>(null);
  const [lastExportSuccess, setLastExportSuccess] = useState<string | null>(
    null
  );

  const [isValidatingRestore, setIsValidatingRestore] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState<BackupProgress | null>(
    null
  );
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [stagedBundle, setStagedBundle] =
    useState<ValidatedBackupBundle | null>(null);
  const [inspectionReport, setInspectionReport] =
    useState<BackupInspectionReport | null>(null);
  const [restoreMode, setRestoreMode] = useState<RestoreMode>('merge');
  const [conflictPolicy, setConflictPolicy] =
    useState<MergeConflictPolicy>('keep-existing');
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreSummary, setRestoreSummary] = useState<RestoreSummary | null>(
    null
  );

  const [isCheckingPersistence, setIsCheckingPersistence] = useState(false);

  const handleExportBackup = async () => {
    setIsExporting(true);
    setExportError(null);
    setLastExportSuccess(null);
    setExportProgress({ phase: 'Preparing backup…', percent: 2 });
    try {
      const { blob, fileName, manifest } = await exportLibraryBackup((p) =>
        setExportProgress(p)
      );
      triggerBackupDownload(blob, fileName);
      await onRefreshStorageState();
      const msg = `Exported ${manifest.recordCounts.books} ${
        manifest.recordCounts.books === 1 ? 'book' : 'books'
      } to ${fileName} (${formatStorageSize(blob.size)}).`;
      setLastExportSuccess(msg);
      onNotify(msg, 'success');
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Failed to generate library backup archive.';
      setExportError(msg);
      onNotify(msg, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSelectRestoreFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;

    setIsValidatingRestore(true);
    setRestoreError(null);
    setRestoreSummary(null);
    setStagedBundle(null);
    setInspectionReport(null);
    setConfirmOverwrite(false);
    setConflictPolicy('keep-existing');
    setRestoreProgress({ phase: 'Inspecting backup archive…', percent: 5 });

    try {
      const bundle = await parseAndValidateBackupArchive(
        file,
        file.name,
        (p) => setRestoreProgress(p)
      );
      const report = await inspectBackupAgainstLibrary(bundle);
      setStagedBundle(bundle);
      setInspectionReport(report);
      setRestoreMode(report.currentCounts.books === 0 ? 'full' : 'merge');
      setRestoreProgress(null);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'The selected backup archive could not be validated.';
      setRestoreError(msg);
      setRestoreProgress(null);
    } finally {
      setIsValidatingRestore(false);
    }
  };

  const handleCancelRestore = () => {
    setStagedBundle(null);
    setInspectionReport(null);
    setRestoreError(null);
    setRestoreProgress(null);
    setConfirmOverwrite(false);
  };

  const requiresExplicitOverwriteCheck =
    restoreMode === 'full' ||
    (restoreMode === 'merge' &&
      conflictPolicy === 'overwrite-matching' &&
      (inspectionReport?.conflicts.length ?? 0) > 0);

  const canConfirmRestore =
    Boolean(stagedBundle && inspectionReport) &&
    !isRestoring &&
    (!requiresExplicitOverwriteCheck || confirmOverwrite);

  const handleConfirmRestore = async () => {
    if (!stagedBundle || !canConfirmRestore) return;
    setIsRestoring(true);
    setRestoreError(null);
    setRestoreProgress({ phase: 'Preparing safe restoration…', percent: 10 });

    try {
      const summary = await executeBackupRestore(stagedBundle, {
        mode: restoreMode,
        conflictPolicy,
        onProgress: (p) => setRestoreProgress(p),
      });
      await onRefreshLibrary();
      setRestoreSummary(summary);
      setStagedBundle(null);
      setInspectionReport(null);
      setConfirmOverwrite(false);
      setRestoreProgress(null);
      onNotify(
        restoreMode === 'full'
          ? `Restored ${summary.importedBooks} books cleanly from backup.`
          : `Merged backup: ${summary.importedBooks} added, ${summary.mergedBooks} kept intact.`,
        'success'
      );
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Restoration failed and was safely rolled back. Your original library was not modified.';
      setRestoreError(msg);
      setRestoreProgress(null);
      onNotify(msg, 'error');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleRequestPersistenceClick = async () => {
    setIsCheckingPersistence(true);
    try {
      const next = await onRequestPersistence();
      if (next.persistenceStatus === 'granted') {
        onNotify('Persistent browser storage is enabled.', 'success');
      } else if (next.persistenceStatus === 'denied') {
        onNotify(
          'Browser declined persistent storage permission. Downloading periodic backups is recommended.',
          'error'
        );
      } else {
        onNotify(
          'Persistent storage API is not supported in this browser.',
          'error'
        );
      }
    } finally {
      setIsCheckingPersistence(false);
    }
  };

  const persistence = storageBreakdown?.persistenceStatus ?? 'unsupported';
  const usedDisplay =
    storageBreakdown?.browserUsageBytes !== null &&
    storageBreakdown?.browserUsageBytes !== undefined
      ? formatStorageSize(storageBreakdown.browserUsageBytes)
      : formatStorageSize(storageBreakdown?.totalLibraryBytes);

  return (
    <section
      aria-labelledby="backup-storage-heading"
      className="max-w-4xl space-y-10"
    >
      {/* Editorial Header */}
      <div className="pb-6 border-b border-white/[0.08] space-y-2">
        <h1
          id="backup-storage-heading"
          className="font-serif text-3xl sm:text-4xl font-medium tracking-tight text-[#F2EDE4]"
        >
          Local Storage &amp; Backup
        </h1>
        <p className="text-sm text-[#A69F93] leading-relaxed max-w-2xl">
          Your EPUB library, customised covers, reading positions, bookmarks,
          and notes are stored locally on this device in IndexedDB with no
          external servers or accounts.
        </p>
      </div>

      {/* 1. Complete Library Backup (Export) */}
      <div className="rounded-lg bg-[#111116] border border-white/[0.08] p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1.5">
            <h2 className="font-serif text-xl font-medium text-[#F2EDE4]">
              Complete Library Backup
            </h2>
            <p className="text-xs text-[#A69F93] leading-relaxed max-w-xl">
              Exports a portable ZIP archive containing original EPUB files,
              custom and original covers, cover design settings, collections,
              series, tags, reading positions, bookmarks, highlights, personal
              notes, custom fonts, and reader settings.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void handleExportBackup()}
            disabled={isExporting}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-md bg-[#D99B43] hover:bg-[#E8B15C] disabled:opacity-50 text-[#08080A] text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>
              {isExporting ? 'Creating Archive…' : 'Download Backup (.zip)'}
            </span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#A69F93] pt-2 border-t border-white/[0.06]">
          <span>
            Last backup:{' '}
            <strong className="font-medium text-[#F2EDE4]">
              {backupSettings.lastBackupAt
                ? formatShortDate(backupSettings.lastBackupAt)
                : 'Never'}
            </strong>
          </span>
          {backupSettings.lastBackupFileName && (
            <>
              <span aria-hidden="true" className="text-[#6E685F]">
                ·
              </span>
              <span className="font-mono text-[11px] text-[#6E685F] truncate max-w-xs">
                {backupSettings.lastBackupFileName}
              </span>
            </>
          )}
        </div>

        {isExporting && exportProgress && (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs text-[#C8C1B6]">
              <span className="truncate">{exportProgress.phase}</span>
              <span className="font-mono tabular-nums text-[#D99B43]">
                {exportProgress.percent}%
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-white/[0.08] overflow-hidden">
              <div
                className="h-full bg-[#D99B43] transition-all duration-150"
                style={{ width: `${exportProgress.percent}%` }}
              />
            </div>
            {exportProgress.detail && (
              <p className="text-[11px] text-[#6E685F] truncate">
                {exportProgress.detail}
              </p>
            )}
          </div>
        )}

        {exportError && (
          <div
            role="alert"
            className="flex items-start gap-2.5 p-3 rounded-md bg-red-950/40 border border-red-500/35 text-xs text-red-200"
          >
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{exportError}</span>
          </div>
        )}

        {lastExportSuccess && !exportError && (
          <div
            role="status"
            className="flex items-start gap-2.5 p-3 rounded-md bg-emerald-950/35 border border-emerald-500/30 text-xs text-emerald-100"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>{lastExportSuccess}</span>
          </div>
        )}
      </div>

      {/* 2. Restore Library from Backup */}
      <div className="rounded-lg bg-[#111116] border border-white/[0.08] p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1.5">
            <h2 className="font-serif text-xl font-medium text-[#F2EDE4]">
              Restore Library from Backup
            </h2>
            <p className="text-xs text-[#A69F93] leading-relaxed max-w-xl">
              Select a Folio backup ZIP file. Archives are validated with
              checksums before any local changes are made. Choose to merge into
              your existing library or perform a complete replacement.
            </p>
          </div>

          <div>
            <input
              ref={restoreInputRef}
              type="file"
              accept=".zip,application/zip"
              className="hidden"
              onChange={(e) => {
                void handleSelectRestoreFile(e.target.files);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => restoreInputRef.current?.click()}
              disabled={isValidatingRestore || isRestoring}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-md bg-[#18181F] hover:bg-[#22222C] border border-white/[0.12] hover:border-[#D99B43]/60 disabled:opacity-50 text-[#F2EDE4] text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isValidatingRestore ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#D99B43]" />
              ) : (
                <Upload className="w-4 h-4 text-[#D99B43]" />
              )}
              <span>
                {isValidatingRestore ? 'Validating…' : 'Select Backup (.zip)'}
              </span>
            </button>
          </div>
        </div>

        {(isValidatingRestore || isRestoring) && restoreProgress && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-[#C8C1B6]">
              <span className="truncate">{restoreProgress.phase}</span>
              <span className="font-mono tabular-nums text-[#D99B43]">
                {restoreProgress.percent}%
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-white/[0.08] overflow-hidden">
              <div
                className="h-full bg-[#D99B43] transition-all duration-150"
                style={{ width: `${restoreProgress.percent}%` }}
              />
            </div>
            {restoreProgress.detail && (
              <p className="text-[11px] font-mono text-[#6E685F] truncate">
                {restoreProgress.detail}
              </p>
            )}
          </div>
        )}

        {restoreError && (
          <div
            role="alert"
            className="flex items-start gap-2.5 p-3.5 rounded-md bg-red-950/40 border border-red-500/35 text-xs text-red-200 leading-relaxed"
          >
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{restoreError}</span>
          </div>
        )}

        {restoreSummary && (
          <div
            role="status"
            className="p-4 rounded-md bg-emerald-950/30 border border-emerald-500/30 space-y-2 text-xs text-emerald-100"
          >
            <div className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>
                {restoreSummary.mode === 'full'
                  ? 'Full Library Restore Completed'
                  : 'Backup Merge Completed'}
              </span>
            </div>
            <p className="text-[#D4E9DC] leading-relaxed tabular-nums">
              Books imported: {restoreSummary.importedBooks} · Merged intact:{' '}
              {restoreSummary.mergedBooks} · Overwritten:{' '}
              {restoreSummary.overwrittenBooks} · Skipped:{' '}
              {restoreSummary.skippedBooks}
            </p>
            <p className="text-[#B7D8C5] tabular-nums">
              Bookmarks added: {restoreSummary.importedBookmarks} (skipped{' '}
              {restoreSummary.skippedBookmarks}) · Highlights added:{' '}
              {restoreSummary.importedAnnotations} (skipped{' '}
              {restoreSummary.skippedAnnotations}) · Collections:{' '}
              {restoreSummary.importedCollections} new /{' '}
              {restoreSummary.mergedCollections} merged · Custom fonts:{' '}
              {restoreSummary.importedFonts}
            </p>
          </div>
        )}

        {/* Staged Backup Inspection & Confirmation */}
        {inspectionReport && stagedBundle && (
          <div className="pt-4 border-t border-white/[0.08] space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs font-medium text-[#F2EDE4]">
                  Validated Archive: {inspectionReport.fileName}
                </p>
                <p className="text-[11px] text-[#A69F93] tabular-nums">
                  Exported {formatShortDate(inspectionReport.manifest.exportedAtMs)} ·{' '}
                  Format v{inspectionReport.manifest.formatVersion} ·{' '}
                  {formatStorageSize(inspectionReport.fileSize)} ·{' '}
                  {inspectionReport.manifest.recordCounts.books} books,{' '}
                  {inspectionReport.manifest.recordCounts.annotations} highlights,{' '}
                  {inspectionReport.manifest.recordCounts.bookmarks} bookmarks,{' '}
                  {inspectionReport.manifest.recordCounts.customFonts} custom fonts
                </p>
              </div>
              <button
                type="button"
                onClick={handleCancelRestore}
                aria-label="Cancel staged restore"
                className="p-1.5 rounded text-[#A69F93] hover:text-[#F2EDE4] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Restore Mode Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setRestoreMode('merge');
                  setConfirmOverwrite(false);
                }}
                className={`text-left p-4 rounded-md border transition-colors cursor-pointer ${
                  restoreMode === 'merge'
                    ? 'bg-[#D99B43]/12 border-[#D99B43] text-[#F2EDE4]'
                    : 'bg-[#18181F] border-white/[0.08] text-[#A69F93] hover:text-[#F2EDE4]'
                }`}
              >
                <p className="text-xs font-semibold">Merge Backup</p>
                <p className="text-[11px] text-[#A69F93] mt-1 leading-relaxed">
                  Adds missing books, collections, series, tags, and notes while
                  protecting your existing library records.
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setRestoreMode('full');
                  setConfirmOverwrite(false);
                }}
                className={`text-left p-4 rounded-md border transition-colors cursor-pointer ${
                  restoreMode === 'full'
                    ? 'bg-[#D99B43]/12 border-[#D99B43] text-[#F2EDE4]'
                    : 'bg-[#18181F] border-white/[0.08] text-[#A69F93] hover:text-[#F2EDE4]'
                }`}
              >
                <p className="text-xs font-semibold">Full Restore</p>
                <p className="text-[11px] text-[#A69F93] mt-1 leading-relaxed">
                  Replaces the current local library completely with the exact
                  contents of this backup archive.
                </p>
              </button>
            </div>

            {restoreMode === 'merge' ? (
              <div className="space-y-4 text-xs">
                <div className="p-3.5 rounded-md bg-[#0E0E12] border border-white/[0.08] space-y-1.5 text-[#C8C1B6] tabular-nums">
                  <p>
                    Ready to add{' '}
                    <strong className="text-[#F2EDE4]">
                      {inspectionReport.newBooks.length}
                    </strong>{' '}
                    new books,{' '}
                    <strong className="text-[#F2EDE4]">
                      {inspectionReport.newCollectionsCount}
                    </strong>{' '}
                    new collections ({inspectionReport.mergedCollectionsCount}{' '}
                    merged),{' '}
                    <strong className="text-[#F2EDE4]">
                      {inspectionReport.newSeriesCount}
                    </strong>{' '}
                    series,{' '}
                    <strong className="text-[#F2EDE4]">
                      {inspectionReport.newTagsCount}
                    </strong>{' '}
                    tags, and{' '}
                    <strong className="text-[#F2EDE4]">
                      {inspectionReport.newFontsCount}
                    </strong>{' '}
                    custom fonts.
                  </p>
                </div>

                {inspectionReport.conflicts.length > 0 && (
                  <div className="p-4 rounded-md bg-amber-950/25 border border-[#D99B43]/35 space-y-3">
                    <div className="space-y-1">
                      <p className="font-medium text-[#E8B15C]">
                        {inspectionReport.conflicts.length} matching{' '}
                        {inspectionReport.conflicts.length === 1
                          ? 'book already exists'
                          : 'books already exist'}{' '}
                        in your library
                      </p>
                      <p className="text-[11px] text-[#C8C1B6]">
                        Matched by ID, EPUB hash, or title &amp; file size.
                        Choose how conflicts should be handled:
                      </p>
                    </div>

                    <ul className="max-h-36 overflow-y-auto space-y-1.5 text-[11px] text-[#E2DDD5]">
                      {inspectionReport.conflicts.map((c) => (
                        <li
                          key={c.backupBook.id}
                          className="flex items-center justify-between gap-2 py-1 border-b border-white/[0.06] last:border-b-0"
                        >
                          <span className="truncate font-serif">
                            {c.existingBook.title}
                          </span>
                          <span className="font-mono text-[10px] text-[#A69F93] shrink-0">
                            Matched by {c.matchReason} · Local {c.existingBook.progress}% / Backup {c.backupBook.progress}%
                          </span>
                        </li>
                      ))}
                    </ul>

                    <div className="space-y-2 pt-1">
                      <label className="flex items-start gap-2.5 cursor-pointer">
                        <input
                          type="radio"
                          name="conflict-policy"
                          checked={conflictPolicy === 'keep-existing'}
                          onChange={() => {
                            setConflictPolicy('keep-existing');
                            setConfirmOverwrite(false);
                          }}
                          className="mt-0.5 accent-[#D99B43]"
                        />
                        <span>
                          <strong className="block text-[#F2EDE4]">
                            Keep existing books &amp; personal data (Recommended)
                          </strong>
                          <span className="text-[11px] text-[#A69F93]">
                            Preserves your current reading positions, covers, and
                            notes, while adding any non-duplicate bookmarks and
                            highlights from the backup.
                          </span>
                        </span>
                      </label>

                      <label className="flex items-start gap-2.5 cursor-pointer">
                        <input
                          type="radio"
                          name="conflict-policy"
                          checked={conflictPolicy === 'skip-matching'}
                          onChange={() => {
                            setConflictPolicy('skip-matching');
                            setConfirmOverwrite(false);
                          }}
                          className="mt-0.5 accent-[#D99B43]"
                        />
                        <span>
                          <strong className="block text-[#F2EDE4]">
                            Skip matching books completely
                          </strong>
                          <span className="text-[11px] text-[#A69F93]">
                            Imports only brand-new books and ignores matching
                            titles and their backup notes.
                          </span>
                        </span>
                      </label>

                      <label className="flex items-start gap-2.5 cursor-pointer">
                        <input
                          type="radio"
                          name="conflict-policy"
                          checked={conflictPolicy === 'overwrite-matching'}
                          onChange={() => {
                            setConflictPolicy('overwrite-matching');
                            setConfirmOverwrite(false);
                          }}
                          className="mt-0.5 accent-[#D99B43]"
                        />
                        <span>
                          <strong className="block text-[#F2EDE4]">
                            Replace matching books with backup copies
                          </strong>
                          <span className="text-[11px] text-[#A69F93]">
                            Updates matched books&apos; reading progress,
                            customised covers, and metadata from the backup.
                          </span>
                        </span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-md bg-red-950/30 border border-red-500/35 space-y-2 text-xs text-red-100">
                <div className="flex items-center gap-2 font-semibold text-red-200">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <span>Full Restore Warning</span>
                </div>
                <p className="leading-relaxed text-red-100/90 tabular-nums">
                  Proceeding will replace your entire current library (
                  {inspectionReport.currentCounts.books} books,{' '}
                  {inspectionReport.currentCounts.annotations} highlights,{' '}
                  {inspectionReport.currentCounts.bookmarks} bookmarks, and{' '}
                  {inspectionReport.currentCounts.collections} collections) with
                  the {inspectionReport.manifest.recordCounts.books} books in
                  this backup archive. If any error occurs, the transaction will
                  roll back cleanly so your original library remains intact.
                </p>
              </div>
            )}

            {requiresExplicitOverwriteCheck && (
              <label className="flex items-start gap-2.5 p-3 rounded-md bg-[#18181F] border border-white/[0.1] text-xs text-[#F2EDE4] cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmOverwrite}
                  onChange={(e) => setConfirmOverwrite(e.target.checked)}
                  className="mt-0.5 accent-[#D99B43]"
                />
                <span>
                  {restoreMode === 'full'
                    ? 'I understand this will replace my current local library with the selected backup.'
                    : 'I explicitly confirm replacing my existing reading progress, covers, and metadata for matched books.'}
                </span>
              </label>
            )}

            <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={handleCancelRestore}
                disabled={isRestoring}
                className="px-4 py-2 min-h-[40px] rounded-md border border-white/[0.12] text-xs font-medium text-[#A69F93] hover:text-[#F2EDE4] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmRestore()}
                disabled={!canConfirmRestore}
                className="px-4 py-2 min-h-[40px] rounded-md bg-[#D99B43] hover:bg-[#E8B15C] disabled:opacity-40 text-[#08080A] text-xs font-semibold cursor-pointer"
              >
                {restoreMode === 'full'
                  ? 'Confirm Full Restore'
                  : 'Confirm Merge Restore'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Storage Management & Browser Persistence */}
      <div className="rounded-lg bg-[#111116] border border-white/[0.08] p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <HardDrive className="w-5 h-5 text-[#D99B43]" />
            <h2 className="font-serif text-xl font-medium text-[#F2EDE4]">
              Storage Management &amp; Persistence
            </h2>
          </div>

          <button
            type="button"
            onClick={() => void onRefreshStorageState()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#18181F] hover:bg-[#22222C] border border-white/[0.08] text-xs text-[#C8C1B6] hover:text-[#F2EDE4] self-start sm:self-auto cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Usage</span>
          </button>
        </div>

        {/* Persistence Status */}
        <div className="p-4 rounded-md bg-[#0E0E12] border border-white/[0.08] space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              {persistence === 'granted' ? (
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <ShieldAlert className="w-5 h-5 text-[#D99B43] shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <p className="text-xs font-semibold text-[#F2EDE4]">
                  Browser Persistent Storage:{' '}
                  {persistence === 'granted'
                    ? 'Granted'
                    : persistence === 'denied'
                      ? 'Not Granted'
                      : 'Unavailable in This Browser'}
                </p>
                <p className="text-xs text-[#A69F93] leading-relaxed">
                  {persistence === 'granted'
                    ? 'Your browser has granted persistent storage permission, reducing the risk of automatic cleanup during low disk space.'
                    : persistence === 'denied'
                      ? 'Persistent storage permission was not granted. Under heavy device storage pressure, the browser may evict site data. Download periodic backups to keep your library safe.'
                      : 'This browser does not expose the Storage Persistence API. Download periodic backups to keep a safe external copy of your library.'}
                </p>
              </div>
            </div>

            {persistence === 'denied' &&
              storageBreakdown?.persistenceSupported && (
                <button
                  type="button"
                  onClick={() => void handleRequestPersistenceClick()}
                  disabled={isCheckingPersistence}
                  className="px-3.5 py-2 min-h-[40px] rounded-md bg-[#18181F] hover:bg-[#22222C] border border-white/[0.12] text-xs font-medium text-[#F2EDE4] whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {isCheckingPersistence
                    ? 'Requesting…'
                    : 'Request Persistence'}
                </button>
              )}
          </div>

          <p className="text-[11px] text-[#8E877D] leading-relaxed pt-2 border-t border-white/[0.06]">
            Important: Persistent browser storage does not guarantee permanent
            protection against data loss. Manually clearing browser site data,
            resetting browser profiles, or uninstalling the application will
            still erase locally stored information.
          </p>
        </div>

        {/* Quota Warning if Approaching Limit */}
        {storageBreakdown?.isApproachingQuota && (
          <div
            role="alert"
            className={`flex items-start gap-2.5 p-3.5 rounded-md border text-xs leading-relaxed ${
              storageBreakdown.isCriticalQuota
                ? 'bg-red-950/40 border-red-500/40 text-red-200'
                : 'bg-amber-950/35 border-[#D99B43]/40 text-amber-100'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-[#D99B43] shrink-0 mt-0.5" />
            <span>
              Browser storage usage is approaching the available quota (
              {storageBreakdown.usageRatio !== null
                ? `${Math.round(storageBreakdown.usageRatio * 100)}% used`
                : 'low free quota'}
              ). Download a backup archive and manually remove books you no
              longer need. Folio never automatically deletes books or notes.
            </span>
          </div>
        )}

        {/* Usage Breakdown Grid */}
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-5 pt-1 text-xs">
          <div>
            <dt className="text-[#6E685F]">Imported Books</dt>
            <dd className="font-mono text-base tabular-nums text-[#F2EDE4] mt-1">
              {storageBreakdown?.bookCount ?? 0}
            </dd>
          </div>
          <div>
            <dt className="text-[#6E685F]">Estimated App Storage</dt>
            <dd className="font-mono text-base tabular-nums text-[#F2EDE4] mt-1">
              {usedDisplay}
            </dd>
          </div>
          <div>
            <dt className="text-[#6E685F]">Available Browser Quota</dt>
            <dd className="font-mono text-base tabular-nums text-[#F2EDE4] mt-1">
              {storageBreakdown?.estimateSupported &&
              storageBreakdown.browserQuotaBytes !== null
                ? formatStorageSize(storageBreakdown.browserQuotaBytes)
                : 'Unavailable'}
            </dd>
          </div>
          <div>
            <dt className="text-[#6E685F]">EPUB Files</dt>
            <dd className="font-mono text-sm tabular-nums text-[#C8C1B6] mt-1">
              {formatStorageSize(storageBreakdown?.epubBytes ?? 0)}
            </dd>
          </div>
          <div>
            <dt className="text-[#6E685F]">Cover Artwork &amp; Designs</dt>
            <dd className="font-mono text-sm tabular-nums text-[#C8C1B6] mt-1">
              {formatStorageSize(storageBreakdown?.coverBytes ?? 0)}
            </dd>
          </div>
          <div>
            <dt className="text-[#6E685F]">Custom Fonts</dt>
            <dd className="font-mono text-sm tabular-nums text-[#C8C1B6] mt-1">
              {formatStorageSize(storageBreakdown?.customFontBytes ?? 0)}
            </dd>
          </div>
        </dl>

        {storageBreakdown?.estimateSupported &&
          storageBreakdown.usageRatio !== null && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-[#A69F93] tabular-nums">
                <span>Quota Utilisation</span>
                <span className="font-mono">
                  {(storageBreakdown.usageRatio * 100).toFixed(1)}%
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-white/[0.08] overflow-hidden">
                <div
                  className={`h-full transition-all duration-200 ${
                    storageBreakdown.isCriticalQuota
                      ? 'bg-red-400'
                      : 'bg-[#D99B43]'
                  }`}
                  style={{
                    width: `${Math.max(1, Math.min(100, storageBreakdown.usageRatio * 100))}%`,
                  }}
                />
              </div>
            </div>
          )}

        <p className="text-[11px] text-[#6E685F] leading-relaxed">
          Storage figures returned by browser APIs are estimates and may not
          represent the exact space available to the application. Folio never
          automatically deletes books, covers, bookmarks, or annotations to free
          disk space.
        </p>
      </div>
    </section>
  );
}
