---
title: withCallState()
---

```typescript
import { withCallState } from '@ngrx-toolkit/core';
```

`withCallState` adds call state management capabilities to NgRx signal stores, tracking the status of asynchronous operations with built-in states for loading, loaded, and error conditions.

## Basic Usage

The simplest way to use `withCallState` is without any configuration:

```typescript
export const TodosStore = signalStore(
  withCallState(),
  // ... other features
);
```

This provides you with:

- A `callState` state property of type `'init' | 'loading' | 'loaded' | { error: string }`
- Computed signals: `loading`, `loaded`, and `error`
- Helper methods: `setLoading()`, `setLoaded()`, and `setError()`

## Use Cases

- Track **loading states** for async operations
- Handle **error states** consistently
- Manage multiple **named collections** of call states

## Type Constraints

The call state can be one of these types:

- `'init'` - Initial state
- `'loading'` - Operation in progress
- `'loaded'` - Operation completed successfully
- `{ error: string }` - Operation failed with error

## Usage

```typescript
import { withCallState, setLoading, setLoaded, setError } from '@ngrx-toolkit/core';

const store = signalStore(
  withCallState(),
  withMethods((store) => ({
    async loadData() {
      patchState(store, setLoading());
      try {
        // ... async operation
        patchState(store, setLoaded());
      } catch (error) {
        patchState(store, setError(error));
      }
    },
  })),
);
```

### Named Collection

You can track state for a specific collection by providing a collection name:

```typescript
export const TodosStore = signalStore(
  withCallState({ collection: 'todos' }),
  // ... other features
);
```

This provides:

- A `todosCallState` state property
- Computed signals: `todosLoading`, `todosLoaded`, and `todosError`
- Helper methods with optional collection parameter

```typescript
const store = signalStore(
  withCallState({ collection: 'todos' }),
  withMethods((store) => ({
    async loadTodos() {
      patchState(store, setLoading('todos'));
      try {
        // ... load todos
        patchState(store, setLoaded('todos'));
      } catch (error) {
        patchState(store, setError(error, 'todos'));
      }
    },
  })),
);
```

### Multiple Collections

For managing multiple async operations, use the collections configuration:

```typescript
export const TodosStore = signalStore(
  withCallState({ collections: ['todos', 'categories'] }),
  // ... other features
);
```

This creates separate states and signals for each collection:

- States: `todosCallState`, `categoriesCallState`
- Signals: `todosLoading`, `todosLoaded`, `todosError`, `categoriesLoading`, etc.

```typescript
const store = signalStore(
  withCallState({ collections: ['todos', 'users'] }),
  withMethods((store) => ({
    async loadAll() {
      patchState(store, setLoading('todos'), setLoading('users'));
      // ... load data for both collections
    },
  })),
);
```

## Helper Methods

### setLoading()

Sets the call state to 'loading':

```typescript
patchState(store, setLoading()); // Basic usage
patchState(store, setLoading('todos')); // With collection
```

### setLoaded()

Sets the call state to 'loaded':

```typescript
patchState(store, setLoaded()); // Basic usage
patchState(store, setLoaded('todos')); // With collection
```

### setError()

Sets the call state to error with a message:

```typescript
patchState(store, setError(error)); // Basic usage
patchState(store, setError(error, 'todos')); // With collection
```

## Accessing State

Access the computed signals in your templates or component code:

```typescript
@Component({
  template: `
    @if (store.loading()) {
      <div>Loading...</div>
    }
    @if (store.error()) {
      <div>Error: {{ store.error() }}</div>
    }
    @if (store.loaded()) {
      <div>Content loaded!</div>
    }
  `,
})
export class MyComponent {
  store = inject(MyStore);
}
```

For collections:

```typescript
@Component({
  template: `
   @if (store.todosLoading()) {
     <div>Loading todos...</div>
   }
   @if (store.categoriesLoading()) {
     <div>Loading categories...</div>
   }
  `
})
```
