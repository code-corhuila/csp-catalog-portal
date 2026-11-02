import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ADMIN_SHARED_STYLES } from '../admin-layout.component';
import { AdminRoomsState } from '../data/admin-rooms-state';
import { AdminToastService } from '../data/admin-toast.service';

@Component({
  selector: 'app-admin-rooms-page',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="admin-container">
      <div class="page-header">
        <h1 class="page-title">Configuración de Salas</h1>
        <p class="page-description">Administra las salas y su capacidad de asientos.</p>
      </div>

      <div class="admin-grid">
        <section class="card">
          <h2 class="card-title">Crear Nueva Sala</h2>

          <form (ngSubmit)="saveRoom()">
            <div class="form-group">
              <label class="form-label" for="new-room-name">Nombre o Número de Sala</label>
              <input
                type="text"
                id="new-room-name"
                class="form-control"
                name="name"
                placeholder="Ej. Sala 01 - IMAX"
                required
                [(ngModel)]="draft.name"
              />
            </div>

            <div class="form-group">
              <label class="form-label" for="new-room-capacity">Capacidad</label>
              <input
                type="number"
                id="new-room-capacity"
                class="form-control"
                name="capacity"
                placeholder="Ej. 120"
                min="1"
                required
                [(ngModel)]="draft.capacity"
              />
            </div>

            <button type="submit" class="btn btn-primary btn-full">Guardar Sala</button>
          </form>
        </section>

        <section class="card">
          <h2 class="card-title">Salas Registradas</h2>

          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Sala</th>
                  <th>Capacidad</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                @for (room of state.rooms(); track room.id) {
                  <tr>
                    <td><strong>{{ room.name }}</strong></td>
                    <td>{{ room.capacity ?? room.seats.length }} asientos</td>
                    <td>
                      <button
                        type="button"
                        class="btn btn-danger btn-compact"
                        (click)="archiveRoom(room.id)"
                      >
                        Archivar
                      </button>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    @switch (state.status()) {
                      @case ('loading') {
                        <td colspan="3" class="empty-cell">Cargando salas…</td>
                      }
                      @case ('error') {
                        <td colspan="3" class="empty-cell">
                          {{ state.error()?.userMessage }}
                          <button type="button" class="btn btn-compact" (click)="state.load()">Reintentar</button>
                        </td>
                      }
                      @default {
                        <td colspan="3" class="empty-cell">No hay salas registradas.</td>
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
export class AdminRoomsPageComponent implements OnInit {
  readonly state = inject(AdminRoomsState);
  readonly toasts = inject(AdminToastService);

  readonly draft = {
    name: '',
    capacity: null as number | null,
  };

  ngOnInit(): void {
    this.state.load();
  }

  saveRoom(): void {
    this.state.create({ ...this.draft }).subscribe(result => {
      if (result.ok) {
        this.draft.name = '';
        this.draft.capacity = null;
        this.toasts.success(result.message);
      } else {
        this.toasts.error(result.message);
      }
    });
  }

  archiveRoom(roomId: string): void {
    this.state.archive(roomId).subscribe(result => {
      if (result.ok) {
        this.toasts.success(result.message);
      } else {
        this.toasts.error(result.message);
      }
    });
  }
}
