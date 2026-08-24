import { JsonPipe } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { patchState, signalState } from '@ngrx/signals';
import { Flight } from '../shared/flight';
import { FlightCardComponent } from '../shared/flight-card.component';
import { FlightFilter } from '../shared/flight.service';
import { ticketActions } from './+state/actions';
import { injectFlightStore } from './+state/redux';

@Component({
  imports: [JsonPipe, FormsModule, FlightCardComponent],
  selector: 'demo-flight-search-redux-connector',
  templateUrl: './flight-search.component.html',
})
export class FlightSearchReducConnectorComponent {
  private store = injectFlightStore();

  protected localState = signalState({
    filter: {
      from: 'Frankfurt',
      to: 'Paris',
    },
    basket: {
      888: true,
      889: true,
    } as Record<number, boolean>,
  });

  protected flights = this.store.flightEntities;

  protected search() {
    this.store.dispatch(
      ticketActions.flightsLoad({
        from: this.localState.filter.from(),
        to: this.localState.filter.to(),
      }),
    );
  }

  protected patchFilter(filter: Partial<FlightFilter>) {
    patchState(this.localState, (state) => ({
      filter: {
        ...state.filter,
        ...filter,
      },
    }));
  }

  protected select(id: number, selected: boolean): void {
    patchState(this.localState, (state) => ({
      basket: {
        ...state.basket,
        [id]: selected,
      },
    }));
  }

  protected delay(flight: Flight): void {
    const oldFlight = flight;
    const oldDate = new Date(oldFlight.date);

    const newDate = new Date(oldDate.getTime() + 1000 * 60 * 5); // Add 5 min
    const newFlight = {
      ...oldFlight,
      date: newDate.toISOString(),
      delayed: true,
    };

    this.store.dispatch(ticketActions.flightUpdate({ flight: newFlight }));
  }

  protected reset(): void {
    this.store.dispatch(ticketActions.flightsClear());
  }
}
