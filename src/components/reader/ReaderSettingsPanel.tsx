import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  BookOpen,
  Minus,
  Plus,
  RotateCcw,
  ScrollText,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import {
  BUILT_IN_READER_FONTS,
  READER_THEMES,
  buildCustomFontFaceCss,
  createDefaultReaderPreferences,
  resolveFontFamilyStack,
  resolveReaderTheme,
} from '../../services/readerThemeService';
import { formatShortDate } from '../../services/libraryDomainService';
import { formatStorageSize } from '../../services/storageProtectionService';
import type {
  BackupSettingsRecord,
  CustomFontRecord,
  ReaderPreferences,
  ReaderThemeId,
  StorageBreakdown,
} from '../../types/library';

interface ReaderSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: ReaderPreferences;
  customFonts: CustomFontRecord[];
  onChangePreferences: (
    patch: Partial<Omit<ReaderPreferences, 'id' | 'updatedAt'>>
  ) => void;
  onUploadCustomFont: (file: File) => Promise<CustomFontRecord>;
  onDeleteCustomFont: (id: string) => Promise<void>;
  storageBreakdown?: StorageBreakdown | null;
  backupSettings?: BackupSettingsRecord;
  onOpenStorageSettings?: () => void;
}

const THEME_LIST: Array<{
  id: ReaderThemeId;
  label: string;
  swatchBg: string;
  swatchText: string;
}> = [
  {
    id: 'light',
    label: 'Light',
    swatchBg: READER_THEMES.light.bg,
    swatchText: READER_THEMES.light.text,
  },
  {
    id: 'dark',
    label: 'Dark',
    swatchBg: READER_THEMES.dark.bg,
    swatchText: READER_THEMES.dark.text,
  },
  {
    id: 'sepia',
    label: 'Sepia',
    swatchBg: READER_THEMES.sepia.bg,
    swatchText: READER_THEMES.sepia.text,
  },
  {
    id: 'warm',
    label: 'Warm',
    swatchBg: READER_THEMES.warm.bg,
    swatchText: READER_THEMES.warm.text,
  },
  {
    id: 'midnight',
    label: 'Midnight',
    swatchBg: READER_THEMES.midnight.bg,
    swatchText: READER_THEMES.midnight.text,
  },
  {
    id: 'custom',
    label: 'Custom',
    swatchBg: '#27242C',
    swatchText: '#D99B43',
  },
];

