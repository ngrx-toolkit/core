import { FlightService } from '../shared/flight.service';

import { signalStore, type } from '@ngrx/signals';

import {
  withCallState,
  withDataService,
  withUndoRedo,
} from '@ngrx-toolkit/core';
import { withEntities } from '@ngrx/signals/entities';
import { Flight } from '../shared/flight';

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
    filter: { from: 'Paris', to: 'New York' },
    collection: 'flight',
  }),
  withUndoRedo({
    collections: ['flight'],
  }),
);
