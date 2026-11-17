import type {
  CoverColorScheme,
  CoverDesignSpec,
  CoverFamilyId,
  CoverFontId,
  CoverLayoutId,
} from '../types/library';

export type CoverColourCategoryId = 'pastels' | 'bright' | 'neutrals';

export interface CoverPaletteDefinition extends CoverColorScheme {
  id: string;
  name: string;
  category: CoverColourCategoryId;
  isLight: boolean;
}

export const PASTEL_PALETTES: CoverPaletteDefinition[] = [
  {
    id: 'pastel-blue',
    name: 'Pastel Blue',
    category: 'pastels',
    paletteId: 'pastel-blue',
    backgroundColor: '#CFE3F5',
    artworkPrimaryColor: '#9AC0E3',
    artworkSecondaryColor: '#5B88B8',
    accentColor: '#9B6D32',
    textColor: '#132538',
    isLight: true,
  },
  {
    id: 'powder-blue',
    name: 'Powder Blue',
    category: 'pastels',
    paletteId: 'powder-blue',
    backgroundColor: '#D9E9F2',
    artworkPrimaryColor: '#A9CBDF',
    artworkSecondaryColor: '#6794B0',
    accentColor: '#365E7D',
    textColor: '#152736',
    isLight: true,
  },
  {
    id: 'lavender',
    name: 'Lavender',
    category: 'pastels',
    paletteId: 'lavender',
    backgroundColor: '#E1DAF5',
    artworkPrimaryColor: '#BAACE2',
    artworkSecondaryColor: '#7E6BB4',
    accentColor: '#8B5D2E',
    textColor: '#211836',
    isLight: true,
  },
  {
    id: 'lilac',
    name: 'Lilac',
    category: 'pastels',
    paletteId: 'lilac',
    backgroundColor: '#EBD9F0',
    artworkPrimaryColor: '#C9A5D6',
    artworkSecondaryColor: '#8F60A3',
    accentColor: '#5F3772',
    textColor: '#291732',
    isLight: true,
  },
  {
    id: 'pastel-pink',
    name: 'Pastel Pink',
    category: 'pastels',
    paletteId: 'pastel-pink',
    backgroundColor: '#F7DCE4',
    artworkPrimaryColor: '#E2A8BA',
    artworkSecondaryColor: '#B5637E',
    accentColor: '#8C435B',
    textColor: '#31141E',
    isLight: true,
  },
  {
    id: 'rose-pink',
    name: 'Rose Pink',
    category: 'pastels',
    paletteId: 'rose-pink',
    backgroundColor: '#F2CED9',
    artworkPrimaryColor: '#D993AA',
    artworkSecondaryColor: '#A64E6B',
    accentColor: '#782B45',
    textColor: '#2F121C',
    isLight: true,
  },
  {
    id: 'peach',
    name: 'Peach',
    category: 'pastels',
    paletteId: 'peach',
    backgroundColor: '#F9DFCD',
    artworkPrimaryColor: '#E4AE8E',
    artworkSecondaryColor: '#BA6E4A',
    accentColor: '#8E4926',
    textColor: '#331A0F',
    isLight: true,
  },
  {
    id: 'soft-coral',
    name: 'Soft Coral',
    category: 'pastels',
    paletteId: 'soft-coral',
    backgroundColor: '#F7CFC6',
    artworkPrimaryColor: '#E09788',
    artworkSecondaryColor: '#B85949',
    accentColor: '#873325',
    textColor: '#341410',
    isLight: true,
  },
  {
    id: 'butter-yellow',
    name: 'Butter Yellow',
    category: 'pastels',
    paletteId: 'butter-yellow',
    backgroundColor: '#F7EDC3',
    artworkPrimaryColor: '#DFC77C',
    artworkSecondaryColor: '#A88A38',
    accentColor: '#7A5B1A',
    textColor: '#2B220B',
    isLight: true,
  },
  {
    id: 'pale-mint',
    name: 'Pale Mint',
    category: 'pastels',
    paletteId: 'pale-mint',
    backgroundColor: '#D3EFE2',
    artworkPrimaryColor: '#98CEB6',
    artworkSecondaryColor: '#4E9478',
    accentColor: '#2A634D',
    textColor: '#122A20',
    isLight: true,
  },
  {
    id: 'sage-green',
    name: 'Sage Green',
    category: 'pastels',
    paletteId: 'sage-green',
    backgroundColor: '#D7E2D2',
    artworkPrimaryColor: '#A2B79A',
    artworkSecondaryColor: '#5D7A56',
    accentColor: '#3B5436',
    textColor: '#182416',
    isLight: true,
  },
  {
    id: 'soft-aqua',
    name: 'Soft Aqua',
    category: 'pastels',
    paletteId: 'soft-aqua',
    backgroundColor: '#CEECEF',
    artworkPrimaryColor: '#8EC8D0',
    artworkSecondaryColor: '#468D98',
    accentColor: '#245F69',
    textColor: '#10292D',
    isLight: true,
  },
];

export const BRIGHT_PALETTES: CoverPaletteDefinition[] = [
  {
    id: 'royal-blue',
    name: 'Royal Blue',
    category: 'bright',
    paletteId: 'royal-blue',
    backgroundColor: '#14326E',
    artworkPrimaryColor: '#2653AA',
    artworkSecondaryColor: '#4E7FD8',
    accentColor: '#E8C16F',
    textColor: '#F3F6FC',
    isLight: false,
  },
  {
    id: 'cobalt-blue',
    name: 'Cobalt Blue',
    category: 'bright',
    paletteId: 'cobalt-blue',
    backgroundColor: '#0E4299',
    artworkPrimaryColor: '#1E64CC',
    artworkSecondaryColor: '#5293EC',
    accentColor: '#F2C97D',
    textColor: '#F2F7FF',
    isLight: false,
  },
  {
    id: 'burgundy',
    name: 'Burgundy',
    category: 'bright',
    paletteId: 'burgundy',
    backgroundColor: '#4D1121',
    artworkPrimaryColor: '#7D1E37',
    artworkSecondaryColor: '#B3435E',
    accentColor: '#E6B87A',
    textColor: '#FAF0F2',
    isLight: false,
  },
  {
    id: 'crimson-red',
    name: 'Crimson Red',
    category: 'bright',
    paletteId: 'crimson-red',
    backgroundColor: '#7A121D',
    artworkPrimaryColor: '#A81F2E',
    artworkSecondaryColor: '#D64C59',
    accentColor: '#F5CB7C',
    textColor: '#FDF3F4',
    isLight: false,
  },
  {
    id: 'burnt-orange',
    name: 'Burnt Orange',
    category: 'bright',
    paletteId: 'burnt-orange',
    backgroundColor: '#8B3312',
    artworkPrimaryColor: '#B84B1E',
    artworkSecondaryColor: '#E0753C',
    accentColor: '#F7CA79',
    textColor: '#FDF4EC',
    isLight: false,
  },
  {
    id: 'terracotta',
    name: 'Terracotta',
    category: 'bright',
    paletteId: 'terracotta',
    backgroundColor: '#9C422B',
    artworkPrimaryColor: '#C25E42',
    artworkSecondaryColor: '#E38A6E',
    accentColor: '#F7D79E',
    textColor: '#FCF3EE',
    isLight: false,
  },
  {
    id: 'golden-yellow',
    name: 'Golden Yellow',
    category: 'bright',
    paletteId: 'golden-yellow',
    backgroundColor: '#DF9F20',
    artworkPrimaryColor: '#B87A0B',
    artworkSecondaryColor: '#7D4E06',
    accentColor: '#4A2B04',
    textColor: '#211402',
    isLight: true,
  },
  {
    id: 'emerald-green',
    name: 'Emerald Green',
    category: 'bright',
    paletteId: 'emerald-green',
    backgroundColor: '#0C4D37',
    artworkPrimaryColor: '#157554',
    artworkSecondaryColor: '#37A37C',
    accentColor: '#E8C574',
    textColor: '#EFF9F4',
    isLight: false,
  },
  {
    id: 'plum-purple',
    name: 'Plum Purple',
    category: 'bright',
    paletteId: 'plum-purple',
    backgroundColor: '#431854',
    artworkPrimaryColor: '#692982',
    artworkSecondaryColor: '#9B51B8',
    accentColor: '#E8BF7C',
    textColor: '#F8F0FB',
    isLight: false,
  },
  {
    id: 'magenta',
    name: 'Magenta',
    category: 'bright',
    paletteId: 'magenta',
    backgroundColor: '#8A145A',
    artworkPrimaryColor: '#B8237B',
    artworkSecondaryColor: '#DF55A5',
    accentColor: '#F9D186',
    textColor: '#FDF2F8',
    isLight: false,
  },
  {
    id: 'teal',
    name: 'Teal',
    category: 'bright',
    paletteId: 'teal',
    backgroundColor: '#0D4B54',
    artworkPrimaryColor: '#16727E',
    artworkSecondaryColor: '#39A0AC',
    accentColor: '#EAC275',
    textColor: '#EFF8F9',
    isLight: false,
  },
  {
    id: 'turquoise',
    name: 'Turquoise',
    category: 'bright',
    paletteId: 'turquoise',
    backgroundColor: '#117E82',
    artworkPrimaryColor: '#0B5A5E',
    artworkSecondaryColor: '#4CC3C7',
    accentColor: '#FCE09B',
    textColor: '#F2FCFC',
    isLight: false,
  },
];

