import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { CATALOG_ROUTES } from './catalog/catalog.routes';

/**
 * Standalone runs only. Deliberately NO provideHttpClient(): inside the shell the
 * portal uses the shell's client. To exercise the portal alone, run it through
 * the shell rather than giving it a client of its own.
 *
 * The administration entry is registered here and not in CATALOG_ROUTES: the shell
 * mounts ADMIN_ROUTES from './admin-routes' with its own matcher and role guard, and
 * CATALOG_ROUTES must keep covering only the public screens.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter([
      {
        path: 'admin',
        loadChildren: () => import('./catalog/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
      },
      ...CATALOG_ROUTES,
    ]),
  ],
};
