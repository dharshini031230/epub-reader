import { Plus } from 'lucide-react';
import type { NavigationSection } from '../types/library';

interface TopNavProps {
  activeSection: NavigationSection;
  onNavigate: (section: NavigationSection) => void;
  onOpenImport: () => void;
}

const NAV_ITEMS: { id: NavigationSection; label: string }[] = [
  { id: 'shelf', label: 'Shelf' },
  { id: 'collections', label: 'Collections' },
  { id: 'series', label: 'Series' },
  { id: 'tags', label: 'Tags' },
  { id: 'authors', label: 'Authors' },
  { id: 'highlights', label: 'Highlights' },
  { id: 'storage', label: 'Backup' },
];

export function TopNav({
  activeSection,
  onNavigate,
  onOpenImport,
}: TopNavProps) {
  return (
    <header className="sticky top-0 z-30 bg-[#08080A]/92 backdrop-blur-md border-b border-white/[0.08]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark */}
        <button
          type="button"
          onClick={() => onNavigate('shelf')}
          className="font-serif text-2xl font-medium tracking-tight text-[#F2EDE4] hover:text-[#E8B15C] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D99B43]/60 rounded"
        >
          Folio
        </button>

        {/* Zone 2: Primary Navigation Links (Desktop) */}
        <nav
          aria-label="Primary Library Navigation"
          className="hidden md:flex items-center gap-7"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`relative py-1.5 text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D99B43]/60 rounded ${
                  isActive
                    ? 'text-[#F2EDE4]'
                    : 'text-[#A69F93] hover:text-[#F2EDE4]'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute left-0 right-0 -bottom-[1px] h-[2px] bg-[#D99B43] rounded-full"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single Primary Action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onOpenImport}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#D99B43] hover:bg-[#E8B15C] text-[#08080A] text-sm font-semibold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8B15C] focus-visible:ring-offset-2 focus-visible:ring-offset-[#08080A] cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.25]" aria-hidden="true" />
            <span>Import EPUB</span>
          </button>
        </div>
      </div>

      {/* Mobile Navigation Strip */}
      <nav
        aria-label="Mobile Library Navigation"
        className="md:hidden border-t border-white/[0.06] px-4 flex items-center gap-5 overflow-x-auto"
      >
        {NAV_ITEMS.map((item) => {
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`relative py-2.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                isActive ? 'text-[#D99B43]' : 'text-[#A69F93]'
              }`}
            >
              {item.label}
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute left-0 right-0 bottom-0 h-[2px] bg-[#D99B43]"
                />
              )}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
