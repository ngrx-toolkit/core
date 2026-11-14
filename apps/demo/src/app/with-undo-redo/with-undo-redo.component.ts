import { clearUndoRedo } from '@angular-architects/ngrx-toolkit';
import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { UndoRedoStore } from './undo-redo.store';

@Component({
  selector: 'demo-with-undo-redo',
  imports: [
    FormsModule,
    DatePipe,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatInputModule,
    MatListModule,
  ],
  providers: [UndoRedoStore],
  templateUrl: './with-undo-redo.component.html',
  styleUrl: './with-undo-redo.component.css',
})
export class WithUndoRedoComponent {
  readonly store = inject(UndoRedoStore);

  newItemText = '';
  editItemId: number | null = null;
  editItemText = '';

  savepoints = signal<number[]>([]);

  addItem() {
    const text = this.newItemText.trim();
    if (!text) return;
    this.store.addItem(text);
    this.newItemText = '';
  }

  startEdit(id: number, text: string) {
    this.editItemId = id;
    this.editItemText = text;
  }

  saveEdit() {
    if (this.editItemId === null) return;
    this.store.updateItem(this.editItemId, this.editItemText);
    this.editItemId = null;
    this.editItemText = '';
  }

  cancelEdit() {
    this.editItemId = null;
    this.editItemText = '';
  }

  removeItem(id: number) {
    this.store.removeItem(id);
  }

  undo() {
    this.store.undo();
  }

  redo() {
    this.store.redo();
  }

  createSavepoint() {
    this.savepoints.update((sp) => [...sp, Date.now()]);
  }

  rollbackTo(savepoint: number) {
    this.store.rollback(savepoint);
  }

  clearStack() {
    clearUndoRedo(this.store);
    this.savepoints.set([]);
  }
}
