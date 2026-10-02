import { Component, OnInit, inject, signal } from '@angular/core';
import { asApiError, ApiError } from '../../shell-contract';
import { CatalogApiService } from '../data/catalog-api.service';
import { BillboardItem } from '../model/billboard';

@Component({
  selector: 'app-catalog-billboard-page',
  standalone: true,
  template: `
    <h2>Cartelera</h2>
    @switch (view().kind) {
      @case ('loading') { <p>Loading billboard...</p> }
      @case ('error') { <p role="alert">{{ errorMessage() }}</p> }
      @case ('empty') { <p>No movies are currently published.</p> }
      @case ('ready') {
        <ul>
          @for (item of items(); track item.showtime.id) {
            <li>{{ item.movie.title }} - {{ item.showtime.startsAt }}</li>
          }
        </ul>
      }
    }
  `,
})
export class BillboardPageComponent implements OnInit {
  readonly view = signal<View>({ kind: 'loading' });

  private readonly catalogApi = inject(CatalogApiService);

  errorMessage(): string {
    const current = this.view();
    return current.kind === 'error' ? current.error.userMessage : '';
  }

  items(): BillboardItem[] {
    const current = this.view();
    return current.kind === 'ready' ? current.items : [];
  }

  ngOnInit(): void {
    this.catalogApi.getBillboard().subscribe({
      next: page => this.view.set(page.data.length
        ? { kind: 'ready', items: page.data }
        : { kind: 'empty' }),
      error: error => this.view.set({ kind: 'error', error: asApiError(error) }),
    });
  }
}

type View =
  | { kind: 'loading' }
  | { kind: 'error'; error: ApiError }
  | { kind: 'empty' }
  | { kind: 'ready'; items: BillboardItem[] };
