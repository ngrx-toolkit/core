import { CommonModule } from '@angular/common';
import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatToolbarModule } from '@angular/material/toolbar';
import { injectDispatch } from '@ngrx/signals/events';
import { bookEvents } from './book-events';
import { BookStore } from './book.store';

@Component({
  selector: 'demo-events-sample',
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatIconModule,
    MatChipsModule,
    MatGridListModule,
    MatToolbarModule,
  ],
  template: `
    <mat-toolbar color="primary">
      <span>Book Store with Event Tracking</span>
    </mat-toolbar>

    <mat-card>
      <mat-card-content>
        <mat-form-field appearance="outline">
          <mat-label>Search books</mat-label>
          <input
            matInput
            [(ngModel)]="filterText"
            (ngModelChange)="dispatch.filterUpdated({ filter: $event })"
            placeholder="Filter by title or author..."
          />
          <mat-icon matSuffix>search</mat-icon>
        </mat-form-field>

        <button mat-raised-button color="primary" (click)="addRandomBook()">
          <mat-icon>add</mat-icon> Add Book
        </button>
        <button mat-raised-button (click)="dispatch.selectionCleared()">
          Clear Selection
        </button>
      </mat-card-content>
    </mat-card>

    <mat-card>
      <mat-card-content>
        <mat-chip-set>
          <mat-chip>Total: {{ store.totalBooks() }}</mat-chip>
          <mat-chip>In Stock: {{ store.availableBooks() }}</mat-chip>
          <mat-chip>Filtered: {{ store.filteredBooks().length }}</mat-chip>
        </mat-chip-set>
      </mat-card-content>
    </mat-card>

    <mat-grid-list cols="3" rowHeight="350px" gutterSize="16">
      @for (book of store.filteredBooks(); track book.id) {
        <mat-grid-tile>
          <mat-card
            [style.border]="
              store.selectedBook()?.id === book.id
                ? '2px solid #4caf50'
                : 'none'
            "
            (click)="dispatch.bookSelected({ bookId: book.id })"
          >
            <mat-card-header>
              <mat-card-title>{{ book.title }}</mat-card-title>
              <mat-card-subtitle
                >{{ book.author }} ({{ book.year }})</mat-card-subtitle
              >
            </mat-card-header>
            <mat-card-content>
              <p>ISBN: {{ book.isbn }}</p>
              <mat-chip [color]="book.inStock ? 'primary' : 'warn'">
                {{ book.inStock ? 'In Stock' : 'Out of Stock' }}
              </mat-chip>
            </mat-card-content>
            <mat-card-actions>
              <button mat-button (click)="toggleStock(book.id, $event)">
                Toggle Stock
              </button>
              <button
                mat-button
                color="warn"
                (click)="removeBook(book.id, $event)"
              >
                Remove
              </button>
            </mat-card-actions>
          </mat-card>
        </mat-grid-tile>
      } @empty {
        <mat-grid-tile [colspan]="3">
          <p>
            @if (store.filter()) {
              No books found matching "{{ store.filter() }}"
            } @else {
              No books available
            }
          </p>
        </mat-grid-tile>
      }
    </mat-grid-list>

    @if (store.selectedBook(); as book) {
      <mat-card>
        <mat-card-header>
          <mat-card-title>Selected: {{ book.title }}</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <p>Author: {{ book.author }}</p>
          <p>Year: {{ book.year }}</p>
          <p>ISBN: {{ book.isbn }}</p>
          <p>Status: {{ book.inStock ? 'In Stock' : 'Out of Stock' }}</p>
        </mat-card-content>
      </mat-card>
    }
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [
    `
      mat-card {
        margin: 16px;
      }

      mat-form-field {
        margin-right: 16px;
      }

      button {
        margin-right: 8px;
      }

      mat-grid-tile mat-card {
        width: 100%;
        cursor: pointer;
      }
    `,
  ],
})
export class EventsSampleComponent {
  readonly store = inject(BookStore);
  readonly dispatch = injectDispatch(bookEvents);
  filterText = '';

  toggleStock(bookId: string, event: Event) {
    event.stopPropagation();
    this.dispatch.stockToggled({ bookId });
  }

  removeBook(bookId: string, event: Event) {
    event.stopPropagation();
    this.dispatch.bookRemoved({ bookId });
  }

  addRandomBook() {
    const titles = [
      'The Hobbit',
      'Brave New World',
      'Fahrenheit 451',
      'The Road',
      'Dune',
    ];
    const authors = [
      'J.R.R. Tolkien',
      'Aldous Huxley',
      'Ray Bradbury',
      'Cormac McCarthy',
      'Frank Herbert',
    ];
    const randomIndex = Math.floor(Math.random() * titles.length);

    this.dispatch.bookAdded({
      book: {
        id: crypto.randomUUID(),
        title: titles[randomIndex],
        author: authors[randomIndex],
        year: 1950 + Math.floor(Math.random() * 70),
        isbn: `978-${Math.floor(Math.random() * 10)}-${Math.floor(Math.random() * 100000)}`,
        inStock: Math.random() > 0.5,
      },
    });
  }
}
