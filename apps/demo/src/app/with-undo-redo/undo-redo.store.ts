import { withDevtools, withUndoRedo } from '@angular-architects/ngrx-toolkit';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';

export type Item = {
  id: number;
  text: string;
};

export type UndoRedoState = {
  items: Item[];
  counter: number;
};

let nextId = 1;

export const UndoRedoStore = signalStore(
  withDevtools('with-undo-redo'),
  withState<UndoRedoState>({
    items: [],
    counter: 0,
  }),
  withMethods((store) => ({
    addItem(text: string) {
      patchState(store, (state) => ({
        items: [...state.items, { id: nextId++, text }],
      }));
    },
    updateItem(id: number, text: string) {
      patchState(store, (state) => ({
        items: state.items.map((item) =>
          item.id === id ? { ...item, text } : item,
        ),
      }));
    },
    removeItem(id: number) {
      patchState(store, (state) => ({
        items: state.items.filter((item) => item.id !== id),
      }));
    },
    increment() {
      patchState(store, (state) => ({ counter: state.counter + 1 }));
    },
    decrement() {
      patchState(store, (state) => ({ counter: state.counter - 1 }));
    },
  })),
  withUndoRedo({
    keys: ['items', 'counter'],
  }),
);

export type UndoRedoStore = InstanceType<typeof UndoRedoStore>;
