import { inject } from '@angular/core';
import { withLocalStorage, withStorageSync } from '@ngrx-toolkit/core';
import { getState, patchState, signalStore, withMethods } from '@ngrx/signals';
import {
  removeEntity,
  setEntity,
  updateEntity,
  withEntities,
} from '@ngrx/signals/entities';
import { AddTodo, Todo, TodoService } from '../shared/todo.service';

export const SyncedTodoStore = signalStore(
  { providedIn: 'root' },
  withEntities<Todo>(),
  withStorageSync('todos', withLocalStorage()),
  withMethods((store, todoService = inject(TodoService)) => {
    let currentId = 0;
    return {
      add(todo: AddTodo) {
        patchState(store, setEntity({ id: ++currentId, ...todo }));
      },

      remove(id: number) {
        patchState(store, removeEntity(id));
      },

      toggleFinished(id: number): void {
        const todo = store.entityMap()[id];
        patchState(
          store,
          updateEntity({ id, changes: { finished: !todo.finished } }),
        );
      },

      reset() {
        const state = getState(store);

        state.ids.forEach((id) => this.remove(Number(id)));

        const todos = todoService.getData();
        todos.forEach((todo) => this.add(todo));
      },
    };
  }),
);
