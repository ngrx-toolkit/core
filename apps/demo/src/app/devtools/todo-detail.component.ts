import {
  renameDevtoolsName,
  withDevtools,
  withGlitchTracking,
  withMapper,
} from '@angular-architects/ngrx-toolkit';
import { Component, effect, inject, input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { patchState, signalStore, withHooks, withState } from '@ngrx/signals';
import { Todo } from '../shared/todo.service';

/**
 * This Store can be instantiated multiple times, if the user
 * selects different todos.
 *
 * The devtools extension will start to index the store names.
 *
 * Since we want to apply our own store name, (depending on the id), we
 * run renameDevtoolsStore() in the effect.
 */
const TodoDetailStore = signalStore(
  withDevtools(
    'todo-detail',
    withMapper((state: Record<string, unknown>) => {
      return Object.keys(state).reduce(
        (acc, key) => {
          if (key === 'secret') {
            return acc;
          }
          acc[key] = state[key];

          return acc;
        },
        {} as Record<string, unknown>,
      );
    }),
    withGlitchTracking(),
  ),
  withState({
    id: 1,
    secret: 'do not show in DevTools',
    active: false,
  }),
  withHooks((store) => ({ onInit: () => patchState(store, { active: true }) })),
);

@Component({
  selector: 'demo-todo-detail',
  template: ` <section [attr.aria-label]="todo().name">
    <mat-card>
      <mat-card-title>{{ todo().name }}</mat-card-title>
      <mat-card-content>
        <textarea>{{ todo().description }}</textarea>
      </mat-card-content>
    </mat-card>
  </section>`,
  imports: [MatCardModule],
  providers: [TodoDetailStore],
  styles: `
    mat-card {
      margin: 10px;
    }
  `,
})
export class TodoDetailComponent {
  readonly #todoDetailStore = inject(TodoDetailStore);
  todo = input.required<Todo>();

  constructor() {
    effect(() => {
      renameDevtoolsName(this.#todoDetailStore, `todo-${this.todo().id}`);
    });
  }
}
