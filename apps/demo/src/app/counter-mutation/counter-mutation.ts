import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { CounterStore } from './counter.store';

@Component({
  selector: 'demo-counter-mutation',
  imports: [CommonModule],
  templateUrl: './counter-mutation.html',
  styleUrl: './counter-mutation.css',
})
export class CounterMutation {
  private store = inject(CounterStore);

  protected counter = this.store.counter;
  protected error = this.store.incrementError;
  protected isPending = this.store.incrementIsPending;
  protected status = this.store.incrementStatus;

  protected saveError = this.store.saveToServerError;
  protected saveIsPending = this.store.saveToServerIsPending;
  protected saveStatus = this.store.saveToServerStatus;
  protected lastResponse = this.store.lastResponse;

  increment() {
    this.store.increment({ value: 1 });
  }

  saveToServer() {
    this.store.saveToServer();
  }
}
