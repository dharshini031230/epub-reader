import { useEffect, useMemo, useRef, useState } from 'react';
import {
  generateCoverArtworkSvg,
  getFontDefinition,
  hexToRgb,
  isLightHex,
} from '../services/coverArtGenerator';
import {
  COVER_CANVAS_HEIGHT,
  COVER_CANVAS_WIDTH,
  fitTextBlock,
  getLayoutGeometry,
} from '../services/coverRendererService';
import type { CoverDesignSpec } from '../types/library';

interface CoverPreviewCanvasProps {
  spec: CoverDesignSpec;
  customImageUrl: string | null;
  interactiveDrag?: boolean;
  onOffsetChange?: (offsetX: number, offsetY: number) => void;
  className?: string;
}

let sharedMeasureCtx: CanvasRenderingContext2D | null = null;
function getMeasureContext(): CanvasRenderingContext2D | null {
  if (typeof document === 'undefined') return null;
  if (!sharedMeasureCtx) {
    const c = document.createElement('canvas');
    sharedMeasureCtx = c.getContext('2d');
  }
  return sharedMeasureCtx;
}

export function CoverPreviewCanvas({
  spec,
  customImageUrl,
  interactiveDrag = false,
  onOffsetChange,
  className = '',
}: CoverPreviewCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scaleFactor, setScaleFactor] = useState(0.5);
  const [imageNaturalSize, setImageNaturalSize] = useState<{
    w: number;
    h: number;
  } | null>(null);
  const dragStartRef = useRef<{
    clientX: number;
    clientY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const [isDraggingImg, setIsDraggingImg] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateScale = () => {
      const width = el.clientWidth;
      if (width > 0) {
        setScaleFactor(width / COVER_CANVAS_WIDTH);
      }
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!customImageUrl) {
      setImageNaturalSize(null);
      return;
    }
    const img = new Image();
    img.onload = () => {
      setImageNaturalSize({
        w: img.naturalWidth || 600,
        h: img.naturalHeight || 900,
      });
    };
    img.src = customImageUrl;
  }, [customImageUrl]);

  const svgMarkup = useMemo(() => {
    if (spec.mode === 'custom-image' && customImageUrl) return null;
    return generateCoverArtworkSvg(
      spec,
      COVER_CANVAS_WIDTH,
      COVER_CANVAS_HEIGHT
    );
  }, [spec, customImageUrl]);

  const geom = useMemo(() => getLayoutGeometry(spec), [spec]);
  const fontDef = useMemo(
    () => getFontDefinition(spec.fontFamily),
    [spec.fontFamily]
  );

  const computedTypography = useMemo(() => {
    const ctx = getMeasureContext();
    const zone = geom.textZone;
    const authorSize = Math.max(15, Math.round(spec.titleSize * 0.43));
    const subtitleSize = Math.max(14, Math.round(spec.titleSize * 0.41));

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

    return { titleBlock, subtitleBlock, authorBlock };
  }, [spec, geom, fontDef]);

  const canDragImage =
    interactiveDrag &&
    spec.mode === 'custom-image' &&
    Boolean(customImageUrl) &&
    Boolean(onOffsetChange);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!canDragImage) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      originX: spec.customImageOffsetX,
      originY: spec.customImageOffsetY,
    };
    setIsDraggingImg(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!canDragImage || !dragStartRef.current || !onOffsetChange) return;
    const rectW = (geom.artRect?.w ?? COVER_CANVAS_WIDTH) * scaleFactor;
    const rectH = (geom.artRect?.h ?? COVER_CANVAS_HEIGHT) * scaleFactor;
    const dxPercent = ((e.clientX - dragStartRef.current.clientX) / Math.max(1, rectW)) * 100;
    const dyPercent = ((e.clientY - dragStartRef.current.clientY) / Math.max(1, rectH)) * 100;
    const nextX = Math.max(-60, Math.min(60, dragStartRef.current.originX + dxPercent));
    const nextY = Math.max(-60, Math.min(60, dragStartRef.current.originY + dyPercent));
    onOffsetChange(Math.round(nextX * 10) / 10, Math.round(nextY * 10) / 10);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStartRef.current) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore if pointer already released
    }
    dragStartRef.current = null;
    setIsDraggingImg(false);
  };

  // Compute exact image box inside artRect matching drawImageInsideRect
  const customImageStyle = useMemo(() => {
    if (!geom.artRect || !imageNaturalSize) return null;
    const rect = geom.artRect;
    const imgRatio = imageNaturalSize.w / Math.max(1, imageNaturalSize.h);
    const rectRatio = rect.w / Math.max(1, rect.h);

    let baseW: number;
    let baseH: number;
    if (spec.customImageFit === 'cover') {
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

    const drawW = baseW * spec.customImageScale;
    const drawH = baseH * spec.customImageScale;
    const dx = (rect.w - drawW) / 2 + (spec.customImageOffsetX / 100) * rect.w;
    const dy = (rect.h - drawH) / 2 + (spec.customImageOffsetY / 100) * rect.h;

    return {
      left: `${dx}px`,
      top: `${dy}px`,
      width: `${drawW}px`,
      height: `${drawH}px`,
    };
  }, [
    geom.artRect,
    imageNaturalSize,
    spec.customImageFit,
    spec.customImageScale,
    spec.customImageOffsetX,
    spec.customImageOffsetY,
  ]);

  const shouldShowTypography =
    spec.mode !== 'custom-image' || spec.customImageShowTextOverlay;

  const { titleBlock, subtitleBlock, authorBlock } = computedTypography;
  const gapSubtitle = subtitleBlock.lines.length > 0 ? 12 : 0;
  const gapAuthorInline =
    authorBlock.lines.length > 0 && spec.authorPosition === 'below-title'
      ? 18
      : 0;

  // Vertical position calculation matching renderCoverToImageBuffer
  let effectiveZoneY = geom.textZone.y;
  let effectiveZoneH = geom.textZone.h;
  const showTopAuthor =
    spec.layout !== 'framed-artwork' &&
    authorBlock.lines.length > 0 &&
    spec.authorPosition === 'top';
  if (showTopAuthor) {
    effectiveZoneY += authorBlock.totalHeight + 22;
    effectiveZoneH -= authorBlock.totalHeight + 22;
  }

  const bottomAuthorReserve =
    spec.layout !== 'framed-artwork' &&
    authorBlock.lines.length > 0 &&
    spec.authorPosition === 'bottom'
      ? authorBlock.totalHeight + 22
      : 0;

  const availableForMainH = Math.max(80, effectiveZoneH - bottomAuthorReserve);
  const mainStackH =
    titleBlock.totalHeight +
    gapSubtitle +
    subtitleBlock.totalHeight +
    (spec.layout !== 'framed-artwork' && spec.authorPosition === 'below-title'
      ? gapAuthorInline + authorBlock.totalHeight
      : 0);

  let mainCursorY = effectiveZoneY;
  if (spec.layout === 'framed-artwork') {
    const framedStackH =
      titleBlock.totalHeight + gapSubtitle + subtitleBlock.totalHeight;
    mainCursorY =
      geom.textZone.y + Math.max(0, (geom.textZone.h - framedStackH) / 2);
  } else if (
    spec.titlePosition === 'middle' ||
    spec.layout === 'centered-literary'
  ) {
    mainCursorY =
      effectiveZoneY + Math.max(0, (availableForMainH - mainStackH) / 2);
  } else if (spec.titlePosition === 'bottom') {
    mainCursorY = effectiveZoneY + Math.max(0, availableForMainH - mainStackH);
  }

  const bottomAuthorY =
    spec.layout === 'split-composition' && geom.authorTopZone
      ? geom.authorTopZone.y
      : effectiveZoneY + effectiveZoneH - authorBlock.totalHeight;

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={`relative aspect-[2/3] w-full overflow-hidden select-none rounded-md shadow-2xl border border-white/[0.12] ${
        canDragImage
          ? isDraggingImg
            ? 'cursor-grabbing touch-none'
            : 'cursor-grab touch-none'
          : ''
      } ${className}`}
      style={{ backgroundColor: spec.backgroundColor }}
    >
      <div
        className="absolute top-0 left-0 origin-top-left pointer-events-none"
        style={{
          width: `${COVER_CANVAS_WIDTH}px`,
          height: `${COVER_CANVAS_HEIGHT}px`,
          transform: `scale(${scaleFactor})`,
          backgroundColor: spec.backgroundColor,
        }}
      >
        {/* 1. Artwork Layer */}
        {geom.artRect && (
          <div
            className="absolute overflow-hidden"
            style={{
              left: `${geom.artRect.x}px`,
              top: `${geom.artRect.y}px`,
              width: `${geom.artRect.w}px`,
              height: `${geom.artRect.h}px`,
              opacity: geom.artOpacity,
            }}
          >
            {spec.mode === 'custom-image' && customImageUrl ? (
              customImageStyle ? (
                <img
                  src={customImageUrl}
                  alt="Custom uploaded cover"
                  draggable={false}
                  className="absolute max-w-none max-h-none"
                  style={customImageStyle}
                />
              ) : null
            ) : svgMarkup ? (
              <div
                className="w-full h-full"
                dangerouslySetInnerHTML={{ __html: svgMarkup }}
              />
            ) : null}
          </div>
        )}

        {/* Framed Artwork Border */}
        {spec.layout === 'framed-artwork' && geom.artRect && (
          <div
            className="absolute pointer-events-none"
            style={{
              left: `${geom.artRect.x}px`,
              top: `${geom.artRect.y}px`,
              width: `${geom.artRect.w}px`,
              height: `${geom.artRect.h}px`,
              border: `1.5px solid ${spec.accentColor}`,
            }}
          />
        )}

        {/* 2. Layout Matte Plate */}
        {geom.plateRect && (
          <div
            className="absolute"
            style={{
              left: `${geom.plateRect.x}px`,
              top: `${geom.plateRect.y}px`,
              width: `${geom.plateRect.w}px`,
              height: `${geom.plateRect.h}px`,
              backgroundColor: spec.backgroundColor,
              border: geom.plateRect.borderColor
                ? `1.8px solid ${geom.plateRect.borderColor}`
                : undefined,
            }}
          >
            {geom.plateRect.borderColor && (
              <div
                className="absolute inset-2 pointer-events-none"
                style={{
                  border: `1px solid ${geom.plateRect.borderColor}`,
                  opacity: 0.45,
                }}
              />
            )}
          </div>
        )}

        {geom.dividerLine && (
          <div
            className="absolute left-0 right-0"
            style={{
              top: `${geom.dividerLine.y1}px`,
              height: '2px',
              backgroundColor: geom.dividerLine.color,
            }}
          />
        )}

        {/* 3. Scrims & Typography */}
        {shouldShowTypography && (
          <>
            {geom.showTopScrim && (() => {
              const textIsLight = isLightHex(spec.textColor);
              const bgRgb = hexToRgb(spec.backgroundColor);
              const scrimRgb = textIsLight
                ? `${Math.min(bgRgb.r, 24)}, ${Math.min(bgRgb.g, 24)}, ${Math.min(bgRgb.b, 28)}`
                : `${bgRgb.r}, ${bgRgb.g}, ${bgRgb.b}`;
              const topAlpha = textIsLight ? 0.52 : 0.62;
              const botAlpha = textIsLight ? 0.58 : 0.68;
              return (
                <>
                  <div
                    className="absolute inset-x-0 top-0 pointer-events-none"
                    style={{
                      height: '320px',
                      background: `linear-gradient(to bottom, rgba(${scrimRgb},${topAlpha}), rgba(${scrimRgb},0))`,
                    }}
                  />
                  <div
                    className="absolute inset-x-0 bottom-0 pointer-events-none"
                    style={{
                      height: '320px',
                      background: `linear-gradient(to top, rgba(${scrimRgb},${botAlpha}), rgba(${scrimRgb},0))`,
                    }}
                  />
                </>
              );
            })()}

            {/* Author at top (when applicable) */}
            {showTopAuthor && (
              <div
                className="absolute"
                style={{
                  left: `${geom.textZone.x}px`,
                  top: `${geom.textZone.y}px`,
                  width: `${geom.textZone.w}px`,
                  color: spec.textColor,
                  opacity: 0.88,
                  fontFamily: fontDef.cssFamily,
                  fontWeight: 500,
                  fontSize: `${authorBlock.fontSize}px`,
                  lineHeight: `${authorBlock.lineHeight}px`,
                  textAlign: spec.textAlign,
                  letterSpacing: `${Math.max(0.5, spec.letterSpacing * 0.4)}px`,
                }}
              >
                {authorBlock.lines.map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>
            )}

            {/* Title + Subtitle + Optional Inline Author */}
            <div
              className="absolute"
              style={{
                left: `${geom.textZone.x}px`,
                top: `${mainCursorY}px`,
                width: `${geom.textZone.w}px`,
                color: spec.textColor,
                fontFamily: fontDef.cssFamily,
                textAlign: spec.textAlign,
              }}
            >
              <div
                style={{
                  fontWeight: Number(spec.fontWeight),
                  fontSize: `${titleBlock.fontSize}px`,
                  lineHeight: `${titleBlock.lineHeight}px`,
                  letterSpacing: `${spec.letterSpacing}px`,
                }}
              >
                {titleBlock.lines.map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>

              {subtitleBlock.lines.length > 0 && (
                <div
                  style={{
                    marginTop: `${gapSubtitle}px`,
                    opacity: 0.82,
                    fontWeight: 400,
                    fontSize: `${subtitleBlock.fontSize}px`,
                    lineHeight: `${subtitleBlock.lineHeight}px`,
                    letterSpacing: `${spec.letterSpacing * 0.4}px`,
                  }}
                >
                  {subtitleBlock.lines.map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                </div>
              )}

              {spec.layout !== 'framed-artwork' &&
                authorBlock.lines.length > 0 &&
                spec.authorPosition === 'below-title' && (
                  <div
                    style={{
                      marginTop: `${gapAuthorInline}px`,
                      opacity: 0.92,
                      fontWeight: 500,
                      fontSize: `${authorBlock.fontSize}px`,
                      lineHeight: `${authorBlock.lineHeight}px`,
                      letterSpacing: `${Math.max(0.5, spec.letterSpacing * 0.4)}px`,
                    }}
                  >
                    {authorBlock.lines.map((line, i) => (
                      <div key={i}>{line}</div>
                    ))}
                  </div>
                )}
            </div>

            {/* Author for framed-artwork bottom margin */}
            {spec.layout === 'framed-artwork' &&
              authorBlock.lines.length > 0 &&
              geom.authorTopZone && (
                <div
                  className="absolute"
                  style={{
                    left: `${geom.authorTopZone.x}px`,
                    top: `${geom.authorTopZone.y + 18}px`,
                    width: `${geom.authorTopZone.w}px`,
                    color: spec.textColor,
                    opacity: 0.92,
                    fontFamily: fontDef.cssFamily,
                    fontWeight: 500,
                    fontSize: `${authorBlock.fontSize}px`,
                    lineHeight: `${authorBlock.lineHeight}px`,
                    textAlign: spec.textAlign,
                    letterSpacing: `${Math.max(0.5, spec.letterSpacing * 0.4)}px`,
                  }}
                >
                  {authorBlock.lines.map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                </div>
              )}

            {/* Author at bottom */}
            {spec.layout !== 'framed-artwork' &&
              authorBlock.lines.length > 0 &&
              spec.authorPosition === 'bottom' && (
                <div
                  className="absolute"
                  style={{
                    left: `${geom.textZone.x}px`,
                    top: `${bottomAuthorY}px`,
                    width: `${geom.textZone.w}px`,
                    color: spec.textColor,
                    opacity: 0.92,
                    fontFamily: fontDef.cssFamily,
                    fontWeight: 500,
                    fontSize: `${authorBlock.fontSize}px`,
                    lineHeight: `${authorBlock.lineHeight}px`,
                    textAlign: spec.textAlign,
                    letterSpacing: `${Math.max(0.5, spec.letterSpacing * 0.4)}px`,
                  }}
                >
                  {authorBlock.lines.map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                </div>
              )}

            {/* Imprint (strictly user-defined) */}
            {spec.imprint.trim() && (
              <div
                className="absolute uppercase"
                style={{
                  left: `${geom.textZone.x}px`,
                  top: `${geom.imprintY}px`,
                  width: `${geom.textZone.w}px`,
                  color: spec.textColor,
                  opacity: 0.72,
                  fontFamily: fontDef.cssFamily,
                  fontWeight: 500,
                  fontSize: '13px',
                  lineHeight: '16px',
                  textAlign: spec.textAlign,
                  letterSpacing: '1.6px',
                }}
              >
                {spec.imprint.trim()}
              </div>
            )}
          </>
        )}
      </div>

      {/* Subtle book-edge specular ring */}
      <div
        aria-hidden="true"
        className="absolute inset-0 ring-1 ring-inset ring-white/[0.08] pointer-events-none"
      />
    </div>
  );
}
