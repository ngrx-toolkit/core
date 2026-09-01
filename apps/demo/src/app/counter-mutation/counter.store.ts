import {
  concatOp,
  httpMutation,
  rxMutation,
  withMutations,
} from '@ngrx-toolkit/core';
import { patchState, signalStore, withState } from '@ngrx/signals';
import { delay, Observable } from 'rxjs';

export type Params = {
  value: number;
};

// httpbin.org echos the request in the json property
export type CounterResponse = {
  json: { counter: number };
};

export const CounterStore = signalStore(
  { providedIn: 'root' },
  withState({
    counter: 0,
    lastResponse: undefined as unknown | undefined,
  }),
  withMutations((store) => ({
    increment: rxMutation({
      operation: (params: Params) => {
        return calcSum(store.counter(), params.value);
      },
      operator: concatOp,
      onSuccess: (result) => {
        console.log('result', result);
        patchState(store, { counter: result });
      },
      onError: (error) => {
        console.error('Error occurred:', error);
      },
    }),
    saveToServer: httpMutation<void, CounterResponse>({
      request: () => ({
        url: `https://httpbin.org/post`,
        method: 'POST',
        body: { counter: store.counter() },
        headers: { 'Content-Type': 'application/json' },
      }),
      onSuccess: (response) => {
        console.log('Counter sent to server:', response);
        patchState(store, { lastResponse: response.json });
      },
      onError: (error) => {
        console.error('Failed to send counter:', error);
      },
    }),
  })),
);

let error = false;

function createSumObservable(a: number, b: number): Observable<number> {
  return new Observable<number>((subscriber) => {
    const result = a + b;

    if ((result === 7 || result === 13) && !error) {
      subscriber.error({ message: 'error due to bad luck!', result });
      error = true;
    } else {
      subscriber.next(result);
      error = false;
    }
    subscriber.complete();
  });
}

function calcSum(a: number, b: number): Observable<number> {
  // return of(a + b);
  return createSumObservable(a, b).pipe(delay(500));
}
