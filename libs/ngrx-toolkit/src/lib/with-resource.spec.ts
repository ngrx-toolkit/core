import { httpResource, provideHttpClient, withXhr } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { Resource, resource, ResourceSnapshot, Signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { TestBed } from '@angular/core/testing';
import {
  patchState,
  signalStore,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { of } from 'rxjs';
import { Assert, IsEqual, Satisfies } from './test-utils/types';
import { ErrorHandling, mapToResource, withResource } from './with-resource';
import { Address, venice, vienna } from './with-resource/tests/util/fixtures';
import { paramsForResourceTypes } from './with-resource/tests/util/params-for-resource-types';
import { setupUnnamedResource } from './with-resource/tests/util/setup-unnamed-resource';

describe('withResource', () => {
  describe('standard tests', () => {
    const wait = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));

    describe('withResource', () => {
      describe('InnerSignalStore access', () => {
        it('can access the state signals', async () => {
          const UserStore = signalStore(
            { providedIn: 'root' },
            withState({ userId: 1 }),
            withResource((store) =>
              resource({
                params: store.userId,
                loader: ({ params: id }) => Promise.resolve(id + 1),
              }),
            ),
          );

          const userStore = TestBed.inject(UserStore);

          await wait();
          expect(userStore.value()).toBe(2);
        });

        it('can accept an rxResource', async () => {
          const UserStore = signalStore(
            { providedIn: 'root' },
            withState({ userId: 1 }),
            withResource((store) =>
              rxResource({
                params: store.userId,
                stream: ({ params: id }) => of(id + 1),
              }),
            ),
          );

          const userStore = TestBed.inject(UserStore);

          await wait();
          expect(userStore.value()).toBe(2);
        });

        it('can access the props', async () => {
          const UserStore = signalStore(
            { providedIn: 'root' },
            withProps(() => ({ userId: 1 })),
            withResource((store) =>
              resource({
                params: () => store.userId,
                loader: ({ params: id }) => Promise.resolve(id + 1),
              }),
            ),
          );

          const userStore = TestBed.inject(UserStore);
          await wait();
          expect(userStore.value()).toBe(2);
        });

        it('can access the methods', async () => {
          const UserStore = signalStore(
            { providedIn: 'root' },
            withMethods(() => ({ getValue: () => 1 })),
            withResource((store) =>
              resource({
                params: () => store.getValue(),
                loader: ({ params: id }) => Promise.resolve(id + 1),
              }),
            ),
          );

          const userStore = TestBed.inject(UserStore);
          await wait();
          expect(userStore.value()).toBe(2);
        });
      });

      describe('status checks', () => {
        describe('all except error', () => {
          describe.each([
            'native',
            'undefined value',
            'previous value',
          ] as ErrorHandling[])(`Error Handling: %s`, (errorHandling) => {
            describe.each(paramsForResourceTypes(errorHandling))(
              `$name`,
              ({ setup }) => {
                it('has idle status in the beginning', () => {
                  const { getValue, getMetadata } = setup();

                  expect(getValue()).toBeUndefined();
                  expect(getMetadata()).toEqual({
                    status: 'idle',
                    error: undefined,
                    isLoading: false,
                    hasValue: false,
                  });
                });

                it('has loading status when loading', () => {
                  const { getValue, getMetadata, addressResolver, setId } =
                    setup();

                  addressResolver.resolve.mockResolvedValue(venice);
                  setId(1);

                  expect(getValue()).toBeUndefined();
                  expect(getMetadata()).toEqual({
                    status: 'loading',
                    error: undefined,
                    isLoading: true,
                    hasValue: false,
                  });
                });

                it('has resolved status when loaded', async () => {
                  const { getValue, getMetadata, addressResolver, setId } =
                    setup();

                  addressResolver.resolve.mockResolvedValue(venice);
                  setId(1);

                  await wait();

                  expect(getValue()).toEqual(venice);
                  expect(getMetadata()).toEqual({
                    status: 'resolved',
                    error: undefined,
                    isLoading: false,
                    hasValue: true,
                  });
                });

                it('has local once updated', async () => {
                  const {
                    getValue,
                    getMetadata,
                    addressResolver,
                    setId,
                    setValue,
                  } = setup();

                  addressResolver.resolve.mockResolvedValue(venice);
                  setId(1);

                  await wait();
                  setValue(vienna);

                  expect(getValue()).toEqual(vienna);
                  expect(getMetadata()).toEqual({
                    status: 'local',
                    error: undefined,
                    isLoading: false,
                    hasValue: true,
                  });
                });
              },
            );

            it('reloads an unnamed resource', async () => {
              const { addressResolver, setId, getMetadata, reload, getValue } =
                setupUnnamedResource(errorHandling);

              addressResolver.resolve.mockResolvedValue(venice);
              setId(1);

              await wait();
              expect(getMetadata().hasValue).toBe(true);

              addressResolver.resolve.mockResolvedValue(vienna);
              reload();

              await wait();
              expect(getValue()).toEqual(vienna);
            });
          });
        });

        describe('error status', () => {
          describe('Error Handling: native', () => {
            it.each(paramsForResourceTypes('native'))(
              `$name`,
              async ({ setup }) => {
                const { addressResolver, setId, getValue } = setup();

                addressResolver.resolve.mockRejectedValue(new Error('Error'));
                setId(1);
                await wait();

                expect(() => getValue()).toThrow();
              },
            );
          });

          describe('Error Handling: undefined value', () => {
            it.each(paramsForResourceTypes('undefined value'))(
              '$name',
              async ({ setup }) => {
                const { addressResolver, setId, getValue } = setup();

                addressResolver.resolve.mockRejectedValue(new Error('Error'));
                setId(1);
                await wait();
                expect(getValue()).toBeUndefined();
              },
            );
          });

          describe('Error Handling: previous value', () => {
            it('returns the previous value', async () => {
              const { addressResolver, setId, getValue } =
                setupUnnamedResource('previous value');

              setId(1);
              addressResolver.resolve.mockReturnValue(Promise.resolve(venice));
              await wait();
              expect(getValue()).toBe(venice);

              setId(2);
              addressResolver.resolve.mockRejectedValue(new Error('Error'));
              await wait();
              expect(getValue()).toBe(venice);
            });

            it('returns the local previous value', async () => {
              const { addressResolver, setId, setValue, getValue } =
                setupUnnamedResource('previous value');

              setId(1);
              addressResolver.resolve.mockReturnValue(Promise.resolve(venice));
              await wait();
              expect(getValue()).toBe(venice);
              setValue(vienna);

              setId(2);
              addressResolver.resolve.mockRejectedValue(new Error('Error'));
              await wait();
              expect(getValue()).toBe(vienna);
            });
          });
        });
      });

      describe('override protection', () => {
        const warningSpy = jest.spyOn(console, 'warn');

        afterEach(() => {
          warningSpy.mockClear();
        });

        //TODO wait for https://github.com/ngrx/platform/pull/4932 and then add 'value' to the list
        it.each(['status', 'error', 'isLoading', '_reload', 'hasValue'])(
          `warns if %s is not a member of the store`,
          (memberName) => {
            const Store = signalStore(
              { providedIn: 'root' },
              withProps(() => ({ [memberName]: true })),
              withResource(() =>
                resource({ loader: () => Promise.resolve(1) }),
              ),
            );

            TestBed.inject(Store);

            expect(warningSpy).toHaveBeenCalledWith(
              '@ngrx/signals: SignalStore members cannot be overridden.',
              'Trying to override:',
              memberName,
            );
          },
        );

        //TODO wait for https://github.com/ngrx/platform/pull/4932
        it.skip('also checks for named resources', () => {
          const Store = signalStore(
            { providedIn: 'root' },
            withState({ userValue: 1 }),
            withResource(() => ({
              user: resource({
                loader: () => Promise.resolve(1),
              }),
            })),
          );

          TestBed.inject(Store);

          expect(warningSpy).toHaveBeenCalledWith(
            '@ngrx/signals: SignalStore members cannot be overridden.',
            'Trying to override:',
            'userValue',
          );
        });
      });

      it('works also with list/detail use case', async () => {
        const Store = signalStore(
          { providedIn: 'root', protectedState: false },
          withState({ id: undefined as number | undefined }),
          withResource(({ id }) => ({
            list: httpResource<{ id: number; name: string }[]>(
              () => '/address',
              {
                defaultValue: [],
              },
            ),
            detail: httpResource<Address>(() =>
              id() ? `/address/${id()}` : undefined,
            ),
          })),
        );

        TestBed.configureTestingModule({
          providers: [provideHttpClient(withXhr()), provideHttpClientTesting()],
        });

        const store = TestBed.inject(Store);
        const ctrl = TestBed.inject(HttpTestingController);

        expect(store.listValue()).toEqual([]);
        expect(store.detailValue()).toBeUndefined();
        await wait();
        ctrl.expectOne('/address').flush([{ id: 1, name: 'Italy' }]);

        await wait();
        expect(store.listValue()).toEqual([{ id: 1, name: 'Italy' }]);
        expect(store.detailValue()).toBeUndefined();

        patchState(store, { id: 1 });
        await wait();
        ctrl.expectOne('/address/1').flush(venice);
        await wait();
        expect(store.listValue()).toEqual([{ id: 1, name: 'Italy' }]);
        expect(store.detailValue()).toEqual(venice);
      });
    });
  });

  describe('Type Tests', () => {
    describe('Error Handling: default', () => {
      it('satisfies the Resource interface without default value', () => {
        const Store = signalStore(
          { providedIn: 'root' },
          withResource(() => resource({ loader: () => Promise.resolve(1) })),
        );
        const _store = TestBed.inject(Store);
        type _T1 = Assert<
          Satisfies<typeof _store, Resource<number | undefined>>
        >;
      });

      it('satisfies the Resource interface with default value', () => {
        const Store = signalStore(
          { providedIn: 'root' },
          withResource(() =>
            resource({ loader: () => Promise.resolve(1), defaultValue: 0 }),
          ),
        );
        const _store = TestBed.inject(Store);
        type _T1 = Assert<
          Satisfies<typeof _store, Resource<number | undefined>>
        >;
      });

      it('provides hasValue as type predicate when explicitly typed', () => {
        const Store = signalStore(
          { providedIn: 'root' },
          withResource(() => resource({ loader: () => Promise.resolve(1) })),
        );
        const store: Resource<number | undefined> = TestBed.inject(Store);
        if (store.hasValue()) {
          type _T1 = Assert<IsEqual<typeof store.value, Signal<number>>>;
        }
      });

      it('removes undefined from the inferred value type after hasValue', () => {
        const Store = signalStore(
          { providedIn: 'root' },
          withResource(() => resource({ loader: () => Promise.resolve(1) })),
        );
        const store = TestBed.inject(Store);
        if (store.hasValue()) {
          const _value = store.value();
          type _T1 = Assert<IsEqual<typeof _value, number>>;
        }
      });
    });

    describe('Error Handling: undefined value', () => {
      it('satisfies the Resource interface without default value', () => {
        const Store = signalStore(
          { providedIn: 'root' },
          withResource(() => resource({ loader: () => Promise.resolve(1) }), {
            errorHandling: 'undefined value',
          }),
        );
        const _store = TestBed.inject(Store);
        type _T1 = Assert<
          Satisfies<typeof _store, Resource<number | undefined>>
        >;
      });

      it('satisfies the Resource interface with default value', () => {
        const Store = signalStore(
          { providedIn: 'root' },
          withResource(
            () =>
              resource({ loader: () => Promise.resolve(1), defaultValue: 0 }),
            { errorHandling: 'undefined value' },
          ),
        );
        const _store = TestBed.inject(Store);
        type _T1 = Assert<
          Satisfies<typeof _store, Resource<number | undefined>>
        >;
      });

      it('provides hasValue as type predicate when explicitly typed', () => {
        const Store = signalStore(
          { providedIn: 'root' },
          withResource(() => resource({ loader: () => Promise.resolve(1) }), {
            errorHandling: 'undefined value',
          }),
        );
        const store: Resource<number | undefined> = TestBed.inject(Store);
        if (store.hasValue()) {
          type _T1 = Assert<IsEqual<typeof store.value, Signal<number>>>;
        }
      });

      it('removes undefined from the inferred value type after hasValue', () => {
        const Store = signalStore(
          { providedIn: 'root' },
          withResource(() => resource({ loader: () => Promise.resolve(1) }), {
            errorHandling: 'undefined value',
          }),
        );
        const store = TestBed.inject(Store);
        if (store.hasValue()) {
          const _value = store.value();
          type _T1 = Assert<IsEqual<typeof _value, number>>;
        }
      });

      it('removes undefined from the inferred value type after hasValue for named resources', () => {
        const Store = signalStore(
          { providedIn: 'root' },
          withResource(
            () => {
              return {
                thing: resource({
                  loader: () => Promise.resolve(1),
                }),
              };
            },
            {
              errorHandling: 'native',
            },
          ),
        );
        const store = TestBed.inject(Store);
        if (store.thingHasValue()) {
          const _value = store.thingValue();
          type _T1 = Assert<IsEqual<typeof _value, number>>;
        }
      });
    });

    describe.each(['previous value', 'native'] as const)(
      `Error Handling: %s`,
      (errorHandling) => {
        it('satisfies the Resource interface without default value', () => {
          const Store = signalStore(
            { providedIn: 'root' },
            withResource(() => resource({ loader: () => Promise.resolve(1) }), {
              errorHandling,
            }),
          );
          const _store = TestBed.inject(Store);
          type _T1 = Assert<
            Satisfies<typeof _store, Resource<number | undefined>>
          >;
        });

        it('satisfies the Resource interface with default value', () => {
          const Store = signalStore(
            { providedIn: 'root' },
            withResource(
              () =>
                resource({ loader: () => Promise.resolve(1), defaultValue: 0 }),
              { errorHandling },
            ),
          );
          const _store = TestBed.inject(Store);
          type _T1 = Assert<Satisfies<typeof _store, Resource<number>>>;
        });

        it('provides hasValue as type predicate when explicitly typed', () => {
          const Store = signalStore(
            { providedIn: 'root' },
            withResource(() => resource({ loader: () => Promise.resolve(1) }), {
              errorHandling,
            }),
          );
          const store: Resource<number | undefined> = TestBed.inject(Store);
          if (store.hasValue()) {
            type _T1 = Assert<IsEqual<typeof store.value, Signal<number>>>;
          }
        });

        it('removes undefined from the inferred value type after hasValue', () => {
          const Store = signalStore(
            { providedIn: 'root' },
            withResource(() => resource({ loader: () => Promise.resolve(1) }), {
              errorHandling,
            }),
          );
          const store = TestBed.inject(Store);
          if (store.hasValue()) {
            const _value = store.value();
            type _T1 = Assert<IsEqual<typeof _value, number>>;
          }
        });
      },
    );

    describe('unnamed resource', () => {
      it('does not have access to the STATE_SOURCE', () => {
        signalStore(
          withState({ id: 1 }),
          withResource((store) =>
            resource({
              params: store.id,
              loader: ({ params: id }) => {
                // @ts-expect-error - we want to test the type error
                patchState(store, { id: 0 });

                return Promise.resolve(id + 1);
              },
            }),
          ),
        );
      });
      it('exposes the resource snapshot', () => {
        const Store = signalStore(
          { providedIn: 'root' },
          withResource(() => resource({ loader: () => Promise.resolve(1) })),
        );
        const _store = TestBed.inject(Store);
        const _snapshot = _store.snapshot();
        type _T1 = Assert<
          IsEqual<typeof _snapshot, ResourceSnapshot<number | undefined>>
        >;
      });
    });

    describe('named resources', () => {
      it('does not have access to the STATE_SOURCE', () => {
        signalStore(
          withState({ id: 1 }),
          withResource((store) => ({
            user: resource({
              params: store.id,
              loader: ({ params: id }) => {
                // @ts-expect-error - we want to test the type error
                patchState(store, { id: 0 });

                return Promise.resolve(id + 1);
              },
            }),
          })),
        );
      });
      it('exposes the resource snapshot for named resources', () => {
        const Store = signalStore(
          { providedIn: 'root' },
          withResource(() => ({
            user: resource({ loader: () => Promise.resolve(1) }),
          })),
        );
        const _store = TestBed.inject(Store);
        const _snapshot = _store.userSnapshot();
        type _T1 = Assert<
          IsEqual<typeof _snapshot, ResourceSnapshot<number | undefined>>
        >;
      });
    });

    it('shoud allow different resource types with named resources', () => {
      const Store = signalStore(
        { providedIn: 'root' },
        withResource(
          () => ({
            id: resource({
              loader: () => Promise.resolve(1),
              defaultValue: 0,
            }),
          }),
          { errorHandling: 'native' },
        ),
        withResource(
          () => ({
            word: resource({
              loader: () => Promise.resolve('hello'),
              defaultValue: '',
            }),
          }),
          { errorHandling: 'undefined value' },
        ),
        withResource(
          () => ({
            optionalId: resource({
              loader: () => Promise.resolve(1),
              defaultValue: 0,
            }),
          }),
          { errorHandling: 'previous value' },
        ),
        withResource(() => ({
          digit: resource({
            loader: () => Promise.resolve(-1),
            defaultValue: 0,
          }),
        })),
      );

      const _store = TestBed.inject(Store);

      type _T1 = Assert<IsEqual<typeof _store.idValue, Signal<number>>>;
      type _T2 = Assert<
        IsEqual<typeof _store.wordValue, Signal<string | undefined>>
      >;
      type _T3 = Assert<IsEqual<typeof _store.optionalIdValue, Signal<number>>>;
      type _T4 = Assert<
        IsEqual<typeof _store.digitValue, Signal<number | undefined>>
      >;
    });

    describe('mapToResource', () => {
      it('satisfies the Resource interface without default value', () => {
        const Store = signalStore(
          { providedIn: 'root' },
          withResource(
            () => ({
              id: resource({ loader: () => Promise.resolve(1) }),
            }),
            { errorHandling: 'native' },
          ),
        );

        const _store = mapToResource(TestBed.inject(Store), 'id');
        type _T1 = Assert<IsEqual<typeof _store, Resource<number | undefined>>>;
      });

      it('exposes the resource snapshot for named resources', () => {
        const Store = signalStore(
          { providedIn: 'root' },
          withResource(() => ({
            user: resource({ loader: () => Promise.resolve(1) }),
          })),
        );

        const _store = TestBed.inject(Store);
        const _resource = mapToResource(_store, 'user');
        const _snapshot = _resource.snapshot();
        type _T1 = Assert<
          IsEqual<typeof _snapshot, ResourceSnapshot<number | undefined>>
        >;
      });

      it('satisfies the Resource interface with default value and native error handling', () => {
        const Store = signalStore(
          { providedIn: 'root' },
          withResource(
            () => ({
              id: resource({
                loader: () => Promise.resolve(1),
                defaultValue: 0,
              }),
            }),
            { errorHandling: 'native' },
          ),
        );

        const store = TestBed.inject(Store);
        const _resource = mapToResource(store, 'id');
        type _T1 = Assert<IsEqual<typeof _resource, Resource<number>>>;
      });

      it('provides hasValue as type predicate', () => {
        const Store = signalStore(
          { providedIn: 'root' },
          withResource(() => ({
            id: resource({ loader: () => Promise.resolve(1) }),
          })),
        );

        const store = TestBed.inject(Store);
        const res = mapToResource(store, 'id');

        if (res.hasValue()) {
          const _value = res.value();
          type _T1 = Assert<IsEqual<typeof _value, number>>;
        }
      });

      describe('resource name checks', () => {
        const setup = () => {
          const Store = signalStore(
            { providedIn: 'root' },
            withState({ key: 1, work: 'test' }),
            withResource(() => ({
              id: resource({ loader: () => Promise.resolve(1) }),
              word: resource({ loader: () => Promise.resolve('hello') }),
            })),
          );

          return TestBed.inject(Store);
        };

        it('allows passing id as a valid resource name', () => {
          const store = setup();
          mapToResource(store, 'id') satisfies Resource<number | undefined>;
        });

        it('allows passing word as a valid resource name', () => {
          const store = setup();
          mapToResource(store, 'word') satisfies Resource<string | undefined>;
        });

        it('fails when passing key as a resource name', () => {
          const store = setup();
          // @ts-expect-error - we want to test the type error
          mapToResource(store, 'key');
        });
      });

      it('fails when Resource properties are not fully defined', () => {
        const Store = signalStore(withState({ userValue: 0 }));

        const store = new Store();
        // @ts-expect-error - we want to test the type error
        mapToResource(store, 'user');
      });
    });
  });

  describe('Signature Tests', () => {
    it('can call unnamed with error handler', () => {
      signalStore(
        withResource(
          () => ({
            id: resource({ loader: () => Promise.resolve(1) }),
          }),
          { errorHandling: 'undefined value' },
        ),
      );
    });

    it('can call named with error handler', () => {
      signalStore(
        withResource(
          () => ({
            id: resource({ loader: () => Promise.resolve(1) }),
          }),
          { errorHandling: 'undefined value' },
        ),
      );
    });

    it('can call unnamed without error handler', () => {
      signalStore(
        withResource(() => ({
          id: resource({ loader: () => Promise.resolve(1) }),
        })),
      );
    });

    it('can call named without error handler', () => {
      signalStore(
        withResource(() => ({
          id: resource({ loader: () => Promise.resolve(1) }),
        })),
      );
    });
  });
});
