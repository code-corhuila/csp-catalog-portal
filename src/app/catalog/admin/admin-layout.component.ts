import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AdminToastService } from './data/admin-toast.service';

/**
 * Shared visual language of the administration screens, straight from
 * `12-ux-ui/mockup/index-admin.html` and the tokens of `12-ux-ui/design-system.md`.
 * Exported so every admin page can compose the same cards, forms, tables and
 * badges without duplicating the stylesheet.
 */
export const ADMIN_SHARED_STYLES = `
  :host {
    --admin-brand: #8B5CF6;
    --admin-brand-hover: #A78BFA;
    --admin-cyan: #38BDF8;
    --admin-bg: #0B0D17;
    --admin-surface: #13172A;
    --admin-surface-hover: #1E293B;
    --admin-border: #1E293B;
    --admin-glow: rgba(139, 92, 246, 0.4);
    --admin-text: #F1F5F9;
    --admin-text-secondary: #94A3B8;
    --admin-text-muted: #64748B;
    --admin-success: #10B981;
    --admin-error: #EF4444;
    --admin-radius-sm: 4px;
    --admin-radius-md: 8px;
    --admin-radius-lg: 12px;

    display: block;
    width: 100%;
    color: var(--admin-text);
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }

  .admin-container {
    max-width: 1280px;
    width: 100%;
    margin: 2rem auto;
    padding: 0 1.5rem;
  }

  .page-header {
    margin-bottom: 2rem;
  }

  .page-title {
    font-size: 1.563rem;
    font-weight: 700;
    margin: 0;
  }

  .page-description {
    color: var(--admin-text-secondary);
    margin-top: 0.4rem;
    font-size: 0.9rem;
  }

  .admin-grid {
    display: grid;
    grid-template-columns: 380px 1fr;
    gap: 2rem;
  }

  @media (max-width: 900px) {
    .admin-grid {
      grid-template-columns: 1fr;
    }
  }

  .card {
    background-color: var(--admin-surface);
    border: 1px solid var(--admin-border);
    border-radius: var(--admin-radius-lg);
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    min-width: 0;
  }

  .card-title {
    font-size: 1.25rem;
    margin-bottom: 1.25rem;
    color: var(--admin-text);
    border-bottom: 1px solid var(--admin-border);
    padding-bottom: 0.75rem;
  }

  .form-group {
    margin-bottom: 1.25rem;
  }

  .form-label {
    display: block;
    font-size: 0.875rem;
    color: var(--admin-text-secondary);
    margin-bottom: 0.5rem;
  }

  .form-control {
    width: 100%;
    padding: 0.75rem;
    background-color: var(--admin-bg);
    border: 1px solid var(--admin-border);
    border-radius: var(--admin-radius-md);
    color: var(--admin-text);
    font-family: inherit;
    font-size: 0.875rem;
  }

  .form-control:focus {
    outline: none;
    border-color: var(--admin-brand);
    box-shadow: 0 0 8px var(--admin-glow);
  }

  .form-control:read-only {
    opacity: 0.7;
    cursor: not-allowed;
  }

  select.form-control option {
    background-color: var(--admin-surface);
    color: var(--admin-text);
  }

  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.75rem 1.25rem;
    font-size: 0.875rem;
    font-weight: 600;
    border-radius: var(--admin-radius-md);
    border: none;
    cursor: pointer;
    transition: all 0.2s;
    font-family: inherit;
  }

  .btn-primary {
    background-color: var(--admin-brand);
    color: #FFFFFF;
    box-shadow: 0 0 15px var(--admin-glow);
  }

  .btn-primary:hover {
    background-color: var(--admin-brand-hover);
  }

  .btn-danger {
    background-color: rgba(239, 68, 68, 0.15);
    color: var(--admin-error);
    border: 1px solid var(--admin-error);
  }

  .btn-danger:hover {
    background-color: rgba(239, 68, 68, 0.3);
  }

  .btn-full {
    width: 100%;
  }

  .btn-compact {
    padding: 0.3rem 0.6rem;
    font-size: 0.75rem;
  }

  .btn-link {
    background: none;
    border: none;
    padding: 0;
    color: var(--admin-cyan);
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    text-decoration: none;
  }

  .btn-link:hover {
    text-decoration: underline;
  }

  .table-responsive {
    overflow-x: auto;
  }

  .data-table {
    width: 100%;
    border-collapse: collapse;
    text-align: left;
    font-size: 0.875rem;
  }

  .data-table th {
    background-color: var(--admin-surface-hover);
    color: var(--admin-text-secondary);
    padding: 0.85rem;
    border-bottom: 1px solid var(--admin-border);
    white-space: nowrap;
  }

  .data-table td {
    padding: 1rem 0.85rem;
    border-bottom: 1px solid var(--admin-border);
    color: var(--admin-text);
  }

  .data-table tr:hover {
    background-color: rgba(30, 41, 59, 0.5);
  }

  .status-tag {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    border-radius: var(--admin-radius-sm);
    font-size: 0.75rem;
    font-weight: 600;
    background-color: rgba(16, 185, 129, 0.15);
    color: var(--admin-success);
    white-space: nowrap;
  }

  .alert {
    padding: 0.75rem 1rem;
    border-radius: var(--admin-radius-md);
    font-size: 0.875rem;
    margin-bottom: 1rem;
    background-color: rgba(239, 68, 68, 0.15);
    border: 1px solid var(--admin-error);
    color: var(--admin-error);
  }

  .empty-cell {
    color: var(--admin-text-muted);
  }
`;

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="admin-shell">
      <div class="admin-subnav">
        <span class="admin-badge">Admin</span>
        <nav aria-label="Administración del catálogo">
          <a class="nav-link" routerLink="/admin/billboard" routerLinkActive="active" ariaCurrentWhenActive="page">
            Cartelera y Funciones
          </a>
          <a class="nav-link" routerLink="/admin/movies" routerLinkActive="active" ariaCurrentWhenActive="page">
            Películas
          </a>
          <a class="nav-link" routerLink="/admin/rooms" routerLinkActive="active" ariaCurrentWhenActive="page">
            Salas
          </a>
          <span class="nav-link nav-link--disabled" aria-disabled="true" title="Reportes estará disponible en una próxima iteración">
            Reportes
          </span>
        </nav>
      </div>

      <router-outlet />

      <div class="toast-container" role="status" aria-live="polite">
        @for (toast of toasts.toasts(); track toast.id) {
          <div class="toast" [class.toast-success]="toast.type === 'success'" [class.toast-error]="toast.type === 'error'">
            {{ toast.message }}
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    ADMIN_SHARED_STYLES,
    `
      :host {
        display: block;
        width: 100%;
      }

      .admin-subnav {
        max-width: 1280px;
        width: 100%;
        margin: 2rem auto 0;
        padding: 0.75rem 1.5rem;
        box-sizing: border-box;
        display: flex;
        align-items: center;
        gap: 1.5rem;
        flex-wrap: wrap;
        background-color: var(--admin-surface);
        border: 1px solid var(--admin-border);
        border-radius: var(--admin-radius-lg);
      }

      .admin-badge {
        background-color: rgba(139, 92, 246, 0.2);
        color: var(--admin-brand);
        border: 1px solid var(--admin-brand);
        padding: 0.2rem 0.6rem;
        border-radius: var(--admin-radius-sm);
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        font-weight: 700;
      }

      nav {
        display: flex;
        gap: 1.5rem;
        align-items: center;
        flex-wrap: wrap;
      }

      .nav-link {
        color: var(--admin-text-secondary);
        font-size: 0.875rem;
        transition: color 0.2s;
        white-space: nowrap;
        text-decoration: none;
      }

      .nav-link:hover,
      .nav-link.active {
        color: var(--admin-cyan);
        font-weight: 700;
      }

      .nav-link--disabled {
        color: var(--admin-text-muted);
        cursor: not-allowed;
      }

      .toast-container {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 1000;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .toast {
        min-width: 280px;
        padding: 14px 18px;
        border-radius: var(--admin-radius-md);
        background: var(--admin-surface);
        border: 1px solid var(--admin-glow);
        color: var(--admin-text);
        box-shadow: 0 5px 20px rgba(0, 0, 0, 0.5);
        font-size: 0.875rem;
      }

      .toast-success {
        border-left: 4px solid var(--admin-success);
      }

      .toast-error {
        border-left: 4px solid var(--admin-error);
      }

      @media (max-width: 900px) {
        .admin-subnav {
          gap: 0.75rem 1rem;
          justify-content: center;
        }

        nav {
          gap: 0.75rem 1rem;
          justify-content: center;
        }
      }
    `,
  ],
})
export class AdminLayoutComponent {
  readonly toasts = inject(AdminToastService);
}
