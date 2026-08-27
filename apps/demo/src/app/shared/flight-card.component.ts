import { CommonModule } from '@angular/common';
import { Component, input, model } from '@angular/core';
import { RouterModule } from '@angular/router';
import { initFlight } from './flight';

@Component({
  selector: 'demo-flight-card',
  imports: [CommonModule, RouterModule],
  templateUrl: './flight-card.component.html',
})
export class FlightCardComponent {
  public readonly item = input(initFlight);
  public readonly selected = model.required<boolean>();

  protected select() {
    this.selected.set(true);
  }

  protected deselect() {
    this.selected.set(false);
  }
}
