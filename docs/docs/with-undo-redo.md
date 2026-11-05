---
title: withUndoRedo()
---

```typescript
import { withUndoRedo } from '@ngrx-toolkit/core';
```

`withUndoRedo` adds undo and redo functionality to the store.

Example:

```typescript
import { withUndoRedo } from '@ngrx-toolkit/core';
import { clearUndoRedo } from '@ngrx-toolkit/core';

const SyncStore = signalStore(
  withUndoRedo({
    maxStackSize: 100, // limit of undo/redo steps - `100` by default
    collections: ['flight'], // entity collections to keep track of - unnamed collection is tracked by default
    keys: ['test'], // non-entity based keys to track - `[]` by default
    skip: 0, // number of initial state changes to skip - `0` by default
  }),
);
```

```typescript
import { clearUndoRedo } from '@ngrx-toolkit/core';

@Component(...)
export class UndoRedoComponent {
  private syncStore = inject(SyncStore);

  canUndo = this.store.canUndo; // use in template or in ts
  canRedo = this.store.canRedo; // use in template or in ts

  undo(): void {
    if (!this.canUndo()) return;
    this.store.undo();
  }

  redo(): void {
    if (!this.canRedo()) return;
    this.store.redo();
  }

  clearStack(): void {
    // Does a soft reset (not setting the state to `null`) by default.
    clearUndoRedo(this.store);

    // The hard reset can be set via options,
    // clearUndoRedo(store, { lastRecord: null })
  }
}
```

### Rollback

`rollback` lets you jump back to a specific point in time, restoring the state as it was at that moment. It works by accepting a **savepoint** — a `Date.now()` timestamp you capture before making changes.

All state changes that occurred after the savepoint are moved to the redo stack, so they can still be re-applied with `redo()`.

```typescript
// 1. Capture a savepoint before making changes
const savepoint = Date.now();

// 2. Make state changes …
store.addItem('first');
store.addItem('second');

// 3. Roll back to the savepoint — both additions are undone
store.rollback(savepoint);

// 4. The rolled-back changes are available on the redo stack
store.canRedo(); // true
```

If the savepoint is at or after the current state (i.e. nothing to roll back), the call is a no-op.
