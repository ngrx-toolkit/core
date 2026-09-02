import { isSignal, Signal, signal, untracked } from '@angular/core';
import {
  EmptyFeatureResult,
  patchState,
  SignalStoreFeature,
  signalStoreFeature,
  SignalStoreFeatureResult,
  watchState,
  withComputed,
  withHooks,
  withMethods,
} from '@ngrx/signals';
import { capitalize } from '../with-data-service';
import { ClearUndoRedoOptions } from './clear-undo-redo';

export type StackState = Record<string, unknown>;

export type StackItem = {
  timestamp: number;
  stack: StackState;
};

export type NormalizedUndoRedoOptions = {
  maxStackSize: number;
  collections?: string[];
  keys: string[];
  skip: number;
};

const defaultOptions: NormalizedUndoRedoOptions = {
  maxStackSize: 100,
  keys: [],
  skip: 0,
};

export function getUndoRedoKeys(collections?: string[]): string[] {
  if (collections) {
    return collections.flatMap((c) => [
      `${c}EntityMap`,
      `${c}Ids`,
      `selected${capitalize(c)}Ids`,
      `${c}Filter`,
    ]);
  }
  return ['entityMap', 'ids', 'selectedIds', 'filter'];
}

type NonNever<T> = T extends never ? never : T;

type ExtractEntityCollection<T> = T extends `${infer U}Entities` ? U : never;

type ExtractEntityCollections<Store extends SignalStoreFeatureResult> =
  NonNever<
    {
      [K in keyof Store['props']]: ExtractEntityCollection<K>;
    }[keyof Store['props']]
  >;

type Primitive = string | number | boolean | bigint | symbol | null | undefined;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFunction = (...args: any[]) => any;

/**
 * Recursively builds a union of dot-path strings for all
 * reachable leaf (and intermediate) keys in T.
 * Stops at primitives, arrays, Date and Function values.
 */
type DotPath<
  T,
  Depth extends readonly number[] = [],
> = Depth['length'] extends 10
  ? never
  : T extends Primitive | Date | AnyFunction | unknown[]
    ? never
    : {
        [K in Extract<keyof T, string>]: T[K] extends
          | Primitive
          | Date
          | AnyFunction
          | unknown[]
          ? K
          : K | `${K}.${DotPath<T[K], [...Depth, 0]>}`;
      }[Extract<keyof T, string>];

type OptionsForState<Store extends SignalStoreFeatureResult> = Partial<
  Omit<NormalizedUndoRedoOptions, 'collections' | 'keys'>
> & {
  collections?: ExtractEntityCollections<Store>[];
  keys?: (keyof Store['state'] | DotPath<Store['state']>)[];
};

/**
 * Expands a flat StackState that may contain dot-path keys (e.g. "filter.searchTerm")
 * into a deeply-nested object suitable for patchState.
 */
function createUpdater(stackState: StackState) {
  if (Object.keys(stackState).every((key) => !key.includes('.'))) {
    return stackState;
  }

  // needs partial state updater because of nested items that need to be spread
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (state: any) => {
    const updater: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(stackState)) {
      const segments = key.split('.');
      if (segments.length === 1) {
        // simple key with value
        updater[key] = value;
      } else {
        // nested key
        const firstSegment = segments[0];
        // Start with a copy of the current nested object (only if not already set and actually defined)
        if (
          !updater[firstSegment] &&
          (state as Record<string, unknown>)?.[firstSegment]
        ) {
          updater[firstSegment] = { ...structuredClone(state[firstSegment]) };
        }

        let nestedUpdater = updater;
        // loop through all but the last item and create the object if it doesn't exist
        for (let i = 0; i < segments.length - 1; i++) {
          const segment = segments[i];
          if (!nestedUpdater[segment]) {
            nestedUpdater[segment] = {};
          }
          nestedUpdater = nestedUpdater[segment] as Record<string, unknown>;
        }
        // set the value of the nested key
        nestedUpdater[segments.at(-1) as string] = value;
      }
    }

    return updater;
  };
}

export function withUndoRedo<Input extends EmptyFeatureResult>(
  options?: OptionsForState<Input>,
): SignalStoreFeature<
  Input,
  EmptyFeatureResult & {
    props: {
      canUndo: Signal<boolean>;
      canRedo: Signal<boolean>;
    };
    methods: {
      undo: () => void;
      redo: () => void;
      rollback: (savepoint: number) => void;
      /** @deprecated Use {@link clearUndoRedo} instead. */
      clearStack: () => void;
    };
  }
