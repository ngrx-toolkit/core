import { withResource } from '@angular-architects/ngrx-toolkit';
import { JsonPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { signalStore, withProps, withState } from '@ngrx/signals';
import { of } from 'rxjs';
import { Flight } from '../shared/flight';

const url = 'https://demo.angulararchitects.io/api/flight?from=Paris&to=';

export const FlightStore = signalStore(
  withState({ flightTo: 'New York' }),
  withResource(
    ({ flightTo }) => httpResource<Flight[]>(() => `${url}${flightTo()}`),
    { errorHandling: 'native' },
  ),
  withResource(
    ({ flightTo }) => ({
      list: httpResource<Flight[]>(() => `${url}${flightTo()}`),
    }),
    { errorHandling: 'native' },
  ),
  withProps(() => {
    return {
      normalResource: rxResource({
        stream: () => {
          return of<Flight[]>([]);
        },
      }),
    };
  }),
);

@Component({
  selector: 'demo-with-resource',
  imports: [JsonPipe],
  templateUrl: './with-resource.component.html',
  providers: [FlightStore],
})
export class WithResourceComponent {
  store = inject(FlightStore);

  constructor() {
    // A regular resource
    this.store.normalResource.value();
    if (this.store.normalResource.hasValue()) {
      this.store.normalResource.value();
    }

    // `withResource`
    // unnamed
    this.store.value();
    if (this.store.hasValue()) {
      this.store.value();
    }
    // named
    this.store.listValue();
    if (this.store.listHasValue()) {
      this.store.listValue(); // not narrowing
    }
  }
}
