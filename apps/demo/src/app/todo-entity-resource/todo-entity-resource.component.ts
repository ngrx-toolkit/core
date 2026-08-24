import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { TodoEntityResourceStore } from './todo-entity-resource.store';

@Component({
  selector: 'demo-todo-entity-resource',
  standalone: true,
  imports: [
    FormsModule,
    MatIcon,
    MatInputModule,
    MatListModule,
    MatTableModule,
  ],
  templateUrl: './todo-entity-resource.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [],
})
export class TodoEntityResourceComponent {
  protected readonly store = inject(TodoEntityResourceStore);
  protected newTitle = '';
  protected readonly dataSource = new MatTableDataSource<{
    id: number;
    title: string;
    completed: boolean;
  }>([]);
  protected readonly filtered = computed(() =>
    this.store.entities().filter((t) =>
      (this.store.filter() || '')
        .toLowerCase()
        .split(/\s+/)
        .filter((s) => s.length > 0)
        .every((s) => t.title.toLowerCase().includes(s)),
    ),
  );
  constructor() {
    effect(() => {
      this.dataSource.data = this.filtered();
    });
  }
  trackById = (_: number, t: { id: number }) => t.id;
  add() {
    const title = this.newTitle.trim();
    if (!title) return;
    const ids = this.store.ids() as Array<number>;
    const nextId = ids.length ? Math.max(...ids) + 1 : 1;
    this.store.addTodo({ id: nextId, title, completed: false });
    this.newTitle = '';
  }
}
