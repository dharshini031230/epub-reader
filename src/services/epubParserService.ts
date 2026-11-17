import ePub, { type Book as EpubJsBook, type NavItem } from 'epubjs';
import type { ImportDraft, TocEntry } from '../types/library';
import { computeSha256 } from './libraryDomainService';

function stripHtml(input: string | undefined | null): string {
  if (!input) return '';
  if (typeof DOMParser !== 'undefined') {
    try {
      const doc = new DOMParser().parseFromString(input, 'text/html');
      return (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim();
    } catch {
      // Fallback to regex strip
    }
  }
  return input.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractYear(rawDate: string | undefined | null): string {
  if (!rawDate) return '';
  const match = rawDate.match(/\b(1\d{3}|20\d{2})\b/);
  return match ? match[1] : rawDate.trim().slice(0, 10);
}

function mapTocItems(items: NavItem[] | undefined): TocEntry[] {
  if (!Array.isArray(items)) return [];
  return items.map((item, index) => ({
    id: item.id || `toc-${index}-${item.href}`,
    label: (item.label || 'Untitled Section').replace(/\s+/g, ' ').trim(),
    href: item.href || '',
    subitems: item.subitems ? mapTocItems(item.subitems) : undefined,
  }));
}

async function extractCoverBuffer(
  book: EpubJsBook
): Promise<{ data: ArrayBuffer; mimeType: string; previewUrl: string } | null> {
  try {
    const coverUrl = await book.coverUrl();
    if (coverUrl) {
      const response = await fetch(coverUrl);
      if (response.ok) {
        const blob = await response.blob();
        if (blob.size > 0) {
          const data = await blob.arrayBuffer();
          const mimeType = blob.type || 'image/jpeg';
          const previewUrl = URL.createObjectURL(
            new Blob([data], { type: mimeType })
          );
          return { data, mimeType, previewUrl };
        }
      }
    }
  } catch {
    // Fall through to manifest inspection
  }

  // Fallback: inspect manifest directly for cover-image property or cover id/href
  try {
    const manifest = await book.loaded.manifest;
    const entries = Object.entries(manifest ?? {});
    const candidate = entries.find(([id, item]) => {
      const props = Array.isArray(item.properties) ? item.properties : [];
      const isImage =
        item.type?.startsWith('image/') ||
        /\.(jpe?g|png|webp|gif)$/i.test(item.href || '');
      if (!isImage) return false;
      return (
        props.includes('cover-image') ||
        /cover/i.test(id) ||
        /cover/i.test(item.href || '')
      );
    });

    if (candidate && book.archive) {
      const [, item] = candidate;
      const resolvedPath = book.path
        ? book.path.resolve(item.href)
        : item.href;
      const archiveRecord = book.archive as unknown as {
        getBlob?: (url: string, mimeType?: string) => Promise<Blob>;
        createUrl?: (url: string) => Promise<string>;
      };

      let blob: Blob | null = null;
      if (typeof archiveRecord.getBlob === 'function') {
        blob = await archiveRecord.getBlob(resolvedPath, item.type);
      } else if (typeof archiveRecord.createUrl === 'function') {
        const url = await archiveRecord.createUrl(resolvedPath);
        if (url) {
          const resp = await fetch(url);
          if (resp.ok) blob = await resp.blob();
        }
      }

      if (blob && blob.size > 0) {
        const data = await blob.arrayBuffer();
        const mimeType = blob.type || item.type || 'image/jpeg';
        const previewUrl = URL.createObjectURL(
          new Blob([data], { type: mimeType })
        );
        return { data, mimeType, previewUrl };
      }
    }
  } catch {
    // No cover extractable
  }

  return null;
}

function validateZipHeader(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 4) return false;
  const bytes = new Uint8Array(buffer, 0, 4);
  // EPUBs are ZIP archives starting with PK\x03\x04 (or PK\x05\x06 empty)
  return bytes[0] === 0x50 && bytes[1] === 0x4b;
}

export async function parseEpubFile(file: File): Promise<ImportDraft> {
  const arrayBuffer = await file.arrayBuffer();

  if (!validateZipHeader(arrayBuffer)) {
    throw new Error(
      `"${file.name}" does not appear to be a valid EPUB archive.`
    );
  }

  const checksum = await computeSha256(arrayBuffer);
  const fallbackTitle = file.name.replace(/\.epub$/i, '').replace(/[_-]+/g, ' ').trim();

  let epubBook: EpubJsBook | null = null;

  try {
    epubBook = ePub({ replacements: 'none' });
    await epubBook.open(arrayBuffer.slice(0), 'binary');
    await epubBook.ready;

    const [metadata, navigation, spine, coverResult] = await Promise.all([
      epubBook.loaded.metadata.catch(() => null),
      epubBook.loaded.navigation.catch(() => null),
      epubBook.loaded.spine.catch(() => null),
      extractCoverBuffer(epubBook),
    ]);

    // Ensure epubjs's internal unpack -> replacements -> replaceCss chain finishes
    // before destroy() clears book.resources in finally.
    await Promise.race([
      epubBook.opened,
      new Promise<void>((resolve) => setTimeout(resolve, 1500)),
    ]);

    const rawTitle = metadata?.title?.trim();
    const rawCreator = metadata?.creator?.trim();
    const rawPublisher = metadata?.publisher?.trim();
    const rawDescription = stripHtml(metadata?.description);
    const rawLanguage = metadata?.language?.trim() || 'en';
    const rawYear = extractYear(metadata?.pubdate);
    const rawIdentifier = metadata?.identifier?.trim() || '';

    const toc = mapTocItems(navigation?.toc);
    const spineItems = Array.isArray(spine) ? spine : [];
    const chapterCount =
      toc.length > 0 ? toc.length : spineItems.length;

    return {
      tempId: crypto.randomUUID(),
      fileName: file.name,
      fileSize: file.size,
      checksum,
      epubData: arrayBuffer,
      originalCoverData: coverResult?.data ?? null,
      originalCoverMimeType: coverResult?.mimeType ?? null,
      coverData: coverResult?.data ?? null,
      coverMimeType: coverResult?.mimeType ?? null,
      coverPreviewUrl: coverResult?.previewUrl ?? null,
      customCoverDesign: null,
      title: rawTitle || fallbackTitle || 'Untitled Volume',
      authorsInput: rawCreator || 'Unknown Author',
      publisher: rawPublisher || '',
      description: rawDescription,
      language: rawLanguage,
      publishedYear: rawYear,
      identifier: rawIdentifier,
      seriesName: '',
      seriesIndex: '',
      tagsInput: '',
      status: 'to-read',
      collectionIds: [],
      chapterCount,
      toc,
      duplicateBookId: null,
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Unable to read EPUB container.';
    throw new Error(`Failed to parse "${file.name}": ${message}`);
  } finally {
    if (epubBook) {
      try {
        await Promise.race([
          epubBook.opened?.catch(() => undefined) ?? Promise.resolve(),
          new Promise<void>((resolve) => setTimeout(resolve, 1000)),
        ]);
        epubBook.destroy();
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}
