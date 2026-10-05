import { Routes } from '@angular/router';
export const CATALOG_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/billboard-page.component').then(m => m.BillboardPageComponent),
  },
];
