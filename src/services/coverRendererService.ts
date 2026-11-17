import {
  generateCoverArtworkSvg,
  getFontDefinition,
  hexToRgb,
  isLightHex,
} from './coverArtGenerator';
import type { CoverDesignSpec, CoverTextAlign } from '../types/library';

export const COVER_CANVAS_WIDTH = 600;
export const COVER_CANVAS_HEIGHT = 900;

export interface WrappedTextBlock {
  lines: string[];
  fontSize: number;
  lineHeight: number;
  totalHeight: number;
}

export interface ComputedCoverGeometry {
  artRect: { x: number; y: number; w: number; h: number } | null;
  artOpacity: number;
  plateRect: { x: number; y: number; w: number; h: number; borderColor?: string } | null;
  dividerLine: { x1: number; y1: number; x2: number; y2: number; color: string } | null;
  textZone: { x: number; y: number; w: number; h: number };
  authorTopZone: { x: number; y: number; w: number; h: number } | null;
  imprintY: number;
  showTopScrim: boolean;
  showBottomScrim: boolean;
}

export function getLayoutGeometry(spec: CoverDesignSpec): ComputedCoverGeometry {
  const W = COVER_CANVAS_WIDTH;
  const H = COVER_CANVAS_HEIGHT;

  switch (spec.layout) {
    case 'artwork-band':
      return {
        artRect: { x: 0, y: 0, w: W, h: 565 },
        artOpacity: 1,
        plateRect: { x: 0, y: 565, w: W, h: H - 565 },
        dividerLine: { x1: 0, y1: 565, x2: W, y2: 565, color: spec.accentColor },
        textZone: { x: 48, y: 590, w: W - 96, h: 240 },
        authorTopZone: null,
        imprintY: 856,
        showTopScrim: false,
        showBottomScrim: false,
      };

    case 'centered-literary':
      return {
        artRect: { x: 0, y: 0, w: W, h: H },
        artOpacity: 1,
        plateRect: {
          x: 70,
          y: 155,
          w: W - 140,
          h: 590,
          borderColor: spec.accentColor,
        },
        dividerLine: null,
        textZone: { x: 102, y: 192, w: W - 204, h: 480 },
        authorTopZone: null,
        imprintY: 705,
        showTopScrim: false,
        showBottomScrim: false,
      };

    case 'minimalist-typo':
      return {
        artRect: { x: 0, y: 0, w: W, h: H },
        artOpacity: 0.24,
        plateRect: null,
        dividerLine: null,
        textZone: { x: 56, y: 92, w: W - 112, h: 700 },
        authorTopZone: null,
        imprintY: 842,
        showTopScrim: false,
        showBottomScrim: false,
      };

    case 'framed-artwork':
      return {
        artRect: { x: 64, y: 256, w: W - 128, h: 416 },
        artOpacity: 1,
        plateRect: null,
        dividerLine: null,
        textZone: { x: 64, y: 56, w: W - 128, h: 176 },
        authorTopZone: { x: 64, y: 702, w: W - 128, h: 100 },
        imprintY: 846,
        showTopScrim: false,
        showBottomScrim: false,
      };

    case 'split-composition':
      return {
        artRect: { x: 0, y: 390, w: W, h: H - 390 },
        artOpacity: 1,
        plateRect: { x: 0, y: 0, w: W, h: 390 },
        dividerLine: { x1: 0, y1: 390, x2: W, y2: 390, color: spec.accentColor },
        textZone: { x: 52, y: 48, w: W - 104, h: 312 },
        authorTopZone: { x: 52, y: 810, w: W - 104, h: 34 },
        imprintY: 856,
        showTopScrim: false,
        showBottomScrim: false,
      };

    case 'full-bleed':
    default:
      return {
        artRect: { x: 0, y: 0, w: W, h: H },
        artOpacity: 1,
        plateRect: null,
        dividerLine: null,
        textZone: { x: 52, y: 66, w: W - 104, h: 730 },
        authorTopZone: null,
        imprintY: 852,
        showTopScrim: true,
        showBottomScrim: true,
      };
  }
}

