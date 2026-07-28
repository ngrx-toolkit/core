import {
  Resource,
  ResourceRef,
  ResourceSnapshot,
  ResourceStatus,
  Signal,
  computed,
  isSignal,
  linkedSignal,
} from '@angular/core';
import {
  SignalStoreFeature,
  SignalStoreFeatureResult,
  StateSignals,
  signalStoreFeature,
  withComputed,
  withLinkedState,
  withProps,
} from '@ngrx/signals';
import {
  EntityId,
  EntityProps,
  EntityState,
  NamedEntityProps,
  NamedEntityState,
} from '@ngrx/signals/entities';
import {
  NamedResourceResult,
  ResourceResult,
  withResource,
} from './with-resource';

/**
 * @experimental
 * @description
 *
 * Integrates array-based `Resource` data into Entity-style state for NgRx SignalStore.
 * This feature builds on {@link withResource} to provide an entity view over
 * array resources.
 *
 * - For a single (unnamed) resource: exposes `value`, `status`, `error`, `isLoading`
 *   from the underlying resource (via `withResource`), and derives
 *   `ids`, `entityMap`, and `entities` via `withLinkedState`/`withComputed`.
 * - For multiple (named) resources: registers each resource by name and exposes
 *   the same members prefixed with the resource name, e.g. `todosIds`,
 *   `todosEntityMap`, `todosEntities`, along with `todosValue`, `todosStatus`, etc.
 *
 * No effects are used. All derived signals are linked to the resource's value
 * through `withLinkedState`, so entity updaters such as `addEntity`, `updateEntity`,
 * and `removeEntity` mutate the store's entity view without directly writing to the
 * resource. The source of truth remains the resource value.
 *
 * @usageNotes
 *
 * Unnamed resource example:
 *
 * ```ts
 * type Todo = { id: number; title: string; completed: boolean };
 *
 * const Store = signalStore(
 *   { providedIn: 'root' },
 *   withEntityResources(() =>
 *     resource({ loader: () => Promise.resolve([] as Todo[]), defaultValue: [] }),
 *   ),
 * );
 *
 * const store = TestBed.inject(Store);
 * store.status();    // 'idle' | 'loading' | 'resolved' | 'error' | 'local'
 * store.value();     // Todo[]
 * store.ids();       // EntityId[]
 * store.entityMap(); // Record<EntityId, Todo>
 * store.entities();  // Todo[]
 *
 * // Works with @ngrx/signals/entities updaters
 * patchState(store, addEntity({ id: 1, title: 'X', completed: false }));
 * ```
 *
 * Named resources example:
 *
 * ```ts
 * const Store = signalStore(
 *   { providedIn: 'root' },
 *   withEntityResources(() => ({
 *     todos: resource({ loader: () => Promise.resolve([] as Todo[]), defaultValue: [] }),
 *     projects: resource({ loader: () => Promise.resolve([] as { id: number; name: string }[]), defaultValue: [] }),
 *   })),
 * );
 *
 * const store = TestBed.inject(Store);
 * store.todosValue();
 * store.todosIds();
 * store.todosEntityMap();
 * store.todosEntities();
 * patchState(store, addEntity({ id: 2, title: 'Y', completed: true }, { collection: 'todos' }));
 * ```
 *
 * @see {@link withResource}
 */
export function withEntityResources<
  Input extends SignalStoreFeatureResult,
  Entity extends { id: EntityId },
>(
  resourceFactory: (
    store: Input['props'] & Input['methods'] & StateSignals<Input['state']>,
  ) => ResourceRef<TypedEntityResourceValue<Entity>>,
): SignalStoreFeature<Input, EntityResourceRefResult<Entity>>;

export function withEntityResources<
  Input extends SignalStoreFeatureResult,
  Entity extends { id: EntityId },
>(
  resourceFactory: (
    store: Input['props'] & Input['methods'] & StateSignals<Input['state']>,
  ) => Resource<TypedEntityResourceValue<Entity>>,
): SignalStoreFeature<Input, EntityResourceResult<Entity>>;

export function withEntityResources<
  Input extends SignalStoreFeatureResult,
  Dictionary extends EntityDictionary,
>(
  resourceFactory: (
    store: Input['props'] & Input['methods'] & StateSignals<Input['state']>,
  ) => Dictionary,
): SignalStoreFeature<Input, NamedEntityResourceResult<Dictionary>>;

