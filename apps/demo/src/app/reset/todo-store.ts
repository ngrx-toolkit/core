import { setResetState, withReset } from '@ngrx-toolkit/core';
import {
  getState,
  patchState,
  signalStore,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { addEntity, updateEntity, withEntities } from '@ngrx/signals/entities';

export interface Todo {
  id: number;
  name: string;
  finished: boolean;
  description?: string;
  deadline?: Date;
}

export type AddTodo = Omit<Todo, 'id'>;

export const TodoStore = signalStore(
  { providedIn: 'root' },
  withReset(),
  withEntities<Todo>(),
  withState({
    selectedIds: [] as number[],
  }),
  withMethods((store) => {
    let currentId = 0;
    return {
      _add(todo: AddTodo) {
        patchState(store, addEntity({ ...todo, id: ++currentId }));
      },
      toggleFinished(id: number) {
        const todo = store.entityMap()[id];
        patchState(
          store,
          updateEntity({ id, changes: { finished: !todo.finished } }),
        );
      },
    };
  }),
  withHooks({
    onInit: (store) => {
      store._add({
        name: 'Go for a Walk',
        finished: false,
        description:
          'Go for a walk in the park to relax and enjoy nature. Walking is a great way to clear your mind and get some exercise. It can help reduce stress and improve your mood. Make sure to wear comfortable shoes and bring a bottle of water. Enjoy the fresh air and take in the scenery around you.',
      });

      store._add({
        name: 'Read a Book',
        finished: false,
        description:
          'Spend some time reading a book. It can be a novel, a non-fiction book, or any other genre you enjoy. Reading can help you relax and learn new things.',
      });

      store._add({
        name: 'Write a Journal',
        finished: false,
        description:
          'Take some time to write in your journal. Reflect on your day, your thoughts, and your feelings. Journaling can be a great way to process emotions and document your life.',
      });

      store._add({
        name: 'Exercise',
        finished: false,
        description:
          'Do some physical exercise. It can be a workout, a run, or any other form of exercise you enjoy. Exercise is important for maintaining physical and mental health.',
      });

      store._add({
        name: 'Cook a Meal',
        finished: false,
        description:
          'Prepare a meal for yourself or your family. Cooking can be a fun and rewarding activity. Try out a new recipe or make one of your favorite dishes.',
      });

      setResetState(store, getState(store));
    },
  }),
);
