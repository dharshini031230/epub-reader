import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  BookmarkPlus,
  Copy,
  ImagePlus,
  Layers,
  Loader2,
  Move,
  Palette,
  RotateCcw,
  Shuffle,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Type,
  Upload,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  COVER_FAMILIES,
  COVER_FONTS,
  COVER_LAYOUTS,
  applyColorSchemeToSpec,
  derivePaletteFromBackgroundHex,
  extractColorScheme,
  generateCoverArtworkSvg,
  getOriginalColorScheme,
  type CoverPaletteDefinition,
} from '../services/coverArtGenerator';
import { renderCoverToImageBuffer } from '../services/coverRendererService';
import type {
  CoverAuthorPosition,
  CoverDesignSpec,
  CoverFontWeight,
  CoverLayoutId,
  CoverPresetRecord,
  CoverTextAlign,
  CoverVerticalPosition,
} from '../types/library';
import { CoverColoursSection } from './CoverColoursSection';
import { CoverPreviewCanvas } from './CoverPreviewCanvas';

type DesignerTab = 'design' | 'colour' | 'typography' | 'upload' | 'presets';
type PreviewMode = 'design' | 'shelf';

export interface CoverSavePayload {
  renderedData: ArrayBuffer;
  renderedMimeType: string;
  spec: CoverDesignSpec;
  customImageData: ArrayBuffer | null;
  customImageMimeType: string | null;
}

interface CoverDesignerProps {
  initialSpec: CoverDesignSpec;
  initialCustomImageData: ArrayBuffer | null;
  initialCustomImageMimeType: string | null;
  hasOriginalCover: boolean;
  presets: CoverPresetRecord[];
  readingProgress?: number;
  readingStatusLabel?: string;
  saveButtonLabel?: string;
  onSave: (payload: CoverSavePayload) => Promise<void>;
  onRestoreOriginal?: () => Promise<void>;
  onSavePreset: (name: string, spec: CoverDesignSpec) => Promise<CoverPresetRecord>;
  onDeletePreset: (id: string) => Promise<void>;
  onCancel: () => void;
}

function withOriginalColorsSnapshot(spec: CoverDesignSpec): CoverDesignSpec {
  if (spec.originalColors) return spec;
  return {
    ...spec,
    originalColors: extractColorScheme(spec),
  };
}

