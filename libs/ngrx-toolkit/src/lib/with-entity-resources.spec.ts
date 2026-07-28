import { resource } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { patchState, signalStore, withState } from '@ngrx/signals';
import {
  addEntity,
  removeEntity,
  setAllEntities,
} from '@ngrx/signals/entities';
import { withEntityResources } from './with-entity-resources';
import { withPreviousValue } from './with-resource/tests/util/snapshot';

type Todo = { id: number; title: string; completed: boolean };
const wait = (ms = 0) => new Promise((r) => setTimeout(r, ms));

describe('withEntityResources', () => {
  describe('unnamed entities', () => {
    it('derives ids, entityMap and entities from resource value', async () => {
      const Store = signalStore(
        { providedIn: 'root', protectedState: false },
        withState({ load: undefined as boolean | undefined }),
        withEntityResources((store) =>
          resource({
            params: store.load,
            loader: ({ params }) =>
              Promise.resolve(
                params
                  ? ([{ id: 1, title: 'A', completed: false }] as Todo[])
                  : ([] as Todo[]),
              ),
            defaultValue: [],
          }),
        ),
      );

      const store = TestBed.inject(Store);

      // trigger load and verify derived signals
      patchState(store, { load: true });
      await wait();

      expect(store.ids()).toEqual([1]);
      expect(store.entityMap()).toEqual({
        1: { id: 1, title: 'A', completed: false },
      });
      expect(store.entities()).toEqual([
        { id: 1, title: 'A', completed: false },
      ]);
    });

    it('supports addEntity updater mutating ids/entityMap/derived entities', async () => {
      const Store = signalStore(
        { providedIn: 'root', protectedState: false },
        withEntityResources(() =>
          resource({
            loader: () => Promise.resolve([] as Todo[]),
            defaultValue: [],
          }),
        ),
      );
      const store = TestBed.inject(Store);

      await wait();

      expect(store.entities()).toEqual([]);

      patchState(
        store,
        addEntity({ id: 1, title: 'X', completed: false } as Todo),
      );

      expect(store.ids()).toEqual([1]);
      expect(store.entityMap()).toEqual({
        1: { id: 1, title: 'X', completed: false },
      });
      expect(store.entities()).toEqual([
        { id: 1, title: 'X', completed: false },
      ]);
    });
  });

  describe('named entities', () => {
    it('derives <name>Ids, <name>EntityMap and <name>Entities from resource value', async () => {
      const Store = signalStore(
        { providedIn: 'root', protectedState: false },
        withEntityResources(() => ({
          todos: resource({
            loader: () =>
              Promise.resolve([
                { id: 1, title: 'A', completed: false },
              ] as Todo[]),
            defaultValue: [],
          }),
          projects: resource({
            loader: () =>
              Promise.resolve([{ id: 10, name: 'X' }] as {
                id: number;
                name: string;
              }[]),
            defaultValue: [],
          }),
        })),
      );

      const store = TestBed.inject(Store);

      await wait();

      expect(store.todosIds()).toEqual([1]);
      expect(store.todosEntityMap()).toEqual({
        1: { id: 1, title: 'A', completed: false },
      });
      expect(store.todosValue()).toEqual([
        { id: 1, title: 'A', completed: false },
      ]);
      expect(store.projectsEntities()).toHaveLength(1);
      expect(store.projectsValue()).toEqual([{ id: 10, name: 'X' }]);
    });

    it('supports addEntity for named collection via ids/entityMap', async () => {
      const Store = signalStore(
        { providedIn: 'root', protectedState: false },
        withEntityResources(() => ({
          todos: resource({
            loader: () => Promise.resolve([] as Todo[]),
            defaultValue: [],
          }),
        })),
      );
      const store = TestBed.inject(Store);

      await wait();

      expect(store.todosEntities()).toEqual([]);

      patchState(
        store,
        addEntity(
          { id: 2, title: 'Y', completed: true },
          { collection: 'todos' },
        ),
      );

      expect(store.todosIds()).toEqual([2]);
      expect(store.todosEntityMap()).toEqual({
        2: { id: 2, title: 'Y', completed: true },
      });
      expect(store.todosEntities()).toEqual([
        { id: 2, title: 'Y', completed: true },
      ]);
    });
  });

  describe('entity updaters', () => {
    it('supports setAllEntities/addEntity/removeEntity for unnamed', async () => {
      const Store = signalStore(
        { providedIn: 'root', protectedState: false },
        withEntityResources(() =>
          resource({
            loader: () => Promise.resolve([] as Todo[]),
            defaultValue: [],
          }),
        ),
      );
      const store = TestBed.inject(Store);

      await wait();

      // set all
      patchState(
        store,
        setAllEntities([
          { id: 1, title: 'A', completed: false },
          { id: 2, title: 'B', completed: true },
        ] as Todo[]),
      );
      expect(store.ids()).toEqual([1, 2]);
      expect(store.entities()).toEqual([
        { id: 1, title: 'A', completed: false },
        { id: 2, title: 'B', completed: true },
      ]);

      // add
      patchState(
        store,
        addEntity({ id: 3, title: 'C', completed: false } as Todo),
      );
      expect(store.ids()).toEqual([1, 2, 3]);
      expect(store.entities()).toEqual([
        { id: 1, title: 'A', completed: false },
        { id: 2, title: 'B', completed: true },
        { id: 3, title: 'C', completed: false },
      ]);

      // remove
      patchState(store, removeEntity(2));
      expect(store.ids()).toEqual([1, 3]);
      expect(store.entities()).toEqual([
        { id: 1, title: 'A', completed: false },
        { id: 3, title: 'C', completed: false },
      ]);
    });

    it('does not support setAllEntities/addEntity/removeEntity for unnamed which are of type Resource', async () => {
      const Store = signalStore(
        { providedIn: 'root', protectedState: false },
        withEntityResources(() =>
          withPreviousValue(
            resource({
              loader: () => Promise.resolve([] as Todo[]),
              defaultValue: [],
            }),
          ),
        ),
      );
      const store = TestBed.inject(Store);

      await wait();

      const invalidSetAll = () =>
        patchState(
          store,
          // @ts-expect-error Resources which are of type Resource should not support entity updaters
          setAllEntities([
            { id: 1, title: 'A', completed: false },
            { id: 2, title: 'B', completed: true },
          ] as Todo[]),
        );

      const invalidAdd = () =>
        patchState(
          store,
          // @ts-expect-error Resources which are of type Resource should not support entity updaters
          addEntity({ id: 3, title: 'C', completed: false } as Todo),
        );

      // @ts-expect-error Resources which are of type Resource should not support entity updaters
      const invalidRemove = () => patchState(store, removeEntity(2));

      expect(invalidSetAll).toBeDefined();
      expect(invalidAdd).toBeDefined();
      expect(invalidRemove).toBeDefined();
      expect(store.ids()).toEqual([]);
      expect(store.entities()).toEqual([]);
    });

    it('does not support setAllEntities/addEntity/removeEntity for named which are of type Resource', async () => {
      const Store = signalStore(
        { providedIn: 'root', protectedState: false },
        withEntityResources(() => ({
          todos: withPreviousValue(
            resource({
              loader: () => Promise.resolve([] as Todo[]),
              defaultValue: [],
            }),
          ),
        })),
      );

      const store = TestBed.inject(Store);

      await wait();

      const invalidSetAll = () =>
        patchState(
          store,
          // @ts-expect-error Resources which are of type Resource should not support entity updaters
          setAllEntities(
            [
              { id: 1, title: 'A', completed: false },
              { id: 2, title: 'B', completed: true },
            ] as Todo[],
            { collection: 'todos' },
          ),
        );

      const invalidAdd = () =>
        patchState(
          store,
          // @ts-expect-error Resources which are of type Resource should not support entity updaters
          addEntity({ id: 3, title: 'C', completed: false } as Todo, {
            collection: 'todos',
          }),
        );

      const invalidRemove = () =>
        // @ts-expect-error Resources which are of type Resource should not support entity updaters
        patchState(store, removeEntity(2, { collection: 'todos' }));

      expect(invalidSetAll).toBeDefined();
      expect(invalidAdd).toBeDefined();
      expect(invalidRemove).toBeDefined();
      expect(store.todosIds()).toEqual([]);
      expect(store.todosEntities()).toEqual([]);
    });

    it('supports setAllEntities/addEntity/removeEntity for named', async () => {
      const Store = signalStore(
        { providedIn: 'root', protectedState: false },
        withEntityResources(() => ({
          todos: resource({
            loader: () => Promise.resolve([] as Todo[]),
            defaultValue: [],
          }),
        })),
      );
      const store = TestBed.inject(Store);

      await wait();

      // set all
      patchState(
        store,
        setAllEntities(
          [
            { id: 10, title: 'X', completed: false },
            { id: 11, title: 'Y', completed: true },
          ] as Todo[],
          { collection: 'todos' },
        ),
      );
      expect(store.todosIds()).toEqual([10, 11]);
      expect(store.todosEntities()).toEqual([
        { id: 10, title: 'X', completed: false },
        { id: 11, title: 'Y', completed: true },
      ]);

      // add
      patchState(
        store,
        addEntity({ id: 12, title: 'Z', completed: false } as Todo, {
          collection: 'todos',
        }),
      );
      expect(store.todosIds()).toEqual([10, 11, 12]);
      expect(store.todosEntities()).toEqual([
        { id: 10, title: 'X', completed: false },
        { id: 11, title: 'Y', completed: true },
        { id: 12, title: 'Z', completed: false },
      ]);

      // remove
      patchState(store, removeEntity(11, { collection: 'todos' }));
      expect(store.todosIds()).toEqual([10, 12]);
      expect(store.todosEntities()).toEqual([
        { id: 10, title: 'X', completed: false },
        { id: 12, title: 'Z', completed: false },
      ]);
    });
  });

  describe('error handling', () => {
    it('does not throw for unnamed resources', async () => {
      const Store = signalStore(
        { providedIn: 'root' },
        withEntityResources(() =>
          resource({
            loader: (): Promise<Todo[]> => {
              return Promise.reject('error');
            },
          }),
        ),
      );

      const store = TestBed.inject(Store);
      await wait();
      expect(store.status()).toEqual('error');
      expect(store.ids()).toEqual([]);
      expect(store.entities()).toEqual([]);
      expect(store.value()).toBeUndefined();
    });

    it('does not throw for named resources', async () => {
      const Store = signalStore(
        { providedIn: 'root' },
        withEntityResources(() => ({
          todos: resource({
            loader: (): Promise<Todo[]> => Promise.reject('error'),
          }),
        })),
      );
      const store = TestBed.inject(Store);
      await wait();

      expect(store.todosIds()).toEqual([]);
      expect(store.todosEntities()).toEqual([]);
      expect(store.todosValue()).toBeUndefined();
    });
  });
});
