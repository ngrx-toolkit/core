//** Types for `withResource` */

import { HttpResourceRef } from '@angular/common/http';
import {
  isSignal,
  Resource,
  ResourceRef,
  ResourceSnapshot,
  ResourceStatus,
  Signal,
  untracked,
  WritableSignal,
} from '@angular/core';
import {
  signalStoreFeature,
  SignalStoreFeature,
  SignalStoreFeatureResult,
  StateSignals,
  withLinkedState,
  withMethods,
  withProps,
} from '@ngrx/signals';

export type ResourceResult<T> = {
  state: { value: T };
  props: {
    status: Signal<ResourceStatus>;
    error: Signal<Error | undefined>;
    isLoading: Signal<boolean>;
    snapshot: Signal<ResourceSnapshot<T>>;
  };
  methods: {
    hasValue(): this is Resource<Exclude<T, undefined>>;
  };
};
export type ResourceRefResult<T> = {
  state: { value: T };
  props: {
    status: Signal<ResourceStatus>;
    error: Signal<Error | undefined>;
    isLoading: Signal<boolean>;
    snapshot: Signal<ResourceSnapshot<T>>;
  };
  methods: {
    hasValue(): this is Resource<Exclude<T, undefined>>;
    _reload(): boolean;
  };
};

type ReloadableResource<T> = ResourceRef<T> | HttpResourceRef<T>;

type ResourceCoreKeys =
  | 'value'
  | 'status'
  | 'error'
  | 'isLoading'
  | 'snapshot'
  | 'hasValue';

type AdditionalSignalProps<T extends Resource<unknown>> = {
  [Prop in keyof T as Prop extends ResourceCoreKeys
    ? never
    : T[Prop] extends Signal<unknown>
      ? Prop
      : never]: T[Prop];
};

type InferResourceValue<T extends Resource<unknown>> =
  T['value'] extends Signal<infer S> ? S : never;

type ConditionalReloadMethod<T extends Resource<unknown>> =
  T extends ReloadableResource<unknown>
    ? { _reload(): boolean }
    : Record<never, never>;

declare const NON_PATCHABLE_RESOURCE_STATE: unique symbol;

type NonPatchableResourceStateMarker = {
  [NON_PATCHABLE_RESOURCE_STATE]?: never;
};

type ResourceValueType<
  T extends Resource<unknown>,
  HasUndefinedErrorHandling extends boolean,
> = HasUndefinedErrorHandling extends true
  ? InferResourceValue<T> | undefined
  : InferResourceValue<T>;

type UnnamedResourceResult<
  T extends Resource<unknown>,
  HasUndefinedErrorHandling extends boolean,
> = {
  state: T extends ReloadableResource<unknown>
    ? {
        value: ResourceValueType<T, HasUndefinedErrorHandling>;
      }
    : NonPatchableResourceStateMarker;
  props: (T extends ReloadableResource<unknown>
    ? Record<never, never>
    : {
        value: Signal<ResourceValueType<T, HasUndefinedErrorHandling>>;
      }) & {
    status: Signal<ResourceStatus>;
    error: Signal<Error | undefined>;
    isLoading: Signal<boolean>;
    snapshot: Signal<ResourceSnapshot<InferResourceValue<T>>>;
  } & AdditionalSignalProps<T>;
  methods: {
    hasValue(): this is Resource<Exclude<InferResourceValue<T>, undefined>>;
  } & ConditionalReloadMethod<T>;
};

export type ResourceDictionary = Record<string, Resource<unknown>>;

// Without this, only one resource would be able to have its additional signal props extracted
// When there are two or more named resources,
//     neither additional property can be indexed for certain,
//     because it would be a union of the two's additional properties,
//     and TS cannot pick the correct one when indexing into it.
//     So there would be no resolution of a particular resource's additional property.
// This type util makes this type mapping an intersection, so all additional properties
//     of all resources are preserved, but also can be indexed for a particular resource.
// https://stackoverflow.com/a/50375286 explanation, with relevant TS doc links
type UnionToIntersection<T> = (
  T extends unknown ? (arg: T) => void : never
) extends (arg: infer R) => void
  ? R
  : Record<never, never>;

