import { Check, Plus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { parseSeriesIndex } from '../services/libraryDomainService';
import type {
  Book,
  Collection,
  SeriesRecord,
  TagRecord,
} from '../types/library';

/* ---------------- MANAGE COLLECTIONS MODAL ---------------- */

interface ManageCollectionsModalProps {
  book: Book | null;
  collections: Collection[];
  onClose: () => void;
  onSetBookCollections: (
    bookId: string,
    collectionIds: string[]
  ) => Promise<void>;
  onCreateCollection: (name: string, description: string) => Promise<Collection>;
}

export function ManageCollectionsModal({
  book,
  collections,
  onClose,
  onSetBookCollections,
  onCreateCollection,
}: ManageCollectionsModalProps) {
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setNewName('');
    setError(null);
  }, [book?.id]);

  useEffect(() => {
    if (!book) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [book, onClose]);

  if (!book) return null;

  const memberIds = collections
    .filter((c) => c.bookIds.includes(book.id))
    .map((c) => c.id);

  const toggleCollection = async (colId: string) => {
    setError(null);
    const exists = memberIds.includes(colId);
    const next = exists
      ? memberIds.filter((id) => id !== colId)
      : [...memberIds, colId];
    await onSetBookCollections(book.id, next);
  };

  const handleCreateAndAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newName.trim();
    if (!clean || busy) return;
    setBusy(true);
    setError(null);
    try {
      const created = await onCreateCollection(clean, '');
      await onSetBookCollections(book.id, [...memberIds, created.id]);
      setNewName('');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to create collection.'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="manage-collections-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-lg bg-[#111116] border border-white/[0.12] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08]">
          <div className="min-w-0">
            <h2
              id="manage-collections-title"
              className="font-serif text-lg font-medium text-[#F2EDE4]"
            >
              Manage Collections
            </h2>
            <p className="text-xs text-[#A69F93] truncate">{book.title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-md text-[#A69F93] hover:text-[#F2EDE4] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && <p className="text-xs text-red-300">{error}</p>}

          {collections.length === 0 ? (
            <p className="text-xs text-[#6E685F]">
              No collections yet. Create your first collection below.
            </p>
          ) : (
            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
              {collections.map((col) => {
                const checked = memberIds.includes(col.id);
                return (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => void toggleCollection(col.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md border text-left text-xs transition-colors cursor-pointer ${
                      checked
                        ? 'bg-[#D99B43]/12 border-[#D99B43]/50 text-[#F2EDE4]'
                        : 'bg-[#18181F] border-white/[0.06] text-[#A69F93] hover:text-[#F2EDE4]'
                    }`}
                  >
                    <span className="truncate font-medium">{col.name}</span>
                    <span
                      className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                        checked
                          ? 'bg-[#D99B43] border-[#D99B43] text-[#08080A]'
                          : 'border-white/20'
                      }`}
                    >
                      {checked && <Check className="w-3 h-3 stroke-[2.5]" />}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <form
            onSubmit={(e) => void handleCreateAndAssign(e)}
            className="flex items-center gap-2 pt-2 border-t border-white/[0.08]"
          >
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New collection name..."
              aria-label="New collection name"
              className="flex-1 h-9 px-3 rounded-md bg-[#18181F] border border-white/[0.1] text-xs text-[#F2EDE4] placeholder:text-[#6E685F] focus:outline-none focus:border-[#D99B43]"
            />
            <button
              type="submit"
              disabled={!newName.trim() || busy}
              className="h-9 px-3 inline-flex items-center gap-1 rounded-md bg-[#202029] hover:bg-[#2A2A35] disabled:opacity-40 text-xs font-medium text-[#F2EDE4] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create</span>
            </button>
          </form>
        </div>

        <div className="px-6 py-3.5 border-t border-white/[0.08] bg-[#0D0D11] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-md bg-[#D99B43] hover:bg-[#E8B15C] text-[#08080A] text-xs font-semibold cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- MANAGE SERIES MODAL ---------------- */

interface ManageSeriesModalProps {
  book: Book | null;
  seriesList: SeriesRecord[];
  onClose: () => void;
  onSetBookSeries: (
    bookId: string,
    seriesName: string,
    seriesIndex: number | null
  ) => Promise<void>;
}

export function ManageSeriesModal({
  book,
  seriesList,
  onClose,
  onSetBookSeries,
}: ManageSeriesModalProps) {
  const [seriesName, setSeriesName] = useState('');
  const [seriesIndex, setSeriesIndex] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!book) return;
    setSeriesName(book.seriesName);
    setSeriesIndex(book.seriesIndex !== null ? String(book.seriesIndex) : '');
  }, [book]);

  useEffect(() => {
    if (!book) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [book, onClose]);

  if (!book) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSetBookSeries(
        book.id,
        seriesName.trim(),
        parseSeriesIndex(seriesIndex)
      );
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveFromSeries = async () => {
    setSaving(true);
    try {
      await onSetBookSeries(book.id, '', null);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="manage-series-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={(e) => void handleSave(e)}
        className="w-full max-w-md rounded-lg bg-[#111116] border border-white/[0.12] shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08]">
          <div className="min-w-0">
            <h2
              id="manage-series-title"
              className="font-serif text-lg font-medium text-[#F2EDE4]"
            >
              Manage Series
            </h2>
            <p className="text-xs text-[#A69F93] truncate">{book.title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-md text-[#A69F93] hover:text-[#F2EDE4] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {seriesList.length > 0 && (
            <div className="space-y-1.5">
              <span className="block text-xs text-[#A69F93]">
                Choose Existing Series
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                {seriesList.map((s) => {
                  const selected =
                    s.name.toLowerCase() === seriesName.trim().toLowerCase();
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSeriesName(s.name)}
                      className={`px-2.5 py-1 rounded text-xs border transition-colors cursor-pointer ${
                        selected
                          ? 'bg-[#D99B43]/15 border-[#D99B43]/60 text-[#E8B15C]'
                          : 'bg-[#18181F] border-white/[0.08] text-[#A69F93] hover:text-[#F2EDE4]'
                      }`}
                    >
                      {s.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <label
              htmlFor="modal-series-name"
              className="block text-xs text-[#A69F93] mb-1.5"
            >
              Series Name
            </label>
            <input
              id="modal-series-name"
              type="text"
              value={seriesName}
              onChange={(e) => setSeriesName(e.target.value)}
              placeholder="Enter series title or create new..."
              className="w-full h-10 px-3 rounded-md bg-[#18181F] border border-white/[0.1] text-sm text-[#F2EDE4] placeholder:text-[#6E685F] focus:outline-none focus:border-[#D99B43]"
            />
          </div>

          <div>
            <label
              htmlFor="modal-series-index"
              className="block text-xs text-[#A69F93] mb-1.5"
            >
              Book Number in Series
            </label>
            <input
              id="modal-series-index"
              type="number"
              min="0"
              step="0.5"
              value={seriesIndex}
              onChange={(e) => setSeriesIndex(e.target.value)}
              placeholder="e.g. 1, 2, 2.5"
              className="w-full h-10 px-3 rounded-md bg-[#18181F] border border-white/[0.1] text-sm font-mono tabular-nums text-[#F2EDE4] placeholder:text-[#6E685F] focus:outline-none focus:border-[#D99B43]"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-white/[0.08] bg-[#0D0D11] flex items-center justify-between gap-3">
          {book.seriesName ? (
            <button
              type="button"
              onClick={() => void handleRemoveFromSeries()}
              disabled={saving}
              className="text-xs text-[#A69F93] hover:text-red-400 transition-colors cursor-pointer"
            >
              Remove from Series
            </button>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-md border border-white/[0.12] text-xs text-[#A69F93] hover:text-[#F2EDE4] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-md bg-[#D99B43] hover:bg-[#E8B15C] text-[#08080A] text-xs font-semibold cursor-pointer"
            >
              Save Series
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

/* ---------------- MANAGE TAGS MODAL ---------------- */

interface ManageTagsModalProps {
  book: Book | null;
  tagRecords: TagRecord[];
  allBookTags: string[];
  onClose: () => void;
  onSetBookTags: (bookId: string, tagNames: string[]) => Promise<void>;
}

export function ManageTagsModal({
  book,
  tagRecords,
  allBookTags,
  onClose,
  onSetBookTags,
}: ManageTagsModalProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!book) return;
    setSelectedTags(book.tagNames);
    setNewTagInput('');
  }, [book]);

  useEffect(() => {
    if (!book) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [book, onClose]);

  if (!book) return null;

  const combinedAvailable = Array.from(
    new Map(
      [
        ...tagRecords.map((t) => t.name),
        ...allBookTags,
        ...selectedTags,
      ]
        .map((t) => t.trim())
        .filter(Boolean)
        .map((t) => [t.toLowerCase(), t])
    ).values()
  ).sort((a, b) => a.localeCompare(b));

  const toggleTag = (tagName: string) => {
    const exists = selectedTags.some(
      (t) => t.toLowerCase() === tagName.toLowerCase()
    );
    if (exists) {
      setSelectedTags((prev) =>
        prev.filter((t) => t.toLowerCase() !== tagName.toLowerCase())
      );
    } else {
      setSelectedTags((prev) => [...prev, tagName]);
    }
  };

  const handleAddCustomTag = () => {
    const clean = newTagInput.trim();
    if (!clean) return;
    if (
      !selectedTags.some((t) => t.toLowerCase() === clean.toLowerCase())
    ) {
      setSelectedTags((prev) => [...prev, clean]);
    }
    setNewTagInput('');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSetBookTags(book.id, selectedTags);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="manage-tags-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-lg bg-[#111116] border border-white/[0.12] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08]">
          <div className="min-w-0">
            <h2
              id="manage-tags-title"
              className="font-serif text-lg font-medium text-[#F2EDE4]"
            >
              Manage Tags
            </h2>
            <p className="text-xs text-[#A69F93] truncate">{book.title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-md text-[#A69F93] hover:text-[#F2EDE4] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newTagInput}
              onChange={(e) => setNewTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCustomTag();
                }
              }}
              placeholder="Create or add custom tag..."
              aria-label="Create custom tag"
              className="flex-1 h-9 px-3 rounded-md bg-[#18181F] border border-white/[0.1] text-xs text-[#F2EDE4] placeholder:text-[#6E685F] focus:outline-none focus:border-[#D99B43]"
            />
            <button
              type="button"
              onClick={handleAddCustomTag}
              disabled={!newTagInput.trim()}
              className="h-9 px-3 inline-flex items-center gap-1 rounded-md bg-[#202029] hover:bg-[#2A2A35] disabled:opacity-40 text-xs font-medium text-[#F2EDE4] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>

          {combinedAvailable.length === 0 ? (
            <p className="text-xs text-[#6E685F]">
              No tags created yet. Type any custom tag above.
            </p>
          ) : (
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {combinedAvailable.map((tagName) => {
                const checked = selectedTags.some(
                  (t) => t.toLowerCase() === tagName.toLowerCase()
                );
                return (
                  <button
                    key={tagName}
                    type="button"
                    onClick={() => toggleTag(tagName)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-md border text-left text-xs transition-colors cursor-pointer ${
                      checked
                        ? 'bg-[#D99B43]/12 border-[#D99B43]/50 text-[#F2EDE4]'
                        : 'bg-[#18181F] border-white/[0.06] text-[#A69F93] hover:text-[#F2EDE4]'
                    }`}
                  >
                    <span className="truncate">{tagName}</span>
                    <span
                      className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                        checked
                          ? 'bg-[#D99B43] border-[#D99B43] text-[#08080A]'
                          : 'border-white/20'
                      }`}
                    >
                      {checked && <Check className="w-3 h-3 stroke-[2.5]" />}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-white/[0.08] bg-[#0D0D11] flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-md border border-white/[0.12] text-xs text-[#A69F93] hover:text-[#F2EDE4] cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="px-4 py-2 rounded-md bg-[#D99B43] hover:bg-[#E8B15C] text-[#08080A] text-xs font-semibold cursor-pointer"
          >
            Save Tags
          </button>
        </div>
      </div>
    </div>
  );
}
