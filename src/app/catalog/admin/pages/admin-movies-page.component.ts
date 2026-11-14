import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ADMIN_SHARED_STYLES } from '../admin-layout.component';
import { AdminMoviesState } from '../data/admin-movies-state';
import { AdminToastService } from '../data/admin-toast.service';

const GENRES = ['Ciencia ficción', 'Acción', 'Terror', 'Animación', 'Suspenso', 'Aventura'];
const RATINGS = ['TP', '+7', '+12', '+16', '+18'];
const STATUS_LABELS: Record<string, string> = {
  PUBLISHED: 'Publicada',
  DRAFT: 'Borrador',
  ARCHIVED: 'Archivada',
};

@Component({
  selector: 'app-admin-movies-page',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="admin-container">
      <div class="page-header">
        <h1 class="page-title">Gestión de Películas</h1>
        <p class="page-description">Administra las películas disponibles para programar funciones.</p>
      </div>

      <div class="admin-grid">
        <section class="card">
          <h2 class="card-title">Agregar Película</h2>

          <form (ngSubmit)="saveMovie()">
            <div class="form-group">
              <label class="form-label" for="new-movie-title">Título de la Película</label>
              <input
                type="text"
                id="new-movie-title"
                class="form-control"
                name="title"
                placeholder="Ej. Interstellar"
                required
                [(ngModel)]="draft.title"
              />
            </div>

            <div class="form-group">
              <label class="form-label" for="new-movie-genre">Género</label>
              <select
                id="new-movie-genre"
                class="form-control"
                name="genre"
                required
                [(ngModel)]="draft.genre"
              >
                <option value="" disabled>Selecciona un género</option>
                @for (genre of genres; track genre) {
                  <option [value]="genre">{{ genre }}</option>
                }
              </select>
            </div>

            <div class="form-group">
              <label class="form-label" for="new-movie-duration">Duración (minutos)</label>
              <input
                type="number"
                id="new-movie-duration"
                class="form-control"
                name="duration"
                placeholder="Ej. 169"
                min="1"
                required
                [(ngModel)]="draft.duration"
              />
            </div>

            <div class="form-group">
              <label class="form-label" for="new-movie-rating">Clasificación (Rating)</label>
              <select
                id="new-movie-rating"
                class="form-control"
                name="classification"
                required
                [(ngModel)]="draft.classification"
              >
                <option value="" disabled>Selecciona una opción</option>
                @for (rating of ratings; track rating) {
                  <option [value]="rating">{{ ratingLabel(rating) }}</option>
                }
              </select>
            </div>

            <div class="form-group">
              <label class="form-label" for="new-movie-synopsis">Sinopsis</label>
              <textarea
                id="new-movie-synopsis"
                class="form-control"
                name="synopsis"
                rows="3"
                placeholder="Escribe un breve resumen de la trama..."
                style="resize: vertical;"
                required
                [(ngModel)]="draft.synopsis"
              ></textarea>
            </div>

            <div class="form-group">
              <label class="form-label" for="new-movie-poster">Enlace del Póster (opcional)</label>
              <input
                type="url"
                id="new-movie-poster"
                class="form-control"
                name="poster"
                placeholder="https://..."
                [(ngModel)]="draft.poster"
              />
            </div>

            <div class="form-group">
              <label class="form-label" for="new-movie-trailer">Enlace del tráiler (opcional)</label>
              <input
                type="url"
                id="new-movie-trailer"
                class="form-control"
                name="trailer"
                placeholder="https://..."
                maxlength="2048"
                [(ngModel)]="draft.trailer"
              />
            </div>

            <button type="submit" class="btn btn-primary btn-full">Guardar Película</button>
          </form>
        </section>

        <section class="card">
          <h2 class="card-title">Películas Registradas</h2>

          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Película</th>
                  <th>Género</th>
                  <th>Duración</th>
                  <th>Clasificación</th>
                  <th>Estado</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                @for (movie of state.movies(); track movie.id) {
                  <tr>
                    <td><strong>{{ movie.title }}</strong></td>
                    <td>{{ movie.genres?.join(' · ') || 'N/A' }}</td>
                    <td>{{ movie.durationMinutes }} min</td>
                    <td>{{ movie.classification || 'N/A' }}</td>
                    <td>{{ statusLabel(movie.status) }}</td>
                    <td>
                      @if (movie.status !== 'ARCHIVED') {
                        <button
                          type="button"
                          class="btn btn-danger btn-compact"
                          (click)="archiveMovie(movie.id)"
                        >
                          Archivar
                        </button>
                      } @else {
                        <span class="empty-cell">—</span>
                      }
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    @switch (state.status()) {
                      @case ('loading') {
                        <td colspan="6" class="empty-cell">Cargando películas…</td>
                      }
                      @case ('error') {
                        <td colspan="6" class="empty-cell">
                          {{ state.error()?.userMessage }}
                          <button type="button" class="btn btn-compact" (click)="state.load()">Reintentar</button>
                        </td>
                      }
                      @default {
                        <td colspan="6" class="empty-cell">No hay películas registradas.</td>
                      }
                    }
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  `,
  styles: [ADMIN_SHARED_STYLES],
})
export class AdminMoviesPageComponent implements OnInit {
  readonly state = inject(AdminMoviesState);
  readonly toasts = inject(AdminToastService);

  readonly genres = GENRES;
  readonly ratings = RATINGS;

  readonly draft = {
    title: '',
    genre: '',
    duration: null as number | null,
    classification: '',
    synopsis: '',
    poster: '',
    trailer: '',
  };

  ngOnInit(): void {
    this.state.load();
  }

  statusLabel(status: string): string {
    return STATUS_LABELS[status] ?? status;
  }

  ratingLabel(rating: string): string {
    const labels: Record<string, string> = {
      TP: 'TP (Todos los públicos)',
      '+7': '+7 (Mayores de 7 años)',
      '+12': '+12 (Mayores de 12 años)',
      '+16': '+16 (Mayores de 16 años)',
      '+18': '+18 (Mayores de 18 años)',
    };
    return labels[rating] ?? rating;
  }

  saveMovie(): void {
    this.state.create({ ...this.draft }).subscribe(result => {
      if (result.ok) {
        this.resetDraft();
        this.toasts.success(result.message);
      } else {
        this.toasts.error(result.message);
      }
    });
  }

  archiveMovie(movieId: string): void {
    this.state.archive(movieId).subscribe(result => {
      if (result.ok) {
        this.toasts.success(result.message);
      } else {
        this.toasts.error(result.message);
      }
    });
  }

  private resetDraft(): void {
    this.draft.title = '';
    this.draft.genre = '';
    this.draft.duration = null;
    this.draft.classification = '';
    this.draft.synopsis = '';
    this.draft.poster = '';
    this.draft.trailer = '';
  }
}
