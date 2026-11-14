import { inject, resource } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { patchState, signalStore, withState } from '@ngrx/signals';
import { ErrorHandling, withResource } from '../../../with-resource';
import { Address, AddressResolver, venice } from './fixtures';
import { ResourceTestAdapter } from './resource-test-adapter';

export function setupNamedResource(
  errorHandling: ErrorHandling,
): ResourceTestAdapter & { store: Record<string, unknown> } {
  const addressResolver = {
    resolve: jest.fn(() => Promise.resolve(venice)),
  };

  const UserStore = signalStore(
    { providedIn: 'root', protectedState: false },
    withState({ id: undefined as number | undefined }),
    withResource(
      (store) => {
        const resolver = inject(AddressResolver);
        return {
          address: resource({
            params: store.id,
            loader: ({ params: id }) => resolver.resolve(id),
          }),
        };
      },
      { errorHandling },
    ),
  );

  TestBed.configureTestingModule({
    providers: [
      {
        provide: AddressResolver,
        useValue: addressResolver,
      },
    ],
  });

  const store = TestBed.inject(UserStore);

  // avoid TypeScript's excessive property checks
  return {
    store,
    addressResolver,
    setId: (id: number) => patchState(store, { id }),
    setValue: (value: Address) => patchState(store, { addressValue: value }),
    getValue: () => store.addressValue(),
    getMetadata: () => ({
      status: store.addressStatus(),
      error: store.addressError(),
      isLoading: store.addressIsLoading(),
      hasValue: store.addressHasValue(),
    }),
  };
}
