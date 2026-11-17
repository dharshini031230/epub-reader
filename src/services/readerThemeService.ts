import type {
  CustomFontRecord,
  HighlightColor,
  ReaderPreferences,
  ReaderThemeId,
  ReadingMode,
} from '../types/library';

export interface ReaderThemeDefinition {
  id: ReaderThemeId;
  label: string;
  bg: string;
  text: string;
  muted: string;
  link: string;
  border: string;
  isDark: boolean;
}

export const READER_THEMES: Record<
  Exclude<ReaderThemeId, 'custom'>,
  ReaderThemeDefinition
> = {
  light: {
    id: 'light',
    label: 'Light',
    bg: '#FAF8F4',
    text: '#1E1B18',
    muted: '#6B645C',
    link: '#8C5212',
    border: 'rgba(30, 27, 24, 0.12)',
    isDark: false,
  },
  dark: {
    id: 'dark',
    label: 'Dark',
    bg: '#141418',
    text: '#EAE4DA',
    muted: '#9C9488',
    link: '#E0A34D',
    border: 'rgba(255, 255, 255, 0.1)',
    isDark: true,
  },
  sepia: {
    id: 'sepia',
    label: 'Sepia',
    bg: '#F2E7D3',
    text: '#3A2E21',
    muted: '#735F49',
    link: '#874814',
    border: 'rgba(58, 46, 33, 0.14)',
    isDark: false,
  },
  warm: {
    id: 'warm',
    label: 'Warm',
    bg: '#FBF2E1',
    text: '#2B2118',
    muted: '#776452',
    link: '#924F15',
    border: 'rgba(43, 33, 24, 0.12)',
    isDark: false,
  },
  midnight: {
    id: 'midnight',
    label: 'Midnight',
    bg: '#060608',
    text: '#BAB4AA',
    muted: '#6E685F',
    link: '#C88E3C',
    border: 'rgba(255, 255, 255, 0.08)',
    isDark: true,
  },
};

export interface BuiltInReaderFont {
  id: string;
  label: string;
  category: 'serif' | 'sans';
  cssStack: string;
}