export function ReaderSettingsPanel({
  isOpen,
  onClose,
  preferences,
  customFonts,
  onChangePreferences,
  onUploadCustomFont,
  onDeleteCustomFont,
  storageBreakdown,
  backupSettings,
  onOpenStorageSettings,
}: ReaderSettingsPanelProps) {
  const fontInputRef = useRef<HTMLInputElement>(null);
  const [fontError, setFontError] = useState<string | null>(null);
  const [isUploadingFont, setIsUploadingFont] = useState(false);

  const previewFontCss = useMemo(
    () => buildCustomFontFaceCss(customFonts),
    [customFonts]
  );

  if (!isOpen) return null;

  const activeTheme = resolveReaderTheme(preferences);
  const activeFontStack = resolveFontFamilyStack(
    preferences.fontId,
    customFonts
  );

  const handleFontFileChange = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setFontError(null);
    setIsUploadingFont(true);
    try {
      const savedFont = await onUploadCustomFont(file);
      onChangePreferences({
        useOriginalStyling: false,
        fontId: `custom:${savedFont.id}`,
      });
    } catch (err) {
      setFontError(
        err instanceof Error ? err.message : 'Unable to upload custom font.'
      );
    } finally {
      setIsUploadingFont(false);
    }
  };

  const handleReset = () => {
    const defaults = createDefaultReaderPreferences();
    onChangePreferences({
      readingMode: defaults.readingMode,
      themeId: defaults.themeId,
      customBgColor: defaults.customBgColor,
      customTextColor: defaults.customTextColor,
      useOriginalStyling: defaults.useOriginalStyling,
      fontId: defaults.fontId,
      fontSizePx: defaults.fontSizePx,
      fontWeight: defaults.fontWeight,
      lineHeight: defaults.lineHeight,
      paragraphSpacingEm: defaults.paragraphSpacingEm,
      letterSpacingEm: defaults.letterSpacingEm,
      textAlign: defaults.textAlign,
      marginPx: defaults.marginPx,
      maxWidthPx: defaults.maxWidthPx,
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Reading settings"
      className="fixed inset-0 z-50 flex justify-end bg-black/65 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {previewFontCss && <style>{previewFontCss}</style>}
      <aside className="w-full max-w-md h-full bg-[#111116] border-l border-white/[0.1] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-[#6E685F] font-medium">
              Typography &amp; Surface
            </p>
            <h2 className="font-serif text-base text-[#F2EDE4] mt-0.5">
              Reading Settings
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close reading settings"
            className="p-2 min-w-[40px] min-h-[40px] inline-flex items-center justify-center rounded-md text-[#A69F93] hover:text-[#F2EDE4] hover:bg-white/[0.06] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Live Typography Preview */}
          <div className="space-y-2">
            <span className="block text-[11px] uppercase tracking-wider text-[#6E685F] font-medium">
              Live Sample
            </span>
            <div
              className="rounded-md p-4 border transition-colors"
              style={{
                backgroundColor: activeTheme.bg,
                color: activeTheme.text,
                borderColor: activeTheme.border,
              }}
            >
              <p
                style={
                  preferences.useOriginalStyling
                    ? undefined
                    : {
                        fontFamily: activeFontStack,
                        fontSize: `${Math.min(24, preferences.fontSizePx)}px`,
                        fontWeight: preferences.fontWeight,
                        lineHeight: preferences.lineHeight,
                        letterSpacing: `${preferences.letterSpacingEm}em`,
                        textAlign: preferences.textAlign,
                      }
                }
              >
                In the quiet hours before dawn, a well-typeset page invites
                the eye to linger without effort.
              </p>
            </div>
          </div>

          {/* Reading Mode */}
          <div className="space-y-2">
            <span className="block text-xs font-medium text-[#A69F93]">
              Reading Mode
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  onChangePreferences({ readingMode: 'paginated' })
                }
                className={`inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                  preferences.readingMode === 'paginated'
                    ? 'bg-[#D99B43] text-[#08080A] border-[#D99B43] font-semibold'
                    : 'bg-[#18181F] text-[#A69F93] border-white/[0.08] hover:text-[#F2EDE4]'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Paginated</span>
              </button>
              <button
                type="button"
                onClick={() => onChangePreferences({ readingMode: 'scrolled' })}
                className={`inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                  preferences.readingMode === 'scrolled'
                    ? 'bg-[#D99B43] text-[#08080A] border-[#D99B43] font-semibold'
                    : 'bg-[#18181F] text-[#A69F93] border-white/[0.08] hover:text-[#F2EDE4]'
                }`}
              >
                <ScrollText className="w-3.5 h-3.5" />
                <span>Continuous Scroll</span>
              </button>
            </div>
          </div>

          {/* Reading Theme (Isolated to Reader) */}
          <div className="space-y-2.5 pt-4 border-t border-white/[0.08]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#A69F93]">
                Reading Theme
              </span>
              <span className="text-[11px] text-[#6E685F]">
                Page canvas only
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {THEME_LIST.map((themeItem) => {
                const selected = preferences.themeId === themeItem.id;
                return (
                  <button
                    key={themeItem.id}
                    type="button"
                    onClick={() =>
                      onChangePreferences({ themeId: themeItem.id })
                    }
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-md border text-xs transition-colors cursor-pointer ${
                      selected
                        ? 'border-[#D99B43] bg-[#D99B43]/12 text-[#F2EDE4] font-medium'
                        : 'border-white/[0.08] bg-[#18181F] text-[#A69F93] hover:text-[#F2EDE4]'
                    }`}
                  >
                    <span
                      className="w-4 h-4 rounded-full border border-white/20 shrink-0 flex items-center justify-center text-[9px] font-serif"
                      style={{
                        backgroundColor:
                          themeItem.id === 'custom'
                            ? preferences.customBgColor
                            : themeItem.swatchBg,
                        color:
                          themeItem.id === 'custom'
                            ? preferences.customTextColor
                            : themeItem.swatchText,
                      }}
                    >
                      A
                    </span>
                    <span className="truncate">{themeItem.label}</span>
                  </button>
                );
              })}
            </div>

            {preferences.themeId === 'custom' && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <label className="flex items-center justify-between px-3 py-2 rounded-md bg-[#18181F] border border-white/[0.08] text-xs text-[#C8C1B6]">
                  <span>Background</span>
                  <input
                    type="color"
                    value={preferences.customBgColor}
                    onChange={(e) =>
                      onChangePreferences({ customBgColor: e.target.value })
                    }
                    className="w-7 h-7 rounded border-0 bg-transparent cursor-pointer"
                  />
                </label>
                <label className="flex items-center justify-between px-3 py-2 rounded-md bg-[#18181F] border border-white/[0.08] text-xs text-[#C8C1B6]">
                  <span>Text Colour</span>
                  <input
                    type="color"
                    value={preferences.customTextColor}
                    onChange={(e) =>
                      onChangePreferences({ customTextColor: e.target.value })
                    }
                    className="w-7 h-7 rounded border-0 bg-transparent cursor-pointer"
                  />
                </label>
              </div>
            )}
          </div>

          {/* Original EPUB Styling vs Customised Typography */}
          <div className="space-y-2.5 pt-4 border-t border-white/[0.08]">
            <span className="block text-xs font-medium text-[#A69F93]">
              Book Styling
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  onChangePreferences({ useOriginalStyling: true })
                }
                className={`py-2 px-3 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                  preferences.useOriginalStyling
                    ? 'bg-[#D99B43] text-[#08080A] border-[#D99B43] font-semibold'
                    : 'bg-[#18181F] text-[#A69F93] border-white/[0.08] hover:text-[#F2EDE4]'
                }`}
              >
                Original Styling
              </button>
              <button
                type="button"
                onClick={() =>
                  onChangePreferences({ useOriginalStyling: false })
                }
                className={`py-2 px-3 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                  !preferences.useOriginalStyling
                    ? 'bg-[#D99B43] text-[#08080A] border-[#D99B43] font-semibold'
                    : 'bg-[#18181F] text-[#A69F93] border-white/[0.08] hover:text-[#F2EDE4]'
                }`}
              >
                Custom Typography
              </button>
            </div>
          </div>

          {/* Custom Typography Controls */}
          <div
            className={`space-y-5 pt-4 border-t border-white/[0.08] transition-opacity ${
              preferences.useOriginalStyling ? 'opacity-55' : 'opacity-100'
            }`}
          >
            {/* Font Family */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-[#A69F93]">
                  Font Family
                </span>
                <div>
                  <input
                    ref={fontInputRef}
                    type="file"
                    accept=".ttf,.otf,.woff,.woff2"
                    className="hidden"
                    onChange={(e) => {
                      void handleFontFileChange(e.target.files);
                      e.target.value = '';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fontInputRef.current?.click()}
                    disabled={isUploadingFont}
                    className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#D99B43] hover:text-[#E8B15C] cursor-pointer"
                  >
                    <Upload className="w-3 h-3" />
                    <span>
                      {isUploadingFont ? 'Adding...' : 'Upload Font'}
                    </span>
                  </button>
                </div>
              </div>

              {fontError && (
                <p className="text-[11px] text-red-300 bg-red-950/40 border border-red-500/30 rounded px-2.5 py-1.5">
                  {fontError}
                </p>
              )}

              <div className="grid grid-cols-2 gap-1.5">
                {BUILT_IN_READER_FONTS.map((font) => {
                  const selected =
                    !preferences.useOriginalStyling &&
                    preferences.fontId === font.id;
                  return (
                    <button
                      key={font.id}
                      type="button"
                      onClick={() =>
                        onChangePreferences({
                          useOriginalStyling: false,
                          fontId: font.id,
                        })
                      }
                      className={`text-left px-2.5 py-2 rounded-md border text-xs transition-colors cursor-pointer ${
                        selected
                          ? 'bg-[#D99B43]/15 border-[#D99B43] text-[#E8B15C] font-medium'
                          : 'bg-[#18181F] border-white/[0.08] text-[#C8C1B6] hover:text-[#F2EDE4]'
                      }`}
                      style={{ fontFamily: font.cssStack }}
                    >
                      {font.label}
                    </button>
                  );
                })}
              </div>

              {customFonts.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="block text-[11px] text-[#6E685F]">
                    Uploaded Fonts
                  </span>
                  {customFonts.map((font) => {
                    const fontKey = `custom:${font.id}`;
                    const selected =
                      !preferences.useOriginalStyling &&
                      preferences.fontId === fontKey;
                    return (
                      <div
                        key={font.id}
                        className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md border ${
                          selected
                            ? 'bg-[#D99B43]/15 border-[#D99B43]'
                            : 'bg-[#18181F] border-white/[0.08]'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            onChangePreferences({
                              useOriginalStyling: false,
                              fontId: fontKey,
                            })
                          }
                          className="flex-1 text-left text-xs text-[#F2EDE4] truncate cursor-pointer"
                          style={{
                            fontFamily: `"${font.familyName}", Georgia, serif`,
                          }}
                        >
                          {font.name}
                        </button>
                        <button
                          type="button"
                          onClick={() => void onDeleteCustomFont(font.id)}
                          aria-label={`Remove custom font ${font.name}`}
                          className="p-1 text-[#A69F93] hover:text-red-400 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Font Size */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#A69F93]">Font Size</span>
                <span className="font-mono tabular-nums text-[#D99B43]">
                  {preferences.fontSizePx}px
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-label="Decrease font size"
                  onClick={() =>
                    onChangePreferences({
                      useOriginalStyling: false,
                      fontSizePx: Math.max(14, preferences.fontSizePx - 1),
                    })
                  }
                  className="p-2 rounded-md bg-[#18181F] border border-white/[0.08] text-[#F2EDE4] hover:border-[#D99B43]/50 cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  type="range"
                  min={14}
                  max={34}
                  step={1}
                  value={preferences.fontSizePx}
                  onChange={(e) =>
                    onChangePreferences({
                      useOriginalStyling: false,
                      fontSizePx: Number(e.target.value),
                    })
                  }
                  className="folio-slider flex-1"
                />
                <button
                  type="button"
                  aria-label="Increase font size"
                  onClick={() =>
                    onChangePreferences({
                      useOriginalStyling: false,
                      fontSizePx: Math.min(34, preferences.fontSizePx + 1),
                    })
                  }
                  className="p-2 rounded-md bg-[#18181F] border border-white/[0.08] text-[#F2EDE4] hover:border-[#D99B43]/50 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Font Weight */}
            <div className="space-y-2">
              <span className="block text-xs text-[#A69F93]">Font Weight</span>
              <div className="grid grid-cols-4 gap-1.5">
                {(['400', '500', '600', '700'] as const).map((weight) => (
                  <button
                    key={weight}
                    type="button"
                    onClick={() =>
                      onChangePreferences({
                        useOriginalStyling: false,
                        fontWeight: weight,
                      })
                    }
                    className={`py-1.5 rounded-md text-xs font-mono border cursor-pointer ${
                      preferences.fontWeight === weight
                        ? 'bg-[#D99B43] text-[#08080A] border-[#D99B43] font-semibold'
                        : 'bg-[#18181F] text-[#A69F93] border-white/[0.08] hover:text-[#F2EDE4]'
                    }`}
                  >
                    {weight}
                  </button>
                ))}
              </div>
            </div>

            {/* Line Spacing */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#A69F93]">Line Spacing</span>
                <span className="font-mono tabular-nums text-[#D99B43]">
                  {preferences.lineHeight.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min={1.2}
                max={2.2}
                step={0.05}
                value={preferences.lineHeight}
                onChange={(e) =>
                  onChangePreferences({
                    useOriginalStyling: false,
                    lineHeight: Number(e.target.value),
                  })
                }
                className="folio-slider w-full"
              />
            </div>

            {/* Paragraph Spacing */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#A69F93]">Paragraph Spacing</span>
                <span className="font-mono tabular-nums text-[#D99B43]">
                  {preferences.paragraphSpacingEm.toFixed(2)}em
                </span>
              </div>
              <input
                type="range"
                min={0.2}
                max={1.6}
                step={0.05}
                value={preferences.paragraphSpacingEm}
                onChange={(e) =>
                  onChangePreferences({
                    useOriginalStyling: false,
                    paragraphSpacingEm: Number(e.target.value),
                  })
                }
                className="folio-slider w-full"
              />
            </div>

            {/* Letter Spacing */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#A69F93]">Letter Spacing</span>
                <span className="font-mono tabular-nums text-[#D99B43]">
                  {preferences.letterSpacingEm.toFixed(2)}em
                </span>
              </div>
              <input
                type="range"
                min={-0.02}
                max={0.12}
                step={0.01}
                value={preferences.letterSpacingEm}
                onChange={(e) =>
                  onChangePreferences({
                    useOriginalStyling: false,
                    letterSpacingEm: Number(e.target.value),
                  })
                }
                className="folio-slider w-full"
              />
            </div>

            {/* Text Alignment */}
            <div className="space-y-2">
              <span className="block text-xs text-[#A69F93]">
                Text Alignment
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'left' as const, label: 'Left', icon: AlignLeft },
                  {
                    id: 'justify' as const,
                    label: 'Justify',
                    icon: AlignJustify,
                  },
                  { id: 'center' as const, label: 'Center', icon: AlignCenter },
                ].map((opt) => {
                  const Icon = opt.icon;
                  const active = preferences.textAlign === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() =>
                        onChangePreferences({
                          useOriginalStyling: false,
                          textAlign: opt.id,
                        })
                      }
                      className={`inline-flex items-center justify-center gap-1.5 py-2 rounded-md text-xs border cursor-pointer ${
                        active
                          ? 'bg-[#D99B43] text-[#08080A] border-[#D99B43] font-semibold'
                          : 'bg-[#18181F] text-[#A69F93] border-white/[0.08] hover:text-[#F2EDE4]'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Layout Geometry (Margins & Column Width) */}
          <div className="space-y-4 pt-4 border-t border-white/[0.08]">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#A69F93]">Page Margins</span>
                <span className="font-mono tabular-nums text-[#D99B43]">
                  {preferences.marginPx}px
                </span>
              </div>
              <input
                type="range"
                min={16}
                max={88}
                step={4}
                value={preferences.marginPx}
                onChange={(e) =>
                  onChangePreferences({ marginPx: Number(e.target.value) })
                }
                className="folio-slider w-full"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#A69F93]">Text Column Width</span>
                <span className="font-mono tabular-nums text-[#D99B43]">
                  {preferences.maxWidthPx}px
                </span>
              </div>
              <input
                type="range"
                min={520}
                max={940}
                step={20}
                value={preferences.maxWidthPx}
                onChange={(e) =>
                  onChangePreferences({ maxWidthPx: Number(e.target.value) })
                }
                className="folio-slider w-full"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleReset}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-md bg-[#18181F] hover:bg-[#22222C] border border-white/[0.08] text-xs font-medium text-[#A69F93] hover:text-[#F2EDE4] cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Reading Settings</span>
            </button>
          </div>

          {storageBreakdown && (
            <div className="pt-4 border-t border-white/[0.08] space-y-2 text-[11px] text-[#A69F93]">
              <div className="flex items-center justify-between">
                <span className="font-medium text-[#C8C1B6]">
                  Local Storage &amp; Backup
                </span>
                {onOpenStorageSettings && (
                  <button
                    type="button"
                    onClick={onOpenStorageSettings}
                    className="text-[#D99B43] hover:text-[#E8B15C] font-medium cursor-pointer"
                  >
                    Manage
                  </button>
                )}
              </div>
              <p className="tabular-nums">
                Library:{' '}
                {formatStorageSize(storageBreakdown.totalLibraryBytes)} ·
                Persistence:{' '}
                {storageBreakdown.persistenceStatus === 'granted'
                  ? 'Granted'
                  : storageBreakdown.persistenceStatus === 'denied'
                    ? 'Not granted'
                    : 'Unsupported'}
              </p>
              {backupSettings && (
                <p>
                  Last backup:{' '}
                  {backupSettings.lastBackupAt
                    ? formatShortDate(backupSettings.lastBackupAt)
                    : 'Not yet backed up'}
                </p>
              )}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
