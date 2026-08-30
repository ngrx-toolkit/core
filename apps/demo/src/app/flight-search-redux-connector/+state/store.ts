import { computed, inject } from '@angular/core';
import { reduxMethod } from '@ngrx-toolkit/core/redux-connector';
import {
  patchState,
  signalStore,
  type,
  withComputed,
  withMethods,
} from '@ngrx/signals';
import {
  removeAllEntities,
  setAllEntities,
  updateEntity,
  withEntities,
} from '@ngrx/signals/entities';
import { from, map, pipe, switchMap } from 'rxjs';
import { Flight } from '../../shared/flight';
import { FlightFilter, FlightService } from '../../shared/flight.service';

export const FlightStore = signalStore(
  { providedIn: 'root' },
  // State
  withEntities({ entity: type<Flight>(), collection: 'flight' }),
  withEntities({ entity: type<number>(), collection: 'hide' }),
  // Selectors
  withComputed(({ flightEntities, hideEntities }) => ({
    filteredFlights: computed(() =>
      flightEntities().filter((flight) => !hideEntities().includes(flight.id)),
    ),
    flightCount: computed(() => flightEntities().length),
  })),
  // Updater
  withMethods((store) => ({
    setFlights: (state: { flights: Flight[] }) =>
      patchState(
        store,
        setAllEntities(state.flights, { collection: 'flight' }),
      ),
    updateFlight: (state: { flight: Flight }) =>
      patchState(
        store,
        updateEntity(
          { id: state.flight.id, changes: state.flight },
          { collection: 'flight' },
        ),
      ),
    clearFlights: () =>
      patchState(store, removeAllEntities({ collection: 'flight' })),
  })),
  // Effects
  withMethods((store, flightService = inject(FlightService)) => ({
    loadFlights: reduxMethod<FlightFilter, { flights: Flight[] }>(
      pipe(
        switchMap((filter) =>
          from(flightService.load({ from: filter.from, to: filter.to })),
        ),
        map((flights) => ({ flights })),
      ),
      store.setFlights,
    ),
  })),
);
