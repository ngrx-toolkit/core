---
title: withStorageSync()
---

`withStorageSync` synchronizes state with Web Storage (`localStorage`/`sessionStorage`) and IndexedDB (via an async strategy).

:::warning
As Web Storage and IndexedDB only work in browser environments, it will fallback to a stub implementation on server environments.
:::

Example:

```typescript
import { withStorageSync } from '@ngrx-toolkit/core';

const UserStore = signalStore(
  withState({ name: 'John' }),
  // automatically synchronizes state to localStorage on each change via the key 'user'
  withStorageSync('user'),
);
```

## Auto Sync

By default, `withStorageSync` reads from storage on initialization and writes on every subsequent state change. You can customize or disable this behavior via the `autoSync` option.

```typescript
const UserStore = signalStore(
  withState({ name: 'John' }),
  withStorageSync({
    key: 'user',
    autoSync: false, // Disable automatic synchronization
  }),
);
```

With auto sync disabled, you control synchronization manually. The following methods are available: `readFromStorage`, `writeToStorage`, `clearStorage`.

```typescript
const store = inject(UserStore);

store.readFromStorage(); // Read from storage (e.g., on init)

// ...update state as needed...
store.writeToStorage(); // Persist the current state to storage

store.clearStorage(); // Remove the stored value
```

Notes:

- When `autoSync: true` (default):
  - On init, the store reads the saved state from storage (if present) and patches it into the store.
  - On each state change, the state is written to storage.
- When `autoSync: false`:
  - No automatic read/write occurs; call the exposed methods to sync at your preferred times.
- With async storage strategies (e.g., IndexedDB), ensure writes that depend on persisted data happen after the initial read. Use `store.whenSynced()` or disable auto sync and orchestrate manually.

## Serialization (parse/stringify)

`withStorageSync` uses `JSON.stringify` to write and `JSON.parse` to read by default. You can customize both to control how data is stored and restored.

- `stringify: (state) => string`: transforms the state into a string for storage
- `parse: (stateString) => object`: transforms the stored string back into an object that will be patched into the store

Example (handling special types):

```typescript
const UserStore = signalStore(
  withState({ name: 'John', birthday: new Date('1990-01-01') }),
  withStorageSync({
    key: 'user',
    stringify: (state) => JSON.stringify({ ...state, birthday: state.birthday.toISOString() }),
    parse: (stateString) => {
      const serialized = JSON.parse(stateString);
      return {
        ...serialized,
        birthday: new Date(serialized.birthday),
      };
    },
  }),
);
```

## Select (synchronize only what you need)

Use `select` to persist only a subset of your state instead of the whole object. By default, the entire state is persisted.

Behavior:

- `select` runs before `stringify` during writes.
- On reads, the result of `parse` is passed to `patchState(...)`. Return a subset that matches your store's shape; only those keys will be updated.

Example (persist only name and birthday):

```typescript
const UserStore = signalStore(
  withState({ name: 'John', birthday: new Date('1990-01-01'), sessionToken: 'secret' }),
  withStorageSync({
    key: 'user',
    // Only persist the public fields; omit sensitive/ephemeral data
    select: ({ name, birthday }) => ({ name, birthday }),
  }),
);
```

## Session Storage

Use `withSessionStorage()` to synchronize with `sessionStorage` instead of `localStorage`.

```typescript
import { withSessionStorage, withStorageSync } from '@ngrx-toolkit/core';

const UserStore = signalStore(withState({ name: 'John' }), withStorageSync('user', withSessionStorage()));
```

Notes:

- Session storage is cleared when the page session ends (e.g., tab closes) and is scoped per-tab.
- Prefer `withSessionStorage()` over the deprecated `storage` option in the config.

## IndexedDB (async storage)

Use `withIndexedDB()` to synchronize with IndexedDB. Because IndexedDB is asynchronous, all reads and writes are performed asynchronously. You must wait for the initial read during app initialization (via `whenSynced()`), and we recommend disabling auto sync for predictable sequencing and better DX (avoids sprinkling `whenSynced()` after each change).

```typescript
import { withIndexedDB, withStorageSync } from '@ngrx-toolkit/core';
import { withHooks, patchState } from '@ngrx/signals';

// Recommended: disable autoSync to control sequencing explicitly
const UserStore = signalStore(
  withState({ name: 'John', birthday: new Date('1990-01-01') }),
  withStorageSync({ key: 'user', autoSync: false }, withIndexedDB()),
  withHooks({
    async onInit(store) {
      // Ensure initial state is read from IndexedDB before any writes
      await store.readFromStorage();
    },
  }),
);
```

If you keep `autoSync: true`, wait for the initial read before performing writes that depend on persisted data. Also, because every `patchState` triggers an async write, call `whenSynced()` after state changes when subsequent logic relies on the persisted result.

```typescript
const UserStore = signalStore(
  withState({ name: 'John', birthday: new Date('1990-01-01') }),
  withStorageSync({ key: 'user' }, withIndexedDB()), // autoSync defaults to true
);

const store = inject(UserStore);
await store.whenSynced(); // wait on initialization
// ... patch state ...
patchState(store, { birthday: new Date() });
await store.whenSynced(); // ensure the write completed before dependent logic
```

Notes:

- Methods are async with IndexedDB: `readFromStorage()`, `writeToStorage()`, and `clearStorage()` return `Promise<void>`.