type NamedAdditionalSignalProps<T extends ResourceDictionary> =
  UnionToIntersection<
    {
      [ResourceName in keyof T & string]: {
        [Prop in keyof AdditionalSignalProps<T[ResourceName]> &
          string as `${ResourceName}${Capitalize<Prop>}`]: AdditionalSignalProps<
          T[ResourceName]
        >[Prop];
      };
    }[keyof T & string]
  >;

export type NamedResourceResult<
  T extends ResourceDictionary,
  HasUndefinedErrorHandling extends boolean,
> = {
  state: {
    [Prop in keyof T as T[Prop] extends ReloadableResource<unknown>
      ? `${Prop & string}Value`
      : never]: T[Prop] extends Resource<unknown>
      ? ResourceValueType<T[Prop], HasUndefinedErrorHandling>
      : never;
  } & NonPatchableResourceStateMarker;
  props: {
    [Prop in keyof T as T[Prop] extends ReloadableResource<unknown>
      ? never
      : `${Prop & string}Value`]: Signal<
      T[Prop] extends Resource<unknown>
        ? ResourceValueType<T[Prop], HasUndefinedErrorHandling>
        : never
    >;
  } & {
    [Prop in keyof T as `${Prop & string}Status`]: Signal<ResourceStatus>;
  } & {
    [Prop in keyof T as `${Prop & string}Error`]: Signal<Error | undefined>;
  } & {
    [Prop in keyof T as `${Prop & string}IsLoading`]: Signal<boolean>;
  } & {
    [Prop in keyof T as `${Prop & string}Snapshot`]: Signal<
      ResourceSnapshot<T[Prop]['value'] extends Signal<infer S> ? S : never>
    >;
  } & NamedAdditionalSignalProps<T>;
  methods: {
    [Prop in keyof T as `${Prop & string}HasValue`]: () => this is Resource<
      Exclude<InferResourceValue<T[Prop]>, undefined>
    >;
  } & {
    [Prop in keyof T as T[Prop] extends ReloadableResource<unknown>
      ? `_${Prop & string}Reload`
      : never]: () => boolean;
  };
};

export type ErrorHandling = 'native' | 'undefined value' | 'previous value';

export type ResourceOptions = {
  errorHandling?: ErrorHandling;
};

const defaultOptions: Required<ResourceOptions> = {
  errorHandling: 'undefined value',
};

//** Implementation of `withResource` */

/**
 * @experimental
 * @description
 *
 * Integrates a `Resource` into the SignalStore and makes the store instance
 * implement the `Resource` interface.
 *
 * Reloadable resources (`ResourceRef`/`HttpResourceRef`) expose their
 * value under `value` in the store state and can be updated via `patchState`.
 *
 * Plain `Resource` values are exposed as signals on the store instance,
 * but are not part of state and therefore cannot be changed via `patchState`.
 * Additional signal members on the resource (for example `foo`) are also
 * exposed on the store as props.
 *
 * @usageNotes
 *
 * ```ts
 * const UserStore = signalStore(
 *   withState({ userId: undefined as number | undefined }),
 *   withResource(({ userId }) =>
 *     httpResource<User>(() =>
 *       userId === undefined ? undefined : `/users/${userId}`
 *     )
 *   )
 * );
 *
 * const userStore = new UserStore();
 * userStore.value(); // User | undefined
 * ```
 *
 * @param resourceFactory A factory function that receives the store's state signals,
 * methods, and props.
 * @param resourceOptions Allows configuration of the error handling behavior.
 */
export function withResource<
  Input extends SignalStoreFeatureResult,
  ResourceType extends Resource<unknown>,
>(
  resourceFactory: (
    store: Input['props'] & Input['methods'] & StateSignals<Input['state']>,
  ) => ResourceType,
): SignalStoreFeature<Input, UnnamedResourceResult<ResourceType, true>>;