export function withEntityResources<
  Input extends SignalStoreFeatureResult,
  ResourceValue extends EntityResourceValue,
>(
  entityResourceFactory: (
    store: Input['props'] & Input['methods'] & StateSignals<Input['state']>,
  ) => Resource<ResourceValue> | EntityDictionary,
): SignalStoreFeature<Input> {
  return (store) => {
    const resourceOrDict = entityResourceFactory({
      ...store.stateSignals,
      ...store.props,
      ...store.methods,
    });

    if (isEntityResourceRef(resourceOrDict)) {
      return createUnnamedEntityResourceRef(resourceOrDict)(store);
    } else if (isEntityResource(resourceOrDict)) {
      return createUnnamedEntityResource(resourceOrDict)(store);
    }
    return createNamedEntityResources(resourceOrDict)(store);
  };
}

/**
 * We cannot use the value of `resource` directly, but
 * have to use the one created through {@link withResource}
 * because {@link withResource} creates a Proxy around the resource value
 * to avoid the error throwing behavior of the Resource API.
 */
function createUnnamedEntityResourceRef<E extends Entity>(
  resource: ResourceRef<TypedEntityResourceValue<E>>,
) {
  return signalStoreFeature(
    withResource(() => resource),
    withLinkedState((store) => {
      // `value` exists in either the `props` or `state`, but `store` here only
      // infers the `state` case, so we have to do this bleh casting
      const propsOrStateStore = store as {
        value: Signal<TypedEntityResourceValue<E>>;
        status: Signal<ResourceStatus>;
        error: Signal<Error | undefined>;
        isLoading: Signal<boolean>;
        snapshot: Signal<ResourceSnapshot<TypedEntityResourceValue<E>>>;
      };
      const resourceValue = propsOrStateStore[
        `value`
      ] as Signal<EntityResourceValue>;
      if (!isSignal(resourceValue)) {
        throw new Error(`Resource's value ${name}Value does not exist`);
      }

      const { ids, entityMap } = createEntityDerivations(resourceValue);

      return {
        entityMap,
        ids,
      };
    }),
    withComputed(({ ids, entityMap }) => ({
      entities: createComputedEntities(ids, entityMap),
    })),
  );
}

function createUnnamedEntityResource<E extends Entity>(
  resource: Resource<TypedEntityResourceValue<E>>,
) {
  return signalStoreFeature(
    withResource(() => resource),
    withProps((store) => {
      const propsStore = store as {
        value: Signal<TypedEntityResourceValue<E>>;
        status: Signal<ResourceStatus>;
        error: Signal<Error | undefined>;
        isLoading: Signal<boolean>;
        snapshot: Signal<ResourceSnapshot<TypedEntityResourceValue<E>>>;
      };

      const resourceValue = propsStore.value as Signal<EntityResourceValue>;
      if (!isSignal(resourceValue)) {
        throw new Error(`Resource's value signal does not exist`);
      }

      const { ids, entityMap } = createReadonlyEntityDerivations(resourceValue);

      return {
        ids,
        entityMap,
      };
    }),
    withComputed(({ ids, entityMap }) => ({
      entities: createComputedEntities(ids, entityMap),
    })),
  );
}

/**
 * See {@link createUnnamedEntityResource} for why we cannot use the value of `resource` directly.
 */
