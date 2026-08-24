import { withImmutableState } from '@angular-architects/ngrx-toolkit';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { patchState, signalStore, withMethods } from '@ngrx/signals';

const initialState = { user: { id: 1, name: 'Konrad' } };

const UserStore = signalStore(
  { providedIn: 'root' },
  withImmutableState(initialState),
  withMethods((store) => ({
    mutateState() {
      patchState(store, (state) => {
        state.user.id = 2;
        return state;
      });
    },
  })),
);

@Component({
  template: `
    <h2>
      <pre>withImmutableState</pre>
    </h2>
    <p>
      withImmutableState throws an error if the state is mutated, regardless
      inside or outside the SignalStore.
    </p>
    <ul>
      <li>
        <button mat-raised-button (click)="mutateOutside()">
          Mutate State outside the SignalStore
        </button>
      </li>
      <li>
        <button mat-raised-button (click)="mutateInside()">
          Mutate State inside the SignalStore
        </button>
      </li>
    </ul>

    <p>Form to edit State mutable via ngModel</p>
    <input [(ngModel)]="userStore.user().name" />
  `,
  imports: [MatButton, FormsModule],
})
export class ImmutableStateComponent {
  protected readonly userStore = inject(UserStore);
  mutateOutside() {
    initialState.user.id = 2;
  }

  mutateInside() {
    this.userStore.mutateState();
  }
}
