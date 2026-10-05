import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SyntheticCatalogDataService } from '../data/synthetic-catalog-data.service';

@Component({
  selector: 'app-movie-detail-page',
  standalone: true,
  imports: [DatePipe, RouterLink],
  template: `
    @if (movie; as currentMovie) {
      <main>
        <a routerLink="/">Back to billboard</a>
        <h2>{{ currentMovie.title }}</h2>
        <p>{{ currentMovie.durationMinutes }} minutes · {{ currentMovie.genres?.join(', ') }}</p>
        <h3>Showtimes</h3>
        <ul>
          @for (showtime of showtimes; track showtime.id) {
            <li>
              <a [routerLink]="['/showtimes', showtime.id, 'seats']">
                {{ showtime.startsAt | date: 'medium' }}
              </a>
            </li>
          }
        </ul>
      </main>
    } @else {
      <p role="alert">Movie not found.</p>
    }
  `,
})
export class MovieDetailPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly catalog = inject(SyntheticCatalogDataService);
  readonly movie = this.catalog.getMovie(this.route.snapshot.paramMap.get('movieId') ?? '');
  readonly showtimes = this.catalog.getShowtimes(this.movie?.id);
}
