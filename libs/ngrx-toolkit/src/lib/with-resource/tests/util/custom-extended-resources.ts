import { computed, Resource, ResourceRef, Signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';

export function stuffExtendedResourceWritable(
  params?: () => string | undefined,
): ResourceRef<string | undefined> & { stuff: Signal<string> } {
  const resource = rxResource({
    params: () => params?.() ?? '',
    stream: ({ params }) => {
      return of<string>(params);
    },
  });

  const stuff = computed(() => resource.value() + ' stuff');

  return {
    stuff,
    value: resource.value,
    status: resource.status,
    error: resource.error,
    isLoading: resource.isLoading,
    snapshot: resource.snapshot,
    hasValue: resource.hasValue,
    set: resource.set.bind(resource),
    update: resource.update.bind(resource),
    asReadonly: resource.asReadonly.bind(resource),
    reload: resource.reload.bind(resource),
    destroy: resource.destroy.bind(resource),
  };
}

export function stuffExtendedResourceReadable(
  params?: () => string | undefined,
): Resource<string | undefined> & { stuff: Signal<string> } {
  const resource = rxResource({
    params: () => params?.() ?? '',
    stream: ({ params }) => {
      return of<string>(params);
    },
  }).asReadonly();

  const stuff = computed(() => resource.value() + ' stuff');

  return {
    stuff,
    value: resource.value,
    status: resource.status,
    error: resource.error,
    isLoading: resource.isLoading,
    snapshot: resource.snapshot,
    hasValue: resource.hasValue.bind(resource),
  };
}
