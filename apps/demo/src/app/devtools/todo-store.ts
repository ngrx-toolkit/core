import { computed, inject } from '@angular/core';
import { updateState, withDevtools } from '@ngrx-toolkit/core';
import {
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import {
  removeEntity,
  setEntity,
  updateEntity,
  withEntities,
} from '@ngrx/signals/entities';
import { AddTodo, Todo, TodoService } from '../shared/todo.service';

export const TodoStore = signalStore(
  { providedIn: 'root' },
  withDevtools('todo-store'),
  withEntities<Todo>(),
  withState({
    selectedIds: [] as number[],
  }),
  withMethods((store) => {
    let currentId = 0;
    return {
      add(todo: AddTodo) {
        updateState(store, 'add todo', setEntity({ id: ++currentId, ...todo }));
      },

      remove(id: number) {
        updateState(
          store,
          'remove todo',
          removeEntity(id),
          ({ selectedIds }) => ({
            selectedIds: selectedIds.filter((selectedId) => selectedId !== id),
          }),
        );
      },

      toggleFinished(id: number): void {
        const todo = store.entityMap()[id];
        updateState(
          store,
          'toggle todo',
          updateEntity({ id, changes: { finished: !todo.finished } }),
        );
      },
      toggleSelectTodo(id: number) {
        updateState(store, `select todo ${id}`, ({ selectedIds }) => {
          if (selectedIds.includes(id)) {
            return {
              selectedIds: selectedIds.filter(
                (selectedId) => selectedId !== id,
              ),
            };
          }
          return {
            selectedIds: [...store.selectedIds(), id],
          };
        });
      },
    };
  }),
  withComputed((state) => ({
    selectedTodos: computed(() =>
      state.selectedIds().map((id) => state.entityMap()[id]),
    ),
  })),
  withHooks({
    onInit: (store, todoService = inject(TodoService)) => {
      const todos = todoService.getData();
      todos.forEach((todo) => store.add(todo));
    },
  }),
);
