import { withConditional } from '@angular-architects/ngrx-toolkit';
import { Component, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import {
  MatButtonToggle,
  MatButtonToggleGroup,
} from '@angular/material/button-toggle';
import {
  patchState,
  signalStore,
  signalStoreFeature,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';

const withUser = signalStoreFeature(
  withState({ id: 0, name: '' }),
  withHooks((store) => ({
    onInit() {
      patchState(store, { id: 1, name: 'Konrad' });
    },
  })),
);

const withFakeUser = signalStoreFeature(
  withState({ id: 0, name: 'Tommy Fake' }),
);

const UserServiceStore = signalStore(
  { providedIn: 'root' },
  withState({ implementation: 'real' as 'real' | 'fake' }),
  withMethods((store) => ({
    setImplementation(implementation: 'real' | 'fake') {
      patchState(store, { implementation });
    },
  })),
);

const UserStore = signalStore(
  withConditional(
    () => inject(UserServiceStore).implementation() === 'real',
    withUser,
    withFakeUser,
  ),
);

@Component({
  selector: 'demo-conditional-user',
  template: `<p>Current User {{ userStore.name() }}</p>`,
  providers: [UserStore],
})
class ConditionalUserComponent {
  protected readonly userStore = inject(UserStore);

  constructor() {
    console.log('log geht es');
  }
}

@Component({
  template: `
    <h2>
      <pre>withConditional</pre>
    </h2>

    <mat-button-toggle-group
      aria-label="User Feature"
      [(ngModel)]="userFeature"
    >
      <mat-button-toggle value="real">Real User</mat-button-toggle>
      <mat-button-toggle value="fake">Fake User</mat-button-toggle>
    </mat-button-toggle-group>

    <div>
      <button mat-raised-button (click)="toggleUserComponent()">
        Toggle User Component
      </button>
    </div>
    @if (showUserComponent()) {
      <demo-conditional-user />
    }
  `,
  imports: [
    FormsModule,
    MatButtonToggle,
    MatButtonToggleGroup,
    ConditionalUserComponent,
    MatButton,
  ],
})
export class ConditionalSettingComponent {
  showUserComponent = signal(false);

  toggleUserComponent() {
    this.showUserComponent.update((show) => !show);
  }
  userService = inject(UserServiceStore);
  protected readonly userFeature = signal<'real' | 'fake'>('real');

  effRef = effect(() => {
    const userFeature = this.userFeature();

    untracked(() => {
      this.userService.setImplementation(userFeature);
      this.showUserComponent.set(false);
    });
  });
}