function createNamedEntityResources<Dictionary extends EntityDictionary>(
  dictionary: Dictionary,
) {
  const keys = Object.keys(dictionary);

  const stateFactories = keys
    .filter((name) => isEntityResourceRef(dictionary[name]))
    .map((name) => {
      return (store: Record<string, unknown>) => {
        const resourceValue = store[
          `${name}Value`
        ] as Signal<EntityResourceValue>;
        if (!isSignal(resourceValue)) {
          throw new Error(`Resource's value ${name}Value does not exist`);
        }

        const { ids, entityMap } = createEntityDerivations(resourceValue);

        return {
          [`${name}EntityMap`]: entityMap,
          [`${name}Ids`]: ids,
        };
      };
    });

  const propsFactories = keys
    .filter((name) => !isEntityResourceRef(dictionary[name]))
    .map((name) => {
      return (store: Record<string, unknown>) => {
        const resourceValue = store[
          `${name}Value`
        ] as Signal<EntityResourceValue>;
        if (!isSignal(resourceValue)) {
          throw new Error(`Resource's value ${name}Value does not exist`);
        }

        const { ids, entityMap } =
          createReadonlyEntityDerivations(resourceValue);

        return {
          [`${name}EntityMap`]: entityMap,
          [`${name}Ids`]: ids,
        };
      };
    });

  const computedFactories = keys.map((name) => {
    return (store: Record<string, unknown>) => {
      const ids = store[`${name}Ids`] as Signal<EntityId[]>;
      const entityMap = store[`${name}EntityMap`] as Signal<
        Record<EntityId, Entity>
      >;

      if (!isSignal(ids)) {
        throw new Error(`Entity Resource's ids ${name}Ids does not exist`);
      }
      if (!isSignal(entityMap)) {
        throw new Error(
          `Entity Resource's entityMap ${name}EntityMap does not exist`,
        );
      }

      return {
        [`${name}Entities`]: createComputedEntities(ids, entityMap),
      };
    };
  });

  return signalStoreFeature(
    withResource(() => dictionary),
    withLinkedState((store) =>
      stateFactories.reduce(
        (acc, factory) => ({
          ...acc,
          ...factory(store),
        }),
        {},
      ),
    ),
    withProps((store) =>
      propsFactories.reduce(
        (acc, factory) => ({
          ...acc,
          ...factory(store),
        }),
        {},
      ),
    ),
    withComputed((store) =>
      computedFactories.reduce(
        (acc, factory) => ({
          ...acc,
          ...factory(store),
        }),
        {},
      ),
    ),
  );
}

// Types for `withEntityResources`
/**
 * @internal
 * @description
 *
 * Type composition notes: we intentionally do not duplicate or re-declare
 * types that already exist in `@ngrx/signals/entities` or in this library's
 * `with-resource` feature. Instead, we compose the resulting API via
 * intersections of those public contracts.
 *
 * Rationale:
 * - Keeps our types in sync with upstream sources and avoids drift.
 * - Reduces maintenance overhead and duplication.
 * - Ensures consumers benefit automatically from upstream typing fixes.
 *
 * Concretely:
 * - For unnamed resources we return `ResourceResult<Entity>` intersected with
 *   `EntityState<Entity>` and `EntityProps<Entity>`.
 * - For named resources we return `NamedResourceResult<T>` intersected with
 *   `NamedEntityState<E, Name>` and `NamedEntityProps<E, Name>` for each entry.
 */
declare const NON_PATCHABLE_ENTITY_RESOURCE_STATE: unique symbol;

type NonPatchableEntityResourceStateMarker = {
  [NON_PATCHABLE_ENTITY_RESOURCE_STATE]?: never;
};

type ReadonlyEntityProps<E extends Entity> = {
  ids: Signal<EntityId[]>;
  entityMap: Signal<Record<EntityId, E>>;
};

type NamedReadonlyEntityProps<E extends Entity, Name extends string> = {
  [Prop in `${Name}Ids`]: Signal<EntityId[]>;
} & {
  [Prop in `${Name}EntityMap`]: Signal<Record<EntityId, E>>;
};

export type EntityResourceRefResult<Entity> = {
  state: ResourceResult<Entity>['state'] & EntityState<Entity>;
  props: ResourceResult<Entity>['props'] & EntityProps<Entity>;
  methods: ResourceResult<Entity>['methods'];
};

export type EntityResourceResult<Entity extends { id: EntityId }> = {
  state: NonPatchableEntityResourceStateMarker;
  props: ResourceResult<Entity>['props'] &
    EntityProps<Entity> &
    ReadonlyEntityProps<Entity>;
  methods: ResourceResult<Entity>['methods'];
};

// Generic helpers for inferring entity types and merging unions
type ArrayElement<T> = T extends readonly (infer E)[] | (infer E)[] ? E : never;

type InferEntityFromSignal<T> =
  T extends Signal<infer V> ? ArrayElement<V> : never;

type MergeUnion<U> = (U extends unknown ? (k: U) => void : never) extends (
  k: infer I,
) => void
  ? I
  : never;

type Entity = { id: EntityId };

type EntityResourceValue = Entity[] | (Entity[] | undefined);

type TypedEntityResourceValue<E extends Entity> = E[] | (E[] | undefined);

export type EntityDictionary = Record<
  string,
  ResourceRef<EntityResourceValue> | Resource<EntityResourceValue>
>;

