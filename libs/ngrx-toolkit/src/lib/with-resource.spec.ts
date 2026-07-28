import { httpResource, provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { Resource, resource, Signal } from '@angular/core';
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
import { Assert, AssertNot, IsEqual, Satisfies } from './test-utils/types';
import { ErrorHandling, mapToResource, withResource } from './with-resource';
import {
  stuffExtendedResourceReadable,
  stuffExtendedResourceWritable,
} from './with-resource/tests/util/custom-extended-resources';
import { Address, venice, vienna } from './with-resource/tests/util/fixtures';
import { paramsForResourceTypes } from './with-resource/tests/util/params-for-resource-types';
import { setupUnnamedResource } from './with-resource/tests/util/setup-unnamed-resource';
import { withPreviousValue } from './with-resource/tests/util/snapshot';

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

      describe('extra properties checks', () => {
        describe('extra properties go to `props` so they cannot be written to', () => {
          it('for unnamed writables', async () => {
            const Store = signalStore(
              { providedIn: 'root', protectedState: false },
              withResource(() => stuffExtendedResourceWritable(() => 'a')),
            );

            const store = TestBed.inject(Store);

            await wait();

            expect(store.stuff()).toBe('a stuff');

            // @ts-expect-error - extra properties should not be patchable
            patchState(store, { stuff: 'b stuff' });
          });
          it('for unnamed readables', async () => {
            const Store = signalStore(
              { providedIn: 'root', protectedState: false },
              withResource(() => stuffExtendedResourceReadable(() => 'a')),
            );

            const store = TestBed.inject(Store);

            await wait();

            expect(store.stuff()).toBe('a stuff');

            // @ts-expect-error - extra properties should not be patchable
            patchState(store, { stuff: 'b stuff' });
          });
          it('for named readables', async () => {
            const Store = signalStore(
              { providedIn: 'root', protectedState: false },
              withResource(() => ({
                name: stuffExtendedResourceReadable(() => 'a'),
              })),
            );

            const store = TestBed.inject(Store);

            await wait();

            expect(store.nameStuff()).toBe('a stuff');

            // @ts-expect-error - extra properties should not be patchable
            patchState(store, { nameStuff: 'b stuff' });
          });
          it('for named writables', async () => {
            const Store = signalStore(
              { providedIn: 'root', protectedState: false },
              withResource(() => ({
                name: stuffExtendedResourceWritable(() => 'a'),
              })),
            );

            const store = TestBed.inject(Store);

            await wait();

            expect(store.nameStuff()).toBe('a stuff');

            // @ts-expect-error - extra properties should not be patchable
            patchState(store, { nameStuff: 'b stuff' });
          });
        });
        it('can call custom unnamed writable resource and extract custom extra signal properties', async () => {
          const Store = signalStore(
            { providedIn: 'root', protectedState: false },
            withResource(() => stuffExtendedResourceWritable(() => 'a')),
          );
          const store = TestBed.inject(Store);

          await wait();

          expect(store.value()).toBe('a');
          expect(store.stuff()).toBe('a stuff');

          patchState(store, { value: 'b' });

          expect(store.value()).toBe('b');
          expect(store.stuff()).toBe('b stuff');
        });
        it('can call custom unnamed readable resource and extract custom extra signal properties', async () => {
          const Store = signalStore(
            { providedIn: 'root', protectedState: false },
            withResource(() => stuffExtendedResourceReadable(() => 'a')),
          );
          const store = TestBed.inject(Store);

          await wait();

          expect(store.value()).toBe('a');
          expect(store.stuff()).toBe('a stuff');

          // @ts-expect-error - readable resources should not have their value patchable
          patchState(store, { value: 'b' });

          expect(store.value()).toBe('a');
          expect(store.stuff()).toBe('a stuff');
        });
        it('can supply custom named resources (writable and unwritable) and extract custom extra signal properties', async () => {
          const Store = signalStore(
            { providedIn: 'root', protectedState: false },
            withResource(() => ({
              idWritable: stuffExtendedResourceWritable(() => 'a'),
              idReadable: stuffExtendedResourceReadable(() => 'a'),
            })),
          );
          const store = TestBed.inject(Store);

          await wait();

          expect(store.idWritableValue()).toBe('a');
          expect(store.idReadableValue()).toBe('a');
          expect(store.idWritableStuff()).toBe('a stuff');
          expect(store.idReadableStuff()).toBe('a stuff');

          patchState(store, { idWritableValue: 'b' });
          // @ts-expect-error - readable resources should not have their value patchable
          patchState(store, { idReadableValue: 'b' });

          expect(store.idWritableValue()).toBe('b');
          expect(store.idReadableValue()).toBe('a');
          expect(store.idWritableStuff()).toBe('b stuff');
          expect(store.idReadableStuff()).toBe('a stuff');
        });

        it('can supply custom unnamed (writable and unwritable) and custom named (writable and unwritable) and extract custom extra signal properties', async () => {
          const UnnamedWritableAndNamedComboStore = signalStore(
            { providedIn: 'root', protectedState: false },
            withResource(() => stuffExtendedResourceWritable(() => 'a')),
            withResource(() => ({
              idWritable: stuffExtendedResourceWritable(() => 'a'),
              idReadable: stuffExtendedResourceReadable(() => 'a'),
            })),
          );
          const unnamedWritableAndNamedComboStore = TestBed.inject(
            UnnamedWritableAndNamedComboStore,
          );

          await wait();

          expect(unnamedWritableAndNamedComboStore.value()).toBe('a');
          expect(unnamedWritableAndNamedComboStore.stuff()).toBe('a stuff');
          expect(unnamedWritableAndNamedComboStore.idWritableValue()).toBe('a');
          expect(unnamedWritableAndNamedComboStore.idReadableValue()).toBe('a');
          expect(unnamedWritableAndNamedComboStore.idWritableStuff()).toBe(
            'a stuff',
          );
          expect(unnamedWritableAndNamedComboStore.idReadableStuff()).toBe(
            'a stuff',
          );

          patchState(unnamedWritableAndNamedComboStore, {
            idWritableValue: 'b',
          });
          patchState(unnamedWritableAndNamedComboStore, { value: 'b' });
          patchState(unnamedWritableAndNamedComboStore, {
            // @ts-expect-error - readable resources should not have their value patchable
            idReadableValue: 'b',
          });

          expect(unnamedWritableAndNamedComboStore.value()).toBe('b');
          expect(unnamedWritableAndNamedComboStore.stuff()).toBe('b stuff');
          expect(unnamedWritableAndNamedComboStore.idWritableValue()).toBe('b');
          expect(unnamedWritableAndNamedComboStore.idReadableValue()).toBe('a');
          expect(unnamedWritableAndNamedComboStore.idWritableStuff()).toBe(
            'b stuff',
          );
          expect(unnamedWritableAndNamedComboStore.idReadableStuff()).toBe(
            'a stuff',
          );

          const UnnamedUnwritableAndNamedComboStore = signalStore(
            { providedIn: 'root', protectedState: false },
            withResource(() => stuffExtendedResourceReadable(() => 'a')),
            withResource(() => ({
              idWritable: stuffExtendedResourceWritable(() => 'a'),
              idReadable: stuffExtendedResourceReadable(() => 'a'),
            })),
          );
          const unnamedUnwritableAndNamedComboStore = TestBed.inject(
            UnnamedUnwritableAndNamedComboStore,
          );

          await wait();

          expect(unnamedUnwritableAndNamedComboStore.value()).toBe('a');
          expect(unnamedUnwritableAndNamedComboStore.stuff()).toBe('a stuff');
          expect(unnamedUnwritableAndNamedComboStore.idWritableValue()).toBe(
            'a',
          );
          expect(unnamedUnwritableAndNamedComboStore.idReadableValue()).toBe(
            'a',
          );
          expect(unnamedUnwritableAndNamedComboStore.idWritableStuff()).toBe(
            'a stuff',
          );
          expect(unnamedUnwritableAndNamedComboStore.idReadableStuff()).toBe(
            'a stuff',
          );

          patchState(unnamedUnwritableAndNamedComboStore, {
            idWritableValue: 'b',
          });
          // @ts-expect-error - readable resources should not have their value patchable
          patchState(unnamedUnwritableAndNamedComboStore, { value: 'b' });
          patchState(unnamedUnwritableAndNamedComboStore, {
            // @ts-expect-error - readable resources should not have their value patchable
            idReadableValue: 'b',
          });

          expect(unnamedUnwritableAndNamedComboStore.value()).toBe('a');
          expect(unnamedUnwritableAndNamedComboStore.stuff()).toBe('a stuff');
          expect(unnamedUnwritableAndNamedComboStore.idWritableValue()).toBe(
            'b',
          );
          expect(unnamedUnwritableAndNamedComboStore.idReadableValue()).toBe(
            'a',
          );
          expect(unnamedUnwritableAndNamedComboStore.idWritableStuff()).toBe(
            'b stuff',
          );
          expect(unnamedUnwritableAndNamedComboStore.idReadableStuff()).toBe(
            'a stuff',
          );
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

        //TODO wait for https://github.com/ngrx/platform/pull/4932 and then add 'value' to the list
        it.each([
          'status',
          'error',
          'isLoading',
          '_reload',
          'hasValue',
          'stuff',
        ])(
          `warns if %s is not a member of the store with a custom extended resource`,
          (memberName) => {
            const Store = signalStore(
              { providedIn: 'root' },
              withProps(() => ({ [memberName]: true })),
              withResource(() => stuffExtendedResourceWritable(() => 'a')),
            );

            TestBed.inject(Store);

            expect(warningSpy).toHaveBeenCalledWith(
              '@ngrx/signals: SignalStore members cannot be overridden.',
              'Trying to override:',
              memberName,
            );
          },
        );
      });

      it('works also with list/detail use case', async () => {
        const Store = signalStore(
          { providedIn: 'root', protectedState: false },
          withState({ id: undefined as number | undefined }),
          withResource(({ id }) => ({
            list: httpResource<
              {
                id: number;
                name: string;
              }[]
            >(() => '/address', {
              defaultValue: [],
            }),
            detail: httpResource<Address>(() =>
              id() ? `/address/${id()}` : undefined,
            ),
          })),
        );

        TestBed.configureTestingModule({
          providers: [provideHttpClient(), provideHttpClientTesting()],
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

      it('fails on hasValue as type predicate when not explicitly typed', () => {
        const Store = signalStore(
          { providedIn: 'root' },
          withResource(() => resource({ loader: () => Promise.resolve(1) })),
        );
        const store = TestBed.inject(Store);
        if (store.hasValue()) {
          const _value = store.value();
          type _T1 = AssertNot<IsEqual<typeof _value, number>>;
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

      it('fails on hasValue as type predicate when not explicitly typed', () => {
        const Store = signalStore(
          { providedIn: 'root' },
          withResource(() => resource({ loader: () => Promise.resolve(1) }), {
            errorHandling: 'undefined value',
          }),
        );
        const store = TestBed.inject(Store);
        if (store.hasValue()) {
          const _value = store.value();
          type _T1 = AssertNot<IsEqual<typeof _value, number>>;
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

        it('fails on hasValue as type predicate when not explicitly typed', () => {
          const Store = signalStore(
            { providedIn: 'root' },
            withResource(() => resource({ loader: () => Promise.resolve(1) }), {
              errorHandling,
            }),
          );
          const store = TestBed.inject(Store);
          if (store.hasValue()) {
            const _value = store.value();
            type _T1 = AssertNot<IsEqual<typeof _value, number>>;
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
    it('only exposes reload methods for reloadable resources', () => {
      const Store = signalStore(
        { providedIn: 'root' },
        withResource(() => ({
          digit: resource({
            loader: () => Promise.resolve(-1),
            defaultValue: 0,
          }),
          digitSnapshotted: withPreviousValue(
            resource({
              loader: () => Promise.resolve(-1),
              defaultValue: 0,
            }),
          ),
        })),
        withResource(() =>
          resource({
            loader: () => Promise.resolve(-1),
            defaultValue: 0,
          }),
        ),
        withMethods((store) => ({
          namedReload: () => store._digitReload(),
          unnamedReload: () => store._reload(),
          // @ts-expect-error - a snapshot should not have a reload
          invalidReload: () => store._digitSnapshottedReload(),
        })),
      );

      const _store = TestBed.inject(Store);

      type _T1 = Assert<IsEqual<typeof _store.namedReload, () => boolean>>;
      type _T2 = Assert<IsEqual<typeof _store.unnamedReload, () => boolean>>;
    });

    describe('patchState restrictions do not allow patching', () => {
      it('an unnamed non-reloadable resource value', () => {
        signalStore(
          withResource(() =>
            withPreviousValue(
              resource({
                loader: () => Promise.resolve(1),
                defaultValue: 0,
              }),
            ),
          ),
          withMethods((store) => ({
            // @ts-expect-error - non-reloadable Resource values are not state
            setValue: (value: number) => patchState(store, { value }),
          })),
        );
      });

      it('a named non-reloadable resource value', () => {
        signalStore(
          withResource(() => ({
            digitSnapshotted: withPreviousValue(
              resource({
                loader: () => Promise.resolve(-1),
                defaultValue: 0,
              }),
            ),
          })),
          withMethods((store) => ({
            setNamedValue: (value: number) =>
              // @ts-expect-error digitSnapshotted is a `Resource` value, but not state, so it should not be patchable
              patchState(store, { digitSnapshottedValue: value }),
          })),
        );
      });
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
