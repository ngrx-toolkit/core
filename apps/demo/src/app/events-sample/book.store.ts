import {
  withDevtools,
  withGlitchTracking,
  withTrackedReducer,
} from '@ngrx-toolkit/core';
import { signalStore, withComputed, withHooks, withState } from '@ngrx/signals';
import { injectDispatch, on } from '@ngrx/signals/events';
import { bookEvents } from './book-events';
import { Book, mockBooks } from './book.model';

export const BookStore = signalStore(
  { providedIn: 'root' },
  withDevtools('book-store-events', withGlitchTracking()),
  withState({
    books: [] as Book[],
    selectedBookId: null as string | null,
    filter: '',
  }),

  withComputed((store) => ({
    selectedBook: () => {
      const id = store.selectedBookId();
      return id ? store.books().find((b) => b.id === id) || null : null;
    },

    filteredBooks: () => {
      const filter = store.filter().toLowerCase();
      if (!filter) return store.books();

      return store
        .books()
        .filter(
          (book) =>
            book.title.toLowerCase().includes(filter) ||
            book.author.toLowerCase().includes(filter),
        );
    },

    totalBooks: () => store.books().length,

    availableBooks: () => store.books().filter((book) => book.inStock).length,
  })),

  withTrackedReducer(
    on(bookEvents.loadBooks, () => ({
      books: mockBooks,
    })),

    on(bookEvents.bookSelected, ({ payload }) => ({
      selectedBookId: payload.bookId,
    })),

    on(bookEvents.selectionCleared, () => ({
      selectedBookId: null,
    })),

    on(bookEvents.filterUpdated, ({ payload }) => ({
      filter: payload.filter,
    })),

    on(bookEvents.stockToggled, (event, state) => ({
      books: state.books.map((book) =>
        book.id === event.payload.bookId
          ? { ...book, inStock: !book.inStock }
          : book,
      ),
    })),

    on(bookEvents.bookAdded, (event, state) => ({
      books: [...state.books, event.payload.book],
    })),

    on(bookEvents.bookRemoved, (event, state) => ({
      books: state.books.filter((book) => book.id !== event.payload.bookId),
    })),
  ),
  withHooks({
    onInit() {
      injectDispatch(bookEvents).loadBooks();
    },
  }),
);
