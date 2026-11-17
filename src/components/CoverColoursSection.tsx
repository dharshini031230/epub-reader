import { Check, ChevronDown, ChevronRight, Palette, RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  COVER_COLOUR_CATEGORIES,
  getPaletteDefinition,
  isLightHex,
  type CoverColourCategoryId,
  type CoverPaletteDefinition,
} from '../services/coverArtGenerator';
import type { CoverDesignSpec } from '../types/library';

interface CoverColoursSectionProps {
  spec: CoverDesignSpec;
  isModifiedFromOriginal: boolean;
  onSelectPalette: (palette: CoverPaletteDefinition) => void;
  onSelectCustomBackground: (hex: string) => void;
  onResetColour: () => void;
}

export function CoverColoursSection({
  spec,
  isModifiedFromOriginal,
  onSelectPalette,
  onSelectCustomBackground,
  onResetColour,
}: CoverColoursSectionProps) {
  const activePalette = getPaletteDefinition(spec.paletteId);

  const [expandedCategories, setExpandedCategories] = useState<
    Record<CoverColourCategoryId, boolean>
  >(() => {
    const activeCat = activePalette?.category;
    return {
      pastels: activeCat ? activeCat === 'pastels' : true,
      bright: activeCat === 'bright',
      neutrals: activeCat === 'neutrals',
    };
  });

  useEffect(() => {
    if (!activePalette) return;
    setExpandedCategories((prev) =>
      prev[activePalette.category]
        ? prev
        : { ...prev, [activePalette.category]: true }
    );
  }, [activePalette]);

  const toggleCategory = (id: CoverColourCategoryId) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const activeLabel = activePalette
    ? activePalette.name
    : `Custom (${spec.backgroundColor.toUpperCase()})`;

  return (
    <div
      aria-labelledby="cover-colours-heading"
      className="pt-5 border-t border-white/[0.08] space-y-3.5"
    >
      {/* Section Header + Current Indicator + Reset Colour */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Palette className="w-3.5 h-3.5 text-[#D99B43]" aria-hidden="true" />
          <h3
            id="cover-colours-heading"
            className="text-xs font-medium text-[#F2EDE4]"
          >
            Cover Colours
          </h3>
          <span className="inline-flex items-center gap-1.5 pl-1.5 pr-2 py-0.5 rounded-full bg-[#181820] border border-white/[0.08] text-[11px] text-[#A69F93]">
            <span
              className="w-2.5 h-2.5 rounded-full border border-white/25 shrink-0"
              style={{ backgroundColor: spec.backgroundColor }}
              aria-hidden="true"
            />
            <span className="truncate max-w-[140px]">{activeLabel}</span>
          </span>
        </div>

        <button
          type="button"
          onClick={onResetColour}
          disabled={!isModifiedFromOriginal}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#16161D] hover:bg-[#1F1F28] disabled:opacity-40 disabled:pointer-events-none border border-white/[0.09] text-[11px] font-medium text-[#A69F93] hover:text-[#F2EDE4] transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" aria-hidden="true" />
          <span>Reset Colour</span>
        </button>
      </div>

      {/* Expandable Categories: Pastels, Bright Colours, Neutrals */}
      <div className="space-y-2">
        {COVER_COLOUR_CATEGORIES.map((group) => {
          const isExpanded = expandedCategories[group.id];
          const categoryHasSelection = group.palettes.some(
            (p) => p.id === spec.paletteId
          );

          return (
            <div
              key={group.id}
              className="rounded-md bg-[#16161D] border border-white/[0.08] overflow-hidden"
            >
              <button
                type="button"
                aria-expanded={isExpanded}
                onClick={() => toggleCategory(group.id)}
                className="w-full px-3.5 py-2.5 flex items-center justify-between gap-3 text-left hover:bg-white/[0.03] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {isExpanded ? (
                    <ChevronDown
                      className="w-3.5 h-3.5 text-[#D99B43] shrink-0"
                      aria-hidden="true"
                    />
                  ) : (
                    <ChevronRight
                      className="w-3.5 h-3.5 text-[#6E685F] shrink-0"
                      aria-hidden="true"
                    />
                  )}
                  <span className="text-xs font-medium text-[#F2EDE4]">
                    {group.label}
                  </span>
                  <span className="font-mono text-[10px] text-[#6E685F] tabular-nums">
                    {group.palettes.length}
                  </span>
                  {categoryHasSelection && !isExpanded && (
                    <span className="text-[10px] text-[#D99B43] truncate">
                      · {activePalette?.name}
                    </span>
                  )}
                </div>

                {/* Compact preview dot strip when collapsed */}
                {!isExpanded && (
                  <div
                    aria-hidden="true"
                    className="flex items-center -space-x-1 shrink-0"
                  >
                    {group.palettes.slice(0, 6).map((p) => (
                      <span
                        key={p.id}
                        className="w-3.5 h-3.5 rounded-full border border-[#16161D]"
                        style={{ backgroundColor: p.backgroundColor }}
                      />
                    ))}
                  </div>
                )}
              </button>

              {isExpanded && (
                <div className="px-3.5 pb-3.5 pt-1 border-t border-white/[0.06] grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {group.palettes.map((palette) => {
                    const isSelected = spec.paletteId === palette.id;
                    const lightBg = isLightHex(palette.backgroundColor);

                    return (
                      <button
                        key={palette.id}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => onSelectPalette(palette)}
                        className={`group flex flex-col items-center gap-1.5 p-2 rounded-md border transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D99B43] ${
                          isSelected
                            ? 'bg-[#D99B43]/12 border-[#D99B43]'
                            : 'bg-[#111116] border-white/[0.06] hover:border-white/25'
                        }`}
                      >
                        <span
                          className={`relative w-9 h-9 rounded-full flex items-center justify-center border transition-transform group-hover:scale-105 ${
                            isSelected
                              ? 'border-[#D99B43] ring-2 ring-[#D99B43]/40'
                              : 'border-white/20'
                          }`}
                          style={{
                            background: `linear-gradient(135deg, ${palette.backgroundColor} 62%, ${palette.artworkSecondaryColor} 62%, ${palette.artworkSecondaryColor} 82%, ${palette.accentColor} 82%)`,
                          }}
                        >
                          {isSelected && (
                            <Check
                              className={`w-3.5 h-3.5 stroke-[2.75] ${
                                lightBg ? 'text-[#181614]' : 'text-[#F8F4EC]'
                              }`}
                              aria-hidden="true"
                            />
                          )}
                        </span>
                        <span
                          className={`text-[11px] leading-tight text-center line-clamp-1 ${
                            isSelected
                              ? 'text-[#F2EDE4] font-medium'
                              : 'text-[#A69F93] group-hover:text-[#F2EDE4]'
                          }`}
                        >
                          {palette.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Custom Background Colour Picker */}
      <label className="flex items-center justify-between gap-3 p-3 rounded-md bg-[#16161D] border border-white/[0.08] hover:border-white/20 transition-colors cursor-pointer">
        <div className="min-w-0">
          <p className="text-xs font-medium text-[#F2EDE4]">
            Custom Background Colour
          </p>
          <p className="text-[11px] text-[#6E685F]">
            Automatically adapts artwork shades &amp; text contrast
          </p>
        </div>

        <span className="flex items-center gap-2.5 shrink-0">
          <span className="font-mono text-[11px] text-[#A69F93] uppercase">
            {spec.backgroundColor}
          </span>
          <input
            type="color"
            aria-label="Custom background colour"
            value={spec.backgroundColor}
            onChange={(e) => onSelectCustomBackground(e.target.value)}
            className="w-8 h-8 rounded-full border border-white/25 bg-transparent cursor-pointer overflow-hidden"
          />
        </span>
      </label>
    </div>
  );
}
