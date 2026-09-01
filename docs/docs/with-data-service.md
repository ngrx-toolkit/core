---
title: withDataService()
---

```typescript
import { withDataService } from '@ngrx-toolkit/core';
```

`withDataService()` allows to connect a Data Service to the store:

This gives you a store for a CRUD use case:

```typescript
import { withDataService, withCallState, withUndoRedo } from '@ngrx-toolkit/core';

export const SimpleFlightBookingStore = signalStore(
  { providedIn: 'root' },
  withCallState(),
  withEntities<Flight>(),
  withDataService({
    dataServiceType: FlightService,
    filter: { from: 'Paris', to: 'New York' },
  }),
  withUndoRedo(),
);
```

The features `withCallState` and `withUndoRedo` are optional, but when present, they enrich each other.
Refer to the [Undo-Redo](./with-undo-redo) section for more information.

The Data Service needs to implement the `DataService` interface:

```typescript
@Injectable({
  providedIn: 'root'
})
export class FlightService implements DataService<Flight, FlightFilter> {
  loadById(id: EntityId): Promise<Flight> { ... }
  load(filter: FlightFilter): Promise<Flight[]> { ... }

  create(entity: Flight): Promise<Flight> { ... }
  update(entity: Flight): Promise<Flight> { ... }
  updateAll(entity: Flight[]): Promise<Flight[]> { ... }
  delete(entity: Flight): Promise<void> { ... }
  [...]
}
```

Once the store is defined, it gives its consumers numerous signals and methods they just need to delegate to:

```typescript
@Component(...)
export class FlightSearchSimpleComponent {
  private store = inject(SimpleFlightBookingStore);

  from = this.store.filter.from;
  to = this.store.filter.to;
  flights = this.store.entities;
  selected = this.store.selectedEntities;
  selectedIds = this.store.selectedIds;

  loading = this.store.loading;

  canUndo = this.store.canUndo;
  canRedo = this.store.canRedo;

  async search() {
    this.store.load();
  }

  undo(): void {
    this.store.undo();
  }

  redo(): void {
    this.store.redo();
  }

  updateCriteria(from: string, to: string): void {
    this.store.updateFilter({ from, to });
  }

  updateBasket(id: number, selected: boolean): void {
    this.store.updateSelected(id, selected);
  }

}
```

## DataService with Dynamic Properties

To avoid naming conflicts, the properties set up by `withDataService` and the connected features can be configured in a typesafe way:

```typescript
import { withDataService, withCallState, withUndoRedo } from '@ngrx-toolkit/core';

export const FlightBookingStore = signalStore(
  { providedIn: 'root' },
  withCallState({
    collection: 'flight',
  }),
  withEntities({
    entity: type<Flight>(),
    collection: 'flight',
  }),
  withDataService({
    dataServiceType: FlightService,
    filter: { from: 'Graz', to: 'Hamburg' },
    collection: 'flight',
  }),
  withUndoRedo({
    collections: ['flight'],
  }),
);
```

This setup makes them use `flight` as part of the used property names. As these implementations respect the Type Script type system, the compiler will make sure these properties are used in a typesafe way:

```typescript
@Component(...)
export class FlightSearchDynamicComponent {
  private store = inject(FlightBookingStore);

  from = this.store.flightFilter.from;
  to = this.store.flightFilter.to;
  flights = this.store.flightEntities;
  selected = this.store.selectedFlightEntities;
  selectedIds = this.store.selectedFlightIds;

  loading = this.store.flightLoading;

  canUndo = this.store.canUndo;
  canRedo = this.store.canRedo;

  async search() {
    this.store.loadFlightEntities();
  }

  undo(): void {
    this.store.undo();
  }

  redo(): void {
    this.store.redo();
  }

  updateCriteria(from: string, to: string): void {
    this.store.updateFlightFilter({ from, to });
  }

  updateBasket(id: number, selected: boolean): void {
    this.store.updateSelectedFlightEntities(id, selected);
  }

}
```
