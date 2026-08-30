---
title: withConditional()
---

```typescript
import { withConditional } from '@ngrx-toolkit/core';
```

`withConditional` activates a feature based on a given condition.

## Use Cases

- Conditionally activate features based on the **store state** or other criteria.
- Choose between **two different implementations** of a feature.

## Type Constraints

Both features must have **exactly the same state, props, and methods**.
Otherwise, a type error will occur.

## Usage

```typescript
import { withConditional } from '@ngrx-toolkit/core';

const withUser = signalStoreFeature(
  withState({ id: 1, name: 'Konrad' }),
  withHooks((store) => ({
    onInit() {
      // user loading logic
    },
  })),
);

function withFakeUser() {
  return signalStoreFeature(withState({ id: 0, name: 'anonymous' }));
}

signalStore(
  withMethods(() => ({
    useRealUser: () => true,
  })),
  withConditional((store) => store.useRealUser(), withUser, withFakeUser),
);
```
