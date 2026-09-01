---
title: Mutations
---

```typescript
import { httpMutation } from '@ngrx-toolkit/core';
```

```typescript
import { rxMutation } from '@ngrx-toolkit/core';
```

```typescript
import { withMutations } from '@ngrx-toolkit/core';
```

```typescript
// Optional, `concatOp` is the default.
import { concatOp, exhaustOp, mergeOp, switchOp } from '@ngrx-toolkit/core';
```

## Basic Usage

The mutations feature (`withMutations`) and methods (`httpMutation` and `rxMutation`) seek to offer an appropriate equivalent to signal resources for sending data back to the backend. The methods can be used in `withMutations()` but can be used outside of a store in something like a component or service as well.

This guide covers

- Why we do not use [`withResource`](./with-resource), and the direction on mutations from the community
- Key Features ([summary](#key-features-summary) and [in depth](#key-features-in-depth)):
  - The params to pass (via RxJS or via `HttpClient` params without RxJS)
  - Callbacks available (`onSuccess` and `onError`)
  - Flattening operators (`concatOp, exhaustOp, mergeOp, switchOp`)
  - Calling the mutations (optionally as `Promise`)
  - State signals available (`value/status/error/isPending`)
      <!-- TODO - resolve when #235 closed-->
    - For `httpMutation`, the response type is specified with the param `parse: (res: T) => res as T`
    - `hasValue` signal to narrow type. ⚠️NOTE⚠️: currently there is an [outstanding bug](https://github.com/ngrx-toolkit/core/issues/235) that this does not properly narrow.
  - [How to use](#usage-withmutations-or-solo-functions), as:
    - _standalone functions_
    - In `withMutations` store _feature_
- [Differences](#choosing-between-rxmutation-and-httpmutation) between `httpMutation` and `rxMutation`
- [Full examples](#full-example) of
  - Both mutations in a `withMutations()`
  - Standalone functions in a component

```ts
  withMutations((store) => ({
    increment: rxMutation({
      operation: (params: Params) => {
        return calcSum(store.counter(), params.value);
      },
      onSuccess: (result) => {
        // ...
      },
      onError: (error) => {
        // ...
      },
    }),
    saveToServer: httpMutation({
      request: (_: void) => ({
        url: `https://httpbin.org/post`,
        method: 'POST',
        body: { counter: store.counter() },
      }),
      parse: (response) => response as CounterResponse,
      onSuccess: (response) => {
        console.log('Counter sent to server:', response);
        patchState(store, { lastResponse: response.json });
      },
      onError: (error) => {
        console.error('Failed to send counter:', error);
      },
    }),
  })),
```

import MutationsVideo from '@site/src/components/MutationsVideo';

<MutationsVideo />

But before going into depth of the "How" and "When" to use mutations, it is important to give context about
the "Why" and "Who" of why mutations were built for the toolkit like this.

## Background

### Why not handle mutations using [`withResource`](./with-resource)?

The `resource` API and discussion about it naturally lead to talks about all async operations.
Notably, one position has been remained firm by the Angular team through resources' debut, RFCs (#1, [Architecture](https://github.com/angular/angular/discussions/60120)) and (#2, [APIs](https://github.com/angular/angular/discussions/60121)), and followup
enhancements: **Resources should only be responsible for read operations, such as an HTTP GET. Resources should NOT be used for MUTATIONS,
for example, HTTP methods like POST/PUT/DELETE.** Though other HTTP methods are supported in resources, there are edge cases for those who need them, such as some APIs that treat everything as a POST request 😬

> "`httpResource` (and the more fundamental `resource`) both declare a dependency on data that should be fetched. It's not a suitable primitive for making imperative HTTP requests, such as requests to mutation APIs" - [Pawel Kozlowski, in the Resource API RFC](https://github.com/angular/angular/discussions/60121)

### Path the toolkit is following for Mutations

Libraries like Angular Query offer a [Mutation API](https://tanstack.com/query/latest/docs/framework/angular/guides/mutations) for such cases. Some time ago, Marko Stanimirović also [proposed a Mutation API for Angular](https://github.com/markostanimirovic/rx-resource-proto). These mutation functions and features are heavily inspired by Marko's work and adapts it as a custom feature/functions for the NgRx SignalStore. We also had internal discussions with Alex Rickabaugh on our design.

The goal is to provide a simple Mutation API that is available now for early adopters. Ideally, migration to future mutation APIs will be straightforward. Hence, we aim to align with current ideas for them (if any).

## Key features (summary)

Each mutation has the following:

1. Parameters to pass to an RxJS stream (`rxMutation`) or RxJS agnostic `HttpClient` call (`httpMutation`)
1. Callbacks: `onSuccess` and `onError` (optional)
1. Flattening operators (optional, defaults to `concatOp`)
1. Provides a factory function of the same name as the mutation, returns a `Promise`.
1. State signals: `value/status/error/isPending/hasValue`

Additionally, mutations can be used in either `withMutations()` or as standalone functions.

### Params

See dedicated section on [choosing between `rxMutation` and `httpMutation`](#choosing-between-rxmutation-and-httpmutation)

```ts
// RxJS stream
rxMutation({
  operation: (params: Params) => {
    // function calcSum(a: number, b: number): Observable<number>
    return calcSum(this.counterSignal(), params.value);
  },
})