export function withResource<
  Input extends SignalStoreFeatureResult,
  ResourceType extends Resource<unknown>,
>(
  resourceFactory: (
    store: Input['props'] & Input['methods'] & StateSignals<Input['state']>,
  ) => ResourceType,
  resourceOptions: { errorHandling: 'undefined value' },
): SignalStoreFeature<Input, UnnamedResourceResult<ResourceType, true>>;

export function withResource<
  Input extends SignalStoreFeatureResult,
  ResourceType extends Resource<unknown>,
>(
  resourceFactory: (
    store: Input['props'] & Input['methods'] & StateSignals<Input['state']>,
  ) => ResourceType,
  resourceOptions?: ResourceOptions,
): SignalStoreFeature<Input, UnnamedResourceResult<ResourceType, false>>;

/**
 * @experimental
 * @description
 *
 * Integrates multiple resources into the SignalStore. Each resource is
 * registered by name, which is used as a prefix when spreading the members
 * of `Resource` onto the store.
 *
 * Reloadable resources (`ResourceRef`/`HttpResourceRef`) place their values
 * in state using `<name>Value` keys and support updates via `patchState`.
 *
 * Plain `Resource` values are exposed as read-only signals with `<name>Value`
 * but are not stored in state.
 * Additional signal members are exposed as read-only props using
 * `<name><CapitalizedMember>`.
 *
 * @usageNotes
 *
 * ```ts
 * const UserStore = signalStore(
 *   withState({ userId: undefined as number | undefined }),
 *   withResource(({ userId }) => ({
 *     list: httpResource<User[]>(() => '/users', { defaultValue: [] }),
 *     detail: httpResource<User>(() =>
 *       userId === undefined ? undefined : `/users/${userId}`
 *     ),
 *   }))
 * );
 *
 * const userStore = new UserStore();
 * userStore.listValue(); // []
 * userStore.detailValue(); // User | undefined
 * ```
 *
 * @param resourceFactory A factory function that receives the store's props,
 * methods, and state signals. It must return a `Record<string, Resource>`.
 * @param resourceOptions Allows to configure the error handling behavior.
 */
export function withResource<
  Input extends SignalStoreFeatureResult,
  Dictionary extends ResourceDictionary,
>(
  resourceFactory: (
    store: Input['props'] & Input['methods'] & StateSignals<Input['state']>,
  ) => Dictionary,
): SignalStoreFeature<Input, NamedResourceResult<Dictionary, true>>;

export function withResource<
  Input extends SignalStoreFeatureResult,
  Dictionary extends ResourceDictionary,
>(
  resourceFactory: (
    store: Input['props'] & Input['methods'] & StateSignals<Input['state']>,
  ) => Dictionary,
  resourceOptions: { errorHandling: 'undefined value' },
): SignalStoreFeature<Input, NamedResourceResult<Dictionary, true>>;

export function withResource<
  Input extends SignalStoreFeatureResult,
  Dictionary extends ResourceDictionary,
>(
  resourceFactory: (
    store: Input['props'] & Input['methods'] & StateSignals<Input['state']>,
  ) => Dictionary,
  resourceOptions?: ResourceOptions,
): SignalStoreFeature<Input, NamedResourceResult<Dictionary, false>>;

export function withResource<
  Input extends SignalStoreFeatureResult,
  ResourceValue,
>(
  resourceFactory: (
    store: Input['props'] & Input['methods'] & StateSignals<Input['state']>,
  ) => Resource<ResourceValue> | ResourceDictionary,
  resourceOptions?: ResourceOptions,
): SignalStoreFeature<Input> {
  const options: Required<ResourceOptions> = {
    ...defaultOptions,
    ...(resourceOptions || {}),
  };
  return (store) => {
    const resourceOrDictionary = resourceFactory({
      ...store.stateSignals,
      ...store.props,
      ...store.methods,
    });

    if (
      isResourceRef(resourceOrDictionary) ||
      isResource(resourceOrDictionary)
    ) {
      return createUnnamedResource(
        resourceOrDictionary,
        options.errorHandling,
      )(store);
    } else {
      return createNamedResource(
        resourceOrDictionary,
        options.errorHandling,
      )(store);
    }
  };
}

