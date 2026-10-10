import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ADMIN_SHARED_STYLES } from '../admin-layout.component';
import { AdminCatalogStateService } from '../data/admin-catalog-state.service';
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
                    <td>{{ room.seatLabels.length }} asientos</td>
                    <td>
                      <button
                        type="button"
                        class="btn btn-danger btn-compact"
                        (click)="removeRoom(room.id)"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="3" class="empty-cell">No hay salas registradas.</td>
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
export class AdminRoomsPageComponent {
  readonly state = inject(AdminCatalogStateService);
  readonly toasts = inject(AdminToastService);

  readonly draft = {
    name: '',
    capacity: null as number | null,
  };

  saveRoom(): void {
    const result = this.state.addRoom(this.draft.name, this.draft.capacity ?? 0);

    if (result.ok) {
      this.draft.name = '';
      this.draft.capacity = null;
      this.toasts.success(result.message);
    } else {
      this.toasts.error(result.message);
    }
  }

  removeRoom(roomId: string): void {
    const result = this.state.removeRoom(roomId);
    if (result.ok) {
      this.toasts.success(result.message);
    } else {
      this.toasts.error(result.message);
    }
  }
}
