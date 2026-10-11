import { Routes } from '@angular/router';
export const CATALOG_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/billboard-page.component').then(m => m.BillboardPageComponent),
  },
  {
    path: 'movies',
    pathMatch: 'full',
    redirectTo: '',
  },
  {
    path: 'movies/:movieId',
    loadComponent: () => import('./pages/movie-detail-page.component').then(m => m.MovieDetailPageComponent),
  },
  {
    path: 'showtimes/:showtimeId/seats',
    loadComponent: () => import('./pages/seat-map-page.component').then(m => m.SeatMapPageComponent),
  },
];