function createUnnamedResource<ResourceValue>(
  resource: Resource<ResourceValue>,
  errorHandling: ErrorHandling,
) {
  function hasValue(): this is Resource<Exclude<ResourceValue, undefined>> {
    if (isResourceRef(resource)) {
      return resource.hasValue();
    } else {
      return resource.hasValue();
    }
  }

  const metadataProps = {
    status: resource.status,
    error: resource.error,
    isLoading: resource.isLoading,
    snapshot: resource.snapshot,
    ...extractAdditionalSignalProps(resource),
  };

  if (isResourceRef(resource)) {
    return signalStoreFeature(
      withLinkedState(() => ({
        value: valueSignalForErrorHandling(resource, errorHandling),
      })),
      withProps(() => metadataProps),
      withMethods(() => ({
        hasValue,
        _reload: () => resource.reload(),
      })),
    );
  }

  return signalStoreFeature(
    withProps(() => ({
      value: valueSignalForErrorHandling(resource, errorHandling),
      ...metadataProps,
    })),
    withMethods(() => ({ hasValue })),
  );
}

function createNamedResource<Dictionary extends ResourceDictionary>(
  dictionary: Dictionary,
  errorHandling: ErrorHandling,
) {
  const keys = Object.keys(dictionary);

  const state: Record<string, WritableSignal<unknown>> = {};
  const props: Record<string, Signal<unknown>> = {};
  const methods: Record<string, () => boolean> = {};

  for (const resourceName of keys) {
    const res = dictionary[resourceName];

    props[`${resourceName}Status`] = res.status;
    props[`${resourceName}Error`] = res.error;
    props[`${resourceName}IsLoading`] = res.isLoading;
    props[`${resourceName}Snapshot`] = res.snapshot;
    assignPrefixedProps(props, resourceName, extractAdditionalSignalProps(res));
    methods[`${resourceName}HasValue`] = isResourceRef(res)
      ? () => res.hasValue()
      : () => res.hasValue();

    if (isResourceRef(res)) {
      state[`${resourceName}Value`] = valueSignalForErrorHandling(
        res,
        errorHandling,
      ) as WritableSignal<unknown>;
      methods[`_${resourceName}Reload`] = () => res.reload();
    } else {
      props[`${resourceName}Value`] = valueSignalForErrorHandling(
        res,
        errorHandling,
      );
    }
  }

  if (Object.keys(state).length === 0) {
    return signalStoreFeature(
      withProps(() => props),
      withMethods(() => methods),
    );
  }

  return signalStoreFeature(
    withLinkedState(() => state),
    withProps(() => props),
    withMethods(() => methods),
  );
}

