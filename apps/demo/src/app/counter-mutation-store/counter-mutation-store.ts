import { JsonPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { CounterStore } from './counter.store';

@Component({
  selector: 'demo-counter-mutation-store',
  imports: [JsonPipe],
  templateUrl: './counter-mutation-store.html',
  styleUrl: './counter-mutation-store.css',
})
export class CounterMutationStore {
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
