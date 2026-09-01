import { HttpClient, HttpParams } from '@angular/common/http';
import { inject } from '@angular/core';
import {
  noPayload,
  payload,
  updateState,
  withDevtools,
  withRedux,
} from '@ngrx-toolkit/core';
import { signalStore, withState } from '@ngrx/signals';
import { map, switchMap } from 'rxjs';
import { Flight } from './flight';

const actions = {
  public: {
    loadFlights: payload<{ from: string; to: string }>(),
    delayFirst: noPayload,
  },
  private: {
    flightsLoaded: payload<{ flights: Flight[] }>(),
  },
};

export const FlightStore = signalStore(
  { providedIn: 'root' },
  withDevtools('flights'),
  withState({ flights: [] as Flight[] }),
  withRedux({
    actions,
    reducer: (actions, on) => {
      on(actions.flightsLoaded, (state, { flights }) => {
        updateState(state, 'flights loaded', { flights });
      });
    },

    effects: (actions, create) => {
      const httpClient = inject(HttpClient);

      return {
        loadFlights$: create(actions.loadFlights).pipe(
          switchMap(({ from, to }) => {
            return httpClient.get<Flight[]>(
              'https://demo.angulararchitects.io/api/flight',
              {
                params: new HttpParams().set('from', from).set('to', to),
              },
            );
          }),
          map((flights) => actions.flightsLoaded({ flights })),
        ),
      };
    },
  }),
);