// http call, as options
httpMutation((userData: CreateUserRequest) => ({
  url: '/api/users',
  method: 'POST',
  body: userData,
})),
// OR
// http call, as function + options
httpMutation({
  request: (p: Params) => ({
    url: `https://httpbin.org/post`,
    method: 'POST',
    body: { counter: p.value },
  }),
  parse: (res) => res as CounterResponse,
);
```

### Callbacks

In the mutation: _optional_ `onSuccess` and `onError` callbacks.

The callbacks are called with two parameters:

1. The result of the mutation (`onSuccess`) or the error (`onError`)
2. The parameter passed when calling the mutation

```ts
({
  onSuccess: (result: CounterResponse) => {
    // optional
    // method:
    //     this.counterSignal.set(result);
    // store:
    //     patchState(store, {counter: result});
  },
  onError: (error) => {
    // optional
    console.error('Error occurred:', error);
  },
});

// using the passed parameter
({
  onSuccess: (_result, params) => {
    // after successful deletion
    store.listResource.set(store.listResource.value().filter((item) => item.id !== params.id));
  },
});
```

### Flattening operators

Enables handling race conditions

```ts
// Default: concatOp
// All options: concatOp, exhaustOp, mergeOp, switchOp

increment: rxMutation({
  // ...
  // Passing in a custom option. Need to import like:
  // import { switchOp } from '@ngrx-toolkit/core'
  operator: mergeOp, // `concatOp` is the default if `operator` is omitted
}),

saveToServer: httpMutation({
  // ...
  operator: switchOp,
}),
```

:::info
Since a mutation returns a `Promise`, we would not be able to know if a request got skipped with native `exhaustMap`. That's why we are providing adapters which would just pass-through on `merge/switch/concatMap` but resolve the resulting `Promise` in `exhaustMap` if it would be skipped.

We considered doing an object reference check internally (`operator === exhaustMap`) which would have removed the necessity for the adaptors. The reason why we decided against it was tree-shakability. Once `rxMutation` imports `exhaustMap` for the check, it will always be there (even if it is not used).
:::

### Methods

Enables the method (returns a `Promise`)

```ts
// Call directly
store.increment({...});
mutationName.saveToServer({...});

// or await `Promise`s
const inc = await store.increment({...}); if (inc.status === 'success')
const save = await store.save({...}); if (inc.status === 'error')
```

### Signal values

```ts
// value: Signal<Result | undefined>;
// status: Signal<MutationStatus>;
// isPending: Signal<boolean>;
// isSuccess: Signal<boolean>;
// error: Signal<unknown>;

// via store in `withMutation`
store.incrementValue;

// via member variable if defined outside of `withMutation`
mutationName.value; // ^^^
```

### Usage: `withMutations()` or solo functions

Both of the mutation functions can be used either

- In a `signalStore`, inside of `withMutations()`
- On its own, for example, like a class member of a component or service

#### Independent of a store

```ts
@Component({...})
class CounterMutation {
  private increment = rxMutation({...});
  private saveToServer = httpMutation({...});
}
```

#### Inside `withMutations()`

```ts
export const CounterStore = signalStore(
  // ...
  withMutations((store) => ({
    // the same functions
    increment: rxMutation({...}),
    saveToServer: httpMutation({...}),
  })),
);
```

## Usage - In Depth

The mutation functions can be used in a `withMutations()` feature, but can be used outside of one in something like a component or service as well.

### Key features (in depth)

Each mutation has the following:

- Passing params via RxJS or RxJS-less `HttpClient` signature
  - See ["Choosing between `rxMutation` and `httpMutation`"](#choosing-between-rxmutation-and-httpmutation)
- State signals: `value/status/error/isPending/status/hasValue`
  - For `httpMutation`, the response type is specified with the param `parse: (res: T) => res as T`
- (optional, but has default) Flattening operators
- (optional) callbacks: `onSuccess` and `onError`
- Provides a factory function of the same name as the mutation, returns a `Promise`.

#### State Signals

```ts
// Fields + types types:
export type MutationStatus = 'idle' | 'pending' | 'error' | 'success';

export type Mutation<Parameter, Result> = {
  status: Signal<'idle' | 'pending' | 'error' | 'success'>;
  value: Signal<Result | undefined>;
  isPending: Signal<boolean>;
  isSuccess: Signal<boolean>;
  error: Signal<unknown>;
  hasValue(): this is Mutation<Exclude<Parameter, undefined>, Result>; // type narrows `.value()`
};

storeName.mutationNameValue; // `withMutations`
mutationName.value; // no `withMutations`
```

#### Callbacks: `onSuccess` and `onError` (optional)

Callbacks can be used on success or error of the mutation. This allows for side effects, such as patching/setting
state like a service's signal or a store's property.

```ts
export const CounterStore = signalStore(
  // ...
  withMutations((store) => ({
    increment: rxMutation({
      // ...
      onSuccess: (result: CounterResponse) => {
        console.log('result', result);
        patchState(store, { counter: result });
      },
    }),
  })),
);

@Component({...})
class CounterMutation {
  // ...
  private saveToServer = httpMutation({
    // ...
    onError: (error) => {
      console.error('Failed to send counter:', error);
    },
  });
}
```

#### Flattening operators (optional to specify, has default)

```ts
// Default: concatOp
// All options: concatOp, exhaustOp, mergeOp, switchOp

(withMutations((store) => ({
  increment: rxMutation({
    // ...
    // Passing in a custom option. Need to import like:
    // import { switchOp } from '@ngrx-toolkit/core'
    operator: mergeOp, // `concatOp` is the default if `operator` is omitted
  }),
})),
  class SomeComponent {
    private saveToServer = httpMutation({
      // ...
      operator: switchOp,
    });
  });
```

#### Methods

A mutation is its own function to be invoked, returning a `Promise` should you want to await one.

```ts
@Component({...})
class CounterRxMutation {
  private increment = rxMutation({...});
  private store = inject(CounterStore);

  // To await
  async incrementBy13() {
    const resultA = await this.increment({ value: 13 });
    if (resultA.status === 'success') { ... }

    const resultB = await this.store.increment({ value: 13 });
    if (resultB.status === 'success') { ... }
  }

  // or not to await, that is the question
  incrementBy12() {
    this.increment({ value: 12 });

    this.store.increment({ value: 12 });
  }
}
```

Why do we return a `Promise` and not something else, like an `Observable` or `Signal`?

We were looking at the use case for showing a message,
navigating to a different route, or showing/hiding a loading indicator while the mutation is active or ends. If we use a `Signal`, then it
could be that a former mutation already set the value successful on the status. If we would have an `effect`, waiting for the `Signal` to
succeed, that one would run immediately. `Observable` would have the same problem, and it would also add to the API which
exposes an `Observable` which means users have to deal with RxJS once more. A `Promise` is perfect. It guarantees to return just a single
value where `Observable` can emit one, none or multiple. It is always asynchronous and not like `Observable`. The syntax with `await`
makes it quite good for DX and it is very easy to go from a `Promise` to an `Observable` or even `Signal`.

### Choosing between `rxMutation` and `httpMutation`

Though mutations and resources have different intents, the difference between `rxMutation` and `httpMutation` can be seen in a
similar way as `rxResource` and `httpResource`

For brevity, take `rx` as `rxMutation` and `http` for `httpMutation`

- `rx` to utilize RxJS streams, `http` to make an `HttpClient` request
  - `rx` could be any valid `Observable`, even if it is not HTTP related.
  - `http` has to be an HTTP request. The user's API is agnostic of RxJS. _Technically, HttpClient with `Observable`s is used under the hood_.
- Primary property to pass parameters to:
  - `rx`'s `operation` is a function that defines the mutation logic. It returns an `Observable`,
  - `http` takes parts of `HttpClient`'s method signature, or a `request` object which accepts those parts

## Full example

Our example application in the repository has more details and implementations, but here is a full example in a store using `withMutations`.

This example is a dedicated store with `withMutations` and used in a component, but could be just the mutation functions as class members of a service/component or `const`s, for example.

### Declare

```ts
import { concatOp, httpMutation, rxMutation, withMutations } from '@ngrx-toolkit/core';
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
      onSuccess: (result: number) => {
        console.log('result', result);
        patchState(store, { counter: result });
      },
      onError: (error) => {
        console.error('Error occurred:', error);
      },
    }),
    saveToServer: httpMutation({
      request: (_: void) => ({
        url: `https://httpbin.org/post`,
        method: 'POST',
        body: { counter: store.counter() },
      }),
      parse: (res) => res as CounterResponse,
      onSuccess: (response) => { // response inferred as per `parse` ^^^
        console.log('Counter sent to server:', response);
        patchState(store, { lastResponse: response.json });
      },
      onError: (error) => {
        console.error('Failed to send counter:', error);
      },
    }),
  })),
);

// return of(a + b);
function calcSum(a: number, b: number): Observable<number> {
  function createSumObservable(a: number, b: number): Observable<number> {...}
  return createSumObservable(a, b).pipe(delay(500));
}
```

### Use

```ts
@Component({...})
export class CounterMutation {
  private store = inject(CounterStore);

  // signals
  protected counter = this.store.counter;
  protected error = this.store.incrementError;
  protected isPending = this.store.incrementIsPending;
  protected status = this.store.incrementStatus;
  // signals
  protected saveError = this.store.saveToServerError;
  protected saveIsPending = this.store.saveToServerIsPending;
  protected saveStatus = this.store.saveToServerStatus;
  protected lastResponse = this.store.lastResponse;

  increment() {
    this.store.increment({ value: 1 });
  }

  // `Promise` version nice if you want to the result's `status`
  async saveToServer() {
    await this.store.saveToServer();
  }
}
```
