import { withResource } from '@angular-architects/ngrx-toolkit';
import { JsonPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { signalStore, withState } from '@ngrx/signals';
import { Flight } from '../shared/flight';

const url = 'https://demo.angulararchitects.io/api/flight?from=Paris&to=';

export const FlightStore = signalStore(
  withState({ flightTo: 'New York' }),
  withResource(({ flightTo }) => httpResource(() => `${url}${flightTo()}`)),
  withResource(({ flightTo }) => ({
    list: httpResource<Flight[]>(() => `${url}${flightTo()}`, {
      defaultValue: [],
    }),
  })),
);

@Component({
  selector: 'demo-with-resource',
  imports: [JsonPipe],
  template: `,
    <h1>withResource</h1>
    <a
      href="https://ngrx-toolkit.angulararchitects.io/docs/with-resource"
      target="_blank"
      >withResource doc page</a
    >

    <h2>Single Resource</h2>
    <pre>value: {{ store.value() | json }}</pre>
    <pre>status: {{ store.status() }}</pre>
    <pre>error: {{ store.error() | json }}</pre>
    <pre>hasValue: {{ store.hasValue() }}</pre>

    <h2>Named Resource</h2>
    <pre>{{ store.listValue() | json }}</pre>
    <pre>status: {{ store.listStatus() }}</pre>
    <pre>error: {{ store.listError() | json }}</pre>
    <pre>hasValue: {{ store.listHasValue() }}</pre> `,
  providers: [FlightStore],
})
export class WithResourceComponent {
  store = inject(FlightStore);
}
