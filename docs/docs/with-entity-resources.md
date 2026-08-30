---
title: withEntityResources()
---

```typescript
import { withEntityResources } from '@ngrx-toolkit/core';
```

`withEntityResources()` integrates Angular Resources that return arrays into NgRx SignalStore using the Entity helpers from `@ngrx/signals/entities`.

> Note: This feature builds on [withResource()](./with-resource.md) and adds an entity view over array resources.

- **Unnamed resource**: Your store exposes resource members (`value`, `status`, `error`, `isLoading`, etc.) and additionally derives entity members: `ids`, `entityMap`, `entities`.
- **Named resources**: Register multiple array resources by name. The store exposes prefixed members per resource, e.g. `todosValue`, `todosIds`, `todosEntityMap`, `todosEntities`.

This feature composes [withResource()](./with-resource.md) and the Entities utilities without effects. Entity state is linked to the resource value using linked signals, so updaters like `addEntity`, `updateEntity`, and `removeEntity` mutate the entity view in the store while the source of truth remains the resource.

## Accepted Inputs and Type Signatures

```ts
// Single (unnamed) resource producing an array of entities
withEntityResources<
  Entity extends { id: EntityId }
>((store) => ResourceRef<readonly Entity[] | Entity[] | undefined>);

// Multiple (named) resources: a dictionary of array resources
withEntityResources<
  Dictionary extends Record<string, ResourceRef<readonly unknown[] | unknown[] | undefined>>
>((store) => Dictionary);
```

- **Must be arrays**: Each `ResourceRef` must resolve to an array (possibly `readonly` and possibly `undefined` while loading). Use `defaultValue: []` for a consistent empty state.
- **Entity identity**: Array element type must include an `id` compatible with `EntityId`.
- **Named resources**: For the dictionary form, keys become the name prefixes (e.g., `todosEntities()`), and each entry can have a different element type.
- **Non-array resources**: If your resource does not produce an array, use `withResource()` instead.

## Basic Usage

### Unnamed Resource

```typescript
import { signalStore, withState, patchState } from '@ngrx/signals';
import { resource } from '@angular/core';
import { addEntity } from '@ngrx/signals/entities';
import { withEntityResources } from '@ngrx-toolkit/core';

export type Todo = { id: number; title: string; completed: boolean };

export const TodoStore = signalStore(
  { providedIn: 'root' },
  withState({}),
  withEntityResources(() => resource({ loader: () => Promise.resolve([] as Todo[]), defaultValue: [] })),
);

// Later, you can use entity updaters
// patchState(TodoStore, addEntity({ id: 1, title: 'A', completed: false }));
```

The store now provides:

- **Resource members**: `value()`, `status()`, `error()`, `isLoading()`, `hasValue()`, `_reload()`
- **Entity members**: `ids()`, `entityMap()`, `entities()`

### Named Resources

```typescript
import { signalStore } from '@ngrx/signals';
import { resource } from '@angular/core';
import { withEntityResources } from '@ngrx-toolkit/core';

export type Todo = { id: number; title: string; completed: boolean };

export const Store = signalStore(
  { providedIn: 'root' },
  withEntityResources(() => ({
    todos: resource({ loader: () => Promise.resolve([] as Todo[]), defaultValue: [] }),
    projects: resource({ loader: () => Promise.resolve([] as { id: number; name: string }[]), defaultValue: [] }),
  })),
);
```

This exposes per-resource members with the resource name as a prefix:

- **Resource members**: `todosValue()`, `todosStatus()`, `todosError()`, `todosIsLoading()`; `projectsValue()`, ...
- **Entity members**: `todosIds()`, `todosEntityMap()`, `todosEntities()`; `projectsIds()`, `projectsEntityMap()`, `projectsEntities()`

## Error Handling

Starting in NgRx Toolkit v20.6.0, error state handling for `withResource` and `withEntityResources` was enhanced.

In the event of an error in a resource declared in `withEntityResource`, the resource's value will be `undefined`.