export const BUILT_IN_READER_FONTS: BuiltInReaderFont[] = [
  {
    id: 'fraunces',
    label: 'Fraunces',
    category: 'serif',
    cssStack: '"Fraunces", Georgia, serif',
  },
  {
    id: 'source-serif',
    label: 'Source Serif 4',
    category: 'serif',
    cssStack: '"Source Serif 4", Georgia, serif',
  },
  {
    id: 'cormorant',
    label: 'Cormorant Garamond',
    category: 'serif',
    cssStack: '"Cormorant Garamond", Georgia, serif',
  },
  {
    id: 'playfair',
    label: 'Playfair Display',
    category: 'serif',
    cssStack: '"Playfair Display", Georgia, serif',
  },
  {
    id: 'georgia',
    label: 'Georgia Classic',
    category: 'serif',
    cssStack: 'Georgia, "Times New Roman", serif',
  },
  {
    id: 'jakarta',
    label: 'Plus Jakarta Sans',
    category: 'sans',
    cssStack: '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif',
  },
  {
    id: 'dm-sans',
    label: 'DM Sans',
    category: 'sans',
    cssStack: '"DM Sans", -apple-system, BlinkMacSystemFont, sans-serif',
  },
  {
    id: 'system-sans',
    label: 'System Sans',
    category: 'sans',
    cssStack: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
];

export interface HighlightColorDefinition {
  id: HighlightColor;
  label: string;
  swatch: string;
  fill: string;
  border: string;
  softBg: string;
  text: string;
}

export const HIGHLIGHT_COLORS: HighlightColorDefinition[] = [
  {
    id: 'yellow',
    label: 'Yellow',
    swatch: '#EAB308',
    fill: 'rgba(234, 179, 8, 0.36)',
    border: 'rgba(234, 179, 8, 0.85)',
    softBg: 'rgba(234, 179, 8, 0.14)',
    text: '#FDE047',
  },
  {
    id: 'orange',
    label: 'Orange',
    swatch: '#F97316',
    fill: 'rgba(249, 115, 22, 0.34)',
    border: 'rgba(249, 115, 22, 0.85)',
    softBg: 'rgba(249, 115, 22, 0.14)',
    text: '#FDBA74',
  },
  {
    id: 'pink',
    label: 'Pink',
    swatch: '#EC4899',
    fill: 'rgba(236, 72, 153, 0.32)',
    border: 'rgba(236, 72, 153, 0.85)',
    softBg: 'rgba(236, 72, 153, 0.14)',
    text: '#F9A8D4',
  },
  {
    id: 'blue',
    label: 'Blue',
    swatch: '#3B82F6',
    fill: 'rgba(59, 130, 246, 0.32)',
    border: 'rgba(59, 130, 246, 0.85)',
    softBg: 'rgba(59, 130, 246, 0.14)',
    text: '#93C5FD',
  },
  {
    id: 'green',
    label: 'Green',
    swatch: '#22C55E',
    fill: 'rgba(34, 197, 94, 0.32)',
    border: 'rgba(34, 197, 94, 0.85)',
    softBg: 'rgba(34, 197, 94, 0.14)',
    text: '#86EFAC',
  },
  {
    id: 'purple',
    label: 'Purple',
    swatch: '#A855F7',
    fill: 'rgba(168, 85, 247, 0.32)',
    border: 'rgba(168, 85, 247, 0.85)',
    softBg: 'rgba(168, 85, 247, 0.14)',
    text: '#D8B4FE',
  },
];

export function getHighlightColorDefinition(
  color?: HighlightColor
): HighlightColorDefinition {
  return (
    HIGHLIGHT_COLORS.find((item) => item.id === color) ?? HIGHLIGHT_COLORS[0]
  );
}

export function createDefaultReaderPreferences(): ReaderPreferences {
  return {
    id: 'default',
    readingMode: 'paginated',
    themeId: 'dark',
    customBgColor: '#17171C',
    customTextColor: '#EDE7DD',
    useOriginalStyling: false,
    fontId: 'source-serif',
    fontSizePx: 19,
    fontWeight: '400',
    lineHeight: 1.7,
    paragraphSpacingEm: 0.75,
    letterSpacingEm: 0,
    textAlign: 'left',
    marginPx: 36,
    maxWidthPx: 720,
    updatedAt: Date.now(),
  };
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace('#', '').trim();
  const normalized =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null;
  const num = parseInt(normalized, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function isColorDark(hex: string): boolean {
  const rgb = hexToRgb(hex);
  if (!rgb) return true;
  const lum = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return lum < 0.5;
}

export function resolveReaderTheme(
  prefs: ReaderPreferences
): ReaderThemeDefinition {
  if (prefs.themeId === 'custom') {
    const bg = prefs.customBgColor || '#17171C';
    const text = prefs.customTextColor || '#EDE7DD';
    const dark = isColorDark(bg);
    return {
      id: 'custom',
      label: 'Custom',
      bg,
      text,
      muted: dark ? 'rgba(255,255,255,0.62)' : 'rgba(0,0,0,0.62)',
      link: dark ? '#E0A34D' : '#8C5212',
      border: dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
      isDark: dark,
    };
  }
  return READER_THEMES[prefs.themeId] ?? READER_THEMES.dark;
}

export function resolveFontFamilyStack(
  fontId: string,
  customFonts: CustomFontRecord[]
): string {
  if (fontId.startsWith('custom:')) {
    const customId = fontId.slice('custom:'.length);
    const custom = customFonts.find((f) => f.id === customId);
    if (custom) {
      return `"${custom.familyName}", Georgia, serif`;
    }
  }
  const builtIn = BUILT_IN_READER_FONTS.find((f) => f.id === fontId);
  return builtIn ? builtIn.cssStack : BUILT_IN_READER_FONTS[1].cssStack;
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  if (typeof btoa === 'function') {
    return btoa(binary);
  }
  return Buffer.from(bytes).toString('base64');
}

export function inferFontMimeAndFormat(fileName: string): {
  mimeType: string;
  format: string;
} {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.woff2')) {
    return { mimeType: 'font/woff2', format: 'woff2' };
  }
  if (lower.endsWith('.woff')) {
    return { mimeType: 'font/woff', format: 'woff' };
  }
  if (lower.endsWith('.otf')) {
    return { mimeType: 'font/otf', format: 'opentype' };
  }
  return { mimeType: 'font/ttf', format: 'truetype' };
}

export function buildCustomFontFaceCss(customFonts: CustomFontRecord[]): string {
  if (customFonts.length === 0) return '';
  return customFonts
    .map((font) => {
      const { mimeType, format } = inferFontMimeAndFormat(font.fileName);
      const mime = font.mimeType || mimeType;
      const b64 = arrayBufferToBase64(font.data);
      return `
@font-face {
  font-family: "${font.familyName.replace(/"/g, '')}";
  src: url("data:${mime};base64,${b64}") format("${format}");
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}`;
    })
    .join('\n');
}

const GOOGLE_FONTS_STYLESHEET_URL =
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&family=DM+Sans:wght@400;500;600;700&family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,400&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,500;0,8..60,600;0,8..60,700;1,8..60,400&display=swap';

export function buildReaderIframeCss(
  prefs: ReaderPreferences,
  customFonts: CustomFontRecord[],
  mode: ReadingMode
): string {
  const theme = resolveReaderTheme(prefs);
  const fontStack = resolveFontFamilyStack(prefs.fontId, customFonts);
  const customFontFaces = buildCustomFontFaceCss(customFonts);

  const baseCss = `
@import url("${GOOGLE_FONTS_STYLESHEET_URL}");
${customFontFaces}

html {
  background-color: ${theme.bg} !important;
  color: ${theme.text} !important;
  -webkit-font-smoothing: antialiased;
}

body {
  background-color: ${theme.bg} !important;
  color: ${theme.text} !important;
  overflow-wrap: break-word;
  word-wrap: break-word;
  ${
    mode === 'scrolled'
      ? `
  max-width: ${prefs.maxWidthPx}px !important;
  margin-left: auto !important;
  margin-right: auto !important;
  padding: 28px ${Math.max(16, prefs.marginPx)}px 56px ${Math.max(16, prefs.marginPx)}px !important;
  `
      : `
  box-sizing: border-box !important;
  `
  }
}

img, svg, video, figure {
  max-width: 100% !important;
  height: auto !important;
}

a {
  color: ${theme.link} !important;
}

::selection {
  background: rgba(217, 155, 67, 0.34);
  color: inherit;
}
`;

  if (prefs.useOriginalStyling) {
    return `
${baseCss}
p, li, dd, dt, blockquote {
  color: inherit;
}
h1, h2, h3, h4, h5, h6 {
  color: inherit;
}
`;
  }

  return `
${baseCss}

body {
  font-family: ${fontStack} !important;
  font-size: ${prefs.fontSizePx}px !important;
  font-weight: ${prefs.fontWeight} !important;
  line-height: ${prefs.lineHeight} !important;
  letter-spacing: ${prefs.letterSpacingEm}em !important;
  text-align: ${prefs.textAlign} !important;
}

p, div, li, blockquote, dd, dt, span {
  font-family: ${fontStack} !important;
  line-height: ${prefs.lineHeight} !important;
  letter-spacing: ${prefs.letterSpacingEm}em !important;
}

p, blockquote, li {
  font-size: ${prefs.fontSizePx}px !important;
  font-weight: ${prefs.fontWeight} !important;
  text-align: ${prefs.textAlign} !important;
}

p {
  margin-top: ${(prefs.paragraphSpacingEm * 0.45).toFixed(2)}em !important;
  margin-bottom: ${prefs.paragraphSpacingEm.toFixed(2)}em !important;
}

h1, h2, h3, h4, h5, h6 {
  font-family: ${fontStack} !important;
  color: ${theme.text} !important;
  line-height: 1.28 !important;
}

code, pre, kbd, samp {
  font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace !important;
}
`;
}
