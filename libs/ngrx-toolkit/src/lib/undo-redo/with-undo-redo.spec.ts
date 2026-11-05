import { computed, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  patchState,
  signalStore,
  type,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
import { addEntity, withEntities } from '@ngrx/signals/entities';
import { withCallState } from '../with-call-state';
import { clearUndoRedo } from './clear-undo-redo';
import { withUndoRedo } from './with-undo-redo';

const testState = { test: '' };
const testKeys = ['test' as const];
const newValue = 'new value';
const newerValue = 'newer value';

describe('withUndoRedo', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('adds methods for undo, redo, canUndo, canRedo, rollback', () => {
    TestBed.runInInjectionContext(() => {
      const Store = signalStore(
        withState(testState),
        withUndoRedo({ keys: testKeys }),
      );
      const store = new Store();

      expect(Object.keys(store)).toEqual([
        'test',
        'canUndo',
        'canRedo',
        'undo',
        'redo',
        'rollback',
        '__clearUndoRedo__',
        'clearStack',
      ]);
    });
  });

  it('should check keys and collection types', () => {
    signalStore(
      withState(testState),
      // @ts-expect-error - should not allow invalid keys
      withUndoRedo({ keys: ['tes'] }),
    );
    signalStore(
      withState(testState),
      withEntities({ entity: type(), collection: 'flight' }),
      // @ts-expect-error - should not allow invalid keys when entities are present
      withUndoRedo({ keys: ['flightIdsTest'] }),
    );
    signalStore(
      withState(testState),
      // @ts-expect-error - should not allow collections without named entities
      withUndoRedo({ collections: ['tee'] }),
    );
    signalStore(
      withState(testState),
      withComputed((store) => ({ testComputed: computed(() => store.test()) })),
      // @ts-expect-error - should not allow collections without named entities with other computed
      withUndoRedo({ collections: ['tested'] }),
    );
    signalStore(
      withEntities({ entity: type() }),
      // @ts-expect-error - should not allow collections without named entities
      withUndoRedo({ collections: ['test'] }),
    );
    signalStore(
      withEntities({ entity: type(), collection: 'flight' }),
      // @ts-expect-error - should not allow invalid collections
      withUndoRedo({ collections: ['test'] }),
    );

    // sub-key (dot-path) support
    const nestedState = { filter: { searchTerm: '', page: 1 } };
    signalStore(
      withState(nestedState),
      // valid top-level key
      withUndoRedo({ keys: ['filter'] }),
    );
    signalStore(
      withState(nestedState),
      // valid dot-path sub-key
      withUndoRedo({ keys: ['filter.searchTerm'] }),
    );
    signalStore(
      withState(nestedState),
      // @ts-expect-error - should not allow invalid dot-path sub-keys
      withUndoRedo({ keys: ['filter.invalid'] }),
    );
  });

  describe('undo and redo', () => {
    it('restores previous state for regular store key', () => {
      TestBed.runInInjectionContext(() => {
        const Store = signalStore(
          withState(testState),
          withMethods((store) => ({
            updateTest: (newTest: string) =>
              patchState(store, { test: newTest }),
          })),
          withUndoRedo({ keys: testKeys }),
        );

        const store = new Store();

        store.updateTest(newValue);

        expect(store.test()).toEqual(newValue);
        expect(store.canUndo()).toBe(true);
        expect(store.canRedo()).toBe(false);

        store.undo();

        expect(store.test()).toEqual('');
        expect(store.canUndo()).toBe(false);
        expect(store.canRedo()).toBe(true);
      });
    });

    it('restores previous state for regular store key and respects skip', () => {
      TestBed.runInInjectionContext(() => {
        const Store = signalStore(
          withState(testState),
          withMethods((store) => ({
            updateTest: (newTest: string) =>
              patchState(store, { test: newTest }),
          })),
          withUndoRedo({ keys: testKeys, skip: 1 }),
        );

        const store = new Store();

        store.updateTest(newValue);

        expect(store.test()).toEqual(newValue);

        store.updateTest(newerValue);

        store.undo();

        expect(store.test()).toEqual(newValue);
        expect(store.canUndo()).toBe(false);

        store.undo();

        // should not change
        expect(store.test()).toEqual(newValue);
      });
    });

    it('undoes and redoes previous state for entity', () => {
      const Store = signalStore(
        withEntities({ entity: type<{ id: string }>() }),
        withMethods((store) => ({
          addEntity: (newTest: string) =>
            patchState(store, addEntity({ id: newTest })),
        })),
        withUndoRedo(),
      );
      TestBed.configureTestingModule({ providers: [Store] });
      TestBed.runInInjectionContext(() => {
        const store = inject(Store);

        expect(store.entities()).toEqual([]);
        expect(store.canUndo()).toBe(false);
        expect(store.canRedo()).toBe(false);

        store.addEntity(newValue);

        expect(store.entities()).toEqual([{ id: newValue }]);
        expect(store.canUndo()).toBe(true);
        expect(store.canRedo()).toBe(false);

        store.addEntity(newerValue);

        expect(store.entities()).toEqual([
          { id: newValue },
          { id: newerValue },
        ]);
        expect(store.canUndo()).toBe(true);
        expect(store.canRedo()).toBe(false);

        store.undo();

        expect(store.entities()).toEqual([{ id: newValue }]);
        expect(store.canUndo()).toBe(true);
        expect(store.canRedo()).toBe(true);

        store.undo();

        expect(store.entities()).toEqual([]);
        expect(store.canUndo()).toBe(false);
        expect(store.canRedo()).toBe(true);

        store.redo();

        expect(store.entities()).toEqual([{ id: newValue }]);
        expect(store.canUndo()).toBe(true);
        expect(store.canRedo()).toBe(true);

        // should return canRedo=false after a change
        store.addEntity('newest');

        expect(store.canUndo()).toBe(true);
        expect(store.canRedo()).toBe(false);
      });
    });

    it('restores previous state for named entity', () => {
      TestBed.runInInjectionContext(() => {
        const Store = signalStore(
          withEntities({
            entity: type<{ id: string }>(),
            collection: 'flight',
          }),
          withMethods((store) => ({
            addEntity: (newTest: string) =>
              patchState(
                store,
                addEntity({ id: newTest }, { collection: 'flight' }),
              ),
          })),
          withCallState({ collection: 'flight' }),
          withUndoRedo({ collections: ['flight'] }),
        );

        const store = new Store();

        store.addEntity(newValue);

        expect(store.flightEntities()).toEqual([{ id: newValue }]);
        expect(store.canUndo()).toBe(true);
        expect(store.canRedo()).toBe(false);

        store.undo();

        expect(store.flightEntities()).toEqual([]);
        expect(store.canUndo()).toBe(false);
        expect(store.canRedo()).toBe(true);
      });
    });

    it('clears undo redo stack', () => {
      const Store = signalStore(
        { providedIn: 'root' },
        withState(testState),
        withMethods((store) => ({
          update: (value: string) => patchState(store, { test: value }),
        })),
        withUndoRedo({ keys: testKeys }),
      );

      const store = TestBed.inject(Store);

      store.update('Foo');
      store.update('Bar');
      store.undo();
      store.clearStack();

      expect(store.canUndo()).toBe(false);
      expect(store.canRedo()).toBe(false);
    });

    it('cannot undo after clearing and setting a new value', () => {
      const Store = signalStore(
        { providedIn: 'root' },
        withState(testState),
        withMethods((store) => ({
          update: (value: string) => patchState(store, { test: value }),
        })),
        withUndoRedo({ keys: testKeys }),
      );

      const store = TestBed.inject(Store);

      store.update('Alan');

      store.update('Gordon');

      clearUndoRedo(store, { lastRecord: null });

      // After clearing the undo/redo stack, there is no previous item anymore.
      // The following update becomes the first value.
      // Since there is no other value before, it cannot be undone.
      store.update('Hugh');

      expect(store.canUndo()).toBe(false);
      expect(store.canRedo()).toBe(false);
    });

    it('can undo after setting lastRecord', () => {
      const Store = signalStore(
        { providedIn: 'root' },
        withState(testState),
        withMethods((store) => ({
          update: (value: string) => patchState(store, { test: value }),
        })),
        withUndoRedo({ keys: testKeys }),
      );

      const store = TestBed.inject(Store);

      store.update('Alan');

      store.update('Gordon');

      clearUndoRedo(store, { lastRecord: { test: 'Joan' } });

      store.update('Hugh');

      expect(store.canUndo()).toBe(true);
      expect(store.canRedo()).toBe(false);
    });
  });

  describe('rollback', () => {
    it('rolls back to a specific savepoint', () => {
      TestBed.runInInjectionContext(() => {
        const Store = signalStore(
          withState(testState),
          withMethods((store) => ({
            updateTest: (newTest: string) =>
              patchState(store, { test: newTest }),
          })),
          withUndoRedo({ keys: testKeys }),
        );

        const store = new Store();
        jest.advanceTimersByTime(5);
        store.updateTest('value1');

        jest.advanceTimersByTime(5);
        const savepoint = Date.now();

        jest.advanceTimersByTime(5);
        store.updateTest('value2');

        jest.advanceTimersByTime(5);
        store.updateTest('value3');

        expect(store.test()).toEqual('value3');

        jest.advanceTimersByTime(5);
        store.rollback(savepoint);

        expect(store.test()).toEqual('value1');
        expect(store.canUndo()).toBe(true);
        expect(store.canRedo()).toBe(true);
      });
    });

    it('rolls back to initial state when savepoint is before all changes', () => {
      TestBed.runInInjectionContext(() => {
        const Store = signalStore(
          withState(testState),
          withMethods((store) => ({
            updateTest: (newTest: string) =>
              patchState(store, { test: newTest }),
          })),
          withUndoRedo({ keys: testKeys }),
        );

        const store = new Store();

        jest.advanceTimersByTime(5);
        const initialSavepoint = Date.now();

        jest.advanceTimersByTime(5);
        store.updateTest('value1');
        jest.advanceTimersByTime(5);
        store.updateTest('value2');
        jest.advanceTimersByTime(5);
        store.updateTest('value3');

        expect(store.test()).toEqual('value3');

        jest.advanceTimersByTime(5);
        store.rollback(initialSavepoint);

        expect(store.test()).toEqual('');
        expect(store.canUndo()).toBe(false);
        expect(store.canRedo()).toBe(true);
      });
    });

    it('does nothing when savepoint is after all changes', () => {
      TestBed.runInInjectionContext(() => {
        const Store = signalStore(
          withState(testState),
          withMethods((store) => ({
            updateTest: (newTest: string) =>
              patchState(store, { test: newTest }),
          })),
          withUndoRedo({ keys: testKeys }),
        );

        const store = new Store();

        jest.advanceTimersByTime(5);
        store.updateTest('value1');
        jest.advanceTimersByTime(5);
        store.updateTest('value2');

        jest.advanceTimersByTime(5);
        const futureSavepoint = Date.now() + 10000;

        expect(store.test()).toEqual('value2');

        jest.advanceTimersByTime(5);
        store.rollback(futureSavepoint);

        expect(store.test()).toEqual('value2');
        expect(store.canUndo()).toBe(true);
        expect(store.canRedo()).toBe(false);
      });
    });

    it('handles rollback with nested dot-path keys', () => {
      TestBed.runInInjectionContext(() => {
        const Store = signalStore(
          withState({
            filter: { searchTerm: '', page: 1, sort: 'asc' },
            other: 'value',
          }),
          withMethods((store) => ({
            updateSearchTerm: (term: string) =>
              patchState(store, {
                filter: { ...store.filter(), searchTerm: term },
              }),
            updatePage: (page: number) =>
              patchState(store, { filter: { ...store.filter(), page } }),
            updateSort: (sort: string) =>
              patchState(store, { filter: { ...store.filter(), sort } }),
            updateOther: (value: string) => patchState(store, { other: value }),
          })),
          withUndoRedo({
            keys: ['filter.searchTerm', 'filter.page', 'filter.sort'],
          }),
        );

        const store = new Store();
        jest.advanceTimersByTime(5);
        store.updateSearchTerm('angular');
        store.updateOther('value2');
        jest.advanceTimersByTime(5);
        store.updatePage(2);
        jest.advanceTimersByTime(5);
        const savepoint = Date.now();

        jest.advanceTimersByTime(5);
        store.updateSort('desc');
        jest.advanceTimersByTime(5);
        store.updatePage(3);
        store.updateOther('value3');

        expect(store.filter().searchTerm).toEqual('angular');
        expect(store.filter().page).toEqual(3);
        expect(store.filter().sort).toEqual('desc');
        expect(store.other()).toEqual('value3');

        jest.advanceTimersByTime(5);
        store.rollback(savepoint);

        expect(store.filter().searchTerm).toEqual('angular');
        expect(store.filter().page).toEqual(2);
        expect(store.filter().sort).toEqual('asc');
        // since there is no rollback for this one
        expect(store.other()).toEqual('value3');
      });
    });

    it('handles rollback with complex nested state', () => {
      TestBed.runInInjectionContext(() => {
        const complexState = {
          user: {
            profile: {
              name: '',
              email: '',
              settings: {
                theme: 'light',
                notifications: true,
              },
            },
          },
        };

        const Store = signalStore(
          withState(complexState),
          withMethods((store) => ({
            updateName: (name: string) =>
              patchState(store, {
                user: {
                  ...store.user(),
                  profile: {
                    ...store.user().profile,
                    name,
                  },
                },
              }),
            updateTheme: (theme: string) =>
              patchState(store, {
                user: {
                  ...store.user(),
                  profile: {
                    ...store.user().profile,
                    settings: {
                      ...store.user().profile.settings,
                      theme,
                    },
                  },
                },
              }),
          })),
          withUndoRedo({
            keys: ['user.profile.name', 'user.profile.settings.theme'],
          }),
        );

        const store = new Store();

        jest.advanceTimersByTime(5);
        store.updateName('John Doe');
        jest.advanceTimersByTime(5);
        store.updateTheme('dark');
        jest.advanceTimersByTime(5);
        const savepoint = Date.now();

        expect(store.user().profile.name).toEqual('John Doe');
        expect(store.user().profile.settings.theme).toEqual('dark');

        jest.advanceTimersByTime(5);
        store.updateName('Jane Doe');
        jest.advanceTimersByTime(5);
        store.updateTheme('light');

        expect(store.user().profile.name).toEqual('Jane Doe');
        expect(store.user().profile.settings.theme).toEqual('light');

        jest.advanceTimersByTime(5);
        store.rollback(savepoint);

        expect(store.user().profile.name).toEqual('John Doe');
        expect(store.user().profile.settings.theme).toEqual('dark');
      });
    });
  });
});
