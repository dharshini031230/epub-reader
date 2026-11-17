import {
  Check,
  Edit3,
  Plus,
  Tag as TagIcon,
  Trash2,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { summarizeTags } from '../services/libraryDomainService';
import type { Book, TagRecord, TagSummary } from '../types/library';
import { BookCard, type BookMenuHandlers } from './BookCard';
import { EntityDeleteModal } from './EntityDeleteModal';

interface TagsViewProps {
  books: Book[];
  tagRecords: TagRecord[];
  coverUrls: Record<string, string>;
  onSelectBook: (book: Book) => void;
  bookMenuHandlers: BookMenuHandlers;
  onCreateTag: (name: string) => Promise<TagRecord>;
  onRenameTag: (oldTag: string, newTag: string) => Promise<void>;
  onDeleteTag: (tag: string) => Promise<void>;
  onNotify: (message: string) => void;
}

export function TagsView({
  books,
  tagRecords,
  coverUrls,
  onSelectBook,
  bookMenuHandlers,
  onCreateTag,
  onRenameTag,
  onDeleteTag,
  onNotify,
}: TagsViewProps) {
  const tags = useMemo(
    () => summarizeTags(books, tagRecords),
    [books, tagRecords]
  );

  const [newTagName, setNewTagName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [selectedTagName, setSelectedTagName] = useState<string | null>(null);
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [tagPendingDelete, setTagPendingDelete] = useState<TagSummary | null>(
    null
  );

  const selectedTagSummary = useMemo(
    () =>
      tags.find(
        (t) =>
          selectedTagName &&
          t.name.toLowerCase() === selectedTagName.toLowerCase()
      ) ?? null,
    [tags, selectedTagName]
  );

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    const clean = newTagName.trim();
    if (!clean) {
      setCreateError('Please enter a tag name.');
      return;
    }
    try {
      const created = await onCreateTag(clean);
      setNewTagName('');
      setSelectedTagName(created.name);
      onNotify(`Created tag "${created.name}".`);
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : 'Unable to create tag.'
      );
    }
  };

  const handleCommitRename = async (oldName: string) => {
    const clean = renameValue.trim();
    if (!clean || clean === oldName) {
      setEditingTag(null);
      return;
    }
    await onRenameTag(oldName, clean);
    if (selectedTagName?.toLowerCase() === oldName.toLowerCase()) {
      setSelectedTagName(clean);
    }
    setEditingTag(null);
    onNotify(`Renamed tag "${oldName}" to "${clean}".`);
  };

  const handleConfirmDeleteTag = async () => {
    if (!tagPendingDelete) return;
    const deletedName = tagPendingDelete.name;
    await onDeleteTag(deletedName);
    if (selectedTagName?.toLowerCase() === deletedName.toLowerCase()) {
      setSelectedTagName(null);
    }
    setTagPendingDelete(null);
    onNotify(
      `Deleted tag "${deletedName}". Associated books remain safely in your library.`
    );
  };

  return (
    <section aria-labelledby="tags-heading" className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div className="space-y-2">
          <h1
            id="tags-heading"
            className="font-serif text-3xl sm:text-4xl font-medium tracking-tight text-[#F2EDE4]"
          >
            Tags
          </h1>
          <p className="text-sm text-[#A69F93] tabular-nums">
            {tags.length} {tags.length === 1 ? 'custom tag' : 'custom tags'}{' '}
            indexed
          </p>
        </div>

        <form
          onSubmit={(e) => void handleCreateTag(e)}
          className="flex items-center gap-2 self-start sm:self-auto"
        >
          <input
            type="text"
            value={newTagName}
            onChange={(e) => {
              setNewTagName(e.target.value);
              setCreateError(null);
            }}
            placeholder="Create custom tag..."
            aria-label="New custom tag name"
            className="h-9 px-3 rounded-md bg-[#131318] border border-white/[0.1] text-xs text-[#F2EDE4] placeholder:text-[#6E685F] focus:outline-none focus:border-[#D99B43]"
          />
          <button
            type="submit"
            className="h-9 px-3.5 inline-flex items-center gap-1.5 rounded-md bg-[#18181F] hover:bg-[#22222C] border border-white/[0.12] text-xs font-medium text-[#F2EDE4] whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#D99B43]" />
            <span>Create Tag</span>
          </button>
        </form>
      </div>

      {createError && (
        <p role="alert" className="text-xs text-red-300">
          {createError}
        </p>
      )}

      {tags.length === 0 ? (
        <div className="py-20 px-6 rounded-lg border border-white/[0.08] bg-[#0E0E12] text-center max-w-2xl mx-auto">
          <div className="w-12 h-12 rounded-md bg-[#18181F] border border-white/[0.08] flex items-center justify-center mx-auto mb-5 text-[#D99B43]">
            <TagIcon className="w-5 h-5" aria-hidden="true" />
          </div>
          <h2 className="font-serif text-2xl font-medium text-[#F2EDE4]">
            No tags cataloged yet
          </h2>
          <p className="mt-2 text-sm text-[#A69F93] max-w-md mx-auto">
            Create any custom tag above or assign tags to books using the book
            menu to build your personal index.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-8 items-start">
          {/* Tabular Tag Index */}
          <div className="rounded-lg border border-white/[0.08] bg-[#111116] overflow-hidden">
            <div className="px-4 py-3 border-b border-white/[0.08] flex items-center justify-between text-xs text-[#6E685F]">
              <span>Tag</span>
              <span>Books</span>
            </div>
            <ul className="divide-y divide-white/[0.06]">
              {tags.map((tag) => {
                const isSelected =
                  selectedTagSummary?.name.toLowerCase() ===
                  tag.name.toLowerCase();
                const isEditing = editingTag === tag.name;

                return (
                  <li
                    key={tag.name}
                    className={`px-4 py-3 transition-colors ${
                      isSelected ? 'bg-[#1A1A22]' : 'hover:bg-[#15151B]'
                    }`}
                  >
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              void handleCommitRename(tag.name);
                            } else if (e.key === 'Escape') {
                              setEditingTag(null);
                            }
                          }}
                          autoFocus
                          aria-label={`Rename tag ${tag.name}`}
                          className="flex-1 h-8 px-2.5 rounded bg-[#0B0B0E] border border-[#D99B43]/60 text-xs text-[#F2EDE4] focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => void handleCommitRename(tag.name)}
                          aria-label="Confirm rename"
                          className="p-1.5 text-[#D99B43] hover:text-[#E8B15C] cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingTag(null)}
                          aria-label="Cancel rename"
                          className="p-1.5 text-[#6E685F] hover:text-[#F2EDE4] cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => setSelectedTagName(tag.name)}
                          className="flex-1 text-left min-w-0 cursor-pointer"
                        >
                          <span
                            className={`text-sm font-medium block truncate ${
                              isSelected ? 'text-[#E8B15C]' : 'text-[#F2EDE4]'
                            }`}
                          >
                            {tag.name}
                          </span>
                          <span className="text-[11px] text-[#6E685F] tabular-nums">
                            {tag.readingCount} reading · {tag.finishedCount}{' '}
                            finished
                          </span>
                        </button>

                        <div className="flex items-center gap-1 shrink-0">
                          <span className="font-mono text-xs tabular-nums text-[#A69F93] mr-2">
                            {tag.bookCount}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTag(tag.name);
                              setRenameValue(tag.name);
                            }}
                            aria-label={`Rename tag ${tag.name}`}
                            className="p-1.5 rounded text-[#6E685F] hover:text-[#F2EDE4] transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setTagPendingDelete(tag)}
                            aria-label={`Delete tag ${tag.name}`}
                            className="p-1.5 rounded text-[#6E685F] hover:text-red-400 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Selected Tag Shelf */}
          <div className="space-y-6">
            {selectedTagSummary ? (
              <>
                <div className="flex items-baseline justify-between border-b border-white/[0.08] pb-3">
                  <h2 className="font-serif text-2xl text-[#F2EDE4]">
                    {selectedTagSummary.name}
                  </h2>
                  <span className="font-mono text-xs tabular-nums text-[#A69F93]">
                    {selectedTagSummary.bookCount}{' '}
                    {selectedTagSummary.bookCount === 1 ? 'book' : 'books'}
                  </span>
                </div>
                {selectedTagSummary.books.length === 0 ? (
                  <div className="py-14 px-6 rounded-lg border border-white/[0.06] bg-[#0C0C10] text-center">
                    <p className="font-serif text-lg text-[#F2EDE4]">
                      No books tagged with &ldquo;{selectedTagSummary.name}
                      &rdquo; yet
                    </p>
                    <p className="mt-1 text-xs text-[#A69F93]">
                      Assign this tag from any book&apos;s contextual menu via
                      &ldquo;Manage tags&rdquo;.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-5 gap-y-8">
                    {selectedTagSummary.books.map((book) => (
                      <BookCard
                        key={book.id}
                        book={book}
                        coverUrl={coverUrls[book.id]}
                        onSelect={onSelectBook}
                        menuHandlers={bookMenuHandlers}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="py-16 px-6 rounded-lg border border-white/[0.06] bg-[#0C0C10] text-center">
                <p className="font-serif text-lg text-[#F2EDE4]">
                  Select a tag from the index
                </p>
                <p className="mt-1 text-xs text-[#A69F93]">
                  Inspect associated books, rename tags globally, or remove
                  unused labels.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <EntityDeleteModal
        isOpen={Boolean(tagPendingDelete)}
        entityType="tag"
        entityName={tagPendingDelete?.name ?? ''}
        bookCount={tagPendingDelete?.bookCount ?? 0}
        onCancel={() => setTagPendingDelete(null)}
        onConfirm={handleConfirmDeleteTag}
      />
    </section>
  );
}
