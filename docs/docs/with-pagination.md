---
title: withPagination()
---

```typescript
import { withPagination } from '@angular-architects/ngrx-toolkit';
```

`withPagination()` allows for displaying a subset of items from a larger collection, based on the current page and page size.

:::info
Default page size is 10, but can be set with `setPageSize(pageSize: number)`
:::

```ts
import { withPagination } from '@angular-architects/ngrx-toolkit';

const Store = signalStore(withEntities({ entity: type<Book>() }), withPagination());

// elsewhere
const store = new Store();

patchState(store, setAllEntities(generateBooks(50)), setPageSize(10));
// store.pageCount() === 5

patchState(store, setPageSize(5));
// store.pageCount() === 10
```

The `withPagination()` function accepts an optional `collection` parameter to support multiple paginated collections. It calculates the selected page entities, total count, total pages, and page navigation array based on the provided options.

Additionally, utility functions like `gotoPage`, `setPageSize`, `nextPage`, `previousPage`, `firstPage`, and `setMaxPageNavigationArrayItems` are provided to easily update the pagination state.

Default page size is 10.

```ts
import { withPagination } from '@angular-architects/ngrx-toolkit';

const Store = signalStore(withEntities({ entity: type<Book>() }), withPagination());

// elsewhere
const store = new Store();

patchState(store, setAllEntities(generateBooks(55)));
// store.currentPage() === 0

patchState(store, nextPage());
// store.currentPage() === 1

patchState(store, previousPage());
// store.currentPage() === 0

patchState(store, nextPage());
patchState(store, nextPage());
// store.currentPage() === 2

patchState(store, firstPage());
// store.currentPage() === 0
```

<!-- TODO: `setMaxPageNavigationArrayItems` example -->