export const NEUTRAL_PALETTES: CoverPaletteDefinition[] = [
  {
    id: 'warm-cream',
    name: 'Warm Cream',
    category: 'neutrals',
    paletteId: 'warm-cream',
    backgroundColor: '#F0E6D2',
    artworkPrimaryColor: '#D4C1A1',
    artworkSecondaryColor: '#9E8562',
    accentColor: '#7C4527',
    textColor: '#1F1811',
    isLight: true,
  },
  {
    id: 'ivory',
    name: 'Ivory',
    category: 'neutrals',
    paletteId: 'ivory',
    backgroundColor: '#F5F1E6',
    artworkPrimaryColor: '#D8D0BD',
    artworkSecondaryColor: '#9C927C',
    accentColor: '#665C47',
    textColor: '#1D1B17',
    isLight: true,
  },
  {
    id: 'champagne',
    name: 'Champagne',
    category: 'neutrals',
    paletteId: 'champagne',
    backgroundColor: '#EBDCC5',
    artworkPrimaryColor: '#CBB492',
    artworkSecondaryColor: '#947B58',
    accentColor: '#694F2E',
    textColor: '#231A10',
    isLight: true,
  },
  {
    id: 'warm-beige',
    name: 'Warm Beige',
    category: 'neutrals',
    paletteId: 'warm-beige',
    backgroundColor: '#DFCEB6',
    artworkPrimaryColor: '#BCA382',
    artworkSecondaryColor: '#846B4C',
    accentColor: '#5B4329',
    textColor: '#21180F',
    isLight: true,
  },
  {
    id: 'dusty-rose',
    name: 'Dusty Rose',
    category: 'neutrals',
    paletteId: 'dusty-rose',
    backgroundColor: '#D8B7BC',
    artworkPrimaryColor: '#B58991',
    artworkSecondaryColor: '#7D515A',
    accentColor: '#592E38',
    textColor: '#261418',
    isLight: true,
  },
  {
    id: 'taupe',
    name: 'Taupe',
    category: 'neutrals',
    paletteId: 'taupe',
    backgroundColor: '#6B5F57',
    artworkPrimaryColor: '#8C7E74',
    artworkSecondaryColor: '#B5A79D',
    accentColor: '#E6C68E',
    textColor: '#F7F3EE',
    isLight: false,
  },
  {
    id: 'charcoal',
    name: 'Charcoal',
    category: 'neutrals',
    paletteId: 'charcoal',
    backgroundColor: '#1E1E24',
    artworkPrimaryColor: '#363640',
    artworkSecondaryColor: '#6E6E7D',
    accentColor: '#D99B43',
    textColor: '#F2EDE4',
    isLight: false,
  },
  {
    id: 'monochrome',
    name: 'Monochrome',
    category: 'neutrals',
    paletteId: 'monochrome',
    backgroundColor: '#111114',
    artworkPrimaryColor: '#2B2B32',
    artworkSecondaryColor: '#6E6E7A',
    accentColor: '#D4D4DC',
    textColor: '#F3F3F5',
    isLight: false,
  },
];

const LEGACY_PALETTES: CoverPaletteDefinition[] = [
  {
    id: 'amber',
    name: 'Amber',
    category: 'bright',
    paletteId: 'amber',
    backgroundColor: '#17120A',
    artworkPrimaryColor: '#4A3314',
    artworkSecondaryColor: '#9E6B24',
    accentColor: '#D99B43',
    textColor: '#F5EDE0',
    isLight: false,
  },
  {
    id: 'navy-blue',
    name: 'Navy Blue',
    category: 'bright',
    paletteId: 'navy-blue',
    backgroundColor: '#0C1524',
    artworkPrimaryColor: '#1B3458',
    artworkSecondaryColor: '#3C6496',
    accentColor: '#D8B26E',
    textColor: '#F0F3F8',
    isLight: false,
  },
  {
    id: 'forest-green',
    name: 'Forest Green',
    category: 'bright',
    paletteId: 'forest-green',
    backgroundColor: '#0D1B15',
    artworkPrimaryColor: '#1E4535',
    artworkSecondaryColor: '#41765C',
    accentColor: '#C9A86A',
    textColor: '#EEF2EC',
    isLight: false,
  },
  {
    id: 'violet',
    name: 'Violet',
    category: 'bright',
    paletteId: 'violet',
    backgroundColor: '#161124',
    artworkPrimaryColor: '#38295E',
    artworkSecondaryColor: '#69519B',
    accentColor: '#D6A96E',
    textColor: '#F2EEF8',
    isLight: false,
  },
  {
    id: 'cream',
    name: 'Cream',
    category: 'neutrals',
    paletteId: 'cream',
    backgroundColor: '#EDE4D3',
    artworkPrimaryColor: '#C9B99F',
    artworkSecondaryColor: '#8F7B61',
    accentColor: '#8F4728',
    textColor: '#1E1A16',
    isLight: true,
  },
];

export interface CoverColourCategoryGroup {
  id: CoverColourCategoryId;
  label: string;
  palettes: CoverPaletteDefinition[];
}

export const COVER_COLOUR_CATEGORIES: CoverColourCategoryGroup[] = [
  { id: 'pastels', label: 'Pastels', palettes: PASTEL_PALETTES },
  { id: 'bright', label: 'Bright Colours', palettes: BRIGHT_PALETTES },
  { id: 'neutrals', label: 'Neutrals', palettes: NEUTRAL_PALETTES },
];

export const COVER_PALETTES: CoverPaletteDefinition[] = [
  ...PASTEL_PALETTES,
  ...BRIGHT_PALETTES,
  ...NEUTRAL_PALETTES,
];

const ALL_PALETTES_WITH_LEGACY: CoverPaletteDefinition[] = [
  ...COVER_PALETTES,
  ...LEGACY_PALETTES,
];

export interface CoverFontDefinition {
  id: CoverFontId;
  label: string;
  category: 'Serif' | 'Sans';
  cssFamily: string;
  canvasFamily: string;
}

