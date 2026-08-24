import { SelectionModel } from '@angular/cdk/collections';
import { Component, effect, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { Todo } from '../shared/todo.service';
import { TodoDetailComponent } from './todo-detail.component';
import { TodoStore } from './todo-store';

@Component({
  selector: 'demo-todo',
  template: `
    <mat-table [dataSource]="dataSource" class="mat-elevation-z8">
      <!-- Checkbox Column -->
      <ng-container matColumnDef="finished">
        <mat-header-cell *matHeaderCellDef></mat-header-cell>
        <mat-cell *matCellDef="let row" class="actions">
          <mat-checkbox
            (click)="$event.stopPropagation()"
            (change)="checkboxLabel(row)"
            [checked]="row.finished"
          >
          </mat-checkbox>
          <mat-icon (click)="removeTodo(row)">delete</mat-icon>
        </mat-cell>
      </ng-container>

      <!-- Name Column -->
      <ng-container matColumnDef="name">
        <mat-header-cell *matHeaderCellDef>Name</mat-header-cell>
        <mat-cell *matCellDef="let element">{{ element.name }}</mat-cell>
      </ng-container>

      <!-- Deadline Column -->
      <ng-container matColumnDef="deadline">
        <mat-header-cell mat-header-cell *matHeaderCellDef
          >Deadline
        </mat-header-cell>
        <mat-cell mat-cell *matCellDef="let element"
          >{{ element.deadline }}
        </mat-cell>
      </ng-container>

      <mat-header-row *matHeaderRowDef="displayedColumns"></mat-header-row>
      <mat-row
        *matRowDef="let row; columns: displayedColumns"
        (click)="selection.toggle(row)"
      ></mat-row>
    </mat-table>

    <div class="details">
      @for (todo of todoStore.selectedTodos(); track todo) {
        <demo-todo-detail [todo]="todo"></demo-todo-detail>
      }
    </div>
  `,
  styles: `
    .actions {
      display: flex;
      align-items: center;
    }

    .details {
      margin: 20px;
      display: flex;
    }
  `,
  imports: [
    MatCheckboxModule,
    MatIconModule,
    MatTableModule,
    TodoDetailComponent,
    FormsModule,
  ],
})
export class TodoComponent {
  todoStore = inject(TodoStore);

  displayedColumns: string[] = ['finished', 'name', 'deadline'];
  dataSource = new MatTableDataSource<Todo>([]);
  selection = new SelectionModel<Todo>(true, []);

  constructor() {
    effect(() => {
      this.dataSource.data = this.todoStore.entities();
    });
  }

  checkboxLabel(todo: Todo) {
    this.todoStore.toggleSelectTodo(todo.id);
  }

  removeTodo(todo: Todo) {
    this.todoStore.remove(todo.id);
  }
}
