import { Signal } from '@angular/core';
import {
  EmptyFeatureResult,
  signalStoreFeature,
  SignalStoreFeature,
  SignalStoreFeatureResult,
  StateSignals,
  StateSource,
  withComputed,
  withMethods,
  WritableStateSource,
} from '@ngrx/signals';
import { Mutation, MutationResult, MutationStatus } from './mutation/mutation';

// NamedMutationMethods below will infer the actual parameter and return types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MutationsDictionary = Record<string, Mutation<any, any, any>>;

// withMethods uses Record<string, Function> internally
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export type MethodsDictionary = Record<string, Function>;

type NamedMutationProps<T extends MutationsDictionary> = {
  [Prop in keyof T as `${Prop & string}IsPending`]: Signal<boolean>;
} & {
  [Prop in keyof T as `${Prop & string}Status`]: Signal<MutationStatus>;
} & {
  [Prop in keyof T as `${Prop & string}Error`]: Signal<Error | undefined>;
};

type NamedMutationMethods<T extends MutationsDictionary> = {
  [Prop in keyof T as `${Prop & string}`]: T[Prop] extends Mutation<
    infer P,
    infer R,
    infer E
  >
    ? (params: P) => Promise<MutationResult<R, E>>
    : never;
};

export type NamedMutationResult<T extends MutationsDictionary> =
  EmptyFeatureResult & {
    props: NamedMutationProps<T>;
    methods: NamedMutationMethods<T>;
  };

/**
 * Adds mutation methods to the store. Also, for each mutation method, several
 * Signals are added informing about the mutation's status and errors.
 *
 * ```typescript
 * export type Params = {
 *   value: number;
 * };
 *
 * export const CounterStore = signalStore(
 *   { providedIn: 'root' },
 *   withState({ counter: 0 }),
 *   withMutations((store) => ({
 *     increment: rxMutation({ ... }),
 *   })),
 * );
 * ```
 *
 * There are several types of mutations. In the example shown, an {@link module:rx-mutation.rxMutation | rxMutation}
 * leveraging RxJS is used
 *
 * For the defined `increment` mutation, several the following properties and
 * methods are added to the store:
 * - `increment(params: Params): Promise<MutationResult<number>>`: The mutation method.
 * - `incrementIsPending`: A signal indicating if the mutation is in progress.
 * - `incrementStatus`: A signal representing the current status of the mutation.
 * - `incrementError`: A signal containing any error that occurred during the mutation.
 *
 * @param mutationsFactory
 */
export function withMutations<
  Input extends SignalStoreFeatureResult,
  Result extends MutationsDictionary,
>(
  mutationsFactory: (
    store: Input['props'] &
      Input['methods'] &
      WritableStateSource<Input['state']> &
      StateSignals<Input['state']>,
  ) => Result,
): SignalStoreFeature<Input, NamedMutationResult<Result>>;

export function withMutations<
  Input extends SignalStoreFeatureResult,
  Result extends MutationsDictionary,
>(
  mutationsFactory: (
    store: Input['props'] & Input['methods'] & StateSource<Input['state']>,
  ) => Result,
): SignalStoreFeature<Input> {
  return (store) => {
    // TODO: Is this the correct usage?
    const source = store as StateSource<typeof store.stateSignals>;
    const mutations = mutationsFactory({
      ...source,
      ...store.props,
      ...store.methods,
      ...store.stateSignals,
    });

    const feature = createMutationsFeature(mutations);
    return feature(store);
  };
}

function createMutationsFeature<Result extends MutationsDictionary>(
  mutations: Result,
) {
  const keys = Object.keys(mutations);

  const feature = signalStoreFeature(
    withMethods(() =>
      keys.reduce(
        (acc, key) => ({
          ...acc,
          [key]: async (params: never) => {
            const mutation = mutations[key];
            if (!mutation) {
              throw new Error(`Mutation ${key} not found`);
            }
            const result = await mutation(params);
            return result;
          },
        }),
        {} as MethodsDictionary,
      ),
    ),
    withComputed(() =>
      keys.reduce(
        (acc, key) => ({
          ...acc,
          [`${key}IsPending`]: mutations[key].isPending,
          [`${key}Status`]: mutations[key].status,
          [`${key}Error`]: mutations[key].error,
        }),
        {} as NamedMutationProps<Result>,
      ),
    ),
  );
  return feature;
}