export const COVER_FONTS: CoverFontDefinition[] = [
  {
    id: 'fraunces',
    label: 'Fraunces',
    category: 'Serif',
    cssFamily: '"Fraunces", Georgia, serif',
    canvasFamily: 'Fraunces, Georgia, serif',
  },
  {
    id: 'cormorant',
    label: 'Cormorant Garamond',
    category: 'Serif',
    cssFamily: '"Cormorant Garamond", Georgia, serif',
    canvasFamily: '"Cormorant Garamond", Georgia, serif',
  },
  {
    id: 'playfair',
    label: 'Playfair Display',
    category: 'Serif',
    cssFamily: '"Playfair Display", Georgia, serif',
    canvasFamily: '"Playfair Display", Georgia, serif',
  },
  {
    id: 'source-serif',
    label: 'Source Serif 4',
    category: 'Serif',
    cssFamily: '"Source Serif 4", Georgia, serif',
    canvasFamily: '"Source Serif 4", Georgia, serif',
  },
  {
    id: 'jakarta',
    label: 'Plus Jakarta Sans',
    category: 'Sans',
    cssFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
    canvasFamily: '"Plus Jakarta Sans", sans-serif',
  },
  {
    id: 'dm-sans',
    label: 'DM Sans',
    category: 'Sans',
    cssFamily: '"DM Sans", system-ui, sans-serif',
    canvasFamily: '"DM Sans", sans-serif',
  },
];

export interface CoverTemplateOption {
  id: string;
  name: string;
  description: string;
}

export interface CoverFamilyDefinition {
  id: CoverFamilyId;
  label: string;
  templates: CoverTemplateOption[];
}

export const COVER_FAMILIES: CoverFamilyDefinition[] = [
  {
    id: 'atmospheric',
    label: 'Atmospheric Landscapes',
    templates: [
      {
        id: 'atmospheric-ridges',
        name: 'Distant Ridges',
        description: 'Layered mountain silhouettes beneath mist and horizon orb',
      },
      {
        id: 'atmospheric-tide',
        name: 'Nocturnal Tide',
        description: 'Horizon sea bands and shimmering celestial reflection',
      },
      {
        id: 'atmospheric-aurora',
        name: 'Veiled Sky',
        description: 'Sweeping twilight ribbons over quiet plains',
      },
    ],
  },
  {
    id: 'botanical',
    label: 'Botanical Illustrations',
    templates: [
      {
        id: 'botanical-herbarium',
        name: 'Herbarium Specimen',
        description: 'Symmetrical botanical stem with delicate leaves',
      },
      {
        id: 'botanical-fern',
        name: 'Arching Frond',
        description: 'Graceful arching fern silhouette and seed spores',
      },
      {
        id: 'botanical-bloom',
        name: 'Night Blossom',
        description: 'Fine linework petals, stems, and buds',
      },
    ],
  },
  {
    id: 'architectural',
    label: 'Architectural Illustrations',
    templates: [
      {
        id: 'architectural-colonnade',
        name: 'Silent Arcade',
        description: 'Repeating vaulted arches and vanishing colonnade',
      },
      {
        id: 'architectural-observatory',
        name: 'Oculus Dome',
        description: 'Rotunda drafting geometry and angled light shaft',
      },
      {
        id: 'architectural-stairwell',
        name: 'Monolith Steps',
        description: 'Stepped geometric planes and sharp cast shadows',
      },
    ],
  },
  {
    id: 'abstract',
    label: 'Abstract Compositions',
    templates: [
      {
        id: 'abstract-orbits',
        name: 'Counterbalance',
        description: 'Intersecting arcs, circles, and poised geometry',
      },
      {
        id: 'abstract-monolith',
        name: 'Stepped Planes',
        description: 'Overlapping tonal blocks and diagonal tension',
      },
      {
        id: 'abstract-waves',
        name: 'Contour Harmonics',
        description: 'Flowing concentric resonance lines',
      },
    ],
  },
  {
    id: 'vintage',
    label: 'Vintage Literary',
    templates: [
      {
        id: 'vintage-folio',
        name: 'Engraved Folio',
        description: 'Double-rule archival frame and diamond cartouche',
      },
      {
        id: 'vintage-woodcut',
        name: 'Sunburst Plate',
        description: 'Radiating woodcut rays around an engraved compass disc',
      },
      {
        id: 'vintage-marbled',
        name: 'Marbled Endpaper',
        description: 'Combed archival marbling waves with border rule',
      },
    ],
  },
  {
    id: 'minimalist',
    label: 'Minimalist',
    templates: [
      {
        id: 'minimalist-horizon',
        name: 'Quiet Horizon',
        description: 'Single hairline rule, point of balance, and calm ground',
      },
      {
        id: 'minimalist-monogram',
        name: 'Corner Registration',
        description: 'Crisp printer crop marks and balanced focal square',
      },
      {
        id: 'minimalist-split-rule',
        name: 'Tonal Axis',
        description: 'Subtle dual-tone paper division and fine axis',
      },
    ],
  },
  {
    id: 'illustrated',
    label: 'Illustrated',
    templates: [
      {
        id: 'illustrated-maritime',
        name: 'Beacon Headland',
        description: 'Coastal cliff silhouette, beacon beam, and sea swells',
      },
      {
        id: 'illustrated-celestial',
        name: 'Celestial Orrery',
        description: 'Lunar phases, orbital rings, and charted stars',
      },
      {
        id: 'illustrated-lantern',
        name: 'Alcove Window',
        description: 'Arched study casement opening onto evening light',
      },
    ],
  },
  {
    id: 'ornamental',
    label: 'Ornamental',
    templates: [
      {
        id: 'ornamental-filigree',
        name: 'Corner Filigree',
        description: 'Curved botanical corner flourishes and central seal',
      },
      {
        id: 'ornamental-lattice',
        name: 'Tessellated Star',
        description: 'Interlocking geometric octagram latticework',
      },
      {
        id: 'ornamental-crest',
        name: 'Laurel Medallion',
        description: 'Fine guilloché rings framed by paired laurel boughs',
      },
    ],
  },
];

export interface CoverLayoutOption {
  id: CoverLayoutId;
  label: string;
  description: string;
}

export const COVER_LAYOUTS: CoverLayoutOption[] = [
  {
    id: 'full-bleed',
    label: 'Full-Cover Artwork',
    description: 'Edge-to-edge artwork with floating typography',
  },
  {
    id: 'artwork-band',
    label: 'Artwork + Typography Band',
    description: 'Dedicated title plate anchored below illustration',
  },
  {
    id: 'centered-literary',
    label: 'Centred Literary Plate',
    description: 'Classic framed central cartouche over artwork',
  },
  {
    id: 'minimalist-typo',
    label: 'Minimalist Text-Based',
    description: 'Editorial margins highlighting clean typography',
  },
  {
    id: 'framed-artwork',
    label: 'Framed Artwork',
    description: 'Inset artwork window with generous archival border',
  },
  {
    id: 'split-composition',
    label: 'Split Composition',
    description: 'Asymmetric pairing of typography panel and art',
  },
];

export function getFontDefinition(fontId: CoverFontId): CoverFontDefinition {
  return COVER_FONTS.find((f) => f.id === fontId) ?? COVER_FONTS[0];
}

export function getPaletteDefinition(
  paletteId: string
): CoverPaletteDefinition | undefined {
  return ALL_PALETTES_WITH_LEGACY.find((p) => p.id === paletteId);
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleaned = hex.replace('#', '').trim();
  const normalized =
    cleaned.length === 3
      ? cleaned
          .split('')
          .map((c) => c + c)
          .join('')
      : cleaned.padEnd(6, '0').slice(0, 6);
  const num = parseInt(normalized, 16);
  if (Number.isNaN(num)) {
    return { r: 24, g: 24, b: 31 };
  }
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return (
    '#' +
    [clamp(r), clamp(g), clamp(b)]
      .map((n) => n.toString(16).padStart(2, '0'))
      .join('')
  );
}