function measureLineWidth(
  ctx: CanvasRenderingContext2D | null,
  text: string,
  fontSize: number,
  letterSpacingPx: number
): number {
  if (!ctx) {
    return text.length * fontSize * 0.56 + Math.max(0, text.length - 1) * letterSpacingPx;
  }
  const base = ctx.measureText(text).width;
  return base + Math.max(0, text.length - 1) * letterSpacingPx;
}

function breakLongWord(
  ctx: CanvasRenderingContext2D | null,
  word: string,
  maxWidth: number,
  fontSize: number,
  letterSpacingPx: number
): string[] {
  const parts: string[] = [];
  let current = '';
  for (const ch of word) {
    const candidate = current + ch;
    if (
      current.length > 0 &&
      measureLineWidth(ctx, candidate, fontSize, letterSpacingPx) > maxWidth
    ) {
      parts.push(current);
      current = ch;
    } else {
      current = candidate;
    }
  }
  if (current) parts.push(current);
  return parts;
}

export function wrapTextToWidth(
  ctx: CanvasRenderingContext2D | null,
  text: string,
  maxWidth: number,
  fontSize: number,
  letterSpacingPx: number
): string[] {
  const cleaned = text.trim();
  if (!cleaned) return [];

  const paragraphs = cleaned.split(/\r?\n/);
  const lines: string[] = [];

  for (const para of paragraphs) {
    const words = para.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) continue;

    let currentLine = '';
    for (const word of words) {
      if (measureLineWidth(ctx, word, fontSize, letterSpacingPx) > maxWidth) {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = '';
        }
        const splitParts = breakLongWord(
          ctx,
          word,
          maxWidth,
          fontSize,
          letterSpacingPx
        );
        for (let i = 0; i < splitParts.length - 1; i++) {
          lines.push(splitParts[i]);
        }
        currentLine = splitParts[splitParts.length - 1] ?? '';
        continue;
      }

      const candidate = currentLine ? `${currentLine} ${word}` : word;
      if (
        currentLine &&
        measureLineWidth(ctx, candidate, fontSize, letterSpacingPx) > maxWidth
      ) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = candidate;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }
  }

  return lines;
}

/**
 * Automatically shrinks font size if needed so multi-word or very long titles
 * never clip or exceed vertical zone constraints.
 */
export function fitTextBlock(
  ctx: CanvasRenderingContext2D | null,
  text: string,
  fontCss: string,
  fontWeight: string,
  desiredFontSize: number,
  minFontSize: number,
  maxWidth: number,
  maxHeight: number,
  letterSpacingPx: number,
  lineHeightMultiplier = 1.16
): WrappedTextBlock {
  const cleaned = text.trim();
  if (!cleaned) {
    return {
      lines: [],
      fontSize: desiredFontSize,
      lineHeight: desiredFontSize * lineHeightMultiplier,
      totalHeight: 0,
    };
  }

  let size = desiredFontSize;
  while (size >= minFontSize) {
    if (ctx) {
      ctx.font = `${fontWeight} ${size}px ${fontCss}`;
    }
    const lines = wrapTextToWidth(ctx, cleaned, maxWidth, size, letterSpacingPx);
    const lineHeight = size * lineHeightMultiplier;
    const totalHeight = lines.length * lineHeight;
    if (totalHeight <= maxHeight) {
      return { lines, fontSize: size, lineHeight, totalHeight };
    }
    size -= 2;
  }

  if (ctx) {
    ctx.font = `${fontWeight} ${minFontSize}px ${fontCss}`;
  }
  const lines = wrapTextToWidth(
    ctx,
    cleaned,
    maxWidth,
    minFontSize,
    letterSpacingPx
  );
  const lineHeight = minFontSize * lineHeightMultiplier;
  return {
    lines,
    fontSize: minFontSize,
    lineHeight,
    totalHeight: lines.length * lineHeight,
  };
}

