import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { patchState, signalStore, withState } from '@ngrx/signals';
import { delay, Observable, of, Subject, switchMap, throwError } from 'rxjs';
import { concatOp, exhaustOp, mergeOp, switchOp } from './flattening-operator';
import { Mutation, MutationResult } from './mutation/mutation';
import { rxMutation } from './mutation/rx-mutation';
import { Assert, AssertNot, IsEqual } from './test-utils/types';
import { withMutations } from './with-mutations';

type Param =
  | number
  | {
      value: number | Observable<number>;
      delay?: number;
      fail?: boolean;
    };

type NormalizedParam = {
  value: number | Observable<number>;
  delay: number;
  fail: boolean;
};

async function asyncTick(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, 0);
  });
}

function calcDouble(value: number, delayInMsec = 1000): Observable<number> {
  return of(value * 2).pipe(delay(delayInMsec));
}

function fail(_value: number, delayInMsec = 1000): Observable<number> {
  return of(null).pipe(
    delay(delayInMsec),
    switchMap(() => throwError(() => ({ error: 'Test-Error' }))),
  );
}

function createTestSetup(flatteningOperator = concatOp) {
  function normalizeParam(param: Param): NormalizedParam {
    if (typeof param === 'number') {
      return {
        value: param,
        delay: 1000,
        fail: false,
      };
    }

    return {
      value: param.value,
      delay: param.delay ?? 1000,
      fail: param.fail ?? false,
    };
  }

  type SuccessParams = { result: number; params: Param };
  type ErrorParams = { error: unknown; params: Param };

  let onSuccessCalls = 0;
  let onErrorCalls = 0;

  let lastOnSuccessParams: SuccessParams | undefined = undefined;
  let lastOnErrorParams: ErrorParams | undefined = undefined;

  return TestBed.runInInjectionContext(() => {
    const Store = signalStore(
      withState({ counter: 3 }),
      withMutations((store) => ({
        increment: rxMutation({
          operation: (param: Param) => {
            const normalized = normalizeParam(param);

            if (normalized.value instanceof Observable) {
              return normalized.value.pipe(
                switchMap((value) => {
                  if (normalized.fail) {
                    return fail(value, normalized.delay);
                  }
                  return calcDouble(value, normalized.delay);
                }),
              );
            }

            if (normalized.fail) {
              return fail(normalized.value, normalized.delay);
            }
            return calcDouble(normalized.value, normalized.delay);
          },
          operator: flatteningOperator,
          onSuccess: (result, params) => {
            lastOnSuccessParams = { result, params };
            onSuccessCalls++;
            patchState(store, (state) => ({
              counter: state.counter + result,
            }));
          },
          onError: (error, params) => {
            lastOnErrorParams = { error, params };
            onErrorCalls++;
          },
        }),
      })),
    );

    const store = new Store();
    return {
      store,
      onSuccessCalls: () => onSuccessCalls,
      onErrorCalls: () => onErrorCalls,
      lastOnSuccessParams: () => lastOnSuccessParams,
      lastOnErrorParams: () => lastOnErrorParams,
    };
  });
}

