import {
  linkedSignal,
  Resource,
  resourceFromSnapshots,
  ResourceSnapshot,
} from '@angular/core';

export function withPreviousValue<T>(input: Resource<T>): Resource<T> {
  const derived = linkedSignal<ResourceSnapshot<T>, ResourceSnapshot<T>>({
    source: input.snapshot,
    computation: (snap, previous) => {
      if (
        snap.status === 'loading' &&
        previous &&
        previous.value.status !== 'error'
      ) {
        // When the input resource enters loading state, we keep the value
        // from its previous state, if any.
        return { status: 'loading' as const, value: previous.value.value };
      }
      // Otherwise we simply forward the state of the input resource.
      return snap;
    },
  });
  return resourceFromSnapshots(derived);
}
