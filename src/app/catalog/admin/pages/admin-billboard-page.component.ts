import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ADMIN_SHARED_STYLES } from '../admin-layout.component';
import {
  AdminCatalogStateService,
  parseDateTimeLocal,
  toDateTimeLocalValue,
} from '../data/admin-catalog-state.service';
import { AdminToastService } from '../data/admin-toast.service';

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
                @for (movie of state.movies(); track movie.id) {
                  <option [value]="movie.id">{{ movie.title }} ({{ movie.duration }} min)</option>
                }
              </select>
            </div>

            <div class="form-group">
              <label class="form-label" for="room-select">Sala</label>
              <select id="room-select" class="form-control" name="room" required [(ngModel)]="selectedRoomId">
                <option value="">Seleccionar sala...</option>
                @for (room of state.rooms(); track room.id) {
                  <option [value]="room.id">{{ room.name }} ({{ room.seatLabels.length }} asientos)</option>
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
                  <th>Estado</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                @for (showtime of state.showtimes(); track showtime.id) {
                  <tr>
                    <td><strong>{{ state.movieTitle(showtime.movieId) }}</strong></td>
                    <td>{{ state.roomName(showtime.roomId) }}</td>
                    <td>{{ state.displayDateTime(showtime.startsAt) }}</td>
                    <td>{{ state.displayDateTime(showtime.endsAt) }}</td>
                    <td>
                      <span class="status-tag">{{ state.statusLabel(showtime.status) }}</span>
                    </td>
                    <td>
                      <button
                        type="button"
                        class="btn btn-danger btn-compact"
                        (click)="removeShowtime(showtime.id)"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="6" class="empty-cell">No hay funciones programadas.</td>
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
export class AdminBillboardPageComponent {
  readonly state = inject(AdminCatalogStateService);
  readonly toasts = inject(AdminToastService);

  selectedMovieId = '';
  selectedRoomId = '';
  startTime = '';
  endTime = '';
  alertMessage = '';

  onMovieChange(value: string): void {
    this.selectedMovieId = value;
    this.recalculateEndTime();
  }

  onStartChange(value: string): void {
    this.startTime = value;
    this.recalculateEndTime();
  }

  recalculateEndTime(): void {
    const duration = this.state.durationOf(this.selectedMovieId);
    const start = parseDateTimeLocal(this.startTime);
    this.endTime =
      duration > 0 && !Number.isNaN(start) ? toDateTimeLocalValue(start + duration * 60_000) : '';
  }

  schedule(): void {
    const result = this.state.scheduleShowtime(this.selectedMovieId, this.selectedRoomId, this.startTime);

    if (result.ok) {
      this.alertMessage = '';
      this.resetForm();
      this.toasts.success(result.message);
      return;
    }

    this.alertMessage = result.conflict ? result.message : '';
    this.toasts.error(result.conflict ? 'Conflicto detectado en la programación.' : result.message);
  }

  removeShowtime(showtimeId: string): void {
    const result = this.state.removeShowtime(showtimeId);
    if (result.ok) {
      this.toasts.success(result.message);
    } else {
      this.toasts.error(result.message);
    }
  }

  private resetForm(): void {
    this.selectedMovieId = '';
    this.selectedRoomId = '';
    this.startTime = '';
    this.endTime = '';
  }
}
