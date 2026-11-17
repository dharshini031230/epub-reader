import ePub, { type Book as EpubBook, type Rendition } from 'epubjs';
import {
  AlertCircle,
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Highlighter,
  ListTree,
  Loader2,
  Settings2,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { bookStorageService } from '../../services/bookStorageService';
import {
  buildReaderIframeCss,
  getHighlightColorDefinition,
  resolveReaderTheme,
} from '../../services/readerThemeService';
import type {
  AnnotationRecord,
  BackupSettingsRecord,
  Book,
  BookmarkRecord,
  CustomFontRecord,
  HighlightColor,
  ReaderPreferences,
  ReadingStatus,
  StorageBreakdown,
  TocEntry,
} from '../../types/library';
import {
  ReaderNavigationPanel,
  type ReaderNavTab,
} from './ReaderNavigationPanel';
import {
  ReaderSelectionToolbar,
  type SelectionToolbarState,
} from './ReaderSelectionToolbar';
import { ReaderSettingsPanel } from './ReaderSettingsPanel';

interface ReaderViewProps {
  book: Book;
  initialCfi?: string | null;
  bookmarks: BookmarkRecord[];
  annotations: AnnotationRecord[];
  preferences: ReaderPreferences;
  customFonts: CustomFontRecord[];
  onClose: () => void;
  onUpdateReadingPosition: (
    bookId: string,
    payload: {
      currentCfi: string | null;
      progress: number;
      status?: ReadingStatus;
    }
  ) => Promise<Book>;
  onUpdateReadingState: (
    bookId: string,
    status: ReadingStatus,
    progress: number
  ) => Promise<Book>;
  onCreateBookmark: (
    bookId: string,
    cfi: string,
    label: string
  ) => Promise<BookmarkRecord>;
  onUpdateBookmark: (id: string, label: string) => Promise<BookmarkRecord>;
  onDeleteBookmark: (id: string) => Promise<void>;
  onCreateAnnotation: (payload: {
    bookId: string;
    cfiRange: string;
    text: string;
    note?: string;
    color?: HighlightColor;
    chapterLabel?: string;
  }) => Promise<AnnotationRecord>;
  onUpdateAnnotation: (
    id: string,
    patch: { note?: string; color?: HighlightColor }
  ) => Promise<AnnotationRecord>;
  onDeleteAnnotation: (id: string) => Promise<void>;
  onSavePreferences: (
    prefs: Omit<ReaderPreferences, 'id' | 'updatedAt'>
  ) => Promise<ReaderPreferences>;
  onUploadCustomFont: (file: File) => Promise<CustomFontRecord>;
  onDeleteCustomFont: (id: string) => Promise<void>;
  storageBreakdown?: StorageBreakdown | null;
  backupSettings?: BackupSettingsRecord;
  onOpenStorageSettings?: () => void;
}

interface RawNavItem {
  id?: string;
  label?: string;
  href?: string;
  subitems?: RawNavItem[];
}

function mapTocEntries(items: RawNavItem[] | undefined): TocEntry[] {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item) => Boolean(item?.href || item?.label))
    .map((item, idx) => ({
      id: item.id || `toc-${idx}-${(item.href ?? '').slice(0, 24)}`,
      label: (item.label ?? 'Untitled Section').trim(),
      href: item.href ?? '',
      subitems:
        item.subitems && item.subitems.length > 0
          ? mapTocEntries(item.subitems)
          : undefined,
    }));
}

function flattenTocEntries(entries: TocEntry[]): TocEntry[] {
  const flat: TocEntry[] = [];
  for (const entry of entries) {
    flat.push(entry);
    if (entry.subitems && entry.subitems.length > 0) {
      flat.push(...flattenTocEntries(entry.subitems));
    }
  }
  return flat;
}

