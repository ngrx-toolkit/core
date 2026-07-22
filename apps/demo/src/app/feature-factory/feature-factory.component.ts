import { withFeatureFactory } from '@angular-architects/ngrx-toolkit';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import {
  patchState,
  signalStore,
  signalStoreFeature,
  withMethods,
  withState,
} from '@ngrx/signals';
import { lastValueFrom, of } from 'rxjs';

type User = {
  id: number;
  name: string;
};

function withMyEntity<Entity>(loadMethod: (id: number) => Promise<Entity>) {
  return signalStoreFeature(
    withState({
      currentId: 1 as number | undefined,
      entity: undefined as undefined | Entity,
    }),
    withMethods((store) => ({
      async load(id: number) {
        const entity = await loadMethod(1);
        patchState(store, { entity, currentId: id });
      },
    })),
  );
}

const UserStore = signalStore(
  { providedIn: 'root' },
  withMethods(() => ({
    findById(_id: number) {
      return of({ id: 1, name: 'Konrad' });
    },
  })),
  withFeatureFactory((store) => {
    const loader = (id: number) => lastValueFrom(store.findById(id));
    return withMyEntity<User>(loader);
  }),
);

@Component({
  template: `
    <h2>
      <pre>withFeatureFactory</pre>
    </h2>

    <button mat-raised-button (click)="loadUser()">Load User</button>

    <p>Current User: {{ userStore.entity()?.name || '-' }}</p>
  `,
  imports: [MatButton, FormsModule],
})
export class FeatureFactoryComponent {
  protected readonly userStore = inject(UserStore);

  loadUser() {
    void this.userStore.load(1);
  }
}
