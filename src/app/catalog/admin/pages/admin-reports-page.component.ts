import { Component, inject } from '@angular/core';
import { ADMIN_SHARED_STYLES } from '../admin-layout.component';
import { AdminCatalogStateService } from '../data/admin-catalog-state.service';

@Component({
  selector: 'app-admin-reports-page',
  standalone: true,
  template: `
    <div class="admin-container">
      <div class="page-header">
        <h1 class="page-title">Reportes</h1>
        <p class="page-description">Consulta las métricas generales del cine.</p>
      </div>

      <div class="report-grid">
        <div class="report-card">
          <div class="report-label">Funciones programadas</div>
          <div class="report-value" id="report-showtimes">{{ state.metrics().showtimes }}</div>
        </div>

        <div class="report-card">
          <div class="report-label">Salas registradas</div>
          <div class="report-value" id="report-rooms">{{ state.metrics().rooms }}</div>
        </div>

        <div class="report-card">
          <div class="report-label">Películas registradas</div>
          <div class="report-value" id="report-movies">{{ state.metrics().movies }}</div>
        </div>
      </div>

      <section class="card">
        <h2 class="card-title">Ocupación por Sala</h2>

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Sala</th>
                <th>Capacidad</th>
                <th>Funciones</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              @for (room of state.occupancy(); track room.id) {
                <tr>
                  <td><strong>{{ room.name }}</strong></td>
                  <td>{{ room.capacityLabel }}</td>
                  <td>{{ room.showtimes }}</td>
                  <td>
                    <span class="status-tag">{{ room.status }}</span>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="4" class="empty-cell">No hay salas registradas.</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>

      <section class="card">
        <h2 class="card-title">Resumen de Funciones</h2>

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Película</th>
                <th>Sala</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              @for (row of state.summary(); track row.id) {
                <tr>
                  <td><strong>{{ row.movie }}</strong></td>
                  <td>{{ row.room }}</td>
                  <td>
                    <span class="status-tag">{{ row.status }}</span>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="3" class="empty-cell">No hay funciones registradas.</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `,
  styles: [
    ADMIN_SHARED_STYLES,
    `
      .report-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 1.5rem;
        margin-bottom: 2rem;
      }

      .report-card {
        background-color: var(--admin-surface);
        border: 1px solid var(--admin-border);
        border-radius: var(--admin-radius-lg);
        padding: 1.5rem;
      }

      .report-label {
        color: var(--admin-text-secondary);
        font-size: 0.875rem;
        margin-bottom: 0.4rem;
      }

      .report-value {
        font-size: 1.8rem;
        font-weight: 700;
        color: var(--admin-cyan);
      }

      @media (max-width: 800px) {
        .report-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class AdminReportsPageComponent {
  readonly state = inject(AdminCatalogStateService);
}