export function CoverDesigner({
  initialSpec,
  initialCustomImageData,
  initialCustomImageMimeType,
  hasOriginalCover,
  presets,
  readingProgress = 0,
  readingStatusLabel = 'To Read',
  saveButtonLabel = 'Save Cover Design',
  onSave,
  onRestoreOriginal,
  onSavePreset,
  onDeletePreset,
  onCancel,
}: CoverDesignerProps) {
  const [spec, setSpec] = useState<CoverDesignSpec>(() =>
    withOriginalColorsSnapshot(initialSpec)
  );
  const [customImageData, setCustomImageData] = useState<ArrayBuffer | null>(
    initialCustomImageData
  );
  const [customImageMimeType, setCustomImageMimeType] = useState<string | null>(
    initialCustomImageMimeType
  );
  const [customImageUrl, setCustomImageUrl] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<DesignerTab>('design');
  const [previewMode, setPreviewMode] = useState<PreviewMode>('design');
  const [isSaving, setIsSaving] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const [presetNameInput, setPresetNameInput] = useState('');
  const [showPresetPrompt, setShowPresetPrompt] = useState(false);
  const [isSavingPreset, setIsSavingPreset] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSpec(withOriginalColorsSnapshot(initialSpec));
    setCustomImageData(initialCustomImageData);
    setCustomImageMimeType(initialCustomImageMimeType);
    setErrorMessage(null);
    setStatusNotice(null);
  }, [initialSpec, initialCustomImageData, initialCustomImageMimeType]);

  useEffect(() => {
    if (!customImageData || !customImageMimeType) {
      setCustomImageUrl(null);
      return;
    }
    const url = URL.createObjectURL(
      new Blob([customImageData], { type: customImageMimeType })
    );
    setCustomImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [customImageData, customImageMimeType]);

  const activeFamily = useMemo(
    () =>
      COVER_FAMILIES.find((f) => f.id === spec.family) ?? COVER_FAMILIES[0],
    [spec.family]
  );

  const isColourModifiedFromOriginal = useMemo(() => {
    const baseline = getOriginalColorScheme(spec);
    return (
      spec.paletteId !== baseline.paletteId ||
      spec.backgroundColor.toLowerCase() !==
        baseline.backgroundColor.toLowerCase() ||
      spec.artworkPrimaryColor.toLowerCase() !==
        baseline.artworkPrimaryColor.toLowerCase() ||
      spec.artworkSecondaryColor.toLowerCase() !==
        baseline.artworkSecondaryColor.toLowerCase() ||
      spec.accentColor.toLowerCase() !== baseline.accentColor.toLowerCase() ||
      spec.textColor.toLowerCase() !== baseline.textColor.toLowerCase()
    );
  }, [spec]);

  const updateSpec = (patch: Partial<CoverDesignSpec>) => {
    setErrorMessage(null);
    setStatusNotice(null);
    setSpec((prev) => ({ ...prev, ...patch }));
  };

  const handleSelectFamily = (familyId: CoverDesignSpec['family']) => {
    const family =
      COVER_FAMILIES.find((f) => f.id === familyId) ?? COVER_FAMILIES[0];
    updateSpec({
      mode: 'procedural',
      family: family.id,
      templateId: family.templates[0].id,
    });
  };

  const handleSelectCoverPalette = (palette: CoverPaletteDefinition) => {
    setErrorMessage(null);
    setStatusNotice(null);
    setSpec((prev) =>
      applyColorSchemeToSpec(prev, {
        paletteId: palette.id,
        backgroundColor: palette.backgroundColor,
        artworkPrimaryColor: palette.artworkPrimaryColor,
        artworkSecondaryColor: palette.artworkSecondaryColor,
        accentColor: palette.accentColor,
        textColor: palette.textColor,
      })
    );
  };

  const handleSelectCustomBackground = (hex: string) => {
    setErrorMessage(null);
    setStatusNotice(null);
    const derived = derivePaletteFromBackgroundHex(hex);
    setSpec((prev) => applyColorSchemeToSpec(prev, derived));
  };

  const handleResetColour = () => {
    setErrorMessage(null);
    setSpec((prev) =>
      applyColorSchemeToSpec(prev, getOriginalColorScheme(prev))
    );
    setStatusNotice('Restored original template colours.');
  };

  const handleShuffleArt = () => {
    const nextSeed = Math.floor(1000 + Math.random() * 899999);
    updateSpec({
      mode: 'procedural',
      artSeed: nextSeed,
    });
  };

  const handleUploadCustomImage = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please upload a valid JPEG, PNG, or WebP image.');
      return;
    }
    const buffer = await file.arrayBuffer();
    setCustomImageData(buffer);
    setCustomImageMimeType(file.type);
    updateSpec({
      mode: 'custom-image',
      customImageFit: 'cover',
      customImageScale: 1,
      customImageOffsetX: 0,
      customImageOffsetY: 0,
    });
    setActiveTab('upload');
    setStatusNotice('Uploaded image applied. Drag directly on preview to reposition.');
  };

  const handleRemoveCustomImage = () => {
    setCustomImageData(null);
    setCustomImageMimeType(null);
    updateSpec({
      mode: 'procedural',
      customImageScale: 1,
      customImageOffsetX: 0,
      customImageOffsetY: 0,
    });
  };

  const handleSaveCover = async () => {
    if (!spec.title.trim()) {
      setErrorMessage('Book title is required on the cover.');
      setActiveTab('typography');
      return;
    }
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const rendered = await renderCoverToImageBuffer(
        spec,
        customImageData,
        customImageMimeType
      );
      await onSave({
        renderedData: rendered.data,
        renderedMimeType: rendered.mimeType,
        spec,
        customImageData,
        customImageMimeType,
      });
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Unable to save cover design.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestore = async () => {
    if (!onRestoreOriginal || isRestoring) return;
    setIsRestoring(true);
    setErrorMessage(null);
    try {
      await onRestoreOriginal();
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Unable to restore original EPUB cover.'
      );
    } finally {
      setIsRestoring(false);
    }
  };

  const handleDuplicateDesign = async () => {
    const suggested =
      presetNameInput.trim() ||
      `${activeFamily.label.split(' ')[0]} · ${spec.title.slice(0, 22) || 'Edition'}`;
    setIsSavingPreset(true);
    setErrorMessage(null);
    try {
      await onSavePreset(suggested, spec);
      setPresetNameInput('');
      setShowPresetPrompt(false);
      setStatusNotice(`Saved "${suggested}" to Saved Designs.`);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Unable to duplicate design.'
      );
    } finally {
      setIsSavingPreset(false);
    }
  };

  const handleApplyPreset = (preset: CoverPresetRecord) => {
    // Preserve this book's title/author/subtitle/imprint while applying styling & layout
    updateSpec({
      ...preset.spec,
      mode: 'procedural',
      title: spec.title,
      author: spec.author,
      subtitle: spec.subtitle,
      imprint: spec.imprint,
    });
    setStatusNotice(`Applied "${preset.name}" style.`);
  };

  const tabs: { id: DesignerTab; label: string; icon: typeof Palette }[] = [
    { id: 'design', label: 'Artwork', icon: Sparkles },
    { id: 'colour', label: 'Palette', icon: Palette },
    { id: 'typography', label: 'Text & Type', icon: Type },
    { id: 'upload', label: 'My Image', icon: ImagePlus },
    { id: 'presets', label: `Saved (${presets.length})`, icon: BookmarkPlus },
  ];

  return (
    <div className="flex flex-col h-full min-h-0">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          void handleUploadCustomImage(e.target.files);
          e.target.value = '';
        }}
      />

      {/* Main Responsive Workspace: Mobile vertical stack, Desktop 2-column split */}
      <div className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden grid grid-cols-1 lg:grid-cols-[360px_1fr]">
        {/* LEFT COLUMN: Live Preview Stage */}
        <div className="bg-[#0B0B0E] border-b lg:border-b-0 lg:border-r border-white/[0.08] p-5 sm:p-6 flex flex-col items-center justify-between gap-4 lg:overflow-y-auto">
          {/* Preview Mode Toggle */}
          <div className="w-full flex items-center justify-between gap-2">
            <div
              role="tablist"
              aria-label="Preview mode"
              className="inline-flex p-1 rounded-md bg-[#14141A] border border-white/[0.08]"
            >
              <button
                type="button"
                role="tab"
                aria-selected={previewMode === 'design'}
                onClick={() => setPreviewMode('design')}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer ${
                  previewMode === 'design'
                    ? 'bg-[#D99B43] text-[#08080A] font-semibold'
                    : 'text-[#A69F93] hover:text-[#F2EDE4]'
                }`}
              >
                Cover Design
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={previewMode === 'shelf'}
                onClick={() => setPreviewMode('shelf')}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer ${
                  previewMode === 'shelf'
                    ? 'bg-[#D99B43] text-[#08080A] font-semibold'
                    : 'text-[#A69F93] hover:text-[#F2EDE4]'
                }`}
              >
                Shelf Preview
              </button>
            </div>

            <button
              type="button"
              onClick={handleShuffleArt}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#16161D] hover:bg-[#20202A] border border-white/[0.1] text-xs font-medium text-[#F2EDE4] hover:border-[#D99B43]/50 transition-colors cursor-pointer"
            >
              <Shuffle className="w-3.5 h-3.5 text-[#D99B43]" />
              <span>Shuffle Art</span>
            </button>
          </div>

          {/* Live Preview Surface */}
          <div className="w-full flex-1 flex flex-col items-center justify-center py-2">
            {previewMode === 'design' ? (
              <div className="w-full max-w-[260px] sm:max-w-[290px]">
                <CoverPreviewCanvas
                  spec={spec}
                  customImageUrl={customImageUrl}
                  interactiveDrag={spec.mode === 'custom-image'}
                  onOffsetChange={(x, y) =>
                    updateSpec({ customImageOffsetX: x, customImageOffsetY: y })
                  }
                />
                {spec.mode === 'custom-image' && customImageUrl && (
                  <p className="mt-2.5 text-[11px] text-center text-[#A69F93] flex items-center justify-center gap-1.5">
                    <Move className="w-3 h-3 text-[#D99B43]" />
                    <span>Drag cover image to reposition framing</span>
                  </p>
                )}
              </div>
            ) : (
              <div className="w-full max-w-[240px] rounded-lg bg-[#08080A] border border-white/[0.08] p-5 shadow-inner">
                <p className="text-[11px] font-mono uppercase tracking-wider text-[#6E685F] mb-3">
                  Bookshelf Grid Scale
                </p>
                <div className="w-40 mx-auto">
                  <div className="relative rounded-md overflow-hidden">
                    <CoverPreviewCanvas
                      spec={spec}
                      customImageUrl={customImageUrl}
                    />
                    {(readingProgress > 0 ||
                      readingStatusLabel === 'Reading' ||
                      readingStatusLabel === 'Finished') && (
                      <div className="absolute inset-x-0 bottom-0 h-1 bg-black/75">
                        <div
                          className="h-full bg-[#D99B43]"
                          style={{ width: `${Math.max(4, readingProgress)}%` }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="mt-2.5 space-y-0.5">
                    <p className="font-serif text-[14px] leading-snug font-medium text-[#F2EDE4] line-clamp-2">
                      {spec.title || 'Untitled Volume'}
                    </p>
                    <p className="text-[12px] text-[#A69F93] line-clamp-1">
                      {spec.author || 'Unknown Author'}
                    </p>
                    <p className="text-[11px] text-[#6E685F] tabular-nums">
                      {readingStatusLabel}
                      {readingProgress > 0 ? ` · ${readingProgress}%` : ''}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Left Stage Quick Utilities */}
          <div className="w-full space-y-2 pt-2 border-t border-white/[0.06]">
            {showPresetPrompt ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={presetNameInput}
                  onChange={(e) => setPresetNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void handleDuplicateDesign();
                    }
                  }}
                  placeholder="Preset name..."
                  aria-label="Design preset name"
                  className="flex-1 h-9 px-2.5 rounded-md bg-[#16161D] border border-white/[0.12] text-xs text-[#F2EDE4] placeholder:text-[#6E685F] focus:outline-none focus:border-[#D99B43]"
                />
                <button
                  type="button"
                  onClick={() => void handleDuplicateDesign()}
                  disabled={isSavingPreset}
                  className="h-9 px-3 rounded-md bg-[#D99B43] hover:bg-[#E8B15C] text-[#08080A] text-xs font-semibold cursor-pointer"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setShowPresetPrompt(false)}
                  className="h-9 px-2.5 rounded-md border border-white/[0.1] text-xs text-[#A69F93] hover:text-[#F2EDE4] cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPresetPrompt(true)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-md bg-[#16161D] hover:bg-[#1F1F28] border border-white/[0.09] text-xs font-medium text-[#F2EDE4] transition-colors cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-[#D99B43]" />
                  <span>Duplicate Design</span>
                </button>

                {hasOriginalCover && onRestoreOriginal && (
                  <button
                    type="button"
                    onClick={() => void handleRestore()}
                    disabled={isRestoring}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-md bg-[#16161D] hover:bg-[#1F1F28] border border-white/[0.09] text-xs font-medium text-[#A69F93] hover:text-[#F2EDE4] transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restore Original</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Controls Panel */}
        <div className="flex flex-col min-h-0 bg-[#111116]">
          {/* Section Navigation Tabs */}
          <div className="px-4 sm:px-6 pt-3 pb-0 border-b border-white/[0.08] flex items-center gap-1 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isSelected
                      ? 'border-[#D99B43] text-[#F2EDE4]'
                      : 'border-transparent text-[#A69F93] hover:text-[#F2EDE4]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Scrollable Tab Controls */}
          <div className="flex-1 lg:overflow-y-auto p-5 sm:p-6 space-y-6">
            {errorMessage && (
              <div
                role="alert"
                className="p-3 rounded-md bg-red-950/40 border border-red-500/30 text-xs text-red-200"
              >
                {errorMessage}
              </div>
            )}

            {statusNotice && (
              <div
                role="status"
                className="p-3 rounded-md bg-[#D99B43]/10 border border-[#D99B43]/35 text-xs text-[#E8B15C]"
              >
                {statusNotice}
              </div>
            )}

            {/* Quick Title / Author Strip always visible at top of Design & Typography */}
            {(activeTab === 'design' || activeTab === 'typography') && (
              <div className="p-4 rounded-lg bg-[#16161D] border border-white/[0.07] space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="cover-title-input"
                      className="block text-[11px] font-medium text-[#A69F93] mb-1"
                    >
                      Book Title <span className="text-[#D99B43]">*</span>
                    </label>
                    <input
                      id="cover-title-input"
                      type="text"
                      value={spec.title}
                      onChange={(e) => updateSpec({ title: e.target.value })}
                      placeholder="Enter cover title..."
                      className="w-full h-9 px-3 rounded-md bg-[#0E0E13] border border-white/[0.1] text-sm font-serif text-[#F2EDE4] focus:outline-none focus:border-[#D99B43]"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="cover-author-input"
                      className="block text-[11px] font-medium text-[#A69F93] mb-1"
                    >
                      Author <span className="text-[#6E685F]">(optional)</span>
                    </label>
                    <input
                      id="cover-author-input"
                      type="text"
                      value={spec.author}
                      onChange={(e) => updateSpec({ author: e.target.value })}
                      placeholder="Author name"
                      className="w-full h-9 px-3 rounded-md bg-[#0E0E13] border border-white/[0.1] text-sm text-[#F2EDE4] focus:outline-none focus:border-[#D99B43]"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="cover-subtitle-input"
                      className="block text-[11px] font-medium text-[#A69F93] mb-1"
                    >
                      Subtitle <span className="text-[#6E685F]">(optional)</span>
                    </label>
                    <input
                      id="cover-subtitle-input"
                      type="text"
                      value={spec.subtitle}
                      onChange={(e) => updateSpec({ subtitle: e.target.value })}
                      placeholder="Optional subtitle or edition"
                      className="w-full h-9 px-3 rounded-md bg-[#0E0E13] border border-white/[0.1] text-xs text-[#F2EDE4] placeholder:text-[#6E685F] focus:outline-none focus:border-[#D99B43]"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="cover-imprint-input"
                      className="block text-[11px] font-medium text-[#A69F93] mb-1"
                    >
                      Imprint <span className="text-[#6E685F]">(optional)</span>
                    </label>
                    <input
                      id="cover-imprint-input"
                      type="text"
                      value={spec.imprint}
                      onChange={(e) => updateSpec({ imprint: e.target.value })}
                      placeholder="Optional imprint line"
                      className="w-full h-9 px-3 rounded-md bg-[#0E0E13] border border-white/[0.1] text-xs text-[#F2EDE4] placeholder:text-[#6E685F] focus:outline-none focus:border-[#D99B43]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 1: ARTWORK & LAYOUT */}
            {activeTab === 'design' && (
              <div className="space-y-6">
                {/* 6 Cover Layouts */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-medium text-[#F2EDE4] flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-[#D99B43]" />
                      <span>Cover Layout</span>
                    </h3>
                    <span className="text-[11px] text-[#6E685F]">
                      {COVER_LAYOUTS.length} compositions
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {COVER_LAYOUTS.map((layout) => {
                      const active = spec.layout === layout.id;
                      return (
                        <button
                          key={layout.id}
                          type="button"
                          onClick={() =>
                            updateSpec({ layout: layout.id as CoverLayoutId })
                          }
                          className={`p-3 rounded-md border text-left transition-colors cursor-pointer ${
                            active
                              ? 'bg-[#D99B43]/12 border-[#D99B43]/60'
                              : 'bg-[#16161D] border-white/[0.08] hover:border-white/[0.2]'
                          }`}
                        >
                          <p className="text-xs font-medium text-[#F2EDE4]">
                            {layout.label}
                          </p>
                          <p className="text-[11px] text-[#A69F93] mt-0.5 line-clamp-1">
                            {layout.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 8 Design Families */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-medium text-[#F2EDE4]">
                      Design Family
                    </h3>
                    {spec.mode === 'custom-image' && (
                      <button
                        type="button"
                        onClick={() => updateSpec({ mode: 'procedural' })}
                        className="text-[11px] text-[#D99B43] hover:underline cursor-pointer"
                      >
                        Switch back to procedural art
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {COVER_FAMILIES.map((family) => {
                      const active =
                        spec.mode === 'procedural' && spec.family === family.id;
                      return (
                        <button
                          key={family.id}
                          type="button"
                          onClick={() => handleSelectFamily(family.id)}
                          className={`px-3 py-2.5 rounded-md border text-left text-xs font-medium transition-colors cursor-pointer ${
                            active
                              ? 'bg-[#D99B43]/15 border-[#D99B43] text-[#E8B15C]'
                              : 'bg-[#16161D] border-white/[0.08] text-[#A69F93] hover:text-[#F2EDE4] hover:border-white/20'
                          }`}
                        >
                          {family.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Templates within active family */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-medium text-[#F2EDE4]">
                      {activeFamily.label} Templates
                    </h3>
                    <button
                      type="button"
                      onClick={handleShuffleArt}
                      className="inline-flex items-center gap-1 text-[11px] text-[#D99B43] hover:text-[#E8B15C] cursor-pointer"
                    >
                      <Shuffle className="w-3 h-3" />
                      <span>Shuffle Variation</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {activeFamily.templates.map((tpl) => {
                      const selected =
                        spec.mode === 'procedural' &&
                        spec.templateId === tpl.id;
                      const thumbSvg = generateCoverArtworkSvg(
                        { ...spec, templateId: tpl.id },
                        120,
                        180
                      );
                      return (
                        <button
                          key={tpl.id}
                          type="button"
                          onClick={() =>
                            updateSpec({
                              mode: 'procedural',
                              templateId: tpl.id,
                            })
                          }
                          className={`group rounded-md border overflow-hidden text-left transition-all cursor-pointer ${
                            selected
                              ? 'border-[#D99B43] ring-1 ring-[#D99B43]/50 bg-[#1A1A22]'
                              : 'border-white/[0.08] bg-[#16161D] hover:border-white/25'
                          }`}
                        >
                          <div
                            className="aspect-[2/3] w-full overflow-hidden"
                            dangerouslySetInnerHTML={{ __html: thumbSvg }}
                          />
                          <div className="p-2">
                            <p className="text-[11px] font-medium text-[#F2EDE4] truncate">
                              {tpl.name}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Cover Colours Section (after Design Family & Template selection, before typography) */}
                <CoverColoursSection
                  spec={spec}
                  isModifiedFromOriginal={isColourModifiedFromOriginal}
                  onSelectPalette={handleSelectCoverPalette}
                  onSelectCustomBackground={handleSelectCustomBackground}
                  onResetColour={handleResetColour}
                />
              </div>
            )}

            {/* TAB 2: COLOUR PALETTE */}
            {activeTab === 'colour' && (
              <div className="space-y-6">
                <CoverColoursSection
                  spec={spec}
                  isModifiedFromOriginal={isColourModifiedFromOriginal}
                  onSelectPalette={handleSelectCoverPalette}
                  onSelectCustomBackground={handleSelectCustomBackground}
                  onResetColour={handleResetColour}
                />

                {/* Fine-Tune Individual Colour Channels */}
                <div className="pt-4 border-t border-white/[0.08] space-y-3">
                  <h3 className="text-xs font-medium text-[#F2EDE4]">
                    Fine-Tune Individual Colours
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(
                      [
                        ['backgroundColor', 'Background'],
                        ['artworkPrimaryColor', 'Artwork Primary'],
                        ['artworkSecondaryColor', 'Artwork Secondary'],
                        ['accentColor', 'Accent & Rules'],
                        ['textColor', 'Typography Ink'],
                      ] as const
                    ).map(([key, label]) => (
                      <label
                        key={key}
                        className="flex items-center justify-between gap-3 p-2.5 rounded-md bg-[#16161D] border border-white/[0.08] cursor-pointer"
                      >
                        <span className="text-xs text-[#F2EDE4]">{label}</span>
                        <span className="flex items-center gap-2">
                          <span className="font-mono text-[11px] text-[#A69F93] uppercase">
                            {spec[key]}
                          </span>
                          <input
                            type="color"
                            value={spec[key]}
                            onChange={(e) =>
                              updateSpec({
                                [key]: e.target.value,
                                paletteId: 'custom',
                              })
                            }
                            className="w-7 h-7 rounded border border-white/20 bg-transparent cursor-pointer"
                          />
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: TYPOGRAPHY & POSITIONING */}
            {activeTab === 'typography' && (
              <div className="space-y-6">
                {/* Font Family */}
                <div className="space-y-2.5">
                  <h3 className="text-xs font-medium text-[#F2EDE4]">
                    Typeface
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {COVER_FONTS.map((font) => {
                      const active = spec.fontFamily === font.id;
                      return (
                        <button
                          key={font.id}
                          type="button"
                          onClick={() => updateSpec({ fontFamily: font.id })}
                          className={`p-3 rounded-md border text-left transition-colors cursor-pointer ${
                            active
                              ? 'bg-[#D99B43]/12 border-[#D99B43]'
                              : 'bg-[#16161D] border-white/[0.08] hover:border-white/20'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className="text-base text-[#F2EDE4]"
                              style={{ fontFamily: font.cssFamily }}
                            >
                              {font.label}
                            </span>
                            <span className="font-mono text-[10px] text-[#6E685F] uppercase">
                              {font.category}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Size, Weight, Tracking */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3.5 rounded-md bg-[#16161D] border border-white/[0.08] space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#A69F93]">Title Size</span>
                      <span className="font-mono tabular-nums text-[#F2EDE4]">
                        {spec.titleSize}pt
                      </span>
                    </div>
                    <input
                      type="range"
                      min={24}
                      max={72}
                      value={spec.titleSize}
                      onChange={(e) =>
                        updateSpec({ titleSize: Number(e.target.value) })
                      }
                      aria-label="Title font size"
                      className="folio-slider w-full"
                    />
                  </div>

                  <div className="p-3.5 rounded-md bg-[#16161D] border border-white/[0.08] space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#A69F93]">Letter Spacing</span>
                      <span className="font-mono tabular-nums text-[#F2EDE4]">
                        {spec.letterSpacing}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min={-1}
                      max={6}
                      step={0.5}
                      value={spec.letterSpacing}
                      onChange={(e) =>
                        updateSpec({ letterSpacing: Number(e.target.value) })
                      }
                      aria-label="Letter spacing"
                      className="folio-slider w-full"
                    />
                  </div>
                </div>

                {/* Weight & Alignment */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <span className="block text-xs text-[#A69F93]">
                      Font Weight
                    </span>
                    <div className="grid grid-cols-4 gap-1.5">
                      {(
                        [
                          ['400', 'Regular'],
                          ['500', 'Medium'],
                          ['600', 'Semi'],
                          ['700', 'Bold'],
                        ] as [CoverFontWeight, string][]
                      ).map(([weight, label]) => (
                        <button
                          key={weight}
                          type="button"
                          onClick={() => updateSpec({ fontWeight: weight })}
                          className={`py-2 rounded text-xs border transition-colors cursor-pointer ${
                            spec.fontWeight === weight
                              ? 'bg-[#D99B43]/15 border-[#D99B43] text-[#E8B15C]'
                              : 'bg-[#16161D] border-white/[0.08] text-[#A69F93] hover:text-[#F2EDE4]'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="block text-xs text-[#A69F93]">
                      Text Alignment
                    </span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(
                        [
                          ['left', AlignLeft, 'Left'],
                          ['center', AlignCenter, 'Centre'],
                          ['right', AlignRight, 'Right'],
                        ] as [CoverTextAlign, typeof AlignLeft, string][]
                      ).map(([align, Icon, label]) => (
                        <button
                          key={align}
                          type="button"
                          onClick={() => updateSpec({ textAlign: align })}
                          className={`py-2 inline-flex items-center justify-center gap-1.5 rounded text-xs border transition-colors cursor-pointer ${
                            spec.textAlign === align
                              ? 'bg-[#D99B43]/15 border-[#D99B43] text-[#E8B15C]'
                              : 'bg-[#16161D] border-white/[0.08] text-[#A69F93] hover:text-[#F2EDE4]'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Title & Author Placement */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <span className="block text-xs text-[#A69F93]">
                      Title Position
                    </span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(
                        [
                          ['top', 'Top'],
                          ['middle', 'Middle'],
                          ['bottom', 'Bottom'],
                        ] as [CoverVerticalPosition, string][]
                      ).map(([pos, label]) => (
                        <button
                          key={pos}
                          type="button"
                          onClick={() => updateSpec({ titlePosition: pos })}
                          className={`py-2 rounded text-xs border transition-colors cursor-pointer ${
                            spec.titlePosition === pos
                              ? 'bg-[#D99B43]/15 border-[#D99B43] text-[#E8B15C]'
                              : 'bg-[#16161D] border-white/[0.08] text-[#A69F93] hover:text-[#F2EDE4]'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="block text-xs text-[#A69F93]">
                      Author Position
                    </span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(
                        [
                          ['top', 'Top'],
                          ['below-title', 'By Title'],
                          ['bottom', 'Bottom'],
                        ] as [CoverAuthorPosition, string][]
                      ).map(([pos, label]) => (
                        <button
                          key={pos}
                          type="button"
                          onClick={() => updateSpec({ authorPosition: pos })}
                          className={`py-2 rounded text-xs border transition-colors cursor-pointer ${
                            spec.authorPosition === pos
                              ? 'bg-[#D99B43]/15 border-[#D99B43] text-[#E8B15C]'
                              : 'bg-[#16161D] border-white/[0.08] text-[#A69F93] hover:text-[#F2EDE4]'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: USE MY OWN COVER */}
            {activeTab === 'upload' && (
              <div className="space-y-5">
                <div className="p-5 rounded-lg border border-dashed border-white/[0.16] bg-[#0D0D12] text-center space-y-3">
                  <div className="w-10 h-10 rounded-md bg-[#18181F] border border-white/[0.08] flex items-center justify-center mx-auto text-[#D99B43]">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#F2EDE4]">
                      {customImageData
                        ? 'Replace Custom Cover Image'
                        : 'Use My Own Cover Artwork'}
                    </p>
                    <p className="text-xs text-[#A69F93] mt-1">
                      Supports JPG, PNG, and WebP. Crop, scale, and reposition
                      to 2:3 book cover proportions.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 rounded-md bg-[#D99B43] hover:bg-[#E8B15C] text-[#08080A] text-xs font-semibold cursor-pointer"
                    >
                      {customImageData ? 'Replace Image' : 'Choose Image File'}
                    </button>
                    {customImageData && (
                      <button
                        type="button"
                        onClick={handleRemoveCustomImage}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-white/[0.12] text-xs text-[#A69F93] hover:text-red-400 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove Uploaded Image</span>
                      </button>
                    )}
                  </div>
                </div>

                {customImageData && (
                  <div className="space-y-4 p-4 rounded-lg bg-[#16161D] border border-white/[0.08]">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-medium text-[#F2EDE4] flex items-center gap-1.5">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-[#D99B43]" />
                        <span>Crop, Scale &amp; Framing</span>
                      </h3>
                      <button
                        type="button"
                        onClick={() =>
                          updateSpec({
                            customImageScale: 1,
                            customImageOffsetX: 0,
                            customImageOffsetY: 0,
                          })
                        }
                        className="text-[11px] text-[#D99B43] hover:underline cursor-pointer"
                      >
                        Reset Framing
                      </button>
                    </div>

                    {/* Fit vs Fill */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          updateSpec({
                            mode: 'custom-image',
                            customImageFit: 'cover',
                          })
                        }
                        className={`py-2 rounded text-xs border transition-colors cursor-pointer ${
                          spec.customImageFit === 'cover'
                            ? 'bg-[#D99B43]/15 border-[#D99B43] text-[#E8B15C]'
                            : 'bg-[#0E0E13] border-white/[0.08] text-[#A69F93]'
                        }`}
                      >
                        Fill Cover (Crop)
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateSpec({
                            mode: 'custom-image',
                            customImageFit: 'contain',
                          })
                        }
                        className={`py-2 rounded text-xs border transition-colors cursor-pointer ${
                          spec.customImageFit === 'contain'
                            ? 'bg-[#D99B43]/15 border-[#D99B43] text-[#E8B15C]'
                            : 'bg-[#0E0E13] border-white/[0.08] text-[#A69F93]'
                        }`}
                      >
                        Fit Inside Frame
                      </button>
                    </div>

                    {/* Zoom Scale */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-[#A69F93]">Zoom Scale</span>
                        <span className="font-mono tabular-nums text-[#F2EDE4]">
                          {spec.customImageScale.toFixed(2)}x
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0.6}
                        max={2.4}
                        step={0.05}
                        value={spec.customImageScale}
                        onChange={(e) =>
                          updateSpec({
                            mode: 'custom-image',
                            customImageScale: Number(e.target.value),
                          })
                        }
                        aria-label="Image zoom scale"
                        className="folio-slider w-full"
                      />
                    </div>

                    {/* Horizontal & Vertical Offset */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-[#A69F93]">Horizontal</span>
                          <span className="font-mono tabular-nums text-[#F2EDE4]">
                            {Math.round(spec.customImageOffsetX)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={-50}
                          max={50}
                          value={spec.customImageOffsetX}
                          onChange={(e) =>
                            updateSpec({
                              mode: 'custom-image',
                              customImageOffsetX: Number(e.target.value),
                            })
                          }
                          aria-label="Horizontal image offset"
                          className="folio-slider w-full"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-[#A69F93]">Vertical</span>
                          <span className="font-mono tabular-nums text-[#F2EDE4]">
                            {Math.round(spec.customImageOffsetY)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={-50}
                          max={50}
                          value={spec.customImageOffsetY}
                          onChange={(e) =>
                            updateSpec({
                              mode: 'custom-image',
                              customImageOffsetY: Number(e.target.value),
                            })
                          }
                          aria-label="Vertical image offset"
                          className="folio-slider w-full"
                        />
                      </div>
                    </div>

                    {/* Toggle Title Overlay */}
                    <label className="flex items-center justify-between pt-2 border-t border-white/[0.08] cursor-pointer">
                      <span className="text-xs text-[#F2EDE4]">
                        Overlay cover title &amp; author typography
                      </span>
                      <input
                        type="checkbox"
                        checked={spec.customImageShowTextOverlay}
                        onChange={(e) =>
                          updateSpec({
                            customImageShowTextOverlay: e.target.checked,
                          })
                        }
                        className="w-4 h-4 accent-[#D99B43] cursor-pointer"
                      />
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* TAB 5: SAVED DESIGNS / PRESETS */}
            {activeTab === 'presets' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-[#A69F93]">
                    Duplicate any cover design to reuse its layout, artwork,
                    typography, and palette across volumes.
                  </p>
                </div>

                {presets.length === 0 ? (
                  <div className="p-8 rounded-lg border border-white/[0.08] bg-[#16161D] text-center space-y-2">
                    <p className="font-serif text-base text-[#F2EDE4]">
                      No saved designs yet
                    </p>
                    <p className="text-xs text-[#A69F93]">
                      Use &ldquo;Duplicate Design&rdquo; under the preview to
                      save the current styling for future books.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {presets.map((preset) => {
                      const svgThumb = generateCoverArtworkSvg(
                        preset.spec,
                        120,
                        180
                      );
                      return (
                        <div
                          key={preset.id}
                          className="flex items-center gap-3 p-3 rounded-lg bg-[#16161D] border border-white/[0.08]"
                        >
                          <div
                            className="w-12 aspect-[2/3] rounded overflow-hidden shrink-0 border border-white/10"
                            dangerouslySetInnerHTML={{ __html: svgThumb }}
                          />
                          <div className="flex-1 min-w-0 space-y-1">
                            <p className="text-xs font-medium text-[#F2EDE4] truncate">
                              {preset.name}
                            </p>
                            <p className="text-[11px] text-[#6E685F] truncate">
                              {preset.spec.layout}
                            </p>
                            <div className="flex items-center gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => handleApplyPreset(preset)}
                                className="px-2.5 py-1 rounded bg-[#D99B43]/15 border border-[#D99B43]/50 text-[11px] font-medium text-[#E8B15C] hover:bg-[#D99B43]/25 cursor-pointer"
                              >
                                Apply
                              </button>
                              <button
                                type="button"
                                onClick={() => void onDeletePreset(preset.id)}
                                aria-label={`Delete preset ${preset.name}`}
                                className="p-1 text-[#6E685F] hover:text-red-400 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Footer */}
      <div className="px-5 sm:px-6 py-3.5 border-t border-white/[0.08] bg-[#0D0D11] flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving || isRestoring}
          className="px-4 py-2 rounded-md border border-white/[0.12] text-xs font-medium text-[#A69F93] hover:text-[#F2EDE4] hover:border-white/25 transition-colors cursor-pointer"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={() => void handleSaveCover()}
          disabled={isSaving || isRestoring}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-md bg-[#D99B43] hover:bg-[#E8B15C] disabled:opacity-60 text-[#08080A] text-xs font-semibold transition-colors cursor-pointer"
        >
          {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          <span>{saveButtonLabel}</span>
        </button>
      </div>
    </div>
  );
}
