---
title: withReset()
---

```typescript
import { withReset } from '@ngrx-toolkit/core';
```

`withReset()` adds a method to reset the state of the Signal Store to its initial value. Nothing more to say about it 😅

Example:

```typescript
import { withReset } from '@ngrx-toolkit/core';

const Store = signalStore(
  withState({
    user: { id: 1, name: 'Konrad' },
    address: { city: 'Vienna', zip: '1010' },
  }),
  withReset(), // <-- the reset extension
  withMethods((store) => ({
    changeUser(id: number, name: string) {
      patchState(store, { user: { id, name } });
    },
    changeUserName(name: string) {
      patchState(store, (value) => ({ user: { ...value.user, name } }));
    },
  })),
);

const store = new Store();

store.changeUser(2, 'John');
console.log(store.user()); // { id: 2, name: 'John' }

store.resetState();
console.log(store.user()); // { id: 1, name: 'Konrad' }
```

## `setResetState()`

```typescript
import { setResetState } from '@ngrx-toolkit/core';
```

If you want to set a custom reset state, you can use the `setResetState()` method.

Example:

```typescript
// continue from the previous example
import { setResetState } from '@ngrx-toolkit/core';

setResetState(store, { user: { id: 3, name: 'Jane' }, address: { city: 'Berlin', zip: '10115' } });
store.changeUser(4, 'Alice');

store.resetState();
console.log(store.user()); // { id: 3, name: 'Jane' }
```
