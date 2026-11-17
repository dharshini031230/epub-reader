# Folio

A personal digital library for your EPUB collection.

Folio brings your books together in one place. Import EPUB files,
organise your collection, customise book covers, and settle into a
reading experience that you can adjust to your preferences. Your library
is stored locally in your browser, so you can use Folio without creating
an account or subscribing to a cloud service.

## Features

### Your Personal Bookshelf

Import EPUB files and build a digital library of your own. Folio
extracts available book information, including titles, authors,
publishers, descriptions, publication dates and table of contents.

Browse your collection through a searchable bookshelf, with options to
sort by title, author, publication date, recently added, recently opened
or reading progress.

Keep track of your books using five reading statuses: To Read, Reading,
Finished, Paused and Dropped.

### Organise Your Library

Arrange books into collections, group them into series and maintain
custom tags. Manage authors, edit book information and organise reading
order within a series.

Books can belong to multiple collections, making it easier to organise a
library across different genres, subjects and reading interests.

### A Reading Experience of Your Own

Folio includes an EPUB reader with paginated and continuous scrolling
modes.

Adjust the reading environment to suit your preferences, including:

-   Light, Dark, Sepia, Warm, Midnight and custom themes.
-   Font family, size and weight.
-   Line height and paragraph spacing.
-   Letter spacing and text alignment.
-   Reading margins and text width.
-   Custom font uploads.
-   Original EPUB styling options.

Your reading position is saved locally, allowing you to return to where
you left off.

### Bookmarks, Highlights and Notes

Save important passages and return to them whenever you need to.

Create bookmarks, highlight selected text using different colours, and
attach personal notes to passages. Highlights and annotations can be
managed from the library.

### Design Your Own Book Covers

Give books a different appearance with the built-in cover designer.

Choose from original design families, including atmospheric, botanical,
architectural, abstract, vintage, minimalist, illustrated and ornamental
styles.

Customise colours independently of the artwork, experiment with
typography and layouts, generate different artwork compositions, or
upload your own image.

Save designs and reuse them as presets. Your customised cover is stored
separately from the original EPUB cover, leaving the original book file
unchanged.

### Local Backup and Storage Management

Your library is stored in the browser using IndexedDB and Dexie.js.

Folio includes a backup system that allows you to export your library as
a ZIP archive and restore it later.

Backups include book files, covers, metadata, collections, series, tags,
reading progress, bookmarks, highlights, annotations, custom fonts and
reading preferences.

You can restore a complete library or merge a backup with an existing
collection. Storage information and browser persistence status are also
available in the application.

## Privacy and Storage

Folio is designed around local storage rather than mandatory accounts or
cloud databases.

Your imported EPUB files and associated library information are stored
in your browser's IndexedDB database. The application does not require a
subscription or a paid database to manage your collection.

There are a few things to keep in mind:

-   Your library belongs to the browser and device where it was created.
-   Opening Folio on another device does not automatically transfer your
    books.
-   Clearing browser data can permanently remove your local library.
-   Persistent browser storage can reduce the risk of automatic
    eviction, but cannot protect against every form of data loss.
-   Downloaded ZIP backups provide a way to preserve and transfer your
    library.

Keep a copy of your backups somewhere safe.

## Technology

Folio is built using:

-   React
-   TypeScript
-   Vite
-   Tailwind CSS
-   Dexie.js
-   IndexedDB
-   EPUB.js
-   JSZip
-   Lucide React
-   Motion

The application uses a browser-based architecture and can be deployed as
a static web application.

## Running Locally

You will need Node.js and npm installed.

Clone the repository:

``` bash
git clone https://github.com/YOUR-USERNAME/epub-reader.git
```

Enter the project directory:

``` bash
cd epub-reader
```

Install dependencies:

``` bash
npm install
```

Start the development server:

``` bash
npm run dev
```

Vite will provide a local development address in the terminal.

To create a production build:

``` bash
npm run build
```

To preview the production build locally:

``` bash
npm run preview
```

## Browser Compatibility

Folio uses IndexedDB for its library storage and requires a browser that
supports it.

Use a modern browser with JavaScript and browser storage enabled.
Storage availability and limits may vary between browsers and devices.

For the best experience, use the deployed application over HTTPS.

## Project Status

Folio is under active development. Features and compatibility are still
being refined, and the application is being tested across different
browsers and devices.

## License

No open-source licence has been assigned yet. All rights are reserved
unless a licence is added to this repository.
