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
public class UndoRedoComponent {
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
