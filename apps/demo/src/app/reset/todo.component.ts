import { SelectionModel } from '@angular/cdk/collections';
import { Component, effect, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { Todo, TodoStore } from './todo-store';

@Component({
  template: `
    <div class="button">
      <button mat-raised-button (click)="resetState()">Reset State</button>
    </div>

    <div>
      <mat-table [dataSource]="dataSource" class="mat-elevation-z8">
        <!-- Checkbox Column -->
        <ng-container matColumnDef="finished">
          <mat-header-cell *matHeaderCellDef></mat-header-cell>
          <mat-cell *matCellDef="let row" class="actions">
            <mat-checkbox
              (click)="$event.stopPropagation()"
              (change)="toggleFinished(row)"
              [checked]="row.finished"
            >
            </mat-checkbox>
          </mat-cell>
        </ng-container>

        <!-- Name Column -->
        <ng-container matColumnDef="name">
          <mat-header-cell *matHeaderCellDef>Name</mat-header-cell>
          <mat-cell *matCellDef="let element">{{ element.name }}</mat-cell>
        </ng-container>

        <mat-header-row *matHeaderRowDef="displayedColumns"></mat-header-row>
        <mat-row
          *matRowDef="let row; columns: displayedColumns"
          (click)="selection.toggle(row)"
        ></mat-row>
      </mat-table>
    </div>
  `,
  styles: `
    .button {
      margin-bottom: 1em;
    }
  `,
  imports: [MatCheckboxModule, MatIconModule, MatTableModule, MatButton],
})
export class TodoComponent {
  todoStore = inject(TodoStore);

  displayedColumns: string[] = ['finished', 'name'];
  dataSource = new MatTableDataSource<Todo>([]);
  selection = new SelectionModel<Todo>(true, []);

  constructor() {
    effect(() => {
      this.dataSource.data = this.todoStore.entities();
    });
  }

  toggleFinished(todo: Todo) {
    this.todoStore.toggleFinished(todo.id);
  }

  resetState() {
    this.todoStore.resetState();
  }
}
