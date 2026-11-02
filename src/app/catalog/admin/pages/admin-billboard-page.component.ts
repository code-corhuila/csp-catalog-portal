import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ADMIN_SHARED_STYLES } from '../admin-layout.component';
import { AdminMoviesState } from '../data/admin-movies-state';
import { AdminRoomsState } from '../data/admin-rooms-state';
import {
  AdminShowtimesState,
  displayDateTime,
  formatPrice,
  parseDateTimeLocal,
  toDateTimeLocalValue,
} from '../data/admin-showtimes-state';
import { AdminToastService } from '../data/admin-toast.service';

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'Publicada',
  CANCELLED: 'Cancelada',
  COMPLETED: 'Finalizada',
};

@Component({
  selector: 'app-admin-billboard-page',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="admin-container">
      <div class="page-header">
        <h1 class="page-title">Gestión de Cartelera y Funciones</h1>
        <p class="page-description">Programa y administra las funciones disponibles del cine.</p>
      </div>

      <div class="admin-grid">
        <section class="card">
          <h2 class="card-title">Programar Función</h2>

          @if (alertMessage) {
            <div class="alert" role="alert">{{ alertMessage }}</div>
          }

          <form (ngSubmit)="schedule()">
            <div class="form-group">
              <label class="form-label" for="movie-select">Película</label>
              <select
                id="movie-select"
                class="form-control"
                name="movie"
                required
                [ngModel]="selectedMovieId"
                (ngModelChange)="onMovieChange($event)"
              >
                <option value="">Seleccionar película...</option>
                @for (movie of publishedMovies(); track movie.id) {
                  <option [value]="movie.id">{{ movie.title }} ({{ movie.durationMinutes }} min)</option>
                }
              </select>
            </div>

            <div class="form-group">
              <label class="form-label" for="room-select">Sala</label>
              <select id="room-select" class="form-control" name="room" required [(ngModel)]="selectedRoomId">
                <option value="">Seleccionar sala...</option>
                @for (room of rooms.rooms(); track room.id) {
                  <option [value]="room.id">{{ room.name }} ({{ room.capacity ?? room.seats.length }} asientos)</option>
                }
              </select>
            </div>

            <div class="form-group">
              <label class="form-label" for="start-time">Hora de Inicio</label>
              <input
                type="datetime-local"
                id="start-time"
                class="form-control"
                name="startTime"
                required
                [ngModel]="startTime"
                (ngModelChange)="onStartChange($event)"
              />
            </div>

            <div class="form-group">
              <label class="form-label" for="end-time">Hora de Fin</label>
              <input
                type="datetime-local"
                id="end-time"
                class="form-control"
                name="endTime"
                readonly
                aria-readonly="true"
                [ngModel]="endTime"
              />
            </div>

            <div class="form-group">
              <label class="form-label" for="showtime-price">Precio (COP)</label>
              <input
                type="number"
                id="showtime-price"
                class="form-control"
                name="price"
                placeholder="Ej. 15000"
                min="0"
                required
                [(ngModel)]="price"
              />
            </div>

            <button type="submit" class="btn btn-primary btn-full">Publicar Función</button>
          </form>
        </section>

        <section class="card">
          <h2 class="card-title">Funciones Programadas</h2>

          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Película</th>
                  <th>Sala</th>
                  <th>Inicio</th>
                  <th>Fin</th>
                  <th>Precio</th>
                  <th>Estado</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                @for (showtime of state.showtimes(); track showtime.id) {
                  <tr>
                    <td><strong>{{ movieTitle(showtime.movieId) }}</strong></td>
                    <td>{{ roomName(showtime.roomId) }}</td>
                    <td>{{ show(showtime.startsAt) }}</td>
                    <td>{{ show(showtime.endsAt) }}</td>
                    <td>{{ formatPrice(showtime.priceCents) }}</td>
                    <td>
                      <span class="status-tag">{{ statusLabel(showtime.status) }}</span>
                    </td>
                    <td>
                      @if (showtime.status === 'SCHEDULED') {
                        <button
                          type="button"
                          class="btn btn-danger btn-compact"
                          (click)="cancelShowtime(showtime.id)"
                        >
                          Cancelar
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
                        <td colspan="7" class="empty-cell">Cargando funciones…</td>
                      }
                      @case ('error') {
                        <td colspan="7" class="empty-cell">
                          {{ state.error()?.userMessage }}
                          <button type="button" class="btn btn-compact" (click)="state.load()">Reintentar</button>
                        </td>
                      }
                      @default {
                        <td colspan="7" class="empty-cell">No hay funciones programadas.</td>
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
export class AdminBillboardPageComponent implements OnInit {
  readonly state = inject(AdminShowtimesState);
  readonly movies = inject(AdminMoviesState);
  readonly rooms = inject(AdminRoomsState);
  readonly toasts = inject(AdminToastService);

  readonly formatPrice = formatPrice;
  readonly show = displayDateTime;

  selectedMovieId = '';
  selectedRoomId = '';
  startTime = '';
  endTime = '';
  price: number | null = null;
  alertMessage = '';

  ngOnInit(): void {
    this.movies.load();
    this.rooms.load();
    this.state.load();
  }

  /** The service refuses a showtime for a movie that is not published. */
  publishedMovies() {
    return this.movies.movies().filter((movie) => movie.status === 'PUBLISHED');
  }

  movieTitle(movieId: string): string {
    return this.movies.movies().find((movie) => movie.id === movieId)?.title ?? '—';
  }

  roomName(roomId: string): string {
    return this.rooms.rooms().find((room) => room.id === roomId)?.name ?? '—';
  }

  statusLabel(status: string): string {
    return STATUS_LABELS[status] ?? status;
  }

  onMovieChange(value: string): void {
    this.selectedMovieId = value;
    this.recalculateEndTime();
  }

  onStartChange(value: string): void {
    this.startTime = value;
    this.recalculateEndTime();
  }

  recalculateEndTime(): void {
    const duration = this.movies.movies().find((movie) => movie.id === this.selectedMovieId)?.durationMinutes ?? 0;
    const start = parseDateTimeLocal(this.startTime);
    this.endTime =
      duration > 0 && !Number.isNaN(start) ? toDateTimeLocalValue(start + duration * 60_000) : '';
  }

  schedule(): void {
    this.state
      .create({
        movieId: this.selectedMovieId,
        roomId: this.selectedRoomId,
        startsAt: this.startTime,
        endsAt: this.endTime,
        price: this.price,
      })
      .subscribe((result) => {
        if (result.ok) {
          this.alertMessage = '';
          this.resetForm();
          this.toasts.success(result.message);
          return;
        }

        this.alertMessage = result.conflict ? result.message : '';
        this.toasts.error(result.conflict ? 'Conflicto detectado en la programación.' : result.message);
      });
  }

  cancelShowtime(showtimeId: string): void {
    this.state.cancel(showtimeId).subscribe((result) => {
      if (result.ok) {
        this.toasts.success(result.message);
      } else {
        this.toasts.error(result.message);
      }
    });
  }

  private resetForm(): void {
    this.selectedMovieId = '';
    this.selectedRoomId = '';
    this.startTime = '';
    this.endTime = '';
    this.price = null;
  }
}
