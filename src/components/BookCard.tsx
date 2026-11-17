import {
  BookOpen,
  Check,
  ChevronRight,
  Download,
  Edit3,
  FolderKanban,
  Info,
  Library,
  MoreVertical,
  Palette,
  Tag,
  Trash2,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  READING_STATUS_OPTIONS,
  getReadingStatusLabel,
} from '../services/libraryDomainService';
import type { Book, ReadingStatus } from '../types/library';
import { BookCover } from './BookCover';

export interface BookMenuHandlers {
  onOpenBook: (book: Book) => void;
  onViewDetails: (book: Book) => void;
  onEditMetadata: (book: Book) => void;
  onChangeReadingStatus: (book: Book, status: ReadingStatus) => void;
  onManageCollections: (book: Book) => void;
  onManageSeries: (book: Book) => void;
  onManageTags: (book: Book) => void;
  onCustomiseCover: (book: Book) => void;
  onExportBook: (book: Book) => void;
  onRequestDeleteBook: (book: Book) => void;
}

interface BookCardProps {
  book: Book;
  coverUrl?: string | null;
  onSelect: (book: Book) => void;
  menuHandlers?: BookMenuHandlers;
  seriesBadgeText?: string;
}

export function BookCard({
  book,
  coverUrl,
  onSelect,
  menuHandlers,
  seriesBadgeText,
}: BookCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [statusSubmenuOpen, setStatusSubmenuOpen] = useState(false);
  const [alignLeft, setAlignLeft] = useState(false);

  const cardRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) {
      setStatusSubmenuOpen(false);
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        cardRef.current &&
        !cardRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!menuOpen && cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      // If card is close to the left edge (< 220px), align dropdown to left-0 instead of right-0
      setAlignLeft(rect.left < 160);
    }
    setMenuOpen((prev) => !prev);
  };

  const runAction = (fn: () => void) => {
    setMenuOpen(false);
    fn();
  };

  const primaryAuthor = book.authors.join(', ') || 'Unknown Author';
  const showProgressBar =
    book.progress > 0 ||
    book.status === 'reading' ||
    book.status === 'finished';

  const statusLabel = getReadingStatusLabel(book.status);

  return (
    <article
      ref={cardRef}
      onContextMenu={(e) => {
        if (!menuHandlers) return;
        e.preventDefault();
        if (cardRef.current) {
          const rect = cardRef.current.getBoundingClientRect();
          setAlignLeft(rect.left < 160);
        }
        setMenuOpen(true);
      }}
      className={`group relative flex flex-col ${menuOpen ? 'z-30' : ''}`}
    >
      <div className="relative">
        <button
          type="button"
          onClick={() => onSelect(book)}
          className="text-left w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D99B43] focus-visible:ring-offset-4 focus-visible:ring-offset-[#08080A] rounded-md cursor-pointer"
        >
          <div className="relative rounded-md overflow-hidden border border-white/[0.08] bg-[#131318] transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-1 group-hover:border-[#D99B43]/50 shadow-[0_10px_28px_-14px_rgba(0,0,0,0.85)]">
            <BookCover
              title={book.title}
              author={primaryAuthor}
              publisher={book.publisher}
              coverUrl={coverUrl}
            />

            {showProgressBar && (
              <div
                aria-label={`Reading progress ${book.progress}%`}
                className="absolute inset-x-0 bottom-0 h-1 bg-black/75"
              >
                <div
                  className="h-full bg-[#D99B43] transition-all duration-200"
                  style={{ width: `${Math.max(4, book.progress)}%` }}
                />
              </div>
            )}
          </div>

          <div className="mt-3 space-y-1 pr-6">
            {seriesBadgeText && (
              <p className="text-[11px] font-mono tabular-nums text-[#D99B43] truncate">
                {seriesBadgeText}
              </p>
            )}

            <h3 className="font-serif text-[15px] leading-snug font-medium text-[#F2EDE4] line-clamp-2 group-hover:text-[#E8B15C] transition-colors">
              {book.title}
            </h3>

            <p className="text-[13px] text-[#A69F93] line-clamp-1">
              {primaryAuthor}
            </p>

            <div className="flex items-center gap-1.5 text-[12px] text-[#6E685F] tabular-nums pt-0.5">
              <span
                className={
                  book.status === 'reading'
                    ? 'text-[#D99B43]'
                    : book.status === 'finished'
                      ? 'text-[#A69F93]'
                      : 'text-[#6E685F]'
                }
              >
                {statusLabel}
              </span>
              {(book.progress > 0 || book.status === 'reading') && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono text-[11px]">
                    {book.progress}%
                  </span>
                </>
              )}
            </div>
          </div>
        </button>

        {/* Contextual Book Management Menu Trigger */}
        {menuHandlers && (
          <div className="absolute top-2 right-2 z-20">
            <button
              type="button"
              onClick={toggleMenu}
              aria-label={`Manage ${book.title}`}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className={`w-8 h-8 rounded-md flex items-center justify-center border transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D99B43] ${
                menuOpen
                  ? 'bg-[#18181F] border-[#D99B43]/60 text-[#F2EDE4] opacity-100'
                  : 'bg-black/75 border-white/[0.14] text-[#F2EDE4] opacity-90 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100 hover:bg-[#18181F] hover:border-[#D99B43]/60'
              }`}
            >
              <MoreVertical className="w-4 h-4" aria-hidden="true" />
            </button>

            {menuOpen && (
              <div
                ref={menuRef}
                role="menu"
                aria-label={`Actions for ${book.title}`}
                className={`absolute top-9 ${
                  alignLeft ? 'left-0' : 'right-0'
                } w-56 rounded-lg bg-[#14141A] border border-white/[0.12] shadow-2xl py-1.5 z-40 text-xs`}
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => runAction(() => menuHandlers.onOpenBook(book))}
                  className="w-full px-3.5 py-2 flex items-center gap-2.5 text-left text-[#F2EDE4] hover:bg-white/[0.06] cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5 text-[#D99B43]" />
                  <span>Open book</span>
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() =>
                    runAction(() => menuHandlers.onViewDetails(book))
                  }
                  className="w-full px-3.5 py-2 flex items-center gap-2.5 text-left text-[#F2EDE4] hover:bg-white/[0.06] cursor-pointer"
                >
                  <Info className="w-3.5 h-3.5 text-[#A69F93]" />
                  <span>View details</span>
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() =>
                    runAction(() => menuHandlers.onEditMetadata(book))
                  }
                  className="w-full px-3.5 py-2 flex items-center gap-2.5 text-left text-[#F2EDE4] hover:bg-white/[0.06] cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-[#A69F93]" />
                  <span>Edit metadata</span>
                </button>

                <div className="my-1 border-t border-white/[0.07]" />

                {/* Change Reading Status Accordion/Submenu */}
                <div>
                  <button
                    type="button"
                    role="menuitem"
                    aria-expanded={statusSubmenuOpen}
                    onClick={() => setStatusSubmenuOpen((prev) => !prev)}
                    className="w-full px-3.5 py-2 flex items-center justify-between text-left text-[#F2EDE4] hover:bg-white/[0.06] cursor-pointer"
                  >
                    <span>Change reading status</span>
                    <ChevronRight
                      className={`w-3.5 h-3.5 text-[#6E685F] transition-transform ${
                        statusSubmenuOpen ? 'rotate-90' : ''
                      }`}
                    />
                  </button>

                  {statusSubmenuOpen && (
                    <div className="bg-[#0D0D11] border-y border-white/[0.06] py-1">
                      {READING_STATUS_OPTIONS.map((opt) => {
                        const isCurrent = book.status === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            role="menuitemradio"
                            aria-checked={isCurrent}
                            onClick={() =>
                              runAction(() =>
                                menuHandlers.onChangeReadingStatus(
                                  book,
                                  opt.value
                                )
                              )
                            }
                            className={`w-full pl-6 pr-3.5 py-1.5 flex items-center justify-between text-left transition-colors cursor-pointer ${
                              isCurrent
                                ? 'text-[#E8B15C] font-medium'
                                : 'text-[#A69F93] hover:text-[#F2EDE4] hover:bg-white/[0.04]'
                            }`}
                          >
                            <span>{opt.label}</span>
                            {isCurrent && <Check className="w-3 h-3" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() =>
                    runAction(() => menuHandlers.onManageCollections(book))
                  }
                  className="w-full px-3.5 py-2 flex items-center gap-2.5 text-left text-[#F2EDE4] hover:bg-white/[0.06] cursor-pointer"
                >
                  <FolderKanban className="w-3.5 h-3.5 text-[#A69F93]" />
                  <span>Manage collections</span>
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() =>
                    runAction(() => menuHandlers.onManageSeries(book))
                  }
                  className="w-full px-3.5 py-2 flex items-center gap-2.5 text-left text-[#F2EDE4] hover:bg-white/[0.06] cursor-pointer"
                >
                  <Library className="w-3.5 h-3.5 text-[#A69F93]" />
                  <span>Manage series</span>
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() =>
                    runAction(() => menuHandlers.onManageTags(book))
                  }
                  className="w-full px-3.5 py-2 flex items-center gap-2.5 text-left text-[#F2EDE4] hover:bg-white/[0.06] cursor-pointer"
                >
                  <Tag className="w-3.5 h-3.5 text-[#A69F93]" />
                  <span>Manage tags</span>
                </button>

                <div className="my-1 border-t border-white/[0.07]" />

                <button
                  type="button"
                  role="menuitem"
                  onClick={() =>
                    runAction(() => menuHandlers.onCustomiseCover(book))
                  }
                  className="w-full px-3.5 py-2 flex items-center gap-2.5 text-left text-[#F2EDE4] hover:bg-white/[0.06] cursor-pointer"
                >
                  <Palette className="w-3.5 h-3.5 text-[#A69F93]" />
                  <span>Customise cover</span>
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() =>
                    runAction(() => menuHandlers.onExportBook(book))
                  }
                  className="w-full px-3.5 py-2 flex items-center gap-2.5 text-left text-[#F2EDE4] hover:bg-white/[0.06] cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-[#A69F93]" />
                  <span>Export original EPUB</span>
                </button>

                <div className="my-1 border-t border-white/[0.07]" />

                <button
                  type="button"
                  role="menuitem"
                  onClick={() =>
                    runAction(() => menuHandlers.onRequestDeleteBook(book))
                  }
                  className="w-full px-3.5 py-2 flex items-center gap-2.5 text-left text-red-400 hover:bg-red-950/40 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete book</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