type MergeNamedEntityStates<T extends EntityDictionary> = MergeUnion<
  {
    [Prop in keyof T]: Prop extends string
      ? T[Prop] extends ResourceRef<unknown>
        ? InferEntityFromSignal<T[Prop]['value']> extends infer E
          ? E extends never
            ? never
            : NamedEntityState<E, Prop>
          : never
        : never
      : never;
  }[keyof T]
>;

type MergeNamedReadonlyEntityProps<T extends EntityDictionary> = MergeUnion<
  {
    [Prop in keyof T]: Prop extends string
      ? T[Prop] extends ResourceRef<unknown>
        ? never
        : InferEntityFromSignal<T[Prop]['value']> extends infer E
          ? E extends Entity
            ? NamedReadonlyEntityProps<E, Prop>
            : E extends never
              ? never
              : never
          : never
      : never;
  }[keyof T]
>;

type MergeNamedEntityProps<T extends EntityDictionary> = MergeUnion<
  {
    [Prop in keyof T]: Prop extends string
      ? InferEntityFromSignal<T[Prop]['value']> extends infer E
        ? E extends never
          ? never
          : NamedEntityProps<E, Prop>
        : never
      : never;
  }[keyof T]
>;

export type NamedEntityResourceResult<T extends EntityDictionary> = {
  state: NamedResourceResult<T, false>['state'] &
    MergeNamedEntityStates<T> &
    NonPatchableEntityResourceStateMarker;
  props: NamedResourceResult<T, false>['props'] &
    MergeNamedEntityProps<T> &
    MergeNamedReadonlyEntityProps<T>;
  methods: NamedResourceResult<T, false>['methods'];
};

/**
 * @internal
 * @description
 *
 * Creates the two entity-related state properties (`ids`, `entityMap`) from
 * a single source signal of entities. This mirrors the public contract of
 * `withEntities()`:
 * - `ids`: derived list of entity ids
 * - `entityMap`: map of id -> entity
 *
 * Implementation details:
 * - Uses `withLinkedState` + `linkedSignal` for `ids` and `entityMap` so they are
 *   writable state signals in the store (updaters like `addEntity` can mutate them).
 * - `entities` is a pure `computed` derived from `ids` and `entityMap`, matching
 *   the pattern in `withEntities` where `entities` is computed from the two bases.
 *
 * Why not `watchState` or `effect`?
 * - `watchState` would fire for any state change in the store, not just changes
 *   to the underlying resource value. That would cause unnecessary recomputation
 *   and make it harder to reason about updates.
 * - `effect` would introduce side-effects and lifecycle management for syncing,
 *   which is heavier and not aligned with this feature's goal to be purely
 *   derived from signals. Using linked signals keeps the data flow declarative
 *   and avoids imperative syncing code.
 */
function createEntityDerivations<E extends Entity>(
  source: Signal<TypedEntityResourceValue<E>>,
) {
  const ids = linkedSignal({
    source,
    computation: (list) => (list ?? []).map((e) => e.id),
  });

  const entityMap = linkedSignal({
    source,
    computation: (list) => {
      const map = {} as Record<EntityId, E>;
      for (const item of list ?? []) {
        map[item.id] = item as E;
      }
      return map;
    },
  });

  return { ids, entityMap };
}

function createReadonlyEntityDerivations<E extends Entity>(
  source: Signal<TypedEntityResourceValue<E>>,
) {
  const ids = computed(() => (source() ?? []).map((e) => e.id));

  const entityMap = computed(() => {
    const map = {} as Record<EntityId, E>;
    for (const item of source() ?? []) {
      map[item.id] = item as E;
    }
    return map;
  });

  return { ids, entityMap };
}

function createComputedEntities<E extends Entity>(
  ids: Signal<EntityId[]>,
  entityMap: Signal<Record<EntityId, E>>,
) {
  return () => {
    return ids().map((id) => entityMap()[id]);
  };
}

export function isEntityResource(
  value: unknown,
): value is Resource<EntityResourceValue> {
  return (
    value !== null &&
    typeof value === 'object' &&
    'value' in value &&
    isSignal(value.value) &&
    'status' in value &&
    'error' in value &&
    'isLoading' in value &&
    'snapshot' in value &&
    'hasValue' in value
  );
}

export function isEntityResourceRef(
  value: unknown,
): value is ResourceRef<EntityResourceValue> {
  return (
    isEntityResource(value) &&
    'reload' in value &&
    'set' in value &&
    'update' in value &&
    'asReadonly' in value
  );
}
