import { inject, resource } from '@angular/core';
import {
  httpMutation,
  withEntityResources,
  withMutations,
} from '@ngrx-toolkit/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { addEntity, removeEntity, updateEntity } from '@ngrx/signals/entities';
import { firstValueFrom } from 'rxjs';
import { Todo, TodoMemoryService } from './todo-memory.service';

export const TodoEntityResourceStore = signalStore(
  { providedIn: 'root' },
  withState({ baseUrl: '/api', filter: '' }),
  withEntityResources((store, svc = inject(TodoMemoryService)) =>
    resource({ loader: () => firstValueFrom(svc.list()), defaultValue: [] }),
  ),
  withMethods((store) => ({
    setFilter(filter: string) {
      patchState(store, { filter });
    },
  })),
  withMutations((store, svc = inject(TodoMemoryService)) => ({
    addTodo: httpMutation<Todo, Todo>({
      request: (todo) => ({ url: '/memory/add', method: 'POST', body: todo }),
      parse: (raw) => raw as Todo,
      onSuccess: async (todo) => {
        await firstValueFrom(svc.add(todo));
        patchState(store, addEntity(todo));
      },
    }),
    toggleTodo: httpMutation<{ id: number; completed: boolean }, Todo>({
      request: (p) => ({
        url: `/memory/toggle/${p.id}`,
        method: 'PATCH',
        body: p,
      }),
      parse: (raw) => raw as Todo,
      onSuccess: async (_todo, p) => {
        const todo = await firstValueFrom(svc.toggle(p.id, p.completed));
        if (todo) {
          patchState(
            store,
            updateEntity<Todo>({
              id: todo.id,
              changes: { completed: todo.completed },
            }),
          );
        }
      },
    }),
    removeTodo: httpMutation<number, boolean>({
      request: (id) => ({ url: `/memory/remove/${id}`, method: 'DELETE' }),
      parse: () => true,
      onSuccess: async (_r, id) => {
        await firstValueFrom(svc.remove(id));
        patchState(store, removeEntity(id));
      },
    }),
  })),
);