function normalizeHref(href: string): string {
  return href.split('#')[0].replace(/^\.\//, '').trim().toLowerCase();
}

export function ReaderView({
  book,
  initialCfi,
  bookmarks,
  annotations,
  preferences,
  customFonts,
  onClose,
  onUpdateReadingPosition,
  onUpdateReadingState,
  onCreateBookmark,
  onUpdateBookmark,
  onDeleteBookmark,
  onCreateAnnotation,
  onUpdateAnnotation,
  onDeleteAnnotation,
  onSavePreferences,
  onUploadCustomFont,
  onDeleteCustomFont,
  storageBreakdown,
  backupSettings,
  onOpenStorageSettings,
}: ReaderViewProps) {
  const viewerContainerRef = useRef<HTMLDivElement>(null);
  const epubBookRef = useRef<EpubBook | null>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const locationsReadyRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);

  const [isBookLoading, setIsBookLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toc, setToc] = useState<TocEntry[]>(book.toc);
  const [currentCfi, setCurrentCfi] = useState<string | null>(
    initialCfi ?? book.currentCfi ?? null
  );
  const [currentHref, setCurrentHref] = useState<string>('');
  const [progress, setProgress] = useState<number>(book.progress);
  const [pageInfo, setPageInfo] = useState<{ page: number; total: number } | null>(
    null
  );
  const [atEndOfBook, setAtEndOfBook] = useState(false);

  const [showControls, setShowControls] = useState(true);
  const [navOpen, setNavOpen] = useState(false);
  const [navTab, setNavTab] = useState<ReaderNavTab>('contents');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectionToolbar, setSelectionToolbar] =
    useState<SelectionToolbarState | null>(null);

  const [statusPrompt, setStatusPrompt] = useState<
    null | 'started-reading' | 'offer-finished'
  >(null);
  const [readerNotice, setReaderNotice] = useState<string | null>(null);

  const latestCfiRef = useRef<string | null>(currentCfi);
  const latestProgressRef = useRef<number>(progress);
  const prefsRef = useRef(preferences);
  const customFontsRef = useRef(customFonts);
  const annotationsRef = useRef(annotations);
  const tocRef = useRef(toc);
  const appliedHighlightCfisRef = useRef<Map<string, string>>(new Map());

  prefsRef.current = preferences;
  customFontsRef.current = customFonts;
  annotationsRef.current = annotations;
  tocRef.current = toc;

  const bookBookmarks = useMemo(
    () => bookmarks.filter((b) => b.bookId === book.id),
    [bookmarks, book.id]
  );

  const bookAnnotations = useMemo(
    () => annotations.filter((a) => a.bookId === book.id),
    [annotations, book.id]
  );

  const currentChapterLabel = useMemo(() => {
    const flat = flattenTocEntries(toc);
    const targetNorm = normalizeHref(currentHref);
    if (!targetNorm) return '';
    const match = flat.find((item) => {
      const itemNorm = normalizeHref(item.href);
      return (
        itemNorm === targetNorm ||
        targetNorm.endsWith(itemNorm) ||
        itemNorm.endsWith(targetNorm)
      );
    });
    return match?.label ?? '';
  }, [toc, currentHref]);

  const isCurrentPageBookmarked = useMemo(() => {
    if (!currentCfi) return false;
    return bookBookmarks.some((bm) => bm.cfi === currentCfi);
  }, [bookBookmarks, currentCfi]);

  const readerTheme = useMemo(
    () => resolveReaderTheme(preferences),
    [preferences]
  );

  const notify = useCallback((msg: string) => {
    setReaderNotice(msg);
  }, []);

  useEffect(() => {
    if (!readerNotice) return;
    const t = window.setTimeout(() => setReaderNotice(null), 3200);
    return () => window.clearTimeout(t);
  }, [readerNotice]);

  // Flush debounced reading position immediately when requested or on exit
  const flushReadingPosition = useCallback(async () => {
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    try {
      await onUpdateReadingPosition(book.id, {
        currentCfi: latestCfiRef.current,
        progress: latestProgressRef.current,
      });
    } catch {
      // ignore flush errors during teardown
    }
  }, [book.id, onUpdateReadingPosition]);

  const schedulePositionSave = useCallback(
    (cfi: string | null, nextProgress: number) => {
      latestCfiRef.current = cfi;
      latestProgressRef.current = nextProgress;
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
      }
      saveTimerRef.current = window.setTimeout(() => {
        saveTimerRef.current = null;
        void onUpdateReadingPosition(book.id, {
          currentCfi: latestCfiRef.current,
          progress: latestProgressRef.current,
        });
      }, 600);
    },
    [book.id, onUpdateReadingPosition]
  );

  // Inject/refresh CSS inside all active EPUB iframe documents without losing CFI
  const applyIframeStyles = useCallback(() => {
    const rendition = renditionRef.current;
    if (!rendition) return;
    const css = buildReaderIframeCss(
      prefsRef.current,
      customFontsRef.current,
      prefsRef.current.readingMode
    );
    const rawContents = rendition.getContents() as unknown;
    const contentsList = Array.isArray(rawContents)
      ? rawContents
      : rawContents
        ? [rawContents]
        : [];

    for (const content of contentsList) {
      const doc = (content as { document?: Document }).document;
      if (!doc?.head) continue;
      let styleEl = doc.getElementById(
        'folio-reader-injected-style'
      ) as HTMLStyleElement | null;
      if (!styleEl) {
        styleEl = doc.createElement('style');
        styleEl.id = 'folio-reader-injected-style';
        doc.head.appendChild(styleEl);
      }
      styleEl.textContent = css;
    }
  }, []);

  // Reapply highlight SVG overlays onto the current rendition
  const syncRenditionHighlights = useCallback(() => {
    const rendition = renditionRef.current;
    if (!rendition) return;
    const theme = resolveReaderTheme(prefsRef.current);
    const currentAnns = annotationsRef.current.filter(
      (a) => a.bookId === book.id
    );
    const desiredMap = new Map<string, AnnotationRecord>();
    for (const ann of currentAnns) {
      desiredMap.set(ann.cfiRange, ann);
    }

    // Remove highlights that were deleted or changed color
    for (const [cfiRange, prevColor] of Array.from(
      appliedHighlightCfisRef.current.entries()
    )) {
      const nextAnn = desiredMap.get(cfiRange);
      if (!nextAnn || (nextAnn.color ?? 'yellow') !== prevColor) {
        try {
          rendition.annotations.remove(cfiRange, 'highlight');
        } catch {
          // ignore if section not rendered
        }
        appliedHighlightCfisRef.current.delete(cfiRange);
      }
    }

    // Add missing highlights
    for (const ann of currentAnns) {
      const color = ann.color ?? 'yellow';
      if (appliedHighlightCfisRef.current.has(ann.cfiRange)) continue;
      const colorDef = getHighlightColorDefinition(color);
      try {
        rendition.annotations.add(
          'highlight',
          ann.cfiRange,
          { id: ann.id },
          (event: MouseEvent) => {
            const iframeRect = (
              event.target as Element | null
            )?.ownerDocument?.defaultView?.frameElement?.getBoundingClientRect();
            const absX = (iframeRect?.left ?? 0) + event.clientX;
            const absY = (iframeRect?.top ?? 0) + event.clientY;
            setSelectionToolbar({
              cfiRange: ann.cfiRange,
              text: ann.text,
              x: absX || window.innerWidth / 2,
              y: absY || window.innerHeight / 2,
              existingAnnotation: ann,
            });
          },
          'folio-highlight',
          {
            fill: colorDef.fill,
            'fill-opacity': theme.isDark ? '0.42' : '0.48',
            'mix-blend-mode': theme.isDark ? 'screen' : 'multiply',
          }
        );
        appliedHighlightCfisRef.current.set(ann.cfiRange, color);
      } catch {
        // Ignore invalid/unrendered CFIs silently until chapter renders
      }
    }
  }, [book.id]);

  // Initialize or re-initialize EPUB rendition whenever book.id or readingMode changes
  useEffect(() => {
    let cancelled = false;
    let activeEpubBook: EpubBook | null = null;
    let activeRendition: Rendition | null = null;
    let openPromise: Promise<unknown> | null = null;

    const mountReader = async () => {
      setIsBookLoading(true);
      setLoadError(null);
      setSelectionToolbar(null);
      appliedHighlightCfisRef.current.clear();

      try {
        const container = viewerContainerRef.current;
        if (!container) return;
        container.innerHTML = '';

        const fileResult = await bookStorageService.getBookFileBlob(book.id);
        if (cancelled) return;
        if (!fileResult) {
          throw new Error(
            'This EPUB file binary could not be located in local storage.'
          );
        }

        const buffer = await fileResult.blob.arrayBuffer();
        if (cancelled) return;

        const epubBook = ePub();
        activeEpubBook = epubBook;
        epubBookRef.current = epubBook;

        openPromise = epubBook.open(buffer.slice(0), 'binary');
        await openPromise;
        await epubBook.ready;
        if (cancelled) return;

        // Load TOC from live EPUB navigation, falling back to spine sections if missing
        let resolvedToc: TocEntry[] = [];
        try {
          const nav = await epubBook.loaded.navigation;
          resolvedToc = mapTocEntries(nav?.toc as RawNavItem[] | undefined);
        } catch {
          resolvedToc = [];
        }
        if (resolvedToc.length === 0) {
          const spineItems = (
            epubBook.spine as unknown as {
              spineItems?: Array<{ href?: string; idref?: string }>;
            }
          ).spineItems;
          if (Array.isArray(spineItems)) {
            resolvedToc = spineItems.map((s, idx) => ({
              id: s.idref || `section-${idx}`,
              label: `Section ${idx + 1}`,
              href: s.href || '',
            }));
          }
        }
        if (!cancelled && resolvedToc.length > 0) {
          setToc(resolvedToc);
        }

        // Load cached EPUB locations if present
        locationsReadyRef.current = false;
        const cachedLocations = await bookStorageService.getBookLocations(
          book.id
        );
        if (!cancelled && cachedLocations?.locationsJson) {
          try {
            epubBook.locations.load(cachedLocations.locationsJson);
            locationsReadyRef.current = true;
          } catch {
            locationsReadyRef.current = false;
          }
        }

        const isScrolled = prefsRef.current.readingMode === 'scrolled';
        const rendition = epubBook.renderTo(container, {
          width: '100%',
          height: '100%',
          manager: isScrolled ? 'continuous' : 'default',
          flow: isScrolled ? 'scrolled' : 'paginated',
          spread: 'none',
          allowScriptedContent: false,
        });
        activeRendition = rendition;
        renditionRef.current = rendition;

        // Content hook: inject typography/theme styles, interaction handlers & external link protection
        rendition.hooks.content.register((contents: {
          document: Document;
          window: Window;
        }) => {
          const doc = contents.document;
          const win = contents.window;
          if (!doc) return;

          // Inject current stylesheet
          const css = buildReaderIframeCss(
            prefsRef.current,
            customFontsRef.current,
            prefsRef.current.readingMode
          );
          if (doc.head) {
            let styleEl = doc.getElementById(
              'folio-reader-injected-style'
            ) as HTMLStyleElement | null;
            if (!styleEl) {
              styleEl = doc.createElement('style');
              styleEl.id = 'folio-reader-injected-style';
              doc.head.appendChild(styleEl);
            }
            styleEl.textContent = css;
          }

          // Re-sync SVG highlights after content mounts
          window.setTimeout(() => {
            appliedHighlightCfisRef.current.clear();
            syncRenditionHighlights();
          }, 40);

          // Keyboard navigation from inside iframe
          doc.addEventListener('keydown', (e: KeyboardEvent) => {
            if (prefsRef.current.readingMode === 'paginated') {
              if (e.key === 'ArrowRight') {
                void rendition.next();
              } else if (e.key === 'ArrowLeft') {
                void rendition.prev();
              }
            }
          });

          // Mobile horizontal swipe in paginated mode (only when no text selected)
          let touchStartX = 0;
          let touchStartY = 0;
          doc.addEventListener(
            'touchstart',
            (e: TouchEvent) => {
              if (e.touches.length !== 1) return;
              touchStartX = e.touches[0].clientX;
              touchStartY = e.touches[0].clientY;
            },
            { passive: true }
          );
          doc.addEventListener(
            'touchend',
            (e: TouchEvent) => {
              if (prefsRef.current.readingMode !== 'paginated') return;
              if (e.changedTouches.length !== 1) return;
              const selText = win.getSelection()?.toString().trim() ?? '';
              if (selText.length > 0) return;

              const dx = e.changedTouches[0].clientX - touchStartX;
              const dy = e.changedTouches[0].clientY - touchStartY;
              if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.4) {
                if (dx < 0) {
                  void rendition.next();
                } else {
                  void rendition.prev();
                }
              }
            },
            { passive: true }
          );

          // Intercept external links cleanly & allow center tap to toggle reader controls
          doc.addEventListener('click', (e: MouseEvent) => {
            const target = e.target as Element | null;
            const anchor = target?.closest('a');
            if (anchor) {
              const rawHref = anchor.getAttribute('href') ?? '';
              if (/^https?:\/\//i.test(rawHref)) {
                e.preventDefault();
                notify(
                  `External link blocked inside quiet reader: ${rawHref}`
                );
              }
              return;
            }

            if (target?.closest('button, input, audio, video, details, summary')) {
              return;
            }

            const selectedStr = win.getSelection()?.toString().trim() ?? '';
            if (selectedStr.length > 0) return;

            setSelectionToolbar(null);

            const frameWidth = win.innerWidth || 800;
            const relX = e.clientX / frameWidth;
            if (prefsRef.current.readingMode === 'paginated') {
              if (relX < 0.14) {
                void rendition.prev();
                return;
              }
              if (relX > 0.86) {
                void rendition.next();
                return;
              }
            }
            setShowControls((prev) => !prev);
          });
        });

        // Selection handler for contextual Highlight / Note / Copy / Share toolbar
        rendition.on(
          'selected',
          (
            cfiRange: string,
            contents: { window: Window; document: Document }
          ) => {
            const sel = contents.window?.getSelection();
            const text = sel?.toString().trim() ?? '';
            if (!text || !sel || sel.rangeCount === 0) {
              setSelectionToolbar(null);
              return;
            }
            const range = sel.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            const iframeEl =
              contents.document?.defaultView?.frameElement ?? null;
            const iframeRect = iframeEl?.getBoundingClientRect();
            const absX =
              (iframeRect?.left ?? 0) + rect.left + rect.width / 2;
            const absY = (iframeRect?.top ?? 0) + rect.top;

            setSelectionToolbar({
              cfiRange,
              text,
              x: absX || window.innerWidth / 2,
              y: absY || window.innerHeight / 2,
              existingAnnotation: null,
            });
          }
        );

        // Track location updates, progress percentage, chapter label, and end-of-book
        rendition.on(
          'relocated',
          (location: {
            start?: {
              cfi?: string;
              href?: string;
              index?: number;
              percentage?: number;
              displayed?: { page?: number; total?: number };
            };
            atEnd?: boolean;
          }) => {
            if (cancelled) return;
            const start = location?.start;
            if (!start?.cfi) return;

            setCurrentCfi(start.cfi);
            if (start.href) {
              setCurrentHref(start.href);
            }
            if (
              start.displayed?.page !== undefined &&
              start.displayed?.total !== undefined
            ) {
              setPageInfo({
                page: start.displayed.page,
                total: start.displayed.total,
              });
            }

            let pct = 0;
            if (locationsReadyRef.current) {
              try {
                const computed = epubBook.locations.percentageFromCfi(
                  start.cfi
                );
                if (typeof computed === 'number' && !Number.isNaN(computed)) {
                  pct = Math.round(computed * 100);
                }
              } catch {
                pct = Math.round((start.percentage ?? 0) * 100);
              }
            } else {
              const totalSections =
                (
                  epubBook.spine as unknown as {
                    length?: number;
                  }
                ).length || Math.max(1, book.chapterCount || 1);
              const idx = start.index ?? 0;
              const innerPct = start.percentage ?? 0;
              if (innerPct > 0 && innerPct <= 1) {
                pct = Math.round(
                  ((idx + innerPct) / Math.max(1, totalSections)) * 100
                );
              } else {
                pct = Math.round((idx / Math.max(1, totalSections)) * 100);
              }
            }

            pct = Math.max(0, Math.min(100, pct));
            setProgress(pct);
            schedulePositionSave(start.cfi, pct);

            const totalSpine =
              (epubBook.spine as unknown as { length?: number }).length ?? 1;
            const isFinalChapter = (start.index ?? 0) >= totalSpine - 1;
            const reachedEnd =
              Boolean(location.atEnd) || (isFinalChapter && pct >= 98);
            setAtEndOfBook(reachedEnd);
            if (reachedEnd && book.status !== 'finished') {
              setStatusPrompt('offer-finished');
            } else if (!reachedEnd) {
              setStatusPrompt((prev) =>
                prev === 'offer-finished' ? null : prev
              );
            }
          }
        );

        const targetToDisplay =
          latestCfiRef.current || initialCfi || book.currentCfi || undefined;
        await rendition.display(targetToDisplay);
        if (cancelled) return;

        setIsBookLoading(false);

        // Transition 'to-read' -> 'reading' smoothly on open with optional undo banner
        if (book.status === 'to-read') {
          void onUpdateReadingState(book.id, 'reading', book.progress);
          setStatusPrompt('started-reading');
        }

        // Generate locations asynchronously after chapter displays (if not cached)
        if (!locationsReadyRef.current) {
          window.setTimeout(() => {
            if (cancelled) return;
            void epubBook.locations
              .generate(1200)
              .then(async () => {
                if (cancelled) return;
                locationsReadyRef.current = true;
                try {
                  const json = epubBook.locations.save();
                  await bookStorageService.saveBookLocations(book.id, json);
                } catch {
                  // ignore cache write issues
                }
                if (latestCfiRef.current) {
                  try {
                    const recomputed = Math.round(
                      epubBook.locations.percentageFromCfi(
                        latestCfiRef.current
                      ) * 100
                    );
                    if (!Number.isNaN(recomputed)) {
                      const clamped = Math.max(0, Math.min(100, recomputed));
                      setProgress(clamped);
                      schedulePositionSave(latestCfiRef.current, clamped);
                    }
                  } catch {
                    // ignore
                  }
                }
              })
              .catch(() => {
                // ignore malformed chapter location generation
              });
          }, 250);
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof Error
              ? err.message
              : 'This EPUB file could not be rendered.';
          setLoadError(message);
          setIsBookLoading(false);
        }
      }
    };

    void mountReader();

    return () => {
      cancelled = true;
      void flushReadingPosition();
      const destroyRendition = activeRendition;
      const destroyBook = activeEpubBook;
      renditionRef.current = null;
      epubBookRef.current = null;
      if (destroyRendition) {
        try {
          destroyRendition.destroy();
        } catch {
          // ignore cleanup errors
        }
      }
      if (destroyBook) {
        Promise.resolve(openPromise)
          .catch(() => undefined)
          .finally(() => {
            try {
              destroyBook.destroy();
            } catch {
              // ignore cleanup errors
            }
          });
      }
    };
    // Intentionally re-mount rendition only on book change or paginated/scrolled mode switch
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book.id, preferences.readingMode]);

  // Apply live CSS changes (theme, custom colors, font, typography, spacing) without reloading rendition
  useEffect(() => {
    applyIframeStyles();
  }, [applyIframeStyles, preferences, customFonts]);

  // Trigger EPUB.js resize smoothly when margins or column width change in paginated mode
  useEffect(() => {
    if (isBookLoading || !renditionRef.current || !viewerContainerRef.current) {
      return;
    }
    const timer = window.setTimeout(() => {
      const el = viewerContainerRef.current;
      const rendition = renditionRef.current;
      if (!el || !rendition) return;
      try {
        rendition.resize(el.clientWidth, el.clientHeight);
      } catch {
        // ignore resize before layout settled
      }
    }, 80);
    return () => window.clearTimeout(timer);
  }, [preferences.maxWidthPx, preferences.marginPx, isBookLoading]);

  // Re-sync annotations whenever bookAnnotations or theme changes
  useEffect(() => {
    syncRenditionHighlights();
  }, [bookAnnotations, preferences.themeId, syncRenditionHighlights]);

  // Global keyboard shortcuts inside Reader
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement | null)?.tagName;
      if (
        targetTag === 'INPUT' ||
        targetTag === 'TEXTAREA' ||
        targetTag === 'SELECT'
      ) {
        return;
      }
      if (e.key === 'Escape') {
        if (selectionToolbar) {
          setSelectionToolbar(null);
        } else if (settingsOpen) {
          setSettingsOpen(false);
        } else if (navOpen) {
          setNavOpen(false);
        }
        return;
      }
      if (
        !navOpen &&
        !settingsOpen &&
        preferences.readingMode === 'paginated'
      ) {
        if (e.key === 'ArrowRight') {
          void renditionRef.current?.next();
        } else if (e.key === 'ArrowLeft') {
          void renditionRef.current?.prev();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navOpen, settingsOpen, selectionToolbar, preferences.readingMode]);

  const handleBackToLibrary = async () => {
    await flushReadingPosition();
    onClose();
  };

  const handleNavigateHref = (href: string) => {
    if (!href) return;
    void renditionRef.current?.display(href).catch(() => {
      notify('Unable to locate that section inside the EPUB.');
    });
    setNavOpen(false);
  };

  const handleJumpToCfi = (cfi: string) => {
    if (!cfi) return;
    void renditionRef.current?.display(cfi).catch(() => {
      notify('Unable to jump to that reading location.');
    });
    setNavOpen(false);
  };

  const handleToggleQuickBookmark = async () => {
    if (!currentCfi) return;
    const existing = bookBookmarks.find((bm) => bm.cfi === currentCfi);
    if (existing) {
      await onDeleteBookmark(existing.id);
      notify('Removed bookmark.');
    } else {
      const label = currentChapterLabel || `Position ${progress}%`;
      await onCreateBookmark(book.id, currentCfi, label);
      notify(`Bookmarked "${label}".`);
    }
  };

  const handleChangePreferences = (
    patch: Partial<Omit<ReaderPreferences, 'id' | 'updatedAt'>>
  ) => {
    const nextPrefs = {
      readingMode: patch.readingMode ?? preferences.readingMode,
      themeId: patch.themeId ?? preferences.themeId,
      customBgColor: patch.customBgColor ?? preferences.customBgColor,
      customTextColor: patch.customTextColor ?? preferences.customTextColor,
      useOriginalStyling:
        patch.useOriginalStyling ?? preferences.useOriginalStyling,
      fontId: patch.fontId ?? preferences.fontId,
      fontSizePx: patch.fontSizePx ?? preferences.fontSizePx,
      fontWeight: patch.fontWeight ?? preferences.fontWeight,
      lineHeight: patch.lineHeight ?? preferences.lineHeight,
      paragraphSpacingEm:
        patch.paragraphSpacingEm ?? preferences.paragraphSpacingEm,
      letterSpacingEm: patch.letterSpacingEm ?? preferences.letterSpacingEm,
      textAlign: patch.textAlign ?? preferences.textAlign,
      marginPx: patch.marginPx ?? preferences.marginPx,
      maxWidthPx: patch.maxWidthPx ?? preferences.maxWidthPx,
    };
    void onSavePreferences(nextPrefs);
  };

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col overflow-hidden transition-colors duration-200"
      style={{
        backgroundColor: readerTheme.bg,
        color: readerTheme.text,
      }}
    >
      {/* Top Floating Minimal Toolbar */}
      <header
        className={`fixed top-0 inset-x-0 z-30 h-14 px-3 sm:px-6 flex items-center justify-between gap-2 bg-[#0B0B0E]/92 border-b border-white/[0.08] backdrop-blur-md text-[#F2EDE4] transition-transform duration-200 ${
          showControls ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => void handleBackToLibrary()}
            className="inline-flex items-center gap-1.5 px-2.5 py-2 min-h-[40px] rounded-md text-xs font-medium text-[#C8C1B6] hover:text-[#F2EDE4] hover:bg-white/[0.06] cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-[#D99B43]" />
            <span className="hidden sm:inline">Back to Library</span>
          </button>

          <div className="h-4 w-px bg-white/[0.1] hidden sm:block" />

          <div className="min-w-0 pl-1">
            <h1 className="font-serif text-sm text-[#F2EDE4] truncate max-w-[160px] sm:max-w-xs md:max-w-md">
              {book.title}
            </h1>
            {currentChapterLabel && (
              <p className="text-[11px] text-[#8E877D] truncate max-w-[160px] sm:max-w-xs hidden sm:block">
                {currentChapterLabel}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              setNavTab('contents');
              setNavOpen(true);
            }}
            aria-label="Table of contents"
            title="Table of contents"
            className="inline-flex items-center gap-1.5 px-2.5 py-2 min-h-[40px] min-w-[40px] justify-center rounded-md text-xs text-[#C8C1B6] hover:text-[#F2EDE4] hover:bg-white/[0.06] cursor-pointer"
          >
            <ListTree className="w-4 h-4" />
            <span className="hidden md:inline">Contents</span>
          </button>

          <button
            type="button"
            onClick={() => void handleToggleQuickBookmark()}
            aria-label={
              isCurrentPageBookmarked ? 'Remove bookmark' : 'Bookmark page'
            }
            title={
              isCurrentPageBookmarked
                ? 'Bookmarked (click to remove)'
                : 'Bookmark current page'
            }
            className={`inline-flex items-center gap-1.5 px-2.5 py-2 min-h-[40px] min-w-[40px] justify-center rounded-md text-xs transition-colors cursor-pointer ${
              isCurrentPageBookmarked
                ? 'text-[#D99B43] bg-[#D99B43]/12'
                : 'text-[#C8C1B6] hover:text-[#F2EDE4] hover:bg-white/[0.06]'
            }`}
          >
            {isCurrentPageBookmarked ? (
              <BookmarkCheck className="w-4 h-4" />
            ) : (
              <Bookmark className="w-4 h-4" />
            )}
            <span className="hidden lg:inline">Bookmark</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setNavTab('highlights');
              setNavOpen(true);
            }}
            aria-label="Highlights and notes"
            title="Highlights and notes"
            className="inline-flex items-center gap-1.5 px-2.5 py-2 min-h-[40px] min-w-[40px] justify-center rounded-md text-xs text-[#C8C1B6] hover:text-[#F2EDE4] hover:bg-white/[0.06] cursor-pointer"
          >
            <Highlighter className="w-4 h-4" />
            <span className="hidden lg:inline">
              Notes{bookAnnotations.length > 0 ? ` (${bookAnnotations.length})` : ''}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-label="Reading settings"
            title="Reading settings"
            className="inline-flex items-center gap-1.5 px-2.5 py-2 min-h-[40px] min-w-[40px] justify-center rounded-md text-xs text-[#C8C1B6] hover:text-[#F2EDE4] hover:bg-white/[0.06] cursor-pointer"
          >
            <Settings2 className="w-4 h-4" />
            <span className="hidden md:inline">Settings</span>
          </button>
        </div>
      </header>

      {/* Main Reading Viewport */}
      <div className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden">
        {isBookLoading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 pointer-events-none">
            <Loader2 className="w-7 h-7 animate-spin text-[#D99B43]" />
            <p className="text-xs font-medium opacity-75">
              Opening “{book.title}”…
            </p>
          </div>
        )}

        {loadError && (
          <div className="relative z-20 max-w-md mx-4 p-6 rounded-lg bg-[#141418] border border-red-500/35 text-[#F2EDE4] space-y-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h2 className="font-serif text-lg">Unable to Open Volume</h2>
                <p className="text-xs text-[#A69F93] leading-relaxed">
                  {loadError}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void handleBackToLibrary()}
              className="px-4 py-2 rounded-md bg-[#D99B43] text-[#08080A] text-xs font-semibold cursor-pointer"
            >
              Return to Library
            </button>
          </div>
        )}

        {/* Paginated Side Controls (subtle on desktop, never obstructing text) */}
        {preferences.readingMode === 'paginated' && !loadError && (
          <>
            <button
              type="button"
              onClick={() => void renditionRef.current?.prev()}
              aria-label="Previous page"
              className={`hidden sm:flex fixed left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-16 items-center justify-center rounded-md transition-opacity duration-200 cursor-pointer ${
                showControls ? 'opacity-75 hover:opacity-100' : 'opacity-0 hover:opacity-75'
              }`}
              style={{ color: readerTheme.muted }}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <button
              type="button"
              onClick={() => void renditionRef.current?.next()}
              aria-label="Next page"
              className={`hidden sm:flex fixed right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-16 items-center justify-center rounded-md transition-opacity duration-200 cursor-pointer ${
                showControls ? 'opacity-75 hover:opacity-100' : 'opacity-0 hover:opacity-75'
              }`}
              style={{ color: readerTheme.muted }}
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}

        {/* EPUB.js Render Container */}
        <div
          className="w-full h-full mx-auto transition-[max-width,padding] duration-200"
          style={
            preferences.readingMode === 'paginated'
              ? {
                  maxWidth: `${preferences.maxWidthPx + preferences.marginPx * 2}px`,
                  paddingTop: '58px',
                  paddingBottom: '48px',
                  paddingLeft: `${preferences.marginPx}px`,
                  paddingRight: `${preferences.marginPx}px`,
                }
              : {
                  width: '100%',
                  paddingTop: '56px',
                  paddingBottom: '40px',
                }
          }
        >
          <div
            ref={viewerContainerRef}
            className="w-full h-full"
            data-testid="epub-rendition-stage"
          />
        </div>
      </div>

      {/* Status Prompts (non-intrusive banner above footer) */}
      {statusPrompt === 'started-reading' && (
        <div className="fixed bottom-14 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-4 py-2 rounded-lg bg-[#15151C]/95 border border-white/[0.12] text-xs text-[#F2EDE4] shadow-xl">
          <span>Marked as Reading</span>
          <button
            type="button"
            onClick={() => {
              void onUpdateReadingState(book.id, 'to-read', 0);
              setStatusPrompt(null);
            }}
            className="text-[#D99B43] hover:text-[#E8B15C] font-medium cursor-pointer"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={() => setStatusPrompt(null)}
            className="text-[#6E685F] hover:text-[#F2EDE4] cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {statusPrompt === 'offer-finished' && atEndOfBook && (
        <div className="fixed bottom-14 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-4 py-2.5 rounded-lg bg-[#15151C]/98 border border-[#D99B43]/40 text-xs text-[#F2EDE4] shadow-2xl">
          <CheckCircle2 className="w-4 h-4 text-[#D99B43] shrink-0" />
          <span>Reached the end of this volume.</span>
          <button
            type="button"
            onClick={async () => {
              await onUpdateReadingState(book.id, 'finished', 100);
              setProgress(100);
              setStatusPrompt(null);
              notify(`Marked "${book.title}" as Finished.`);
            }}
            className="px-3 py-1 rounded bg-[#D99B43] hover:bg-[#E8B15C] text-[#08080A] font-semibold cursor-pointer"
          >
            Mark as Finished
          </button>
          <button
            type="button"
            onClick={() => setStatusPrompt(null)}
            className="text-[#A69F93] hover:text-[#F2EDE4] cursor-pointer"
          >
            Not yet
          </button>
        </div>
      )}

      {/* Brief Transient Notice */}
      {readerNotice && (
        <div
          role="status"
          className="fixed top-16 left-1/2 -translate-x-1/2 z-40 px-3.5 py-1.5 rounded-md bg-[#16161D]/95 border border-[#D99B43]/40 text-xs text-[#F2EDE4] shadow-lg"
        >
          {readerNotice}
        </div>
      )}

      {/* Subtle Bottom Progress Bar */}
      <footer
        className={`fixed bottom-0 inset-x-0 z-30 h-11 px-4 sm:px-6 flex items-center justify-between gap-4 bg-[#0B0B0E]/92 border-t border-white/[0.08] backdrop-blur-md text-xs text-[#A69F93] transition-transform duration-200 ${
          showControls ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {preferences.readingMode === 'paginated' && (
            <div className="flex items-center gap-1 sm:hidden">
              <button
                type="button"
                onClick={() => void renditionRef.current?.prev()}
                aria-label="Previous page"
                className="p-1.5 rounded hover:bg-white/[0.08] text-[#F2EDE4] cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => void renditionRef.current?.next()}
                aria-label="Next page"
                className="p-1.5 rounded hover:bg-white/[0.08] text-[#F2EDE4] cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
          <span className="truncate max-w-[180px] sm:max-w-md text-[11px]">
            {currentChapterLabel || book.authors.join(', ') || 'Reading'}
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0 font-mono text-[11px] tabular-nums">
          {pageInfo && preferences.readingMode === 'paginated' && (
            <span className="text-[#8E877D]">
              p. {pageInfo.page} / {pageInfo.total}
            </span>
          )}
          <span className="text-[#D99B43] font-medium">{progress}%</span>
        </div>
      </footer>

      {/* Floating Selection Toolbar */}
      <ReaderSelectionToolbar
        selection={selectionToolbar}
        bookTitle={book.title}
        onHighlight={async (cfiRange, text, color, note) => {
          await onCreateAnnotation({
            bookId: book.id,
            cfiRange,
            text,
            color,
            note,
            chapterLabel: currentChapterLabel,
          });
          notify('Highlight saved.');
        }}
        onUpdateAnnotation={async (id, patch) => {
          await onUpdateAnnotation(id, patch);
          notify('Highlight updated.');
        }}
        onDeleteAnnotation={async (id) => {
          await onDeleteAnnotation(id);
          notify('Highlight removed.');
        }}
        onDismiss={() => setSelectionToolbar(null)}
        onNotify={notify}
      />

      {/* Left Slide-Over Navigation Drawer (TOC, Bookmarks, Highlights & Notes) */}
      <ReaderNavigationPanel
        isOpen={navOpen}
        activeTab={navTab}
        onTabChange={setNavTab}
        onClose={() => setNavOpen(false)}
        bookTitle={book.title}
        toc={toc}
        activeHref={currentHref}
        currentCfi={currentCfi}
        currentChapterLabel={currentChapterLabel}
        bookmarks={bookBookmarks}
        annotations={bookAnnotations}
        onNavigateToHref={handleNavigateHref}
        onJumpToCfi={handleJumpToCfi}
        onCreateBookmark={async (label) => {
          if (!currentCfi) return;
          await onCreateBookmark(book.id, currentCfi, label);
          notify('Bookmark added.');
        }}
        onUpdateBookmark={async (id, label) => {
          await onUpdateBookmark(id, label);
        }}
        onDeleteBookmark={async (id) => {
          await onDeleteBookmark(id);
        }}
        onUpdateAnnotation={async (id, patch) => {
          await onUpdateAnnotation(id, patch);
        }}
        onDeleteAnnotation={async (id) => {
          await onDeleteAnnotation(id);
        }}
      />

      {/* Right Slide-Over Reading Settings Drawer */}
      <ReaderSettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        preferences={preferences}
        customFonts={customFonts}
        onChangePreferences={handleChangePreferences}
        onUploadCustomFont={onUploadCustomFont}
        onDeleteCustomFont={onDeleteCustomFont}
        storageBreakdown={storageBreakdown}
        backupSettings={backupSettings}
        onOpenStorageSettings={onOpenStorageSettings}
      />
    </div>
  );
}
