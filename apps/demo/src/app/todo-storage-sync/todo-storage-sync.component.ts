import { SelectionModel } from '@angular/cdk/collections';
import { Component, effect, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { Todo } from '../shared/todo.service';
import { SyncedTodoStore } from './synced-todo-store';

@Component({
  selector: 'demo-todo-storage-sync',
  imports: [MatCheckboxModule, MatIconModule, MatTableModule, MatButton],
  templateUrl: './todo-storage-sync.component.html',
  styleUrl: './todo-storage-sync.component.scss',
})
export class TodoStorageSyncComponent {
  todoStore = inject(SyncedTodoStore);

  displayedColumns: string[] = ['finished', 'name', 'description', 'deadline'];
  dataSource = new MatTableDataSource<Todo>([]);
  selection = new SelectionModel<Todo>(true, []);

  constructor() {
    effect(() => {
      this.dataSource.data = this.todoStore.entities();
    });
  }

  checkboxLabel(todo: Todo) {
    this.todoStore.toggleFinished(todo.id);
  }

  removeTodo(todo: Todo) {
    this.todoStore.remove(todo.id);
  }

  onClickReset() {
    this.todoStore.reset();
  }
}
