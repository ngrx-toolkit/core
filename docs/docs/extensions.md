---
title: Extensions
---

The NgRx Toolkit is a set of extensions to the NgRx SignalsStore.

:::note Package name for v22

Starting with v22, install and import the toolkit as `@ngrx-toolkit/core`. For v21 and earlier, use `@angular-architects/ngrx-toolkit`.

:::

It offers extensions like:

- [⭐️ Devtools](./with-devtools): Integration into Redux Devtools
- [Conditional Features](./with-conditional): Allows adding features to the store conditionally
- [DataService](./with-data-service): Builds on top of `withEntities` and adds the backend synchronization to it
- [Immutable State Protection](./with-immutable-state): Protects the state from being mutated outside or inside the Store.
- [~Redux~](./with-redux): Possibility to use the Redux Pattern. Deprecated in favor of NgRx's `@ngrx/signals/events` starting in 19.2
- [Resource](./with-resource): Integrates Angular's Resource into SignalStore for async data operations
- [Entity Resources](./with-entity-resources): Builds on top of [withResource](./with-resource); adds entity support for array resources (`ids`, `entityMap`, `entities`)
- [Mutations](./mutations): Seek to offer an appropriate equivalent to signal resources for sending data back to the backend
- [Reset](./with-reset): Adds a `resetState` method to your store
- [Call State](./with-call-state): Add call state management to your signal stores
- [Storage Sync](./with-storage-sync): Synchronizes the Store with Web Storage
- [Undo Redo](./with-undo-redo): Adds Undo/Redo functionality to your store

To install it, run

```shell
npm i @ngrx-toolkit/core
```
