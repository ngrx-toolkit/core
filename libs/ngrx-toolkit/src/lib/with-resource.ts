//** Types for `withResource` */

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
    hasValue: <R extends Resource<T>>(
      this: R,
    ) => this is Resource<Exclude<T, undefined>> & R;
    _reload(): boolean;
  };
};

export type ResourceDictionary = Record<string, ResourceRef<unknown>>;

export type NamedResourceResult<
  T extends ResourceDictionary,
  HasUndefinedErrorHandling extends boolean,
> = {
  state: {
    [Prop in keyof T as `${Prop &
      string}Value`]: T[Prop]['value'] extends Signal<infer S>
      ? HasUndefinedErrorHandling extends true
        ? S | undefined
        : S
      : never;
  };
  props: {
    [Prop in keyof T as `${Prop & string}Status`]: Signal<ResourceStatus>;
  } & {
    [Prop in keyof T as `${Prop & string}Error`]: Signal<Error | undefined>;
  } & {
    [Prop in keyof T as `${Prop & string}IsLoading`]: Signal<boolean>;
  } & {
    [Prop in keyof T as `${Prop & string}Snapshot`]: T[Prop]['snapshot'];
  };
  methods: {
    [Prop in keyof T as `${Prop & string}HasValue`]: <
      R extends Record<
        `${Prop & string}Value`,
        Signal<
          T[Prop]['value'] extends Signal<infer S>
            ? HasUndefinedErrorHandling extends true
              ? S | undefined
              : S
            : never
        >
      >,
    >(
      this: R,
    ) => this is Record<
      `${Prop & string}Value`,
      Signal<
        Exclude<T[Prop]['value'] extends Signal<infer S> ? S : never, undefined>
      >
    > &
      R;
  } & {
    [Prop in keyof T as `_${Prop & string}Reload`]: () => boolean;
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
 * The resource's value is stored under the `value` key in the state
 * and is exposed as a `DeepSignal`.
 *
 * It can also be updated via `patchState`.
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
  ResourceValue,
>(
  resourceFactory: (
    store: Input['props'] & Input['methods'] & StateSignals<Input['state']>,
  ) => ResourceRef<ResourceValue>,
): SignalStoreFeature<Input, ResourceResult<ResourceValue | undefined>>;

export function withResource<
  Input extends SignalStoreFeatureResult,
  ResourceValue,
>(
  resourceFactory: (
    store: Input['props'] & Input['methods'] & StateSignals<Input['state']>,
  ) => ResourceRef<ResourceValue>,
  resourceOptions: { errorHandling: 'undefined value' },
): SignalStoreFeature<Input, ResourceResult<ResourceValue | undefined>>;

export function withResource<
  Input extends SignalStoreFeatureResult,
  ResourceValue,
>(
  resourceFactory: (
    store: Input['props'] & Input['methods'] & StateSignals<Input['state']>,
  ) => ResourceRef<ResourceValue>,
  resourceOptions?: ResourceOptions,
): SignalStoreFeature<Input, ResourceResult<ResourceValue>>;

/**
 * @experimental
 * @description
 *
 * Integrates multiple resources into the SignalStore. Each resource is
 * registered by name, which is used as a prefix when spreading the members
 * of `Resource` onto the store.
 *
 * Each resource’s value is part of the state, stored under the `value` key
 * with the resource name as prefix. Values are exposed as `DeepSignal`s and
 * can be updated via `patchState`.
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
 * methods, and state signals. It must return a `Record<string, ResourceRef>`.
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
  ) => ResourceRef<ResourceValue> | ResourceDictionary,
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

    if (isResourceRef(resourceOrDictionary)) {
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
  resource: ResourceRef<ResourceValue>,
  errorHandling: ErrorHandling,
) {
  function hasValue(): this is Resource<Exclude<ResourceValue, undefined>> {
    return resource.hasValue();
  }

  return signalStoreFeature(
    withLinkedState(() => ({
      value: valueSignalForErrorHandling(resource, errorHandling),
    })),
    withProps(() => ({
      status: resource.status,
      error: resource.error,
      isLoading: resource.isLoading,
      snapshot: resource.snapshot,
    })),
    withMethods(() => ({
      hasValue,
      _reload: () => resource.reload(),
    })),
  );
}

function createNamedResource<Dictionary extends ResourceDictionary>(
  dictionary: Dictionary,
  errorHandling: ErrorHandling,
) {
  const keys = Object.keys(dictionary);

  const state: Record<string, WritableSignal<unknown>> = keys.reduce(
    (state, resourceName) => ({
      ...state,
      [`${resourceName}Value`]: valueSignalForErrorHandling(
        dictionary[resourceName],
        errorHandling,
      ),
    }),
    {},
  );

  const props: Record<string, Signal<unknown>> = keys.reduce(
    (props, resourceName) => ({
      ...props,
      [`${resourceName}Status`]: dictionary[resourceName].status,
      [`${resourceName}Error`]: dictionary[resourceName].error,
      [`${resourceName}IsLoading`]: dictionary[resourceName].isLoading,
      [`${resourceName}Snapshot`]: dictionary[resourceName].snapshot,
    }),
    {},
  );

  const methods: Record<string, () => boolean> = keys.reduce(
    (methods, resourceName) => {
      return {
        ...methods,
        [`${resourceName}HasValue`]: () => dictionary[resourceName].hasValue(),
        [`_${resourceName}Reload`]: () => dictionary[resourceName].reload(),
      };
    },
    {},
  );

  return signalStoreFeature(
    withLinkedState(() => state),
    withProps(() => props),
    withMethods(() => methods),
  );
}

export function isResourceRef(value: unknown): value is ResourceRef<unknown> {
  return (
    value !== null &&
    typeof value === 'object' &&
    'value' in value &&
    isSignal(value.value) &&
    'status' in value &&
    'error' in value &&
    'isLoading' in value &&
    'hasValue' in value &&
    'reload' in value &&
    'snapshot' in value
  );
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
 * @returns `ResourceRef<T>`
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
  res: ResourceRef<T>,
  errorHandling: 'undefined value',
): WritableSignal<T | undefined>;

function valueSignalForErrorHandling<T>(
  res: ResourceRef<T>,
  errorHandling: ErrorHandling,
): WritableSignal<T>;

function valueSignalForErrorHandling<T>(
  res: ResourceRef<T>,
  errorHandling: ErrorHandling,
): WritableSignal<T | undefined> {
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
