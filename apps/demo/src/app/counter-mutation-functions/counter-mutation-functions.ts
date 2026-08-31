import {
  concatOp,
  httpMutation,
  rxMutation,
} from '@angular-architects/ngrx-toolkit';
import { JsonPipe } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { delay, Observable, of, throwError } from 'rxjs';

export type Params = {
  value: number;
};

// httpbin.org echos the request in the json property
export type CounterResponse = {
  json: { counter: number };
};

@Component({
  selector: 'demo-counter-mutation-functions',
  imports: [JsonPipe],
  templateUrl: './counter-mutation-functions.html',
  styleUrl: './counter-mutation-functions.css',
})
export class CounterRxMutationFunctions {
  private counterSignal = signal(0);

  private increment = rxMutation({
    operation: (params: Params) => {
      return calcSum(this.counterSignal(), params.value);
    },
    operator: concatOp,
    onSuccess: (result) => {
      this.counterSignal.set(result);
    },
    onError: (error) => {
      console.error('Error occurred:', error);
    },
  });

  private saveToServer = httpMutation({
    request: (p: Params) => ({
      url: `https://httpbin.org/post`,
      method: 'POST',
      body: { counter: p.value },
    }),
    parse: (response) => response as CounterResponse,
    onSuccess: (response) => {
      console.log('Counter sent to server:', response);
    },
    onError: (error) => {
      console.error('Failed to send counter:', error);
    },
  });

  // Expose signals for template
  protected counter = this.counterSignal.asReadonly();
  protected error = this.increment.error;
  protected isPending = this.increment.isPending;
  protected status = this.increment.status;
  protected value = this.increment.value;
  protected hasValue = this.increment.hasValue;

  protected saveError = this.saveToServer.error;
  protected saveIsPending = this.saveToServer.isPending;
  protected saveStatus = this.saveToServer.status;
  protected lastResponse = computed(() => this.saveToServer.value()?.json);

  async incrementCounter() {
    const result = await this.increment({ value: 1 });
    if (result.status === 'success') {
      console.log('Success:', result.value);
    }
    if (result.status === 'error') {
      console.log('Error:', result.error);
    }
    if (result.status === 'aborted') {
      console.log('Operation aborted');
    }
  }

  async incrementBy13() {
    await this.increment({ value: 13 });
  }

  async saveCounterToServer() {
    const result = await this.saveToServer({ value: this.counter() });
    if (result.status === 'success') {
      console.log('Successfully saved to server:', result.value);
    } else if (result.status === 'error') {
      console.log('Failed to save:', result.error);
    } else {
      console.log('Operation aborted');
    }
  }
}

function calcSum(a: number, b: number): Observable<number> {
  const result = a + b;
  if (b === 13) {
    return throwError(() => ({
      message: 'error due to bad luck!',
      a,
      b,
      result,
    }));
  }
  return of(result).pipe(delay(500));
}
