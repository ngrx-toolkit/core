import { ProviderToken, Signal, computed, inject } from '@angular/core';
import {
  EmptyFeatureResult,
  SignalStoreFeature,
  WritableStateSource,
  patchState,
  signalStoreFeature,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
import {
  EntityId,
  NamedEntityState,
  SelectEntityId,
  addEntity,
  removeEntity,
  setAllEntities,
  updateEntity,
} from '@ngrx/signals/entities';
import { EntityState } from './shared/signal-store-models';
import {
  CallState,
  NamedCallStateSlice,
  getCallStateKeys,
  setError,
  setLoaded,
  setLoading,
} from './with-call-state';

export type Filter = Record<string, unknown>;
export type Entity = Record<string, unknown>;

export interface DataService<E extends Entity, F extends Filter> {
  load(filter: F): Promise<E[]>;

  loadById(id: EntityId): Promise<E>;

  create(entity: E): Promise<E>;

  update(entity: E): Promise<E>;

  updateAll(entity: E[]): Promise<E[]>;

  delete(entity: E): Promise<void>;
}

export function capitalize(str: string): string {
  return str ? str[0].toUpperCase() + str.substring(1) : str;
}

export function getDataServiceKeys(options: { collection?: string }) {
  const filterKey = options.collection
    ? `${options.collection}Filter`
    : 'filter';
  const selectedIdsKey = options.collection
    ? `selected${capitalize(options.collection)}Ids`
    : 'selectedIds';
  const selectedEntitiesKey = options.collection
    ? `selected${capitalize(options.collection)}Entities`
    : 'selectedEntities';

  const updateFilterKey = options.collection
    ? `update${capitalize(options.collection)}Filter`
    : 'updateFilter';
  const updateSelectedKey = options.collection
    ? `updateSelected${capitalize(options.collection)}Entities`
    : 'updateSelected';
  const loadKey = options.collection
    ? `load${capitalize(options.collection)}Entities`
    : 'load';

  const currentKey = options.collection
    ? `current${capitalize(options.collection)}`
    : 'current';
  const loadByIdKey = options.collection
    ? `load${capitalize(options.collection)}ById`
    : 'loadById';
  const setCurrentKey = options.collection
    ? `setCurrent${capitalize(options.collection)}`
    : 'setCurrent';
  const createKey = options.collection
    ? `create${capitalize(options.collection)}`
    : 'create';
  const updateKey = options.collection
    ? `update${capitalize(options.collection)}`
    : 'update';
  const updateAllKey = options.collection
    ? `updateAll${capitalize(options.collection)}`
    : 'updateAll';
  const deleteKey = options.collection
    ? `delete${capitalize(options.collection)}`
    : 'delete';

  // TODO: Take these from @ngrx/signals/entities, when they are exported
  const entitiesKey = options.collection
    ? `${options.collection}Entities`
    : 'entities';
  const entityMapKey = options.collection
    ? `${options.collection}EntityMap`
    : 'entityMap';
  const idsKey = options.collection ? `${options.collection}Ids` : 'ids';

  return {
    filterKey,
    selectedIdsKey,
    selectedEntitiesKey,
    updateFilterKey,
    updateSelectedKey,
    loadKey,
    entitiesKey,
    entityMapKey,
    idsKey,

    currentKey,
    loadByIdKey,
    setCurrentKey,
    createKey,
    updateKey,
    updateAllKey,
    deleteKey,
  };
}

const selectEntityId = <E extends Entity>(
  selectId?: SelectEntityId<E>
): SelectEntityId<E> => {
  if (typeof selectId === 'function') {
    return selectId;
  }

  return (entity: E) => entity['id'] as EntityId;
};

export type NamedDataServiceState<
  E extends Entity,
  F extends Filter,
  Collection extends string,
> = {
  [K in Collection as `${K}Filter`]: F;
} & {
  [K in Collection as `selected${Capitalize<K>}Ids`]: Record<EntityId, boolean>;
} & {
  [K in Collection as `current${Capitalize<K>}`]: E;
};

export type DataServiceState<E extends Entity, F extends Filter> = {
  filter: F;
  selectedIds: Record<EntityId, boolean>;
  current: E;
};

export type DataServiceComputed<E extends Entity> = {
  selectedEntities: Signal<E[]>;
};

export type NamedDataServiceComputed<
  E extends Entity,
  Collection extends string,
> = {
  [K in Collection as `selected${Capitalize<K>}Entities`]: Signal<E[]>;
};

export type NamedDataServiceMethods<
  E extends Entity,
  F extends Filter,
  Collection extends string,
> = {
  [K in Collection as `update${Capitalize<K>}Filter`]: (filter: F) => void;
} & {
  [K in Collection as `updateSelected${Capitalize<K>}Entities`]: (
    id: EntityId,
    selected: boolean,
  ) => void;
} & {
  [K in Collection as `load${Capitalize<K>}Entities`]: () => Promise<void>;
} & {
  [K in Collection as `setCurrent${Capitalize<K>}`]: (entity: E) => void;
} & {
  [K in Collection as `load${Capitalize<K>}ById`]: (
    id: EntityId,
  ) => Promise<void>;
} & {
  [K in Collection as `create${Capitalize<K>}`]: (entity: E) => Promise<void>;
} & {
  [K in Collection as `update${Capitalize<K>}`]: (entity: E) => Promise<void>;
} & {
  [K in Collection as `updateAll${Capitalize<K>}`]: (
    entity: E[],
  ) => Promise<void>;
} & {
  [K in Collection as `delete${Capitalize<K>}`]: (entity: E) => Promise<void>;
};

export type DataServiceMethods<E extends Entity, F extends Filter> = {
  updateFilter: (filter: F) => void;
  updateSelected: (id: EntityId, selected: boolean) => void;
  load: () => Promise<void>;

  setCurrent(entity: E): void;
  loadById(id: EntityId): Promise<void>;
  create(entity: E): Promise<void>;
  update(entity: E): Promise<void>;
  updateAll(entities: E[]): Promise<void>;
  delete(entity: E): Promise<void>;
};

export function withDataService<
  E extends Entity,
  F extends Filter,
  Collection extends string,
>(options: {
  dataServiceType: ProviderToken<DataService<E, F>>;
  filter: F;
  collection: Collection;
  selectId?: SelectEntityId<E>;
}): SignalStoreFeature<
  EmptyFeatureResult & {
    state: NamedCallStateSlice<Collection> & NamedEntityState<E, Collection>;
  },
  {
    state: NamedDataServiceState<E, F, Collection>;
    props: NamedDataServiceComputed<E, Collection>;
    methods: NamedDataServiceMethods<E, F, Collection>;
  }
>;
export function withDataService<E extends Entity, F extends Filter>(options: {
  dataServiceType: ProviderToken<DataService<E, F>>;
  filter: F;
  selectId?: SelectEntityId<E>;
}): SignalStoreFeature<
  EmptyFeatureResult & { state: { callState: CallState } & EntityState<E> },
  {
    state: DataServiceState<E, F>;
    props: DataServiceComputed<E>;
    methods: DataServiceMethods<E, F>;
  }
>;

export function withDataService<
  E extends Entity,
  F extends Filter,
  Collection extends string,
>(options: {
  dataServiceType: ProviderToken<DataService<E, F>>;
  filter: F;
  collection?: Collection;
  selectId?: SelectEntityId<E>;
}): /* eslint-disable @typescript-eslint/no-explicit-any */
SignalStoreFeature<any, any> {
  const { dataServiceType, filter, collection: prefix } = options;
  const {
    entitiesKey,
    filterKey,
    loadKey,
    selectedEntitiesKey,
    selectedIdsKey,
    updateFilterKey,
    updateSelectedKey,
    currentKey,
    createKey,
    updateKey,
    updateAllKey,
    deleteKey,
    loadByIdKey,
    setCurrentKey,
  } = getDataServiceKeys(options);

  const selectId = selectEntityId(options.selectId);

  const { callStateKey } = getCallStateKeys({ collection: prefix });

  return signalStoreFeature(
    withState(() => ({
      [filterKey]: filter,
      [selectedIdsKey]: {} as Record<EntityId, boolean>,
      [currentKey]: undefined as E | undefined,
    })),
    withComputed((store: Record<string, unknown>) => {
      const entities = store[entitiesKey] as Signal<E[]>;
      const selectedIds = store[selectedIdsKey] as Signal<
        Record<EntityId, boolean>
      >;

      return {
        [selectedEntitiesKey]: computed(() =>
          entities().filter((e) => selectedIds()[selectId(e)])
        ),
      };
    }),
    withMethods(
      (store: Record<string, unknown> & WritableStateSource<object>) => {
        const dataService = inject(dataServiceType);
        return {
          [updateFilterKey]: (filter: F): void => {
            patchState(store, { [filterKey]: filter });
          },
          [updateSelectedKey]: (id: EntityId, selected: boolean): void => {
            patchState(store, (state: Record<string, unknown>) => ({
              [selectedIdsKey]: {
                ...(state[selectedIdsKey] as Record<EntityId, boolean>),
                [id]: selected,
              },
            }));
          },
          [loadKey]: async (): Promise<void> => {
            const filter = store[filterKey] as Signal<F>;
            (() =>
              store[callStateKey] && patchState(store, setLoading(prefix)))();

            try {
              const result = await dataService.load(filter());
              patchState(
                store,
                prefix
                  ? setAllEntities(result, { collection: prefix, selectId })
                  : setAllEntities(result, { selectId })
              );
              (() =>
                store[callStateKey] && patchState(store, setLoaded(prefix)))();
            } catch (e) {
              (() =>
                store[callStateKey] &&
                patchState(store, setError(e, prefix)))();
              throw e;
            }
          },
          [loadByIdKey]: async (id: EntityId): Promise<void> => {
            (() =>
              store[callStateKey] && patchState(store, setLoading(prefix)))();

            try {
              const current = await dataService.loadById(id);
              (() =>
                store[callStateKey] && patchState(store, setLoaded(prefix)))();
              patchState(store, { [currentKey]: current });
            } catch (e) {
              (() =>
                store[callStateKey] &&
                patchState(store, setError(e, prefix)))();
              throw e;
            }
          },
          [setCurrentKey]: (current: E): void => {
            patchState(store, { [currentKey]: current });
          },
          [createKey]: async (entity: E): Promise<void> => {
            patchState(store, { [currentKey]: entity });
            (() =>
              store[callStateKey] && patchState(store, setLoading(prefix)))();

            try {
              const created = await dataService.create(entity);
              patchState(store, { [currentKey]: created });
              patchState(
                store,
                prefix
                  ? addEntity(created, { collection: prefix, selectId })
                  : addEntity(created, { selectId })
              );
              (() =>
                store[callStateKey] && patchState(store, setLoaded(prefix)))();
            } catch (e) {
              (() =>
                store[callStateKey] &&
                patchState(store, setError(e, prefix)))();
              throw e;
            }
          },
          [updateKey]: async (entity: E): Promise<void> => {
            patchState(store, { [currentKey]: entity });
            (() =>
              store[callStateKey] && patchState(store, setLoading(prefix)))();

            try {
              const updated = await dataService.update(entity);
              patchState(store, { [currentKey]: updated });

              const updateArg = {
                id: selectId(entity),
                changes: updated,
              };

              const updater = (collection: string) =>
                updateEntity(updateArg, { collection, selectId });

              patchState(
                store,
                prefix ? updater(prefix) : updateEntity(updateArg),
              );
              (() =>
                store[callStateKey] && patchState(store, setLoaded(prefix)))();
            } catch (e) {
              (() =>
                store[callStateKey] &&
                patchState(store, setError(e, prefix)))();
              throw e;
            }
          },
          [updateAllKey]: async (entities: E[]): Promise<void> => {
            (() =>
              store[callStateKey] && patchState(store, setLoading(prefix)))();

            try {
              const result = await dataService.updateAll(entities);
              patchState(
                store,
                prefix
                  ? setAllEntities(result, { collection: prefix, selectId })
                  : setAllEntities(result, { selectId })
              );
              (() =>
                store[callStateKey] && patchState(store, setLoaded(prefix)))();
            } catch (e) {
              (() =>
                store[callStateKey] &&
                patchState(store, setError(e, prefix)))();
              throw e;
            }
          },
          [deleteKey]: async (entity: E): Promise<void> => {
            patchState(store, { [currentKey]: entity });
            (() =>
              store[callStateKey] && patchState(store, setLoading(prefix)))();

            try {
              const id = selectId(entity);

              await dataService.delete(entity);
              patchState(store, { [currentKey]: undefined });
              patchState(
                store,
                prefix
                  ? removeEntity(id, { collection: prefix })
                  : removeEntity(id)
              );
              (() =>
                store[callStateKey] && patchState(store, setLoaded(prefix)))();
            } catch (e) {
              (() =>
                store[callStateKey] &&
                patchState(store, setError(e, prefix)))();
              throw e;
            }
          },
        };
      },
    ),
  );
}
