import { Routes } from '@angular/router';
import { AdminLayoutComponent } from './admin-layout.component';

/**
 * Administration entry point exposed to the shell as `./admin-routes`
 * (see `federation.config.js` and `csp-front/src/app/app.routes.ts`).
 *
 * The shell's `catalogAdminMatcher` consumes only `admin`, so this file declares
 * the area as its own first segment: `billboard`, `movies`, `rooms`. `reports` is
 * the mock-only screen of the navigation map and is reachable when the portal runs
 * standalone, where `app.config.ts` mounts this array under `/admin`.
 */
export const ADMIN_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'billboard' },
  {
    path: '',
    component: AdminLayoutComponent,
    children: [
      {
        path: 'billboard',
        title: 'Administración · Cartelera y Funciones',
        loadComponent: () =>
          import('./pages/admin-billboard-page.component').then((m) => m.AdminBillboardPageComponent),
      },
      {
        path: 'movies',
        title: 'Administración · Películas',
        loadComponent: () =>
          import('./pages/admin-movies-page.component').then((m) => m.AdminMoviesPageComponent),
      },
      {
        path: 'rooms',
        title: 'Administración · Salas',
        loadComponent: () =>
          import('./pages/admin-rooms-page.component').then((m) => m.AdminRoomsPageComponent),
      },
      {
        path: 'reports',
        title: 'Administración · Reportes',
        loadComponent: () =>
          import('./pages/admin-reports-page.component').then((m) => m.AdminReportsPageComponent),
      },
      { path: '**', redirectTo: 'billboard' },
    ],
  },
];
