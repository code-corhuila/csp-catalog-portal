import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterOutlet, RouterLink } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  template: `
    @if (!isAdminRoute()) {
      <header class="site-header" aria-label="Navegación CineSync">
        <a class="brand" routerLink="/" aria-label="Inicio CineSync">
          <img class="brand-logo" src="/assets/logos/icon-csp.svg" alt="CineSync">
          <span class="brand-name">Cine<span>Sync</span></span>
        </a>
      </header>
    }
    <router-outlet />
  `,
  styles: [`
    .site-header {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      padding: 16px 32px;
      background: #070913;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      box-sizing: border-box;
    }
    .brand {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
      color: #F1F5F9;
    }
    .brand-logo {
      width: 38px;
      height: 38px;
      object-fit: contain;
    }
    .brand-name {
      font-size: 1.2rem;
      font-weight: 800;
    }
    .brand-name span {
      color: #38BDF8;
    }
  `],
})
export class AppComponent {
  // Root component - only mounted when portal runs standalone
  // Inside the shell, the shell owns the header and this component is not rendered
  private readonly router = inject(Router);
  private readonly navigation = toSignal(this.router.events, { initialValue: undefined });

  /**
   * The administration module renders its own layout header
   * (AdminLayoutComponent: brand, Admin badge and section nav), so the
   * standalone site header must step aside on /admin/* to avoid stacking both.
   */
  readonly isAdminRoute = computed(() => {
    this.navigation();
    return this.router.url === '/admin' || this.router.url.startsWith('/admin/');
  });
}