export function isResource(value: unknown): value is Resource<unknown> {
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

export function isResourceRef(value: unknown): value is ResourceRef<unknown> {
  return (
    isResource(value) &&
    'reload' in value &&
    'set' in value &&
    'update' in value &&
    'asReadonly' in value
  );
}

function extractAdditionalSignalProps(
  resource: Resource<unknown>,
): Record<string, Signal<unknown>> {
  const additionalSignals: Record<string, Signal<unknown>> = {};

  for (const key of Object.keys(resource)) {
    if (isResourceCoreKey(key)) {
      continue;
    }

    const candidate = (resource as unknown as Record<string, unknown>)[key];
    if (isSignal(candidate)) {
      additionalSignals[key] = candidate;
    }
  }

  return additionalSignals;
}

function isResourceCoreKey(key: string): key is ResourceCoreKeys {
  return (
    key === 'value' ||
    key === 'status' ||
    key === 'error' ||
    key === 'isLoading' ||
    key === 'snapshot' ||
    key === 'hasValue'
  );
}

function assignPrefixedProps(
  target: Record<string, Signal<unknown>>,
  resourceName: string,
  source: Record<string, Signal<unknown>>,
): void {
  for (const key of Object.keys(source)) {
    target[`${resourceName}${capitalizeKey(key)}`] = source[key];
  }
}

function capitalizeKey(value: string): string {
  if (value.length === 0) {
    return value;
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

//** Types for `mapToResource` */

type NamedResource<Name extends string, T> = {
  [Prop in `${Name}Value`]: Signal<T>;
} & {
  [Prop in `${Name}Status`]: Signal<ResourceStatus>;
} & {
  [Prop in `${Name}Error`]: Signal<Error | undefined>;
} & {
  [Prop in `${Name}IsLoading`]: Signal<boolean>;
} & {
  [Prop in `${Name}HasValue`]: () => boolean;
} & {
  [Prop in `${Name}Snapshot`]: Signal<ResourceSnapshot<T>>;
};

type IsValidResourceName<
  Name extends string,
  Store extends Record<string, unknown>,
> =
  Store[`${Name}Value`] extends Signal<infer S>
    ? Store extends NamedResource<Name, S>
      ? true
      : false
    : false;

export type ResourceNames<Store extends Record<string, unknown>> = keyof {
  [Prop in keyof Store as Prop extends `${infer Name}Value`
    ? IsValidResourceName<Name, Store> extends true
      ? Name
      : never
    : never]: Store[Prop] extends Signal<infer S> ? S : never;
};

type MappedResource<
  Store extends Record<string, unknown>,
  Name extends string,
> = Resource<Store[`${Name}Value`] extends Signal<infer S> ? S : never>;

//** Implementation of `mapToResource` */

/**
 * @experimental
 * @description
 *
 * Maps a named resource to type `Resource<T>`.
 *
 * @usageNotes
 *
 * ```ts
 * const store = signalStore(
 *   withState({ userId: undefined as number | undefined }),
 *   withResource(({ userId }) => ({
 *     user: httpResource<User[]>(() => '/users', { defaultValue: [] }),
 *   }))
 * );
 * const userResource = mapToResource(store, 'user');
 * userResource satisfies Resource<User[]>;
 * ```
 *
 * @param store The store instance to map the resource to.
 * @param name The name of the resource to map.
 * @returns `Resource<T>`
 */
export function mapToResource<
  Name extends ResourceNames<Store>,
  Store extends Record<string, unknown>,
>(store: Store, name: Name): MappedResource<Store, Name> {
  const resourceName = String(name);

  function hasValue(): this is Resource<
    Exclude<MappedResource<Store, Name>, undefined>
  > {
    return (store[`${resourceName}HasValue`] as () => boolean)();
  }

  return {
    value: store[`${resourceName}Value`],
    status: store[`${resourceName}Status`],
    error: store[`${resourceName}Error`],
    isLoading: store[`${resourceName}IsLoading`],
    snapshot: store[`${resourceName}Snapshot`],
    hasValue,
  } as MappedResource<Store, Name>;
}

/**
 * Strategies to work around the error throwing behavior of the Resource API.
 *
 * The original idea was to use a `linkedSignal` as the state's value Signal. It would mean
 * that we can leverage the `computation` callback to handle the error. The downside is that
 * changes to that signal will not be reflected in the underlying resource, i.e. the resource
 * will not switch to status `local`.
 *
 * 1. An option to fix that would be to put the `linkedSignal` as property in the SignalStore,
 * where it would have the name `value`. Given, we apply a `DeepSignal` to it, it would not
 * break from the outside. The original value would be put into the state behind a hidden Symbol
 * as property name. In order to update the state, users will get an updater function, called
 * `setResource`.
 *
 * That works perfectly for unnamed resources, but could cause potential problems
 * for named resources, when they are defined multiple times, i.e. calling `withResource`
 * multiple times. The reason is that, we would have to hide their values in the state again
 * behind a symbol, but that would be a property which gets defined once, and would get new
 * subproperties (the values of the resources) added per additional `withResource` call.
 *
 * Using a separate updated method is a common SignalStore pattern, which is also used
 * in `withEntities`.
 *
 * For named resources, `setResource` would come with a name as first parameter.
 *
 * We saw in earlier experiments that there are TypeScript-specific challenges.
 *
 * Pros:
 * - Uses Angular's native `linkedSignal` and isn't a hackish approach
 * - Status transitions to 'local' work correctly (via direct `res.value.set()` in `setResource`)
 * - Works with `patchState`/`getState` (`linkedSignal` handles errors on read)
 * - Clear, explicit API with dedicated `setResource()` method
 *
 * Cons:
 * - Requires API change: users must use `setResource()` instead of `patchState(store, { value })`
 * - Named resources with multiple `withResource` calls: hidden state management becomes complex
 *
 * 2. A possible alternative would be to use a Proxy on value. Instead of using a `linkedSignal`,
 * we can leave the value signal as is and create a proxy around it that intercepts the get/call
 * operation and handles the error. The downside is that we need to implement the proxy ourselves,
 * which is not as clean as using a `linkedSignal`. On the other hand, there are indicators that
 * in future version of Angular, there are better ways of handling errors, which means that this
 * approach is only temporary.
 *
 * It could also happen, that we are getting some sort of "Mapped Signal", where not just the
 * reading (as in `linkedSignal`) but also the writing is handled.
 *
 * Pros:
 * - No API changes: `patchState(store, { value: x })` works naturally
 * - Status transitions to 'local' work correctly (writes go directly to original signal)
 * - Works with `patchState`/`getState` (proxy intercepts reads and handles errors)
 * - Uniform solution: same approach for both named and unnamed resources
 * - Transparent: looks and behaves like a normal signal from the outside
 *
 * Cons:
 * - Manual implementation: must properly handle all signal methods (`set`, `update`, `asReadonly`, etc.)
 * - Dependency tracking: need to verify proxy doesn't break Angular's reactivity system
 * - More complex proxy logic required for 'previous value' strategy (caching previous values)
 * - Less "Angular-native": doesn't leverage `linkedSignal`'s built-in reactivity guarantees
 *
 * =====
 *
 * The decision was made to use the proxy approach, because it is temporary and will not be
 * a breaking change.
 */
function valueSignalForErrorHandling<T>(
  res: Resource<T>,
  errorHandling: 'undefined value',
): Signal<T | undefined>;

function valueSignalForErrorHandling<T>(
  res: Resource<T>,
  errorHandling: ErrorHandling,
): Signal<T>;

function valueSignalForErrorHandling<T>(
  res: Resource<T>,
  errorHandling: ErrorHandling,
): Signal<T | undefined> {
  const originalSignal = res.value;

  switch (errorHandling) {
    case 'native':
      return originalSignal;
    case 'undefined value': {
      return new Proxy(originalSignal, {
        apply(target) {
          const status = untracked(() => res.status());
          try {
            // Always call the underlying signal to ensure reactivity.
            const value = target();
            if (status === 'error') {
              return undefined;
            }
            return value;
          } catch (error) {
            if (status === 'error') {
              return undefined;
            }
            throw error;
          }
        },
      });
    }
    case 'previous value': {
      let previousValue: T | undefined = undefined;
      let hasPreviousValue = false;

      return new Proxy(originalSignal, {
        apply(target) {
          const status = untracked(() => res.status());
          try {
            // Always call the underlying signal to ensure reactivity.
            const value = target();
            if (status === 'error') {
              if (!hasPreviousValue) {
                throw new Error(
                  'Impossible state: previous value is not available -> resource was initialized with error',
                );
              }
              return previousValue;
            }
            previousValue = value;
            hasPreviousValue = true;
            return value;
          } catch (error) {
            if (status === 'error') {
              if (!hasPreviousValue) {
                throw new Error(
                  'Impossible state: previous value is not available -> resource was initialized with error',
                );
              }
              return previousValue;
            }
            throw error;
          }
        },
      });
    }
  }
}
