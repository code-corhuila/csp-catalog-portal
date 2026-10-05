import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Movie } from '../model/movie';
import { SyntheticCatalogDataService } from '../data/synthetic-catalog-data.service';

@Component({
  selector: 'app-catalog-billboard-page',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main>
      <h2>Cartelera</h2>
      @for (movie of movies; track movie.id) {
        <article>
          <h3>{{ movie.title }}</h3>
          <p>{{ movie.durationMinutes }} minutes · {{ movie.genres?.join(', ') }}</p>
          <a [routerLink]="['/movies', movie.id]">View details and showtimes</a>
          <ul>
            @for (showtime of showtimes(movie.id); track showtime.id) {
              <li><a [routerLink]="['/showtimes', showtime.id, 'seats']">{{ showtime.startsAt }}</a></li>
            }
          </ul>
        </article>
      } @empty {
        <p>No movies are currently published.</p>
      }
    </main>
  `,
})
export class BillboardPageComponent {
  private readonly catalog = inject(SyntheticCatalogDataService);
  readonly movies: Movie[] = this.catalog.getPublishedMovies();

  showtimes(movieId: string) {
    return this.catalog.getShowtimes(movieId);
  }
}
