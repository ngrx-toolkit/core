import { inject, resource } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { ErrorHandling, withResource } from '../../../with-resource';
import { Address, AddressResolver, venice } from './fixtures';
import { ReloadableResourceTestAdapter } from './resource-test-adapter';

export function setupUnnamedResource(
  errorHandling?: ErrorHandling,
): ReloadableResourceTestAdapter {
  const addressResolver = {
    resolve: jest.fn(() => Promise.resolve(venice)),
  };
  const AddressStore = signalStore(
    { providedIn: 'root', protectedState: false },
    withState({ id: undefined as number | undefined }),
    withResource(
      (store) => {
        const resolver = inject(AddressResolver);
        return resource({
          params: store.id,
          loader: ({ params: id }) => resolver.resolve(id),
        });
      },
      { errorHandling },
    ),
    withMethods((store) => ({ reload: () => store._reload() })),
  );

  TestBed.configureTestingModule({
    providers: [
      {
        provide: AddressResolver,
        useValue: addressResolver,
      },
    ],
  });

  const store = TestBed.inject(AddressStore);

  return {
    addressResolver,
    setId: (id: number) => patchState(store, { id }),
    setValue: (value: Address) => patchState(store, { value }),
    getValue: () => store.value(),
    getMetadata: () => ({
      status: store.status(),
      error: store.error(),
      isLoading: store.isLoading(),
      hasValue: store.hasValue(),
    }),
    reload: () => store.reload(),
  };
}