function drawAlignedLine(
  ctx: CanvasRenderingContext2D,
  line: string,
  zoneX: number,
  zoneWidth: number,
  y: number,
  align: CoverTextAlign,
  letterSpacingPx: number
): void {
  if (Math.abs(letterSpacingPx) < 0.05) {
    ctx.textAlign = align;
    const x =
      align === 'left'
        ? zoneX
        : align === 'right'
          ? zoneX + zoneWidth
          : zoneX + zoneWidth / 2;
    ctx.fillText(line, x, y);
    return;
  }

  const chars = Array.from(line);
  const totalWidth =
    chars.reduce((acc, ch) => acc + ctx.measureText(ch).width, 0) +
    Math.max(0, chars.length - 1) * letterSpacingPx;

  let startX = zoneX;
  if (align === 'center') {
    startX = zoneX + (zoneWidth - totalWidth) / 2;
  } else if (align === 'right') {
    startX = zoneX + zoneWidth - totalWidth;
  }

  ctx.textAlign = 'left';
  let cursorX = startX;
  for (const ch of chars) {
    ctx.fillText(ch, cursorX, y);
    cursorX += ctx.measureText(ch).width + letterSpacingPx;
  }
}

function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to decode cover image.'));
    };
    img.src = url;
  });
}

function drawImageInsideRect(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  rect: { x: number; y: number; w: number; h: number },
  fit: 'cover' | 'contain',
  scale: number,
  offsetXPercent: number,
  offsetYPercent: number
): void {
  const imgRatio = img.naturalWidth / Math.max(1, img.naturalHeight);
  const rectRatio = rect.w / Math.max(1, rect.h);

  let baseW: number;
  let baseH: number;
  if (fit === 'cover') {
    if (imgRatio > rectRatio) {
      baseH = rect.h;
      baseW = rect.h * imgRatio;
    } else {
      baseW = rect.w;
      baseH = rect.w / imgRatio;
    }
  } else {
    if (imgRatio > rectRatio) {
      baseW = rect.w;
      baseH = rect.w / imgRatio;
    } else {
      baseH = rect.h;
      baseW = rect.h * imgRatio;
    }
  }

  const drawW = baseW * scale;
  const drawH = baseH * scale;
  const dx =
    rect.x + (rect.w - drawW) / 2 + (offsetXPercent / 100) * rect.w;
  const dy =
    rect.y + (rect.h - drawH) / 2 + (offsetYPercent / 100) * rect.h;

  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.drawImage(img, dx, dy, drawW, drawH);
  ctx.restore();
}

