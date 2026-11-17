import {
  ArrowLeft,
  Check,
  Edit3,
  FolderPlus,
  Layers,
  Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Book, Collection } from '../types/library';
import { BookCard, type BookMenuHandlers } from './BookCard';
import { BookCover } from './BookCover';
import { EntityDeleteModal } from './EntityDeleteModal';

interface CollectionsViewProps {
  collections: Collection[];
  books: Book[];
  coverUrls: Record<string, string>;
  onCreateCollection: (name: string, description: string) => Promise<Collection>;
  onUpdateCollection: (
    id: string,
    patch: { name?: string; description?: string }
  ) => Promise<Collection>;
  onDeleteCollection: (id: string) => Promise<void>;
  onSetBookCollections: (
    bookId: string,
    collectionIds: string[]
  ) => Promise<void>;
  onSelectBook: (book: Book) => void;
  bookMenuHandlers: BookMenuHandlers;
  onNotify: (message: string) => void;
}

export function CollectionsView({
  collections,
  books,
  coverUrls,
  onCreateCollection,
  onUpdateCollection,
  onDeleteCollection,
  onSetBookCollections,
  onSelectBook,
  bookMenuHandlers,
  onNotify,
}: CollectionsViewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const [isEditingSelected, setIsEditingSelected] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [collectionPendingDelete, setCollectionPendingDelete] =
    useState<Collection | null>(null);
  const [showManageBooks, setShowManageBooks] = useState(false);

  const bookMap = useMemo(() => {
    const map = new Map<string, Book>();
    for (const book of books) {
      map.set(book.id, book);
    }
    return map;
  }, [books]);

  const selectedCollection =
    collections.find((c) => c.id === selectedId) ?? null;

  const selectedBooks = useMemo(() => {
    if (!selectedCollection) return [];
    return selectedCollection.bookIds
      .map((id) => bookMap.get(id))
      .filter((b): b is Book => Boolean(b));
  }, [selectedCollection, bookMap]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!newName.trim()) {
      setFormError('Please provide a collection name.');
      return;
    }
    try {
      const created = await onCreateCollection(newName, newDescription);
      setNewName('');
      setNewDescription('');
      setShowCreateForm(false);
      setSelectedId(created.id);
      onNotify(`Created collection "${created.name}".`);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Unable to create collection.'
      );
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCollection) return;
    setEditError(null);
    if (!editName.trim()) {
      setEditError('Collection name cannot be empty.');
      return;
    }
    try {
      const updated = await onUpdateCollection(selectedCollection.id, {
        name: editName,
        description: editDescription,
      });
      setIsEditingSelected(false);
      onNotify(`Updated collection "${updated.name}".`);
    } catch (err) {
      setEditError(
        err instanceof Error ? err.message : 'Unable to update collection.'
      );
    }
  };

  const handleConfirmDeleteCollection = async () => {
    if (!collectionPendingDelete) return;
    const deletedName = collectionPendingDelete.name;
    const deletedId = collectionPendingDelete.id;
    await onDeleteCollection(deletedId);
    setCollectionPendingDelete(null);
    if (selectedId === deletedId) {
      setSelectedId(null);
    }
    onNotify(
      `Deleted collection "${deletedName}". All books remain safely in your library.`
    );
  };

  const toggleBookMembership = async (bookId: string) => {
    if (!selectedCollection) return;
    const currentCollectionIds = collections
      .filter((c) => c.bookIds.includes(bookId))
      .map((c) => c.id);

    const exists = currentCollectionIds.includes(selectedCollection.id);
    const nextIds = exists
      ? currentCollectionIds.filter((id) => id !== selectedCollection.id)
      : [...currentCollectionIds, selectedCollection.id];

    await onSetBookCollections(bookId, nextIds);
  };

  if (selectedCollection) {
    return (
      <section aria-labelledby="collection-detail-title" className="space-y-8">
        <div className="space-y-4 pb-6 border-b border-white/[0.08]">
          <button
            type="button"
            onClick={() => {
              setSelectedId(null);
              setIsEditingSelected(false);
              setEditError(null);
              setShowManageBooks(false);
            }}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#A69F93] hover:text-[#E8B15C] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>All Collections</span>
          </button>

          {isEditingSelected ? (
            <form
              onSubmit={(e) => void handleSaveEdit(e)}
              className="max-w-xl space-y-3"
            >
              {editError && (
                <p className="text-xs text-red-300">{editError}</p>
              )}
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                aria-label="Collection name"
                className="w-full h-10 px-3 rounded-md bg-[#131318] border border-white/[0.12] font-serif text-lg text-[#F2EDE4] focus:outline-none focus:border-[#D99B43]"
              />
              <textarea
                rows={2}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Optional curatorial note..."
                className="w-full p-3 rounded-md bg-[#131318] border border-white/[0.12] text-sm text-[#F2EDE4] placeholder:text-[#6E685F] focus:outline-none focus:border-[#D99B43]"
              />
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-md bg-[#D99B43] hover:bg-[#E8B15C] text-[#08080A] text-xs font-semibold cursor-pointer"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingSelected(false);
                    setEditError(null);
                  }}
                  className="px-4 py-1.5 rounded-md border border-white/[0.12] text-xs text-[#A69F93] hover:text-[#F2EDE4] cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="space-y-1.5">
                <h1
                  id="collection-detail-title"
                  className="font-serif text-3xl sm:text-4xl font-medium text-[#F2EDE4]"
                >
                  {selectedCollection.name}
                </h1>
                {selectedCollection.description && (
                  <p className="text-sm text-[#A69F93] max-w-2xl">
                    {selectedCollection.description}
                  </p>
                )}
                <p className="text-xs text-[#6E685F] tabular-nums">
                  {selectedBooks.length}{' '}
                  {selectedBooks.length === 1 ? 'volume' : 'volumes'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {books.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowManageBooks((prev) => !prev)}
                    className={`px-3.5 py-2 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                      showManageBooks
                        ? 'bg-[#D99B43]/15 border-[#D99B43]/60 text-[#E8B15C]'
                        : 'bg-[#131318] border-white/[0.1] text-[#F2EDE4] hover:border-white/25'
                    }`}
                  >
                    {showManageBooks ? 'Done Assigning' : 'Add / Remove Books'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setEditName(selectedCollection.name);
                    setEditDescription(selectedCollection.description);
                    setEditError(null);
                    setIsEditingSelected(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#131318] border border-white/[0.1] text-xs text-[#A69F93] hover:text-[#F2EDE4] cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCollectionPendingDelete(selectedCollection)}
                  aria-label="Delete collection"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#131318] border border-white/[0.1] text-xs text-[#A69F93] hover:text-red-400 hover:border-red-500/40 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Assign / Remove Volumes Selector */}
        {showManageBooks && books.length > 0 && (
          <div className="p-5 rounded-lg bg-[#111116] border border-white/[0.08] space-y-3">
            <h2 className="text-xs font-medium text-[#A69F93]">
              Select books to include in {selectedCollection.name} (removing a
              book from a collection keeps the book in your library)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
              {books.map((book) => {
                const included = selectedCollection.bookIds.includes(book.id);
                return (
                  <button
                    key={book.id}
                    type="button"
                    onClick={() => void toggleBookMembership(book.id)}
                    className={`flex items-center gap-3 p-2.5 rounded-md border text-left transition-colors cursor-pointer ${
                      included
                        ? 'bg-[#D99B43]/12 border-[#D99B43]/50 text-[#F2EDE4]'
                        : 'bg-[#16161C] border-white/[0.06] text-[#A69F93] hover:border-white/[0.16]'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                        included
                          ? 'bg-[#D99B43] border-[#D99B43] text-[#08080A]'
                          : 'border-white/20'
                      }`}
                    >
                      {included && <Check className="w-3 h-3 stroke-[2.5]" />}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">
                        {book.title}
                      </p>
                      <p className="text-[11px] text-[#6E685F] truncate">
                        {book.authors.join(', ')}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {selectedBooks.length === 0 ? (
          <div className="py-16 px-6 rounded-lg border border-white/[0.08] bg-[#0E0E12] text-center">
            <p className="font-serif text-xl text-[#F2EDE4]">
              This collection has no volumes yet
            </p>
            <p className="mt-1.5 text-sm text-[#A69F93]">
              {books.length > 0
                ? 'Use "Add / Remove Books" above or choose "Manage collections" from any book’s menu.'
                : 'Import EPUB books first, then curate them here.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-6 gap-y-9">
            {selectedBooks.map((book) => (
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

        <EntityDeleteModal
          isOpen={Boolean(collectionPendingDelete)}
          entityType="collection"
          entityName={collectionPendingDelete?.name ?? ''}
          bookCount={selectedBooks.length}
          onCancel={() => setCollectionPendingDelete(null)}
          onConfirm={handleConfirmDeleteCollection}
        />
      </section>
    );
  }

  return (
    <section aria-labelledby="collections-heading" className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div className="space-y-2">
          <h1
            id="collections-heading"
            className="font-serif text-3xl sm:text-4xl font-medium tracking-tight text-[#F2EDE4]"
          >
            Collections
          </h1>
          <p className="text-sm text-[#A69F93] tabular-nums">
            {collections.length}{' '}
            {collections.length === 1 ? 'curated shelf' : 'curated shelves'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateForm((prev) => !prev)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#18181F] hover:bg-[#22222C] border border-white/[0.12] text-xs font-medium text-[#F2EDE4] transition-colors self-start sm:self-auto whitespace-nowrap shrink-0 cursor-pointer"
        >
          <FolderPlus className="w-4 h-4 text-[#D99B43]" />
          <span>New Collection</span>
        </button>
      </div>

      {showCreateForm && (
        <form
          onSubmit={(e) => void handleCreate(e)}
          className="p-6 rounded-lg bg-[#111116] border border-white/[0.1] max-w-xl space-y-4"
        >
          <h2 className="font-serif text-lg text-[#F2EDE4]">
            Create a New Collection
          </h2>
          {formError && <p className="text-xs text-red-300">{formError}</p>}
          <div>
            <label
              htmlFor="new-collection-name"
              className="block text-xs text-[#A69F93] mb-1.5"
            >
              Collection Name
            </label>
            <input
              id="new-collection-name"
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Autumn Essays, Speculative Classics"
              className="w-full h-10 px-3 rounded-md bg-[#18181F] border border-white/[0.1] text-sm text-[#F2EDE4] placeholder:text-[#6E685F] focus:outline-none focus:border-[#D99B43]"
            />
          </div>
          <div>
            <label
              htmlFor="new-collection-desc"
              className="block text-xs text-[#A69F93] mb-1.5"
            >
              Description <span className="text-[#6E685F]">(optional)</span>
            </label>
            <textarea
              id="new-collection-desc"
              rows={2}
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Brief note about what belongs on this shelf..."
              className="w-full p-3 rounded-md bg-[#18181F] border border-white/[0.1] text-sm text-[#F2EDE4] placeholder:text-[#6E685F] focus:outline-none focus:border-[#D99B43]"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="px-4 py-2 rounded-md bg-[#D99B43] hover:bg-[#E8B15C] text-[#08080A] text-xs font-semibold cursor-pointer"
            >
              Create Collection
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCreateForm(false);
                setFormError(null);
              }}
              className="px-4 py-2 rounded-md border border-white/[0.12] text-xs text-[#A69F93] hover:text-[#F2EDE4] cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {collections.length === 0 ? (
        <div className="py-20 px-6 rounded-lg border border-white/[0.08] bg-[#0E0E12] text-center max-w-2xl mx-auto">
          <div className="w-12 h-12 rounded-md bg-[#18181F] border border-white/[0.08] flex items-center justify-center mx-auto mb-5 text-[#D99B43]">
            <Layers className="w-5 h-5" aria-hidden="true" />
          </div>
          <h2 className="font-serif text-2xl font-medium text-[#F2EDE4]">
            Organize volumes into curated shelves
          </h2>
          <p className="mt-2 text-sm text-[#A69F93] max-w-md mx-auto">
            Create thematic reading lists, research dossiers, or seasonal
            shelves. One book can belong to multiple collections.
          </p>
          <button
            type="button"
            onClick={() => setShowCreateForm(true)}
            className="mt-6 px-5 py-2.5 rounded-md bg-[#D99B43] hover:bg-[#E8B15C] text-[#08080A] text-sm font-semibold transition-colors cursor-pointer"
          >
            Create First Collection
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {collections.map((collection) => {
            const memberBooks = collection.bookIds
              .map((id) => bookMap.get(id))
              .filter((b): b is Book => Boolean(b));
            const previewBooks = memberBooks.slice(0, 4);

            return (
              <button
                key={collection.id}
                type="button"
                onClick={() => setSelectedId(collection.id)}
                className="group text-left p-5 rounded-lg bg-[#111116] border border-white/[0.08] hover:border-[#D99B43]/50 transition-colors flex flex-col gap-4 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D99B43]"
              >
                {/* Cover Montage Strip */}
                <div className="h-28 rounded-md bg-[#0B0B0E] border border-white/[0.06] p-2.5 flex items-center gap-2 overflow-hidden">
                  {previewBooks.length > 0 ? (
                    previewBooks.map((book) => (
                      <div
                        key={book.id}
                        className="h-full aspect-[2/3] rounded-xs overflow-hidden border border-white/[0.08] shrink-0"
                      >
                        <BookCover
                          title={book.title}
                          author={book.authors[0] ?? ''}
                          coverUrl={coverUrls[book.id]}
                          size="sm"
                        />
                      </div>
                    ))
                  ) : (
                    <span className="text-xs text-[#6E685F] pl-1">
                      Empty shelf
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 className="font-serif text-xl font-medium text-[#F2EDE4] group-hover:text-[#E8B15C] transition-colors truncate">
                      {collection.name}
                    </h2>
                    <span className="font-mono text-xs tabular-nums text-[#6E685F] shrink-0">
                      {memberBooks.length}{' '}
                      {memberBooks.length === 1 ? 'book' : 'books'}
                    </span>
                  </div>
                  {collection.description && (
                    <p className="text-xs text-[#A69F93] line-clamp-2">
                      {collection.description}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