For further details, check out the error handling section of [`withResource`](./with-resource.md#error-handling).

## Component Usage

```typescript
import { Component, inject } from '@angular/core';

@Component({
  selector: 'todo-list',
  template: `
    @if (store.isLoading()) {
      <div>Loading...</div>
    } @else if (store.error()) {
      <p>An error has happened.</p>
    } @else if (store.hasValue()) {
      <ul>
        @for (t of store.entities(); track t.id) {
          <li>{{ t.title }} — {{ t.completed ? 'done' : 'open' }}</li>
        }
      </ul>
    }
  `,
})
export class TodoListComponent {
  protected readonly store = inject(TodoStore);
}
```

For a named collection like `todos`, use `todosIsLoading()`, `todosError()`, `todosEntities()`, etc.

## Using Entity Updaters

The derived entity state is writable via NgRx entity updaters, just like with `withEntities()`:

```typescript
import { patchState } from '@ngrx/signals';
import { addEntity, updateEntity, removeEntity, setAllEntities } from '@ngrx/signals/entities';

// Unnamed
patchState(store, setAllEntities([{ id: 1, title: 'A', completed: false }]));
patchState(store, addEntity({ id: 2, title: 'B', completed: true }));
patchState(store, updateEntity({ id: 2, changes: { completed: false } }));
patchState(store, removeEntity(1));

// Named (e.g., todos)
patchState(store, addEntity({ id: 3, title: 'C', completed: false }, { collection: 'todos' }));
patchState(store, removeEntity(3, { collection: 'todos' }));
```

## Demo Example

See the demo store `todo-entity-resource` for a full example that combines mutations and entity resources.

```typescript
import { httpMutation, withMutations, withEntityResources } from '@ngrx-toolkit/core';
import { inject, resource } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { addEntity, removeEntity, updateEntity } from '@ngrx/signals/entities';
import { firstValueFrom } from 'rxjs';
import { Todo, TodoMemoryService } from './todo-memory.service';

export const TodoEntityResourceStore = signalStore(
  { providedIn: 'root' },
  withState({ baseUrl: '/api', filter: '' }),
  withEntityResources((_store, svc = inject(TodoMemoryService)) => resource({ loader: () => firstValueFrom(svc.list()), defaultValue: [] })),
  withMethods((store) => ({
    setFilter(filter: string) {
      patchState(store, { filter });
    },
  })),
  withMutations((store, svc = inject(TodoMemoryService)) => ({
    addTodo: httpMutation<Todo, Todo>({
      request: (todo) => ({ url: '/memory/add', method: 'POST', body: todo }),
      parse: (raw) => raw as Todo,
      onSuccess: async (todo) => {
        await firstValueFrom(svc.add(todo));
        patchState(store, addEntity(todo));
      },
    }),
    toggleTodo: httpMutation<{ id: number; completed: boolean }, Todo>({
      request: (p) => ({ url: `/memory/toggle/${p.id}`, method: 'PATCH', body: p }),
      parse: (raw) => raw as Todo,
      onSuccess: async (_todo, p) => {
        const todo = await firstValueFrom(svc.toggle(p.id, p.completed));
        if (todo) {
          patchState(store, updateEntity<Todo>({ id: todo.id, changes: { completed: todo.completed } }));
        }
      },
    }),
    removeTodo: httpMutation<number, boolean>({
      request: (id) => ({ url: `/memory/remove/${id}`, method: 'DELETE' }),
      parse: () => true,
      onSuccess: async (_r, id) => {
        await firstValueFrom(svc.remove(id));
        patchState(store, removeEntity(id));
      },
    }),
  })),
);
```

## How it works internally

- **Composes withResource**: Internally calls [withResource()](./with-resource.md) with either a single `ResourceRef` or a dictionary of `ResourceRef`s, so all standard Resource members are available on the store (or prefixed for named resources).
- **Derives entity signals**: From the resource's `value` signal (the array), it derives:
  - `ids` via a linked signal that maps each entity to its `id`
  - `entityMap` via a linked signal that builds an `id -> entity` map
  - `entities` as a computed projection of `ids` through `entityMap`
- **No effects**: Synchronization is purely signal-based; entity updaters mutate the store's entity state while the underlying Resource value remains the source of truth.

## Interop and Notes

- **Type Safety**: The entity type is inferred from the resource value (array element type). Ensure your resource returns an array type with an `id` field (`EntityId`).
- **Composition**: Can be composed with `withEntities()` for additional collections alongside resource-backed collections.
- **No effects**: Synchronization is purely signal-based via linked signals; no imperative effects are used.
- **Named vs Unnamed**: Choose unnamed for a single list; use named when you manage multiple lists in one store.
