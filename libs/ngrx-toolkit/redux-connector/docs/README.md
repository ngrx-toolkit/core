# Redux Connector for the NgRx Signal Store `createReduxState()`

The Redux Connector turns any `signalStore()` into a Global State Management Slice following the Redux pattern. It is available as secondary entry point, i.e. `import { createReduxState } from '@ngrx-toolkit/core/redux-connector'` and has a dependency to `@ngrx/store`.

It supports:

✅ Well-known NgRx Store Actions \
✅ Global Action `dispatch()` \
✅ Angular Lazy Loading \
✅ Auto-generated `provideNamedStore()` & `injectNamedStore()` Functions \
✅ Global Action to Store Method Mappers \

- [Redux Connector for the NgRx Signal Store `createReduxState()`](#redux-connector-for-the-ngrx-signal-store-createreduxstate)
  - [Use a present Signal Store](#use-a-present-signal-store)
  - [Use well-known NgRx Store Actions](#use-well-known-ngrx-store-actions)
  - [Map Actions to Methods](#map-actions-to-methods)
  - [Register an Angular Dependency Injection Provider](#register-an-angular-dependency-injection-provider)
  - [Use the Store in your Component](#use-the-store-in-your-component)

## Use a present Signal Store

```typescript
export const FlightStore = signalStore(
  // State
  withEntities({ entity: type<Flight>(), collection: 'flight' }),
  withEntities({ entity: type<number>(), collection: 'hide' }),
  // Selectors
  withComputed(({ flightEntities, hideEntities }) => ({
    filteredFlights: computed(() => flightEntities().filter((flight) => !hideEntities().includes(flight.id))),
    flightCount: computed(() => flightEntities().length),
  })),
  // Updater
  withMethods((store) => ({
    setFlights: (state: { flights: Flight[] }) => patchState(store, setAllEntities(state.flights, { collection: 'flight' })),
    updateFlight: (state: { flight: Flight }) => patchState(store, updateEntity({ id: state.flight.id, changes: state.flight }, { collection: 'flight' })),
    clearFlights: () => patchState(store, removeAllEntities({ collection: 'flight' })),
  })),
  // Effects
  withMethods((store, flightService = inject(FlightService)) => ({
    loadFlights: reduxMethod<FlightFilter, { flights: Flight[] }>(
      pipe(
        switchMap((filter) => from(flightService.load({ from: filter.from, to: filter.to }))),
        map((flights) => ({ flights })),
      ),
      store.setFlights,
    ),
  })),
);
```

## Use well-known NgRx Store Actions

```typescript
export const ticketActions = createActionGroup({
  source: 'tickets',
  events: {
    'flights load': props<FlightFilter>(),
    'flights loaded': props<{ flights: Flight[] }>(),
    'flights loaded by passenger': props<{ flights: Flight[] }>(),
    'flight update': props<{ flight: Flight }>(),
    'flights clear': emptyProps(),
  },
});
```

## Map Actions to Methods

```typescript
export const { provideFlightStore, injectFlightStore } = createReduxState('flight', FlightStore, (store) =>
  withActionMappers(
    mapAction(
      // Filtered Action
      ticketActions.flightsLoad,
      // Side-Effect
      store.loadFlights,
      // Result Action
      ticketActions.flightsLoaded,
    ),
    mapAction(
      // Filtered Actions
      ticketActions.flightsLoaded,
      ticketActions.flightsLoadedByPassenger,
      // State Updater Method (like Reducers)
      store.setFlights,
    ),
    mapAction(ticketActions.flightUpdate, store.updateFlight),
    mapAction(ticketActions.flightsClear, store.clearFlights),
  ),
);
```

## Register an Angular Dependency Injection Provider

```typescript
export const appRoutes: Route[] = [
  {
    path: 'flight-search-redux-connector',
    providers: [provideFlightStore()],
    component: FlightSearchReducConnectorComponent,
  },
];
```

## Use the Store in your Component

```typescript
@Component({
  standalone: true,
  imports: [JsonPipe, RouterLink, FormsModule, FlightCardComponent],
  selector: 'demo-flight-search-redux-connector',
  templateUrl: './flight-search.component.html',
})
export class FlightSearchReducConnectorComponent {
  private store = injectFlightStore();

  protected flights = this.store.flightEntities;

  protected search() {
    this.store.dispatch(
      ticketActions.flightsLoad({
        from: this.localState.filter.from(),
        to: this.localState.filter.to(),
      }),
    );
  }

  protected reset(): void {
    this.store.dispatch(ticketActions.flightsClear());
  }
}
```