> {
  let lastRecord: StackItem | null = null;
  let skipOnce = false;

  const normalized = {
    ...defaultOptions,
    ...options,
  };

  //
  // Design Decision: This feature has its own
  // internal state.
  //

  const undoStack: StackItem[] = [];
  const redoStack: StackItem[] = [];

  const canUndo = signal(false);
  const canRedo = signal(false);

  const updateInternal = () => {
    canUndo.set(undoStack.length !== 0);
    canRedo.set(redoStack.length !== 0);
  };

  const keys = [
    ...getUndoRedoKeys(normalized.collections),
    ...(normalized.keys ?? []),
  ];

  return signalStoreFeature(
    withComputed(() => ({
      canUndo: canUndo.asReadonly(),
      canRedo: canRedo.asReadonly(),
    })),
    withMethods((store) => ({
      undo(): void {
        const item = undoStack.pop();

        if (item && lastRecord) {
          redoStack.push(lastRecord);
        }

        if (item) {
          skipOnce = true;
          patchState(store, createUpdater(item.stack));
          lastRecord = item;
        }

        updateInternal();
      },
      redo(): void {
        const item = redoStack.pop();

        if (item && lastRecord) {
          undoStack.push(lastRecord);
        }

        if (item) {
          skipOnce = true;
          patchState(store, createUpdater(item.stack));
          lastRecord = item;
        }

        updateInternal();
      },
      rollback(savepoint: number): void {
        // Savepoint is at or after the current state: nothing to roll back.
        if (lastRecord && lastRecord.timestamp <= savepoint) {
          return;
        }

        let item: StackItem | undefined;
        while (undoStack.length > 0) {
          item = undoStack.pop();

          if (!item) {
            break;
          }

          if (lastRecord) {
            redoStack.push(lastRecord);
          }
          lastRecord = item;

          // The most recent state with timestamp <= savepoint is the one
          // that should be restored.
          if (item.timestamp <= savepoint) {
            break;
          }
        }

        if (item) {
          skipOnce = true;
          patchState(store, createUpdater(item.stack));
        }

        updateInternal();
      },
      __clearUndoRedo__(opts?: ClearUndoRedoOptions<Input['state']>): void {
        undoStack.splice(0);
        redoStack.splice(0);

        if (!opts) {
          lastRecord = {
            timestamp: Date.now(),
            stack: store,
          };
        } else if (opts.lastRecord === null) {
          lastRecord = opts.lastRecord;
        }

        updateInternal();
      },
    })),
    withMethods((store) => ({
      /** @deprecated Use {@link clearUndoRedo} instead. */
      clearStack(): void {
        store.__clearUndoRedo__();
      },
    })),
    withHooks({
      onInit(store) {
        watchState(store, () => {
          const stateSnapshot = keys.reduce((acc, key) => {
            const segments = (key as string).split('.');

            // Walk the nested DeepSignal chain for each segment
            let node: unknown = store as Record<string, unknown>;
            for (const segment of segments) {
              if (isSignal(node)) {
                node = (node as Signal<unknown>)();
              }

              // check whether the node has the segment
              if ((node as Record<string, unknown>)?.[segment] === undefined) {
                node = undefined;
                break;
              }

              // Navigate to the segment
              node = (node as Record<string, unknown>)[segment];
            }

            // no state found for the key
            if (node === undefined) {
              return acc;
            }

            // If the final node is a signal, unwrap it
            const value = isSignal(node) ? (node as Signal<unknown>)() : node;
            return {
              ...acc,
              [key]: value,
            };
          }, {});

          if (normalized.skip > 0) {
            normalized.skip--;
            return;
          }

          if (skipOnce) {
            skipOnce = false;
            return;
          }

          //
          // Deep Comparison to prevent duplicated entries
          // on the stack. This can e.g. happen after an undo
          // if the component sends back the undone filter
          // to the store.
          //
          if (
            JSON.stringify(stateSnapshot) === JSON.stringify(lastRecord?.stack)
          ) {
            return;
          }

          // Clear redoStack after recorded action
          redoStack.splice(0);

          if (lastRecord) {
            undoStack.push(lastRecord);
          }

          if (redoStack.length > normalized.maxStackSize) {
            undoStack.unshift();
          }

          lastRecord = { timestamp: Date.now(), stack: stateSnapshot };
          // Don't propagate current reactive context
          untracked(() => updateInternal());
        });
      },
    }),
  );
}