describe('withMutations with rxMutation', () => {
  it('should update the state', fakeAsync(() => {
    const testSetup = createTestSetup();
    const store = testSetup.store;

    expect(store.incrementStatus()).toEqual('idle');
    expect(store.incrementIsPending()).toEqual(false);

    store.increment(2);
    expect(store.incrementStatus()).toEqual('pending');
    expect(store.incrementIsPending()).toEqual(true);

    tick(2000);
    expect(store.incrementStatus()).toEqual('success');
    expect(store.incrementIsPending()).toEqual(false);
    expect(store.incrementError()).toEqual(undefined);

    expect(store.counter()).toEqual(7);
  }));

  it('sets error', fakeAsync(() => {
    const testSetup = createTestSetup();
    const store = testSetup.store;

    store.increment({ value: 2, fail: true });

    tick(2000);
    expect(store.incrementStatus()).toEqual('error');
    expect(store.incrementIsPending()).toEqual(false);
    expect(store.incrementError()).toEqual({
      error: 'Test-Error',
    });

    expect(store.counter()).toEqual(3);
  }));

  it('starts two concurrent operations using concatMap: the first one fails and the second one succeeds', fakeAsync(() => {
    const testSetup = createTestSetup(concatOp);
    const store = testSetup.store;

    store.increment({ value: 1, delay: 100, fail: true });
    store.increment({ value: 2, delay: 200, fail: false });

    tick(100);

    expect(store.incrementStatus()).toEqual('pending');
    expect(store.incrementIsPending()).toEqual(true);
    expect(store.incrementError()).toEqual({
      error: 'Test-Error',
    });

    tick(200);

    expect(store.incrementStatus()).toEqual('success');
    expect(store.incrementIsPending()).toEqual(false);
    expect(store.incrementError()).toEqual(undefined);

    expect(store.counter()).toEqual(7);
  }));

  it('starts two concurrent operations using mergeMap: the first one fails and the second one succeeds', fakeAsync(() => {
    const testSetup = createTestSetup(mergeOp);
    const store = testSetup.store;

    store.increment({ value: 1, delay: 100, fail: true });
    store.increment({ value: 2, delay: 200, fail: false });

    tick(100);

    expect(store.incrementStatus()).toEqual('pending');
    expect(store.incrementIsPending()).toEqual(true);
    expect(store.incrementError()).toEqual({
      error: 'Test-Error',
    });

    tick(100);

    expect(store.incrementStatus()).toEqual('success');
    expect(store.incrementIsPending()).toEqual(false);
    expect(store.incrementError()).toEqual(undefined);

    expect(store.counter()).toEqual(7);
  }));

  it('deals with race conditions using switchMap', fakeAsync(() => {
    const testSetup = createTestSetup(switchOp);
    const store = testSetup.store;

    store.increment(1);

    tick(500);
    expect(store.incrementStatus()).toEqual('pending');
    expect(store.incrementIsPending()).toEqual(true);

    store.increment(2);
    tick(1000);

    expect(store.incrementStatus()).toEqual('success');
    expect(store.incrementIsPending()).toEqual(false);
    expect(store.incrementError()).toEqual(undefined);

    expect(store.counter()).toEqual(7);
    expect(testSetup.onSuccessCalls()).toEqual(1);
    expect(testSetup.onErrorCalls()).toEqual(0);
    expect(testSetup.lastOnSuccessParams()).toEqual({
      params: 2,
      result: 4,
    });
  }));

  it('deals with race conditions using mergeMap', fakeAsync(() => {
    const testSetup = createTestSetup(mergeOp);
    const store = testSetup.store;

    store.increment(1);
    tick(500);
    store.increment(2);
    tick(500);

    expect(store.incrementStatus()).toEqual('pending');
    expect(store.incrementIsPending()).toEqual(true);

    // expect(store.counter()).toEqual(7);
    expect(testSetup.onSuccessCalls()).toEqual(1);
    expect(testSetup.onErrorCalls()).toEqual(0);
    expect(testSetup.lastOnSuccessParams()).toEqual({
      params: 1,
      result: 2,
    });

    tick(500);

    expect(store.incrementStatus()).toEqual('success');
    expect(store.incrementIsPending()).toEqual(false);
    expect(store.incrementError()).toEqual(undefined);

    expect(store.counter()).toEqual(9);
    expect(testSetup.onSuccessCalls()).toEqual(2);
    expect(testSetup.onErrorCalls()).toEqual(0);
    expect(testSetup.lastOnSuccessParams()).toEqual({
      params: 2,
      result: 4,
    });
  }));

  it('deals with race conditions using mergeMap where the 2nd task starts after and finishes before the 1st one', fakeAsync(() => {
    const testSetup = createTestSetup(mergeOp);
    const store = testSetup.store;

    store.increment({ value: 1, delay: 1000 });
    tick(500);

    expect(store.incrementStatus()).toEqual('pending');
    expect(store.incrementIsPending()).toEqual(true);

    store.increment({ value: 2, delay: 100 });
    tick(500);

    expect(store.incrementStatus()).toEqual('success');
    expect(store.incrementIsPending()).toEqual(false);
    expect(store.incrementError()).toEqual(undefined);

    expect(store.counter()).toEqual(9);
    expect(testSetup.onSuccessCalls()).toEqual(2);
    expect(testSetup.onErrorCalls()).toEqual(0);
    expect(testSetup.lastOnSuccessParams()).toEqual({
      params: { value: 1, delay: 1000 },
      result: 2,
    });
  }));

  it('deals with race conditions using concatMap', fakeAsync(() => {
    const testSetup = createTestSetup(concatOp);
    const store = testSetup.store;

    store.increment({ value: 1, delay: 1000 });
    tick(500);
    store.increment({ value: 2, delay: 100 });
    tick(500);

    expect(store.incrementStatus()).toEqual('pending');
    expect(store.incrementIsPending()).toEqual(true);

    expect(store.counter()).toEqual(5);
    expect(testSetup.onSuccessCalls()).toEqual(1);
    expect(testSetup.onErrorCalls()).toEqual(0);
    expect(testSetup.lastOnSuccessParams()).toEqual({
      params: { value: 1, delay: 1000 },
      result: 2,
    });

    tick(500);

    expect(store.incrementStatus()).toEqual('success');
    expect(store.incrementIsPending()).toEqual(false);
    expect(store.incrementError()).toEqual(undefined);

    expect(store.counter()).toEqual(9);
    expect(testSetup.onSuccessCalls()).toEqual(2);
    expect(testSetup.onErrorCalls()).toEqual(0);
    expect(testSetup.lastOnSuccessParams()).toEqual({
      params: { value: 2, delay: 100 },
      result: 4,
    });
  }));

  it('deals with race conditions using exhaustMap', fakeAsync(() => {
    const testSetup = createTestSetup(exhaustOp);
    const store = testSetup.store;

    store.increment({ value: 1, delay: 1000 });
    tick(500);

    expect(store.incrementStatus()).toEqual('pending');
    expect(store.incrementIsPending()).toEqual(true);

    store.increment({ value: 2, delay: 100 });
    tick(500);

    expect(store.incrementStatus()).toEqual('success');
    expect(store.incrementIsPending()).toEqual(false);
    expect(store.incrementError()).toEqual(undefined);

    expect(store.counter()).toEqual(5);
    expect(testSetup.onSuccessCalls()).toEqual(1);
    expect(testSetup.onErrorCalls()).toEqual(0);
    expect(testSetup.lastOnSuccessParams()).toEqual({
      params: { value: 1, delay: 1000 },
      result: 2,
    });

    tick(500);

    expect(store.incrementStatus()).toEqual('success');
    expect(store.incrementIsPending()).toEqual(false);
    expect(store.incrementError()).toEqual(undefined);

    expect(store.counter()).toEqual(5);
    expect(testSetup.onSuccessCalls()).toEqual(1);
    expect(testSetup.onErrorCalls()).toEqual(0);
    expect(testSetup.lastOnSuccessParams()).toEqual({
      params: { value: 1, delay: 1000 },
      result: 2,
    });
  }));

  it('informs about failed operation via the returned promise', async () => {
    const testSetup = createTestSetup(switchOp);
    const store = testSetup.store;

    const p1 = store.increment({ value: 1, delay: 1, fail: false });
    const p2 = store.increment({ value: 2, delay: 2, fail: true });

    expect(store.incrementStatus()).toEqual('pending');
    expect(store.incrementIsPending()).toEqual(true);

    await asyncTick();

    const result1 = await p1;
    const result2 = await p2;

    expect(result1.status).toEqual('aborted');
    expect(result2).toEqual({
      status: 'error',
      error: {
        error: 'Test-Error',
      },
    });

    expect(store.incrementIsPending()).toEqual(false);
    expect(store.incrementStatus()).toEqual('error');
    expect(store.incrementError()).toEqual({
      error: 'Test-Error',
    });
  });

  it('informs about successful operation via the returned promise', async () => {
    const testSetup = createTestSetup();
    const store = testSetup.store;

    const resultPromise = store.increment({ value: 2, delay: 2, fail: false });

    expect(store.incrementStatus()).toEqual('pending');
    expect(store.incrementIsPending()).toEqual(true);

    await asyncTick();

    const result = await resultPromise;

    expect(result).toEqual({
      status: 'success',
      value: 4,
    });

    expect(store.incrementIsPending()).toEqual(false);
    expect(store.incrementStatus()).toEqual('success');
    expect(store.incrementError()).toBeUndefined();
  });

  it('informs about aborted operation when using switchMap', async () => {
    const testSetup = createTestSetup(switchOp);
    const store = testSetup.store;

    const p1 = store.increment({ value: 1, delay: 1, fail: false });
    const p2 = store.increment({ value: 2, delay: 2, fail: false });

    expect(store.incrementStatus()).toEqual('pending');
    expect(store.incrementIsPending()).toEqual(true);

    await asyncTick();

    const result1 = await p1;
    const result2 = await p2;

    expect(result1.status).toEqual('aborted');
    expect(result2).toEqual({
      status: 'success',
      value: 4,
    });

    expect(store.incrementIsPending()).toEqual(false);
    expect(store.incrementStatus()).toEqual('success');
    expect(store.incrementError()).toBeUndefined();
  });

  it('informs about aborted operation when using exhaustMap', async () => {
    const testSetup = createTestSetup(exhaustOp);
    const store = testSetup.store;

    const p1 = store.increment({ value: 1, delay: 1, fail: false });
    const p2 = store.increment({ value: 2, delay: 1, fail: false });

    expect(store.incrementStatus()).toEqual('pending');
    expect(store.incrementIsPending()).toEqual(true);

    await asyncTick();

    const result1 = await p1;
    const result2 = await p2;

    expect(result1).toEqual({
      status: 'success',
      value: 2,
    });

    expect(result2.status).toEqual('aborted');

    expect(store.incrementIsPending()).toEqual(false);
    expect(store.incrementStatus()).toEqual('success');
    expect(store.incrementError()).toBeUndefined();
  });

  it('calls success handler per value in the stream and returns the final value via the promise', async () => {
    const testSetup = createTestSetup(switchOp);
    const store = testSetup.store;

    const input$ = new Subject<number>();
    const resultPromise = store.increment({
      value: input$,
      delay: 1,
      fail: false,
    });

    expect(store.incrementStatus()).toEqual('pending');
    expect(store.incrementIsPending()).toEqual(true);

    input$.next(1);
    input$.next(2);
    input$.next(3);
    input$.complete();

    await asyncTick();

    const result = await resultPromise;

    expect(result).toEqual({
      status: 'success',
      value: 6,
    });

    expect(store.counter()).toEqual(9);
    expect(testSetup.lastOnSuccessParams()).toMatchObject({
      result: 6,
    });

    expect(store.incrementIsPending()).toEqual(false);
    expect(store.incrementStatus()).toEqual('success');
    expect(store.incrementError()).toBeUndefined();
  });

  it('informs about failed operation via the returned promise', async () => {
    const testSetup = createTestSetup(switchOp);
    const store = testSetup.store;

    const p1 = store.increment({ value: 1, delay: 1, fail: false });
    const p2 = store.increment({ value: 2, delay: 2, fail: true });

    expect(store.incrementStatus()).toEqual('pending');
    expect(store.incrementIsPending()).toEqual(true);

    await asyncTick();

    const result1 = await p1;
    const result2 = await p2;

    expect(result1.status).toEqual('aborted');
    expect(result2).toEqual({
      status: 'error',
      error: {
        error: 'Test-Error',
      },
    });

    expect(store.incrementIsPending()).toEqual(false);
    expect(store.incrementStatus()).toEqual('error');
    expect(store.incrementError()).toEqual({
      error: 'Test-Error',
    });
  });

  it('does not expose mutation properties directly, only the method', async () => {
    // Test case for https://github.com/angular-architects/ngrx-toolkit/issues/286
    const testSetup = createTestSetup(switchOp);
    const store = testSetup.store;

    expect(typeof store.increment).toEqual('function');
    // @ts-expect-error Should not expose properties, only the method
    expect(store.increment.isPending).toBeUndefined();
  });

  it('types mutation method as plain callable Promise signature and returns nothing else from a mutation', () => {
    // Test case for https://github.com/angular-architects/ngrx-toolkit/issues/286
    const testSetup = createTestSetup();
    const store = testSetup.store;

    // Only the method is exposed
    type _T1 = Assert<
      IsEqual<
        typeof store.increment,
        (params: Param) => Promise<MutationResult<number>>
      >
    >;

    // Other mutation properties not present
    type _T2 = AssertNot<
      IsEqual<typeof store.increment, Mutation<Param, number>>
    >;

    // _T2 in other words:

    // CAN...
    // Still can call mutation function
    store.increment(0);

    // CANNOT...
    // @ts-expect-error should not expose properties, only method call
    const _status = store.increment.status;
    // @ts-expect-error should not expose properties, only method call
    const _value = store.increment.value;
    // @ts-expect-error should not expose properties, only method call
    const _isPending = store.increment.isPending;
    // @ts-expect-error should not expose properties, only method call
    const _isSuccess = store.increment.isSuccess;
    // @ts-expect-error should not expose properties, only method call
    const _error = store.increment.error;
    // @ts-expect-error should not expose properties, only method call
    const _hasValue = store.increment.hasValue;
  });
});
