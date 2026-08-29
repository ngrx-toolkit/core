import { withResource } from '@angular-architects/ngrx-toolkit';
import { JsonPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { signalStore, withState } from '@ngrx/signals';
import { Flight } from '../shared/flight';

const url = 'https://demo.angulararchitects.io/api/flight?from=Paris&to=';

export const FlightStore = signalStore(
  withState({ flightTo: 'New York' }),
  withResource(({ flightTo }) =>
    httpResource<Flight[]>(() => `${url}${flightTo()}`),
  ),
  withResource(({ flightTo }) => ({
    list: httpResource<Flight[]>(() => `${url}${flightTo()}`, {
      defaultValue: [],
    }),
  })),
);

@Component({
  selector: 'demo-with-resource',
  imports: [JsonPipe],
  templateUrl: './with-resource.component.html',
  providers: [FlightStore],
})
export class WithResourceComponent {
  store = inject(FlightStore);
}