export async function renderCoverToImageBuffer(
  spec: CoverDesignSpec,
  customImageData: ArrayBuffer | null,
  customImageMimeType: string | null
): Promise<{ data: ArrayBuffer; mimeType: string }> {
  if (typeof document === 'undefined') {
    throw new Error('Canvas rendering requires a browser environment.');
  }

  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // Proceed cleanly with system fallback if font readiness rejects
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = COVER_CANVAS_WIDTH;
  canvas.height = COVER_CANVAS_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not initialize 2D canvas context.');
  }

  const geom = getLayoutGeometry(spec);

  // 1. Base cover background
  ctx.fillStyle = spec.backgroundColor;
  ctx.fillRect(0, 0, COVER_CANVAS_WIDTH, COVER_CANVAS_HEIGHT);

  // 2. Artwork layer (Custom uploaded image or procedural vector SVG)
  if (geom.artRect) {
    if (spec.mode === 'custom-image' && customImageData && customImageMimeType) {
      const img = await loadImageFromBlob(
        new Blob([customImageData], { type: customImageMimeType })
      );
      ctx.save();
      ctx.globalAlpha = geom.artOpacity;
      drawImageInsideRect(
        ctx,
        img,
        geom.artRect,
        spec.customImageFit,
        spec.customImageScale,
        spec.customImageOffsetX,
        spec.customImageOffsetY
      );
      ctx.restore();
    } else {
      const svgString = generateCoverArtworkSvg(
        spec,
        COVER_CANVAS_WIDTH,
        COVER_CANVAS_HEIGHT
      );
      const svgBlob = new Blob([svgString], {
        type: 'image/svg+xml;charset=utf-8',
      });
      const svgImg = await loadImageFromBlob(svgBlob);
      ctx.save();
      ctx.globalAlpha = geom.artOpacity;
      ctx.beginPath();
      ctx.rect(geom.artRect.x, geom.artRect.y, geom.artRect.w, geom.artRect.h);
      ctx.clip();
      ctx.drawImage(
        svgImg,
        geom.artRect.x,
        geom.artRect.y,
        geom.artRect.w,
        geom.artRect.h
      );
      ctx.restore();
    }
  }

  // Framed artwork border
  if (spec.layout === 'framed-artwork' && geom.artRect) {
    ctx.strokeStyle = spec.accentColor;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(geom.artRect.x, geom.artRect.y, geom.artRect.w, geom.artRect.h);
  }

  // 3. Dedicated layout plate (if layout defines a matte panel)
  if (geom.plateRect) {
    ctx.fillStyle = spec.backgroundColor;
    ctx.fillRect(
      geom.plateRect.x,
      geom.plateRect.y,
      geom.plateRect.w,
      geom.plateRect.h
    );
    if (geom.plateRect.borderColor) {
      ctx.strokeStyle = geom.plateRect.borderColor;
      ctx.lineWidth = 1.8;
      ctx.strokeRect(
        geom.plateRect.x,
        geom.plateRect.y,
        geom.plateRect.w,
        geom.plateRect.h
      );
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = 1;
      ctx.strokeRect(
        geom.plateRect.x + 8,
        geom.plateRect.y + 8,
        geom.plateRect.w - 16,
        geom.plateRect.h - 16
      );
      ctx.globalAlpha = 1;
    }
  }

  if (geom.dividerLine) {
    ctx.strokeStyle = geom.dividerLine.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(geom.dividerLine.x1, geom.dividerLine.y1);
    ctx.lineTo(geom.dividerLine.x2, geom.dividerLine.y2);
    ctx.stroke();
  }

  const shouldDrawTypography =
    spec.mode !== 'custom-image' || spec.customImageShowTextOverlay;

  if (shouldDrawTypography) {
    // Protective scrims for full-bleed covers so text stays readable on both light and dark covers
    if (geom.showTopScrim) {
      const textIsLight = isLightHex(spec.textColor);
      const bgRgb = hexToRgb(spec.backgroundColor);
      const scrimRgb = textIsLight
        ? `${Math.min(bgRgb.r, 24)}, ${Math.min(bgRgb.g, 24)}, ${Math.min(bgRgb.b, 28)}`
        : `${bgRgb.r}, ${bgRgb.g}, ${bgRgb.b}`;
      const topAlpha = textIsLight ? 0.52 : 0.62;
      const botAlpha = textIsLight ? 0.58 : 0.68;

      const topGrad = ctx.createLinearGradient(0, 0, 0, 320);
      topGrad.addColorStop(0, `rgba(${scrimRgb}, ${topAlpha})`);
      topGrad.addColorStop(1, `rgba(${scrimRgb}, 0)`);
      ctx.fillStyle = topGrad;
      ctx.fillRect(0, 0, COVER_CANVAS_WIDTH, 320);

      const botGrad = ctx.createLinearGradient(0, 580, 0, COVER_CANVAS_HEIGHT);
      botGrad.addColorStop(0, `rgba(${scrimRgb}, 0)`);
      botGrad.addColorStop(1, `rgba(${scrimRgb}, ${botAlpha})`);
      ctx.fillStyle = botGrad;
      ctx.fillRect(0, 580, COVER_CANVAS_WIDTH, 320);
    }

    const fontDef = getFontDefinition(spec.fontFamily);
    const zone = geom.textZone;
    const align = spec.textAlign;
    const authorSize = Math.max(15, Math.round(spec.titleSize * 0.43));
    const subtitleSize = Math.max(14, Math.round(spec.titleSize * 0.41));
    const imprintSize = 13;

    ctx.textBaseline = 'top';

    const titleBlock = fitTextBlock(
      ctx,
      spec.title || 'Untitled Volume',
      fontDef.canvasFamily,
      spec.fontWeight,
      spec.titleSize,
      20,
      zone.w,
      spec.layout === 'framed-artwork' ? 115 : zone.h * 0.58,
      spec.letterSpacing,
      1.15
    );

    const subtitleBlock = spec.subtitle.trim()
      ? fitTextBlock(
          ctx,
          spec.subtitle.trim(),
          fontDef.canvasFamily,
          '400',
          subtitleSize,
          13,
          zone.w,
          72,
          spec.letterSpacing * 0.4,
          1.25
        )
      : { lines: [], fontSize: subtitleSize, lineHeight: 20, totalHeight: 0 };

    const authorBlock = spec.author.trim()
      ? fitTextBlock(
          ctx,
          spec.author.trim(),
          fontDef.canvasFamily,
          '500',
          authorSize,
          14,
          zone.w,
          56,
          Math.max(0.5, spec.letterSpacing * 0.4),
          1.25
        )
      : { lines: [], fontSize: authorSize, lineHeight: 22, totalHeight: 0 };

    const gapSubtitle = subtitleBlock.lines.length > 0 ? 12 : 0;
    const gapAuthorInline =
      authorBlock.lines.length > 0 && spec.authorPosition === 'below-title'
        ? 18
        : 0;

    // Special handling for framed-artwork where author sits in bottom margin
    if (spec.layout === 'framed-artwork') {
      const titleStackH =
        titleBlock.totalHeight + gapSubtitle + subtitleBlock.totalHeight;
      let cursorY = zone.y + Math.max(0, (zone.h - titleStackH) / 2);

      ctx.fillStyle = spec.textColor;
      ctx.font = `${spec.fontWeight} ${titleBlock.fontSize}px ${fontDef.canvasFamily}`;
      for (const line of titleBlock.lines) {
        drawAlignedLine(
          ctx,
          line,
          zone.x,
          zone.w,
          cursorY,
          align,
          spec.letterSpacing
        );
        cursorY += titleBlock.lineHeight;
      }

      if (subtitleBlock.lines.length > 0) {
        cursorY += gapSubtitle;
        ctx.globalAlpha = 0.82;
        ctx.font = `400 ${subtitleBlock.fontSize}px ${fontDef.canvasFamily}`;
        for (const line of subtitleBlock.lines) {
          drawAlignedLine(
            ctx,
            line,
            zone.x,
            zone.w,
            cursorY,
            align,
            spec.letterSpacing * 0.4
          );
          cursorY += subtitleBlock.lineHeight;
        }
        ctx.globalAlpha = 1;
      }

      if (authorBlock.lines.length > 0 && geom.authorTopZone) {
        let ay = geom.authorTopZone.y + 18;
        ctx.fillStyle = spec.textColor;
        ctx.globalAlpha = 0.92;
        ctx.font = `500 ${authorBlock.fontSize}px ${fontDef.canvasFamily}`;
        for (const line of authorBlock.lines) {
          drawAlignedLine(
            ctx,
            line,
            geom.authorTopZone.x,
            geom.authorTopZone.w,
            ay,
            align,
            Math.max(0.5, spec.letterSpacing * 0.4)
          );
          ay += authorBlock.lineHeight;
        }
        ctx.globalAlpha = 1;
      }
    } else {
      // Render Author at TOP if selected and layout isn't artwork-band
      let effectiveZoneY = zone.y;
      let effectiveZoneH = zone.h;

      if (authorBlock.lines.length > 0 && spec.authorPosition === 'top') {
        let ay = effectiveZoneY;
        ctx.fillStyle = spec.textColor;
        ctx.globalAlpha = 0.88;
        ctx.font = `500 ${authorBlock.fontSize}px ${fontDef.canvasFamily}`;
        for (const line of authorBlock.lines) {
          drawAlignedLine(
            ctx,
            line,
            zone.x,
            zone.w,
            ay,
            align,
            Math.max(0.5, spec.letterSpacing * 0.4)
          );
          ay += authorBlock.lineHeight;
        }
        ctx.globalAlpha = 1;
        effectiveZoneY += authorBlock.totalHeight + 22;
        effectiveZoneH -= authorBlock.totalHeight + 22;
      }

      // Reserve bottom space if author is at bottom
      const bottomAuthorReserve =
        authorBlock.lines.length > 0 && spec.authorPosition === 'bottom'
          ? authorBlock.totalHeight + 22
          : 0;

      const availableForMainH = Math.max(80, effectiveZoneH - bottomAuthorReserve);
      const mainStackH =
        titleBlock.totalHeight +
        gapSubtitle +
        subtitleBlock.totalHeight +
        (spec.authorPosition === 'below-title' ? gapAuthorInline + authorBlock.totalHeight : 0);

      let cursorY = effectiveZoneY;
      if (spec.titlePosition === 'middle' || spec.layout === 'centered-literary') {
        cursorY = effectiveZoneY + Math.max(0, (availableForMainH - mainStackH) / 2);
      } else if (spec.titlePosition === 'bottom') {
        cursorY = effectiveZoneY + Math.max(0, availableForMainH - mainStackH);
      }

      // Draw Title
      ctx.fillStyle = spec.textColor;
      ctx.font = `${spec.fontWeight} ${titleBlock.fontSize}px ${fontDef.canvasFamily}`;
      for (const line of titleBlock.lines) {
        drawAlignedLine(
          ctx,
          line,
          zone.x,
          zone.w,
          cursorY,
          align,
          spec.letterSpacing
        );
        cursorY += titleBlock.lineHeight;
      }

      // Draw Subtitle
      if (subtitleBlock.lines.length > 0) {
        cursorY += gapSubtitle;
        ctx.globalAlpha = 0.82;
        ctx.font = `400 ${subtitleBlock.fontSize}px ${fontDef.canvasFamily}`;
        for (const line of subtitleBlock.lines) {
          drawAlignedLine(
            ctx,
            line,
            zone.x,
            zone.w,
            cursorY,
            align,
            spec.letterSpacing * 0.4
          );
          cursorY += subtitleBlock.lineHeight;
        }
        ctx.globalAlpha = 1;
      }

      // Draw Author below-title
      if (authorBlock.lines.length > 0 && spec.authorPosition === 'below-title') {
        cursorY += gapAuthorInline;
        ctx.globalAlpha = 0.92;
        ctx.font = `500 ${authorBlock.fontSize}px ${fontDef.canvasFamily}`;
        for (const line of authorBlock.lines) {
          drawAlignedLine(
            ctx,
            line,
            zone.x,
            zone.w,
            cursorY,
            align,
            Math.max(0.5, spec.letterSpacing * 0.4)
          );
          cursorY += authorBlock.lineHeight;
        }
        ctx.globalAlpha = 1;
      }

      // Draw Author at bottom
      if (authorBlock.lines.length > 0 && spec.authorPosition === 'bottom') {
        let ay =
          spec.layout === 'split-composition' && geom.authorTopZone
            ? geom.authorTopZone.y
            : effectiveZoneY + effectiveZoneH - authorBlock.totalHeight;
        ctx.fillStyle = spec.textColor;
        ctx.globalAlpha = 0.92;
        ctx.font = `500 ${authorBlock.fontSize}px ${fontDef.canvasFamily}`;
        for (const line of authorBlock.lines) {
          drawAlignedLine(
            ctx,
            line,
            zone.x,
            zone.w,
            ay,
            align,
            Math.max(0.5, spec.letterSpacing * 0.4)
          );
          ay += authorBlock.lineHeight;
        }
        ctx.globalAlpha = 1;
      }
    }

    // Imprint at footer (only when user provides one)
    if (spec.imprint.trim()) {
      ctx.fillStyle = spec.textColor;
      ctx.globalAlpha = 0.72;
      ctx.font = `500 ${imprintSize}px ${fontDef.canvasFamily}`;
      drawAlignedLine(
        ctx,
        spec.imprint.trim().toUpperCase(),
        zone.x,
        zone.w,
        geom.imprintY,
        align,
        1.6
      );
      ctx.globalAlpha = 1;
    }
  }

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/png', 0.92);
  });

  if (!blob) {
    throw new Error('Failed to export rendered cover image.');
  }

  const data = await blob.arrayBuffer();
  return { data, mimeType: 'image/png' };
}
