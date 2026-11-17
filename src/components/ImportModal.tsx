import {
  AlertTriangle,
  Check,
  FileText,
  ImagePlus,
  Loader2,
  Palette,
  Plus,
  RotateCcw,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react';
import { bookStorageService } from '../services/bookStorageService';
import { parseEpubFile } from '../services/epubParserService';
import {
  READING_STATUS_OPTIONS,
  formatBytes,
} from '../services/libraryDomainService';
import type {
  Collection,
  CoverDesignSpec,
  CoverPresetRecord,
  ImportDraft,
  ReadingStatus,
} from '../types/library';
import { BookCover } from './BookCover';
import { type CoverSavePayload } from './CoverDesigner';
import {
  CoverDesignerModal,
  type CoverDesignerTarget,
} from './CoverDesignerModal';

interface ImportModalProps {
  isOpen: boolean;
  collections: Collection[];
  coverPresets: CoverPresetRecord[];
  onClose: () => void;
  onSaveDrafts: (drafts: ImportDraft[]) => Promise<void>;
  onCreateCollection: (name: string, description: string) => Promise<Collection>;
  onSaveCoverPreset: (
    name: string,
    spec: CoverDesignSpec
  ) => Promise<CoverPresetRecord>;
  onDeleteCoverPreset: (id: string) => Promise<void>;
}

export function ImportModal({
  isOpen,
  collections,
  coverPresets,
  onClose,
  onSaveDrafts,
  onCreateCollection,
  onSaveCoverPreset,
  onDeleteCoverPreset,
}: ImportModalProps) {
  const [drafts, setDrafts] = useState<ImportDraft[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [newCollectionName, setNewCollectionName] = useState<string>('');
  const [isCreatingCollection, setIsCreatingCollection] = useState<boolean>(false);
  const [designerTarget, setDesignerTarget] =
    useState<CoverDesignerTarget | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const draftsRef = useRef<ImportDraft[]>([]);
  draftsRef.current = drafts;

  const revokeDraftUrls = useCallback((items: ImportDraft[]) => {
    for (const item of items) {
      if (item.coverPreviewUrl) {
        URL.revokeObjectURL(item.coverPreviewUrl);
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      revokeDraftUrls(draftsRef.current);
    };
  }, [revokeDraftUrls]);

  const handleClose = useCallback(() => {
    if (isSaving || isParsing) return;
    revokeDraftUrls(drafts);
    setDrafts([]);
    setActiveIndex(0);
    setParseErrors([]);
    setNewCollectionName('');
    setDesignerTarget(null);
    onClose();
  }, [drafts, isParsing, isSaving, onClose, revokeDraftUrls]);

  useEffect(() => {
    if (!isOpen || designerTarget) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, designerTarget, handleClose]);

  const processFiles = useCallback(async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    setIsParsing(true);
    setParseErrors([]);
    const newDrafts: ImportDraft[] = [];
    const errors: string[] = [];

    for (const file of files) {
      try {
        const draft = await parseEpubFile(file);
        const existing = await bookStorageService.findBookByChecksum(
          draft.checksum
        );
        if (existing) {
          draft.duplicateBookId = existing.id;
        }
        newDrafts.push(draft);
      } catch (err) {
        errors.push(
          err instanceof Error
            ? err.message
            : `Unable to import "${file.name}".`
        );
      }
    }

    if (newDrafts.length > 0) {
      setDrafts((prev) => {
        const next = [...prev, ...newDrafts];
        if (prev.length === 0) {
          setActiveIndex(0);
        }
        return next;
      });
    }
    if (errors.length > 0) {
      setParseErrors(errors);
    }
    setIsParsing(false);
  }, []);

  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (event.dataTransfer?.files) {
      await processFiles(event.dataTransfer.files);
    }
  };

  const updateActiveDraft = (patch: Partial<ImportDraft>) => {
    setDrafts((prev) =>
      prev.map((draft, idx) =>
        idx === activeIndex ? { ...draft, ...patch } : draft
      )
    );
  };

  const removeDraftAt = (index: number) => {
    setDrafts((prev) => {
      const target = prev[index];
      if (target?.coverPreviewUrl) {
        URL.revokeObjectURL(target.coverPreviewUrl);
      }
      const next = prev.filter((_, i) => i !== index);
      if (activeIndex >= next.length) {
        setActiveIndex(Math.max(0, next.length - 1));
      }
      return next;
    });
  };

  const handleReplaceCover = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file || !activeDraft) return;
    if (!file.type.startsWith('image/')) {
      setParseErrors(['Please choose a valid image file (JPEG, PNG, or WebP).']);
      return;
    }
    const buffer = await file.arrayBuffer();
    if (activeDraft.coverPreviewUrl) {
      URL.revokeObjectURL(activeDraft.coverPreviewUrl);
    }
    const previewUrl = URL.createObjectURL(
      new Blob([buffer], { type: file.type })
    );
    updateActiveDraft({
      coverData: buffer,
      coverMimeType: file.type,
      coverPreviewUrl: previewUrl,
      customCoverDesign: null,
    });
  };

  const handleClearCover = () => {
    if (!activeDraft) return;
    if (activeDraft.coverPreviewUrl) {
      URL.revokeObjectURL(activeDraft.coverPreviewUrl);
    }
    updateActiveDraft({
      coverData: null,
      coverMimeType: null,
      coverPreviewUrl: null,
      customCoverDesign: null,
    });
  };

  const handleOpenDraftCoverDesigner = () => {
    if (!activeDraft) return;
    setDesignerTarget({
      kind: 'draft',
      title: activeDraft.title || 'Untitled Volume',
      author: activeDraft.authorsInput,
      hasOriginalCover: Boolean(activeDraft.originalCoverData),
      existingDesign: activeDraft.customCoverDesign,
    });
  };

  const handleSaveDraftCustomCover = async (payload: CoverSavePayload) => {
    if (!activeDraft) return;
    if (activeDraft.coverPreviewUrl) {
      URL.revokeObjectURL(activeDraft.coverPreviewUrl);
    }
    const previewUrl = URL.createObjectURL(
      new Blob([payload.renderedData], { type: payload.renderedMimeType })
    );
    updateActiveDraft({
      coverData: payload.renderedData,
      coverMimeType: payload.renderedMimeType,
      coverPreviewUrl: previewUrl,
      customCoverDesign: {
        spec: payload.spec,
        customImageData: payload.customImageData,
        customImageMimeType: payload.customImageMimeType,
      },
    });
  };

  const handleRestoreDraftOriginalCover = async () => {
    if (!activeDraft) return;
    if (activeDraft.coverPreviewUrl) {
      URL.revokeObjectURL(activeDraft.coverPreviewUrl);
    }
    if (
      activeDraft.originalCoverData &&
      activeDraft.originalCoverMimeType
    ) {
      const previewUrl = URL.createObjectURL(
        new Blob([activeDraft.originalCoverData], {
          type: activeDraft.originalCoverMimeType,
        })
      );
      updateActiveDraft({
        coverData: activeDraft.originalCoverData,
        coverMimeType: activeDraft.originalCoverMimeType,
        coverPreviewUrl: previewUrl,
        customCoverDesign: null,
      });
    } else {
      updateActiveDraft({
        coverData: null,
        coverMimeType: null,
        coverPreviewUrl: null,
        customCoverDesign: null,
      });
    }
  };

  const toggleCollection = (collectionId: string) => {
    if (!activeDraft) return;
    const exists = activeDraft.collectionIds.includes(collectionId);
    const nextIds = exists
      ? activeDraft.collectionIds.filter((id) => id !== collectionId)
      : [...activeDraft.collectionIds, collectionId];
    updateActiveDraft({ collectionIds: nextIds });
  };

  const handleQuickCreateCollection = async () => {
    const clean = newCollectionName.trim();
    if (!clean || isCreatingCollection) return;
    setIsCreatingCollection(true);
    try {
      const created = await onCreateCollection(clean, '');
      setNewCollectionName('');
      if (activeDraft) {
        updateActiveDraft({
          collectionIds: [...activeDraft.collectionIds, created.id],
        });
      }
    } catch (err) {
      setParseErrors([
        err instanceof Error ? err.message : 'Failed to create collection.',
      ]);
    } finally {
      setIsCreatingCollection(false);
    }
  };

  const handleSaveAll = async () => {
    if (drafts.length === 0 || isSaving) return;
    setIsSaving(true);
    try {
      await onSaveDrafts(drafts);
      revokeDraftUrls(drafts);
      setDrafts([]);
      setActiveIndex(0);
      setParseErrors([]);
      onClose();
    } catch (err) {
      setParseErrors([
        err instanceof Error ? err.message : 'Failed to save EPUBs to library.',
      ]);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const activeDraft = drafts[activeIndex] ?? null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm"
    >
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-lg bg-[#111116] border border-white/[0.1] shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08]">
          <div>
            <h2
              id="import-modal-title"
              className="font-serif text-xl font-medium text-[#F2EDE4]"
            >
              {drafts.length > 0
                ? 'Review & Edit Metadata Before Saving'
                : 'Import EPUB Volumes'}
            </h2>
            <p className="text-xs text-[#A69F93] mt-0.5">
              Files are parsed locally with EPUB.js and stored in your
              browser&apos;s IndexedDB archive.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close import dialog"
            className="p-2 rounded-md text-[#A69F93] hover:text-[#F2EDE4] hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hidden Inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".epub,application/epub+zip"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) {
              void processFiles(e.target.files);
              e.target.value = '';
            }
          }}
        />
        <input
          ref={coverInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            void handleReplaceCover(e.target.files);
            e.target.value = '';
          }}
        />

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {parseErrors.length > 0 && (
            <div
              role="alert"
              className="p-3.5 rounded-md bg-red-950/40 border border-red-500/30 text-sm text-red-200 space-y-1"
            >
              {parseErrors.map((err, i) => (
                <p key={i}>{err}</p>
              ))}
            </div>
          )}

          {drafts.length === 0 ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => void handleDrop(e)}
              className={`border border-dashed rounded-lg py-16 px-6 text-center transition-colors ${
                isDragging
                  ? 'border-[#D99B43] bg-[#D99B43]/[0.06]'
                  : 'border-white/[0.16] bg-[#0C0C10] hover:border-white/[0.28]'
              }`}
            >
              {isParsing ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 text-[#D99B43] animate-spin" />
                  <p className="font-serif text-lg text-[#F2EDE4]">
                    Extracting EPUB metadata and cover art...
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 rounded-md bg-[#18181F] border border-white/[0.08] flex items-center justify-center text-[#D99B43]">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div className="space-y-1.5">
                    <p className="font-serif text-xl text-[#F2EDE4]">
                      Select or drop EPUB files
                    </p>
                    <p className="text-xs text-[#A69F93] max-w-sm mx-auto">
                      Supports single or multiple DRM-free <span className="font-mono">.epub</span>{' '}
                      files. You can inspect and refine title, author, series,
                      tags, and cover before saving.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-1 px-5 py-2.5 rounded-md bg-[#D99B43] hover:bg-[#E8B15C] text-[#08080A] text-sm font-semibold transition-colors cursor-pointer"
                  >
                    Choose EPUB Files
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Queue Strip when importing 1+ files */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
                <div className="flex items-center gap-2 overflow-x-auto py-0.5">
                  {drafts.map((draft, index) => {
                    const isCurrent = index === activeIndex;
                    return (
                      <div
                        key={draft.tempId}
                        className={`inline-flex items-center gap-2 pl-3 pr-1.5 py-1.5 rounded-md text-xs border transition-colors shrink-0 ${
                          isCurrent
                            ? 'bg-[#1D1D25] border-[#D99B43]/60 text-[#F2EDE4]'
                            : 'bg-[#14141A] border-white/[0.08] text-[#A69F93] hover:text-[#F2EDE4]'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setActiveIndex(index)}
                          className="max-w-[180px] truncate font-medium cursor-pointer"
                        >
                          {draft.title || draft.fileName}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeDraftAt(index)}
                          aria-label={`Remove ${draft.title} from import queue`}
                          className="p-1 text-[#6E685F] hover:text-red-400 transition-colors cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isParsing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-white/[0.12] text-xs font-medium text-[#F2EDE4] hover:border-[#D99B43]/60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {isParsing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  <span>Add More EPUBs</span>
                </button>
              </div>

              {activeDraft && (
                <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-8">
                  {/* Left Column: Cover & Extracted File Telemetry */}
                  <div className="space-y-4">
                    <div className="rounded-md overflow-hidden border border-white/[0.1]">
                      <BookCover
                        title={activeDraft.title || 'Untitled Volume'}
                        author={activeDraft.authorsInput || 'Unknown Author'}
                        publisher={activeDraft.publisher}
                        coverUrl={activeDraft.coverPreviewUrl}
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={handleOpenDraftCoverDesigner}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-[#D99B43]/15 hover:bg-[#D99B43]/25 border border-[#D99B43]/50 text-xs font-medium text-[#E8B15C] transition-colors cursor-pointer"
                      >
                        <Palette className="w-3.5 h-3.5" />
                        <span>
                          {activeDraft.customCoverDesign
                            ? 'Edit Cover Design'
                            : 'Customise Cover'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => coverInputRef.current?.click()}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-[#18181F] hover:bg-[#22222C] border border-white/[0.1] text-xs font-medium text-[#F2EDE4] transition-colors cursor-pointer"
                      >
                        <ImagePlus className="w-3.5 h-3.5" />
                        <span>
                          {activeDraft.coverPreviewUrl
                            ? 'Upload Image'
                            : 'Upload Cover'}
                        </span>
                      </button>

                      {activeDraft.originalCoverData &&
                        activeDraft.customCoverDesign && (
                          <button
                            type="button"
                            onClick={() => void handleRestoreDraftOriginalCover()}
                            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-[#18181F] hover:bg-[#22222C] border border-white/[0.08] text-xs text-[#A69F93] hover:text-[#F2EDE4] transition-colors cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Restore Original</span>
                          </button>
                        )}

                      {activeDraft.coverPreviewUrl && (
                        <button
                          type="button"
                          onClick={handleClearCover}
                          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs text-[#A69F93] hover:text-red-400 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove Cover</span>
                        </button>
                      )}
                    </div>

                    <div className="pt-3 border-t border-white/[0.08] space-y-1.5 text-xs text-[#A69F93]">
                      <div className="flex items-center gap-1.5 text-[#F2EDE4] font-medium">
                        <FileText className="w-3.5 h-3.5 text-[#D99B43]" />
                        <span className="truncate">{activeDraft.fileName}</span>
                      </div>
                      <p className="font-mono text-[11px] text-[#6E685F] tabular-nums">
                        {formatBytes(activeDraft.fileSize)} ·{' '}
                        {activeDraft.chapterCount}{' '}
                        {activeDraft.chapterCount === 1
                          ? 'section'
                          : 'sections'}
                      </p>
                    </div>
                  </div>

                  {/* Right Column: Editable Metadata Form */}
                  <div className="space-y-4">
                    {activeDraft.duplicateBookId && (
                      <div className="flex items-start gap-2.5 p-3 rounded-md bg-[#D99B43]/10 border border-[#D99B43]/40 text-xs text-[#E8B15C]">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>
                          An identical EPUB file (matching SHA-256 checksum) is
                          already stored in your library. You can still save
                          this copy or remove it from the queue.
                        </span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <label
                          htmlFor="import-title"
                          className="block text-xs font-medium text-[#A69F93] mb-1.5"
                        >
                          Title
                        </label>
                        <input
                          id="import-title"
                          type="text"
                          value={activeDraft.title}
                          onChange={(e) =>
                            updateActiveDraft({ title: e.target.value })
                          }
                          className="w-full h-10 px-3 rounded-md bg-[#18181F] border border-white/[0.1] text-sm font-serif text-[#F2EDE4] focus:outline-none focus:border-[#D99B43]"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label
                          htmlFor="import-authors"
                          className="block text-xs font-medium text-[#A69F93] mb-1.5"
                        >
                          Author(s) <span className="text-[#6E685F]">(comma-separated)</span>
                        </label>
                        <input
                          id="import-authors"
                          type="text"
                          value={activeDraft.authorsInput}
                          onChange={(e) =>
                            updateActiveDraft({ authorsInput: e.target.value })
                          }
                          className="w-full h-10 px-3 rounded-md bg-[#18181F] border border-white/[0.1] text-sm text-[#F2EDE4] focus:outline-none focus:border-[#D99B43]"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="import-publisher"
                          className="block text-xs font-medium text-[#A69F93] mb-1.5"
                        >
                          Publisher
                        </label>
                        <input
                          id="import-publisher"
                          type="text"
                          value={activeDraft.publisher}
                          onChange={(e) =>
                            updateActiveDraft({ publisher: e.target.value })
                          }
                          placeholder="e.g. Fitzcarraldo Editions"
                          className="w-full h-10 px-3 rounded-md bg-[#18181F] border border-white/[0.1] text-sm text-[#F2EDE4] placeholder:text-[#6E685F] focus:outline-none focus:border-[#D99B43]"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="import-status"
                          className="block text-xs font-medium text-[#A69F93] mb-1.5"
                        >
                          Reading Status
                        </label>
                        <select
                          id="import-status"
                          value={activeDraft.status}
                          onChange={(e) =>
                            updateActiveDraft({
                              status: e.target.value as ReadingStatus,
                            })
                          }
                          className="w-full h-10 px-3 rounded-md bg-[#18181F] border border-white/[0.1] text-sm text-[#F2EDE4] focus:outline-none focus:border-[#D99B43]"
                        >
                          {READING_STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="import-series"
                          className="block text-xs font-medium text-[#A69F93] mb-1.5"
                        >
                          Series
                        </label>
                        <input
                          id="import-series"
                          type="text"
                          value={activeDraft.seriesName}
                          onChange={(e) =>
                            updateActiveDraft({ seriesName: e.target.value })
                          }
                          placeholder="Optional series title"
                          className="w-full h-10 px-3 rounded-md bg-[#18181F] border border-white/[0.1] text-sm text-[#F2EDE4] placeholder:text-[#6E685F] focus:outline-none focus:border-[#D99B43]"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="import-series-index"
                          className="block text-xs font-medium text-[#A69F93] mb-1.5"
                        >
                          Volume # in Series
                        </label>
                        <input
                          id="import-series-index"
                          type="number"
                          min="0"
                          step="0.5"
                          value={activeDraft.seriesIndex}
                          onChange={(e) =>
                            updateActiveDraft({ seriesIndex: e.target.value })
                          }
                          placeholder="e.g. 1"
                          className="w-full h-10 px-3 rounded-md bg-[#18181F] border border-white/[0.1] text-sm font-mono tabular-nums text-[#F2EDE4] placeholder:text-[#6E685F] focus:outline-none focus:border-[#D99B43]"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label
                          htmlFor="import-tags"
                          className="block text-xs font-medium text-[#A69F93] mb-1.5"
                        >
                          Tags <span className="text-[#6E685F]">(comma-separated)</span>
                        </label>
                        <input
                          id="import-tags"
                          type="text"
                          value={activeDraft.tagsInput}
                          onChange={(e) =>
                            updateActiveDraft({ tagsInput: e.target.value })
                          }
                          placeholder="e.g. Literary Fiction, Essays, Translated"
                          className="w-full h-10 px-3 rounded-md bg-[#18181F] border border-white/[0.1] text-sm text-[#F2EDE4] placeholder:text-[#6E685F] focus:outline-none focus:border-[#D99B43]"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="import-year"
                          className="block text-xs font-medium text-[#A69F93] mb-1.5"
                        >
                          Publication Year
                        </label>
                        <input
                          id="import-year"
                          type="text"
                          value={activeDraft.publishedYear}
                          onChange={(e) =>
                            updateActiveDraft({ publishedYear: e.target.value })
                          }
                          placeholder="e.g. 2024"
                          className="w-full h-10 px-3 rounded-md bg-[#18181F] border border-white/[0.1] text-sm font-mono tabular-nums text-[#F2EDE4] placeholder:text-[#6E685F] focus:outline-none focus:border-[#D99B43]"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="import-language"
                          className="block text-xs font-medium text-[#A69F93] mb-1.5"
                        >
                          Language &amp; Identifier
                        </label>
                        <div className="flex gap-2">
                          <input
                            id="import-language"
                            type="text"
                            value={activeDraft.language}
                            onChange={(e) =>
                              updateActiveDraft({ language: e.target.value })
                            }
                            aria-label="Language"
                            placeholder="en"
                            className="w-20 h-10 px-3 rounded-md bg-[#18181F] border border-white/[0.1] text-sm font-mono text-[#F2EDE4] focus:outline-none focus:border-[#D99B43]"
                          />
                          <input
                            type="text"
                            value={activeDraft.identifier}
                            onChange={(e) =>
                              updateActiveDraft({ identifier: e.target.value })
                            }
                            aria-label="ISBN or Identifier"
                            placeholder="ISBN / UUID"
                            className="flex-1 min-w-0 h-10 px-3 rounded-md bg-[#18181F] border border-white/[0.1] text-sm font-mono text-[#F2EDE4] placeholder:text-[#6E685F] focus:outline-none focus:border-[#D99B43]"
                          />
                        </div>
                      </div>

                      {/* Collections Assignment */}
                      <div className="sm:col-span-2 space-y-2">
                        <span className="block text-xs font-medium text-[#A69F93]">
                          Collections
                        </span>
                        {collections.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {collections.map((col) => {
                              const checked = activeDraft.collectionIds.includes(
                                col.id
                              );
                              return (
                                <button
                                  key={col.id}
                                  type="button"
                                  onClick={() => toggleCollection(col.id)}
                                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs border transition-colors cursor-pointer ${
                                    checked
                                      ? 'bg-[#D99B43]/15 border-[#D99B43]/60 text-[#E8B15C]'
                                      : 'bg-[#18181F] border-white/[0.08] text-[#A69F93] hover:text-[#F2EDE4]'
                                  }`}
                                >
                                  {checked && <Check className="w-3 h-3" />}
                                  <span>{col.name}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="text"
                            value={newCollectionName}
                            onChange={(e) => setNewCollectionName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                void handleQuickCreateCollection();
                              }
                            }}
                            placeholder="Create new collection..."
                            aria-label="New collection name"
                            className="flex-1 h-9 px-3 rounded-md bg-[#18181F] border border-white/[0.08] text-xs text-[#F2EDE4] placeholder:text-[#6E685F] focus:outline-none focus:border-[#D99B43]"
                          />
                          <button
                            type="button"
                            onClick={() => void handleQuickCreateCollection()}
                            disabled={
                              !newCollectionName.trim() || isCreatingCollection
                            }
                            className="h-9 px-3 rounded-md bg-[#202029] hover:bg-[#2A2A35] disabled:opacity-40 text-xs font-medium text-[#F2EDE4] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            Add Collection
                          </button>
                        </div>
                      </div>

                      <div className="sm:col-span-2">
                        <label
                          htmlFor="import-description"
                          className="block text-xs font-medium text-[#A69F93] mb-1.5"
                        >
                          Synopsis / Description
                        </label>
                        <textarea
                          id="import-description"
                          rows={4}
                          value={activeDraft.description}
                          onChange={(e) =>
                            updateActiveDraft({ description: e.target.value })
                          }
                          className="w-full p-3 rounded-md bg-[#18181F] border border-white/[0.1] text-sm text-[#F2EDE4] leading-relaxed focus:outline-none focus:border-[#D99B43]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-t border-white/[0.08] bg-[#0D0D11]">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSaving}
            className="px-4 py-2 rounded-md border border-white/[0.12] text-sm font-medium text-[#A69F93] hover:text-[#F2EDE4] hover:border-white/25 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          {drafts.length > 0 && (
            <button
              type="button"
              onClick={() => void handleSaveAll()}
              disabled={isSaving || isParsing}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-md bg-[#D99B43] hover:bg-[#E8B15C] disabled:opacity-60 text-[#08080A] text-sm font-semibold transition-colors cursor-pointer"
            >
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>
                {drafts.length === 1
                  ? 'Save to Library'
                  : `Save All (${drafts.length})`}
              </span>
            </button>
          )}
        </div>
      </div>

      <CoverDesignerModal
        target={designerTarget}
        presets={coverPresets}
        onClose={() => setDesignerTarget(null)}
        onSaveForDraft={handleSaveDraftCustomCover}
        onRestoreOriginalForDraft={handleRestoreDraftOriginalCover}
        onSavePreset={onSaveCoverPreset}
        onDeletePreset={onDeleteCoverPreset}
      />
    </div>
  );
}