function rgbToHsl(
  r: number,
  g: number,
  b: number
): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      default:
        h = (rn - gn) / d + 4;
        break;
    }
    h /= 6;
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToHex(h: number, s: number, l: number): string {
  const hn = ((h % 360) + 360) % 360;
  const sn = Math.max(0, Math.min(100, s)) / 100;
  const ln = Math.max(0, Math.min(100, l)) / 100;

  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((hn / 60) % 2) - 1));
  const m = ln - c / 2;
  let r1 = 0;
  let g1 = 0;
  let b1 = 0;

  if (hn < 60) {
    r1 = c;
    g1 = x;
  } else if (hn < 120) {
    r1 = x;
    g1 = c;
  } else if (hn < 180) {
    g1 = c;
    b1 = x;
  } else if (hn < 240) {
    g1 = x;
    b1 = c;
  } else if (hn < 300) {
    r1 = x;
    b1 = c;
  } else {
    r1 = c;
    b1 = x;
  }

  return rgbToHex((r1 + m) * 255, (g1 + m) * 255, (b1 + m) * 255);
}

export function getRelativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const toLinear = (v: number) => {
    const srgb = v / 255;
    return srgb <= 0.03928
      ? srgb / 12.92
      : Math.pow((srgb + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

export function isLightHex(hex: string): boolean {
  return getRelativeLuminance(hex) > 0.36;
}

/**
 * Intelligently maps any user-selected custom background colour into a complete,
 * high-contrast 5-stop cover palette while preserving depth, decorative detail,
 * and readable typography.
 */
export function derivePaletteFromBackgroundHex(hex: string): CoverColorScheme {
  const { r, g, b } = hexToRgb(hex);
  const { h, s, l } = rgbToHsl(r, g, b);
  const light = isLightHex(hex);
  const isNeutral = s < 10;

  if (light) {
    const primary = hslToHex(
      h,
      isNeutral ? s : Math.min(85, s + 8),
      Math.max(22, l - 17)
    );
    const secondary = hslToHex(
      h,
      isNeutral ? s : Math.min(88, s + 12),
      Math.max(16, l - 33)
    );
    const accent = isNeutral
      ? hslToHex(32, 42, Math.max(24, l - 44))
      : hslToHex((h + 28) % 360, Math.min(72, Math.max(36, s)), Math.max(22, l - 45));
    const text = hslToHex(h, isNeutral ? 6 : 24, 12);

    return {
      paletteId: 'custom',
      backgroundColor: hex,
      artworkPrimaryColor: primary,
      artworkSecondaryColor: secondary,
      accentColor: accent,
      textColor: text,
    };
  }

  const primary = hslToHex(
    h,
    isNeutral ? s : Math.min(85, s + 4),
    Math.min(76, l + 16)
  );
  const secondary = hslToHex(
    h,
    isNeutral ? s : Math.min(88, s + 8),
    Math.min(82, l + 32)
  );
  const accent = isNeutral
    ? '#D99B43'
    : hslToHex(38, 72, 70);
  const text = hslToHex(h, isNeutral ? 4 : 18, 95);

  return {
    paletteId: 'custom',
    backgroundColor: hex,
    artworkPrimaryColor: primary,
    artworkSecondaryColor: secondary,
    accentColor: accent,
    textColor: text,
  };
}

export function extractColorScheme(spec: CoverDesignSpec): CoverColorScheme {
  return {
    paletteId: spec.paletteId,
    backgroundColor: spec.backgroundColor,
    artworkPrimaryColor: spec.artworkPrimaryColor,
    artworkSecondaryColor: spec.artworkSecondaryColor,
    accentColor: spec.accentColor,
    textColor: spec.textColor,
  };
}

export function applyColorSchemeToSpec(
  spec: CoverDesignSpec,
  scheme: CoverColorScheme
): CoverDesignSpec {
  return {
    ...spec,
    paletteId: scheme.paletteId,
    backgroundColor: scheme.backgroundColor,
    artworkPrimaryColor: scheme.artworkPrimaryColor,
    artworkSecondaryColor: scheme.artworkSecondaryColor,
    accentColor: scheme.accentColor,
    textColor: scheme.textColor,
  };
}

export function getOriginalColorScheme(spec: CoverDesignSpec): CoverColorScheme {
  if (spec.originalColors) {
    return { ...spec.originalColors };
  }
  const palette = getPaletteDefinition(spec.paletteId);
  if (palette) {
    return {
      paletteId: palette.id,
      backgroundColor: palette.backgroundColor,
      artworkPrimaryColor: palette.artworkPrimaryColor,
      artworkSecondaryColor: palette.artworkSecondaryColor,
      accentColor: palette.accentColor,
      textColor: palette.textColor,
    };
  }
  return extractColorScheme(spec);
}

export function hashSeedFromString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h >>> 0) || 1337;
}

export function createDefaultCoverSpec(params: {
  title: string;
  author?: string;
  subtitle?: string;
  imprint?: string;
}): CoverDesignSpec {
  const seed = hashSeedFromString(params.title || 'folio-volume');
  const paletteIndex = seed % COVER_PALETTES.length;
  const familyIndex = Math.floor(seed / 7) % COVER_FAMILIES.length;
  const family = COVER_FAMILIES[familyIndex];
  const templateIndex = Math.floor(seed / 13) % family.templates.length;
  const palette = COVER_PALETTES[paletteIndex];

  const defaultColors: CoverColorScheme = {
    paletteId: palette.id,
    backgroundColor: palette.backgroundColor,
    artworkPrimaryColor: palette.artworkPrimaryColor,
    artworkSecondaryColor: palette.artworkSecondaryColor,
    accentColor: palette.accentColor,
    textColor: palette.textColor,
  };

  return {
    mode: 'procedural',
    title: params.title.trim() || 'Untitled Volume',
    author: params.author?.trim() ?? '',
    subtitle: params.subtitle?.trim() ?? '',
    imprint: params.imprint?.trim() ?? '',
    family: family.id,
    templateId: family.templates[templateIndex].id,
    artSeed: (seed % 900000) + 1000,
    ...defaultColors,
    fontFamily: 'fraunces',
    titleSize: 44,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 0,
    titlePosition: 'top',
    authorPosition: 'bottom',
    layout: 'full-bleed',
    customImageFit: 'cover',
    customImageScale: 1,
    customImageOffsetX: 0,
    customImageOffsetY: 0,
    customImageShowTextOverlay: true,
    originalColors: defaultColors,
  };
}

/** Deterministic PRNG */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function f(num: number): string {
  return num.toFixed(2);
}

/**
 * Generates an original vector artwork SVG string (NO embedded text — typography is
 * rendered via DOM / Canvas 2D so Google Fonts always match pixel-for-pixel).
 */
export function generateCoverArtworkSvg(
  spec: CoverDesignSpec,
  width = 600,
  height = 900
): string {
  const rand = mulberry32(spec.artSeed || 4242);
  const bg = escapeXml(spec.backgroundColor);
  const p1 = escapeXml(spec.artworkPrimaryColor);
  const p2 = escapeXml(spec.artworkSecondaryColor);
  const acc = escapeXml(spec.accentColor);
  const uid = `g${Math.abs(spec.artSeed) % 100000}`;
  const lightGround = isLightHex(spec.backgroundColor);

  const defs: string[] = [
    `<linearGradient id="${uid}-bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${bg}" />
      <stop offset="100%" stop-color="${p1}" stop-opacity="${lightGround ? '0.26' : '0.45'}" />
    </linearGradient>`,
    `<radialGradient id="${uid}-glow" cx="50%" cy="38%" r="55%">
      <stop offset="0%" stop-color="${lightGround ? '#FFFFFF' : acc}" stop-opacity="${lightGround ? '0.32' : '0.34'}" />
      <stop offset="65%" stop-color="${p2}" stop-opacity="${lightGround ? '0.06' : '0.1'}" />
      <stop offset="100%" stop-color="${bg}" stop-opacity="0" />
    </radialGradient>`,
  ];

  const layers: string[] = [
    `<rect width="${width}" height="${height}" fill="${bg}" />`,
    `<rect width="${width}" height="${height}" fill="url(#${uid}-bg)" />`,
    `<rect width="${width}" height="${height}" fill="url(#${uid}-glow)" />`,
  ];

  const tid = spec.templateId;

  // ---------------- 1. ATMOSPHERIC ----------------
  if (tid === 'atmospheric-ridges') {
    const sunX = width * (0.28 + rand() * 0.44);
    const sunY = height * (0.24 + rand() * 0.14);
    const sunR = 38 + rand() * 26;
    layers.push(
      `<circle cx="${f(sunX)}" cy="${f(sunY)}" r="${f(sunR)}" fill="${acc}" opacity="0.82" />`,
      `<circle cx="${f(sunX)}" cy="${f(sunY)}" r="${f(sunR * 1.65)}" fill="${acc}" opacity="0.14" />`
    );
    for (let ridge = 0; ridge < 5; ridge++) {
      const baseY = height * (0.42 + ridge * 0.11);
      const amp = 45 + (4 - ridge) * 18 + rand() * 24;
      const phase = rand() * Math.PI * 2;
      const pts: string[] = [`0,${height}`, `0,${f(baseY)}`];
      const steps = 14;
      for (let s = 1; s <= steps; s++) {
        const x = (width / steps) * s;
        const y =
          baseY -
          Math.sin(s * 0.65 + phase) * amp * 0.6 -
          Math.cos(s * 1.25 + ridge) * amp * 0.35 +
          (rand() - 0.5) * 14;
        pts.push(`${f(x)},${f(y)}`);
      }
      pts.push(`${width},${height}`);
      const color = ridge % 2 === 0 ? p1 : p2;
      const opacity = (0.35 + ridge * 0.14).toFixed(2);
      layers.push(`<polygon points="${pts.join(' ')}" fill="${color}" opacity="${opacity}" />`);
    }
    // Mist bands
    for (let m = 0; m < 3; m++) {
      const my = height * (0.56 + m * 0.12 + rand() * 0.04);
      layers.push(
        `<ellipse cx="${f(width * (0.3 + rand() * 0.4))}" cy="${f(my)}" rx="${f(width * 0.6)}" ry="${f(16 + rand() * 14)}" fill="${acc}" opacity="0.08" />`
      );
    }
  } else if (tid === 'atmospheric-tide') {
    const horizonY = height * (0.44 + rand() * 0.08);
    const moonX = width * (0.3 + rand() * 0.4);
    const moonY = horizonY - (75 + rand() * 55);
    const moonR = 30 + rand() * 18;
    layers.push(
      `<circle cx="${f(moonX)}" cy="${f(moonY)}" r="${f(moonR)}" fill="${acc}" opacity="0.88" />`
    );
    // Shimmer reflection below horizon
    const bandCount = 18;
    for (let i = 0; i < bandCount; i++) {
      const t = i / bandCount;
      const y = horizonY + 18 + t * (height - horizonY - 40);
      const w = (1 - t * 0.55) * (90 + rand() * 90);
      const x = moonX - w / 2 + (rand() - 0.5) * 24;
      layers.push(
        `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(3 + rand() * 4)}" rx="2" fill="${acc}" opacity="${(0.45 - t * 0.32).toFixed(2)}" />`
      );
    }
    // Sea swell lines
    for (let w = 0; w < 6; w++) {
      const wy = horizonY + w * 68;
      const curve = 14 + rand() * 20;
      layers.push(
        `<path d="M 0 ${f(wy)} Q ${f(width * 0.33)} ${f(wy - curve)} ${f(width * 0.66)} ${f(wy + curve * 0.6)} T ${width} ${f(wy)}" fill="none" stroke="${p2}" stroke-width="2" opacity="0.42" />`
      );
    }
  } else if (tid === 'atmospheric-aurora') {
    // Stars
    for (let s = 0; s < 36; s++) {
      const sx = rand() * width;
      const sy = rand() * height * 0.62;
      const sr = 0.8 + rand() * 1.6;
      layers.push(
        `<circle cx="${f(sx)}" cy="${f(sy)}" r="${f(sr)}" fill="${acc}" opacity="${(0.25 + rand() * 0.55).toFixed(2)}" />`
      );
    }
    // Sweeping twilight ribbons
    for (let r = 0; r < 5; r++) {
      const y1 = height * (0.18 + r * 0.1 + rand() * 0.05);
      const y2 = y1 + (rand() - 0.4) * 180;
      const c1x = width * (0.25 + rand() * 0.25);
      const c1y = y1 - (60 + rand() * 90);
      const c2x = width * (0.55 + rand() * 0.25);
      const c2y = y2 + (50 + rand() * 80);
      const strokeW = 28 + rand() * 46;
      layers.push(
        `<path d="M -30 ${f(y1)} C ${f(c1x)} ${f(c1y)}, ${f(c2x)} ${f(c2y)}, ${width + 30} ${f(y2)}" fill="none" stroke="${r % 2 === 0 ? p2 : acc}" stroke-width="${f(strokeW)}" stroke-linecap="round" opacity="${(0.14 + rand() * 0.14).toFixed(2)}" />`
      );
    }
    layers.push(
      `<path d="M 0 ${f(height * 0.78)} Q ${f(width * 0.5)} ${f(height * 0.71)} ${width} ${f(height * 0.8)} L ${width} ${height} L 0 ${height} Z" fill="${p1}" opacity="0.85" />`
    );

  // ---------------- 2. BOTANICAL ----------------
  } else if (tid === 'botanical-herbarium') {
    const cx = width * (0.48 + (rand() - 0.5) * 0.08);
    const stemTop = height * 0.22;
    const stemBottom = height * 0.82;
    const curveShift = (rand() - 0.5) * 45;
    layers.push(
      `<path d="M ${f(cx)} ${f(stemBottom)} Q ${f(cx + curveShift)} ${f(height * 0.52)} ${f(cx - curveShift * 0.4)} ${f(stemTop)}" fill="none" stroke="${acc}" stroke-width="2.4" opacity="0.8" />`
    );
    const pairs = 6;
    for (let i = 0; i < pairs; i++) {
      const t = (i + 0.7) / (pairs + 0.6);
      const py = stemBottom - t * (stemBottom - stemTop);
      const px = cx + Math.sin(t * Math.PI) * curveShift * 0.5;
      const leafLen = (78 - t * 34) * (0.85 + rand() * 0.3);
      const angle = 28 + rand() * 18;
      for (const dir of [-1, 1]) {
        const tipX = px + dir * Math.cos((angle * Math.PI) / 180) * leafLen;
        const tipY = py - Math.sin((angle * Math.PI) / 180) * leafLen;
        const ctrlX = px + dir * leafLen * 0.48;
        const ctrlY = py - leafLen * 0.52;
        layers.push(
          `<path d="M ${f(px)} ${f(py)} Q ${f(ctrlX)} ${f(ctrlY)} ${f(tipX)} ${f(tipY)} Q ${f(px + dir * leafLen * 0.55)} ${f(py + 12)} ${f(px)} ${f(py)}" fill="${p2}" stroke="${acc}" stroke-width="1.2" opacity="0.68" />`
        );
      }
    }
    layers.push(
      `<circle cx="${f(cx - curveShift * 0.4)}" cy="${f(stemTop)}" r="8" fill="${acc}" opacity="0.85" />`
    );
  } else if (tid === 'botanical-fern') {
    const baseX = width * (0.28 + rand() * 0.16);
    const baseY = height * 0.84;
    const topX = width * (0.62 + rand() * 0.14);
    const topY = height * 0.22;
    const ctrlX = width * 0.36;
    const ctrlY = height * 0.34;
    layers.push(
      `<path d="M ${f(baseX)} ${f(baseY)} Q ${f(ctrlX)} ${f(ctrlY)} ${f(topX)} ${f(topY)}" fill="none" stroke="${acc}" stroke-width="2.5" opacity="0.82" />`
    );
    const segs = 14;
    for (let i = 1; i < segs; i++) {
      const t = i / segs;
      const omt = 1 - t;
      const sx = omt * omt * baseX + 2 * omt * t * ctrlX + t * t * topX;
      const sy = omt * omt * baseY + 2 * omt * t * ctrlY + t * t * topY;
      const len = (1 - t * 0.65) * (95 + rand() * 25);
      layers.push(
        `<ellipse cx="${f(sx - len * 0.42)}" cy="${f(sy - 14)}" rx="${f(len * 0.46)}" ry="${f(9 - t * 4)}" transform="rotate(${f(-24 + t * 14)} ${f(sx)} ${f(sy)})" fill="${p2}" opacity="0.65" />`,
        `<ellipse cx="${f(sx + len * 0.38)}" cy="${f(sy + 6)}" rx="${f(len * 0.42)}" ry="${f(8 - t * 3.5)}" transform="rotate(${f(18 - t * 12)} ${f(sx)} ${f(sy)})" fill="${p1}" stroke="${acc}" stroke-width="0.9" opacity="0.65" />`
      );
    }
  } else if (tid === 'botanical-bloom') {
    const cx = width * (0.5 + (rand() - 0.5) * 0.1);
    const cy = height * (0.44 + (rand() - 0.5) * 0.06);
    layers.push(
      `<path d="M ${f(cx)} ${f(height * 0.88)} Q ${f(cx + (rand() - 0.5) * 60)} ${f(height * 0.66)} ${f(cx)} ${f(cy)}" fill="none" stroke="${acc}" stroke-width="2" opacity="0.7" />`
    );
    const petals = 7 + Math.floor(rand() * 4);
    for (let i = 0; i < petals; i++) {
      const ang = (i / petals) * Math.PI * 2 + rand() * 0.15;
      const r = 68 + rand() * 24;
      const px = cx + Math.cos(ang) * r;
      const py = cy + Math.sin(ang) * r;
      layers.push(
        `<ellipse cx="${f((cx + px) / 2)}" cy="${f((cy + py) / 2)}" rx="${f(r * 0.55)}" ry="${f(22 + rand() * 8)}" transform="rotate(${f((ang * 180) / Math.PI)} ${f((cx + px) / 2)} ${f((cy + py) / 2)})" fill="${i % 2 === 0 ? p2 : p1}" stroke="${acc}" stroke-width="1.2" opacity="0.58" />`
      );
    }
    layers.push(
      `<circle cx="${f(cx)}" cy="${f(cy)}" r="16" fill="${acc}" opacity="0.88" />`,
      `<circle cx="${f(cx)}" cy="${f(cy)}" r="26" fill="none" stroke="${acc}" stroke-width="1" stroke-dasharray="3 4" opacity="0.7" />`
    );

  // ---------------- 3. ARCHITECTURAL ----------------
  } else if (tid === 'architectural-colonnade') {
    const arches = 4;
    const baseW = 280;
    const baseH = 440;
    const shiftX = (rand() - 0.5) * 28;
    for (let i = 0; i < arches; i++) {
      const scale = 1 - i * 0.17;
      const aw = baseW * scale;
      const ah = baseH * scale;
      const ax = (width - aw) / 2 + shiftX * (i * 0.35);
      const ay = (height - ah) / 2 + 25 + i * 16;
      const r = aw / 2;
      const fill = i % 2 === 0 ? p1 : p2;
      layers.push(
        `<path d="M ${f(ax)} ${f(ay + ah)} L ${f(ax)} ${f(ay + r)} A ${f(r)} ${f(r)} 0 0 1 ${f(ax + aw)} ${f(ay + r)} L ${f(ax + aw)} ${f(ay + ah)} Z" fill="${fill}" stroke="${acc}" stroke-width="1.4" opacity="${(0.35 + i * 0.14).toFixed(2)}" />`
      );
    }
    layers.push(
      `<line x1="${f(width * 0.12)}" y1="${f(height * 0.78)}" x2="${f(width * 0.88)}" y2="${f(height * 0.78)}" stroke="${acc}" stroke-width="1.4" opacity="0.6" />`
    );
  } else if (tid === 'architectural-observatory') {
    const cx = width * 0.5;
    const cy = height * 0.45;
    const radius = 155 + rand() * 20;
    layers.push(
      `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(radius)}" fill="${p1}" stroke="${acc}" stroke-width="1.5" opacity="0.52" />`,
      `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(radius * 0.74)}" fill="none" stroke="${p2}" stroke-width="1.2" opacity="0.65" />`,
      `<circle cx="${f(cx)}" cy="${f(cy - radius * 0.38)}" r="26" fill="${acc}" opacity="0.82" />`
    );
    // Light shaft
    const angle = (rand() - 0.5) * 60;
    layers.push(
      `<polygon points="${f(cx - 24)},${f(cy - radius * 0.38)} ${f(cx + 24)},${f(cy - radius * 0.38)} ${f(cx + 120 + angle)},${f(height * 0.82)} ${f(cx - 80 + angle)},${f(height * 0.82)}" fill="${acc}" opacity="0.14" />`,
      `<line x1="${f(cx)}" y1="60" x2="${f(cx)}" y2="${height - 60}" stroke="${acc}" stroke-width="1" stroke-dasharray="4 6" opacity="0.4" />`,
      `<line x1="60" y1="${f(cy)}" x2="${width - 60}" y2="${f(cy)}" stroke="${acc}" stroke-width="1" stroke-dasharray="4 6" opacity="0.4" />`
    );
  } else if (tid === 'architectural-stairwell') {
    const steps = 8 + Math.floor(rand() * 4);
    const startX = width * 0.16;
    const startY = height * 0.74;
    const stepW = (width * 0.68) / steps;
    const stepH = (height * 0.42) / steps;
    for (let i = 0; i < steps; i++) {
      const sx = startX + i * stepW;
      const sy = startY - i * stepH;
      layers.push(
        `<rect x="${f(sx)}" y="${f(sy)}" width="${f(width - sx - width * 0.14)}" height="${f(stepH + 2)}" fill="${i % 2 === 0 ? p1 : p2}" opacity="${(0.5 + (i / steps) * 0.38).toFixed(2)}" />`
      );
    }
    layers.push(
      `<rect x="${f(width * 0.54)}" y="${f(height * 0.22)}" width="${f(width * 0.18)}" height="${f(height * 0.28)}" fill="${acc}" opacity="0.24" />`
    );

  // ---------------- 4. ABSTRACT ----------------
  } else if (tid === 'abstract-orbits') {
    const cx = width * (0.45 + rand() * 0.1);
    const cy = height * (0.42 + rand() * 0.12);
    for (let i = 0; i < 4; i++) {
      const r = 70 + i * 52 + rand() * 14;
      const ox = cx + (rand() - 0.5) * 60;
      const oy = cy + (rand() - 0.5) * 60;
      layers.push(
        `<circle cx="${f(ox)}" cy="${f(oy)}" r="${f(r)}" fill="${i === 0 ? p2 : 'none'}" stroke="${i % 2 === 0 ? acc : p2}" stroke-width="${i === 1 ? 2.2 : 1.3}" opacity="${i === 0 ? '0.45' : '0.68'}" />`
      );
    }
    layers.push(
      `<circle cx="${f(cx + (rand() - 0.5) * 90)}" cy="${f(cy - 65)}" r="24" fill="${acc}" opacity="0.88" />`,
      `<line x1="70" y1="${f(cy + 145)}" x2="${width - 70}" y2="${f(cy - 145)}" stroke="${acc}" stroke-width="1.4" opacity="0.5" />`
    );
  } else if (tid === 'abstract-monolith') {
    for (let i = 0; i < 4; i++) {
      const bw = 130 + rand() * 170;
      const bh = 220 + rand() * 280;
      const bx = width * (0.14 + i * 0.13 + (rand() - 0.5) * 0.06);
      const by = height * (0.18 + rand() * 0.24);
      const fill = i === 3 ? acc : i % 2 === 0 ? p1 : p2;
      layers.push(
        `<rect x="${f(bx)}" y="${f(by)}" width="${f(bw)}" height="${f(bh)}" rx="3" fill="${fill}" opacity="${i === 3 ? '0.32' : '0.64'}" />`
      );
    }
    layers.push(
      `<path d="M 0 ${f(height * (0.62 + rand() * 0.12))} L ${width} ${f(height * (0.38 + rand() * 0.12))} L ${width} ${height} L 0 ${height} Z" fill="${p1}" opacity="0.38" />`
    );
  } else if (tid === 'abstract-waves') {
    const lines = 16;
    const freq = 0.012 + rand() * 0.008;
    const phase = rand() * Math.PI * 2;
    for (let i = 0; i < lines; i++) {
      const yBase = height * 0.18 + (i / lines) * (height * 0.68);
      let d = `M 0 ${f(yBase)}`;
      for (let x = 20; x <= width; x += 20) {
        const dy = Math.sin(x * freq + i * 0.45 + phase) * (24 + (i % 3) * 8);
        d += ` L ${x} ${f(yBase + dy)}`;
      }
      layers.push(
        `<path d="${d}" fill="none" stroke="${i % 4 === 0 ? acc : p2}" stroke-width="${i % 4 === 0 ? 1.8 : 1.1}" opacity="${(0.35 + (i / lines) * 0.45).toFixed(2)}" />`
      );
    }

  // ---------------- 5. VINTAGE LITERARY ----------------
  } else if (tid === 'vintage-folio') {
    const pad1 = 34;
    const pad2 = 44;
    layers.push(
      `<rect x="${pad1}" y="${pad1}" width="${width - pad1 * 2}" height="${height - pad1 * 2}" fill="none" stroke="${acc}" stroke-width="1.8" opacity="0.72" />`,
      `<rect x="${pad2}" y="${pad2}" width="${width - pad2 * 2}" height="${height - pad2 * 2}" fill="none" stroke="${p2}" stroke-width="1" opacity="0.65" />`
    );
    // Corner rosettes
    const corners = [
      [pad2, pad2],
      [width - pad2, pad2],
      [pad2, height - pad2],
      [width - pad2, height - pad2],
    ];
    for (const [cx, cy] of corners) {
      layers.push(
        `<circle cx="${cx}" cy="${cy}" r="9" fill="${bg}" stroke="${acc}" stroke-width="1.4" />`,
        `<circle cx="${cx}" cy="${cy}" r="3" fill="${acc}" />`
      );
    }
    const midY = height * 0.5;
    const dSize = 58 + rand() * 14;
    layers.push(
      `<polygon points="${width / 2},${f(midY - dSize)} ${f(width / 2 + dSize)},${midY} ${width / 2},${f(midY + dSize)} ${f(width / 2 - dSize)},${midY}" fill="${p1}" stroke="${acc}" stroke-width="1.4" opacity="0.65" />`
    );
  } else if (tid === 'vintage-woodcut') {
    const cx = width / 2;
    const cy = height * (0.46 + (rand() - 0.5) * 0.06);
    const rays = 24;
    for (let i = 0; i < rays; i++) {
      const ang = (i / rays) * Math.PI * 2;
      const len = i % 2 === 0 ? 250 : 185;
      const x2 = cx + Math.cos(ang) * len;
      const y2 = cy + Math.sin(ang) * len;
      layers.push(
        `<line x1="${cx}" y1="${f(cy)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${i % 2 === 0 ? acc : p2}" stroke-width="${i % 2 === 0 ? 1.5 : 0.9}" opacity="0.52" />`
      );
    }
    layers.push(
      `<circle cx="${cx}" cy="${f(cy)}" r="62" fill="${p1}" stroke="${acc}" stroke-width="2" />`,
      `<circle cx="${cx}" cy="${f(cy)}" r="44" fill="none" stroke="${acc}" stroke-width="1" stroke-dasharray="3 3" />`,
      `<rect x="28" y="28" width="${width - 56}" height="${height - 56}" fill="none" stroke="${acc}" stroke-width="1.4" opacity="0.55" />`
    );
  } else if (tid === 'vintage-marbled') {
    const stripes = 18;
    const shift = rand() * 80;
    for (let i = 0; i < stripes; i++) {
      const y0 = (i / stripes) * height;
      const amp = 28 + rand() * 24;
      let d = `M -20 ${f(y0)}`;
      for (let x = 0; x <= width + 20; x += 30) {
        const y = y0 + Math.sin(x * 0.025 + i * 0.7 + shift) * amp;
        d += ` L ${x} ${f(y)}`;
      }
      d += ` L ${width + 20} ${f(y0 + 36)} L -20 ${f(y0 + 36)} Z`;
      layers.push(
        `<path d="${d}" fill="${i % 3 === 0 ? p2 : p1}" opacity="${i % 5 === 0 ? '0.32' : '0.45'}" />`
      );
    }
    layers.push(
      `<rect x="30" y="30" width="${width - 60}" height="${height - 60}" fill="none" stroke="${acc}" stroke-width="1.5" opacity="0.6" />`
    );

  // ---------------- 6. MINIMALIST ----------------
  } else if (tid === 'minimalist-horizon') {
    const lineY = height * (0.48 + (rand() - 0.5) * 0.08);
    layers.push(
      `<line x1="64" y1="${f(lineY)}" x2="${width - 64}" y2="${f(lineY)}" stroke="${acc}" stroke-width="1.6" opacity="0.82" />`,
      `<circle cx="${f(width * (0.4 + rand() * 0.2))}" cy="${f(lineY - 22)}" r="6" fill="${acc}" opacity="0.9" />`
    );
  } else if (tid === 'minimalist-monogram') {
    const m = 42;
    const len = 34;
    const corners = [
      `M ${m} ${m + len} V ${m} H ${m + len}`,
      `M ${width - m - len} ${m} H ${width - m} V ${m + len}`,
      `M ${m} ${height - m - len} V ${height - m} H ${m + len}`,
      `M ${width - m - len} ${height - m} H ${width - m} V ${height - m - len}`,
    ];
    for (const c of corners) {
      layers.push(
        `<path d="${c}" fill="none" stroke="${acc}" stroke-width="1.8" opacity="0.72" />`
      );
    }
    layers.push(
      `<rect x="${f(width * 0.32)}" y="${f(height * 0.37)}" width="${f(width * 0.36)}" height="${f(width * 0.36)}" fill="${p1}" stroke="${p2}" stroke-width="1.2" opacity="0.55" />`
    );
  } else if (tid === 'minimalist-split-rule') {
    const splitX = width * (0.34 + rand() * 0.14);
    layers.push(
      `<rect x="0" y="0" width="${f(splitX)}" height="${height}" fill="${p1}" opacity="0.45" />`,
      `<line x1="${f(splitX)}" y1="48" x2="${f(splitX)}" y2="${height - 48}" stroke="${acc}" stroke-width="1.5" opacity="0.8" />`
    );

  // ---------------- 7. ILLUSTRATED ----------------
  } else if (tid === 'illustrated-maritime') {
    const cliffX = width * (0.28 + rand() * 0.08);
    const cliffY = height * 0.56;
    // Beacon rays
    layers.push(
      `<polygon points="${f(cliffX + 20)},${f(cliffY - 128)} ${width},${f(cliffY - 260)} ${width},${f(cliffY - 40)}" fill="${acc}" opacity="0.18" />`,
      `<polygon points="${f(cliffX + 20)},${f(cliffY - 128)} 0,${f(cliffY - 210)} 0,${f(cliffY - 80)}" fill="${acc}" opacity="0.09" />`,
      // Tower
      `<polygon points="${f(cliffX + 6)},${f(cliffY)} ${f(cliffX + 34)},${f(cliffY)} ${f(cliffX + 28)},${f(cliffY - 120)} ${f(cliffX + 12)},${f(cliffY - 120)}" fill="${p2}" />`,
      `<circle cx="${f(cliffX + 20)}" cy="${f(cliffY - 128)}" r="10" fill="${acc}" />`,
      // Headland cliff
      `<path d="M 0 ${f(cliffY + 35)} L ${f(cliffX - 24)} ${f(cliffY + 8)} L ${f(cliffX + 58)} ${f(cliffY)} L ${f(cliffX + 115)} ${f(height * 0.72)} L 0 ${f(height * 0.72)} Z" fill="${p1}" />`
    );
    // Waves
    for (let w = 0; w < 5; w++) {
      const wy = height * (0.71 + w * 0.055);
      layers.push(
        `<path d="M 0 ${f(wy)} Q ${f(width * 0.25)} ${f(wy - 12)} ${f(width * 0.5)} ${f(wy)} T ${width} ${f(wy)}" fill="none" stroke="${p2}" stroke-width="2" opacity="0.55" />`
      );
    }
  } else if (tid === 'illustrated-celestial') {
    const cx = width / 2;
    const cy = height * 0.48;
    for (let s = 0; s < 42; s++) {
      layers.push(
        `<circle cx="${f(rand() * width)}" cy="${f(rand() * height)}" r="${f(0.8 + rand() * 1.5)}" fill="${acc}" opacity="${(0.2 + rand() * 0.6).toFixed(2)}" />`
      );
    }
    for (let r = 1; r <= 4; r++) {
      const rad = 52 * r;
      layers.push(
        `<circle cx="${cx}" cy="${f(cy)}" r="${rad}" fill="none" stroke="${r === 3 ? acc : p2}" stroke-width="${r === 3 ? 1.6 : 1}" opacity="0.62" />`
      );
      const ang = rand() * Math.PI * 2;
      layers.push(
        `<circle cx="${f(cx + Math.cos(ang) * rad)}" cy="${f(cy + Math.sin(ang) * rad)}" r="${f(4 + r * 1.8)}" fill="${r % 2 === 0 ? acc : p2}" />`
      );
    }
    // Central crescent
    layers.push(
      `<circle cx="${cx}" cy="${f(cy)}" r="28" fill="${acc}" opacity="0.9" />`,
      `<circle cx="${cx + 11}" cy="${f(cy - 6)}" r="24" fill="${bg}" />`
    );
  } else if (tid === 'illustrated-lantern') {
    const winW = 220;
    const winH = 380;
    const wx = (width - winW) / 2;
    const wy = height * 0.27;
    const r = winW / 2;
    defs.push(
      `<radialGradient id="${uid}-lamp" cx="50%" cy="45%" r="50%">
        <stop offset="0%" stop-color="${acc}" stop-opacity="0.72" />
        <stop offset="100%" stop-color="${p1}" stop-opacity="0.1" />
      </radialGradient>`
    );
    layers.push(
      `<path d="M ${wx} ${wy + winH} L ${wx} ${wy + r} A ${r} ${r} 0 0 1 ${wx + winW} ${wy + r} L ${wx + winW} ${wy + winH} Z" fill="url(#${uid}-lamp)" stroke="${acc}" stroke-width="2" />`,
      `<line x1="${width / 2}" y1="${wy}" x2="${width / 2}" y2="${wy + winH}" stroke="${bg}" stroke-width="3" opacity="0.7" />`,
      `<line x1="${wx}" y1="${wy + winH * 0.55}" x2="${wx + winW}" y2="${wy + winH * 0.55}" stroke="${bg}" stroke-width="3" opacity="0.7" />`
    );

  // ---------------- 8. ORNAMENTAL ----------------
  } else if (tid === 'ornamental-filigree') {
    const pad = 38;
    layers.push(
      `<rect x="${pad}" y="${pad}" width="${width - pad * 2}" height="${height - pad * 2}" fill="none" stroke="${acc}" stroke-width="1.5" opacity="0.68" />`
    );
    const corners = [
      [pad, pad, 1, 1],
      [width - pad, pad, -1, 1],
      [pad, height - pad, 1, -1],
      [width - pad, height - pad, -1, -1],
    ];
    for (const [cx, cy, dx, dy] of corners) {
      layers.push(
        `<path d="M ${cx} ${cy + dy * 74} C ${cx} ${cy + dy * 18}, ${cx + dx * 18} ${cy}, ${cx + dx * 74} ${cy}" fill="none" stroke="${acc}" stroke-width="2" opacity="0.85" />`,
        `<circle cx="${cx + dx * 22}" cy="${cy + dy * 22}" r="12" fill="none" stroke="${p2}" stroke-width="1.3" opacity="0.75" />`,
        `<circle cx="${cx + dx * 22}" cy="${cy + dy * 22}" r="4" fill="${acc}" />`
      );
    }
    const midY = height * 0.5;
    layers.push(
      `<circle cx="${width / 2}" cy="${midY}" r="76" fill="none" stroke="${acc}" stroke-width="1.4" opacity="0.55" />`,
      `<circle cx="${width / 2}" cy="${midY}" r="54" fill="none" stroke="${p2}" stroke-width="1.2" stroke-dasharray="4 4" opacity="0.65" />`
    );
  } else if (tid === 'ornamental-lattice') {
    const step = 96;
    const offset = (rand() - 0.5) * 24;
    for (let y = 80; y < height - 60; y += step) {
      for (let x = 70; x < width - 50; x += step) {
        const cx = x + offset;
        const cy = y;
        layers.push(
          `<rect x="${f(cx - 26)}" y="${f(cy - 26)}" width="52" height="52" fill="none" stroke="${p2}" stroke-width="1.1" opacity="0.5" />`,
          `<rect x="${f(cx - 26)}" y="${f(cy - 26)}" width="52" height="52" transform="rotate(45 ${f(cx)} ${f(cy)})" fill="none" stroke="${acc}" stroke-width="1.1" opacity="0.45" />`,
          `<circle cx="${f(cx)}" cy="${f(cy)}" r="4" fill="${acc}" opacity="0.55" />`
        );
      }
    }
  } else if (tid === 'ornamental-crest') {
    const cx = width / 2;
    const cy = height * 0.48;
    for (let i = 0; i < 12; i++) {
      const ang = -Math.PI * 0.35 + (i / 11) * Math.PI * 0.7;
      for (const dir of [-1, 1]) {
        const rx = cx + dir * Math.cos(ang) * 126;
        const ry = cy + Math.sin(ang) * 140;
        layers.push(
          `<ellipse cx="${f(rx)}" cy="${f(ry)}" rx="15" ry="6" transform="rotate(${f(dir * ((ang * 180) / Math.PI + 32))} ${f(rx)} ${f(ry)})" fill="${p2}" stroke="${acc}" stroke-width="1" opacity="0.72" />`
        );
      }
    }
    layers.push(
      `<circle cx="${cx}" cy="${cy}" r="94" fill="none" stroke="${acc}" stroke-width="1.6" opacity="0.75" />`,
      `<circle cx="${cx}" cy="${cy}" r="82" fill="none" stroke="${p2}" stroke-width="1" opacity="0.6" />`
    );
  }

  // Subtle paper/linen archival edge vignette
  layers.push(
    `<rect x="0" y="0" width="14" height="${height}" fill="#000000" opacity="${lightGround ? '0.07' : '0.16'}" />`
  );

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"><defs>${defs.join('')}</defs>${layers.join('')}</svg>`;
}
