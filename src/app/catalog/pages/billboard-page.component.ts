import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BillboardSearchState } from '../data/billboard-search-state';
import { BillboardMovie } from '../model/billboard';

@Component({
  selector: 'app-billboard-page',
  standalone: true,
  imports: [CommonModule, DatePipe, FormsModule, RouterLink],
  providers: [BillboardSearchState],
  template: `
    <main class="content-wrapper">
        <section class="hero-banner">
          <span class="hero-badge">TU CINE, TU EXPERIENCIA</span>
          <h1 class="hero-title">Vive el cine <span class="highlight">como nunca.</span></h1>
          <p class="hero-subtitle">
            Descubre todas nuestras funciones disponibles, consulta horarios, selecciona tus asientos y disfruta una experiencia cinematográfica digital.
          </p>
        </section>

        <form class="filter-bar" (ngSubmit)="submit()">
          <div class="search-input">
            <input type="text" name="q" placeholder="Buscar por título o sinopsis..." [(ngModel)]="q" />
          </div>
          <div class="genre-select">
            <input type="text" name="genre" list="genre-suggestions" placeholder="Género" [(ngModel)]="genre" />
            <datalist id="genre-suggestions">
              @for (suggestion of state.genreSuggestions(); track suggestion) {
                <option [value]="suggestion"></option>
              }
            </datalist>
          </div>
          <div class="duration-input">
            <input type="number" name="durationMax" min="1" placeholder="Duración máx. (min)" [(ngModel)]="durationMax" />
          </div>
          <button type="submit" class="search-button">Buscar</button>
        </form>

        @switch (state.status()) {
          @case ('loading') {
            <p class="status-message" role="status">Cargando cartelera…</p>
          }
          @case ('error') {
            <div class="error-state" role="alert">
              <p>{{ state.error()?.userMessage }}</p>
              <button type="button" class="retry" (click)="state.retry()">Reintentar</button>
            </div>
          }
          @case ('empty') {
            <p class="empty-state">No se encontraron películas que coincidan con los criterios de búsqueda.</p>
          }
        }

        <section class="movie-grid" aria-label="Películas en cartelera">
          @for (movie of state.movies(); track movie.id) {
            <article class="movie-card">
              <div
                class="poster"
                [style.background-image]="movie.posterUrl ? 'url(' + movie.posterUrl + ')' : ''"
                [routerLink]="getMovieRoute(movie)"
              >
                <div class="poster-overlay">
                  <span class="poster-mark">CS</span>
                </div>
              </div>

              <div class="movie-info">
                <h3 class="movie-title" [routerLink]="getMovieRoute(movie)">{{ movie.title }}</h3>
                <p class="movie-genre">{{ subtitle(movie) }}</p>
                <p class="movie-description">{{ movie.synopsis }}</p>

                <div class="showtime-list">
                  @if (state.showtimes().get(movie.id); as showtimes) {
                    @for (showtime of showtimes; track showtime.id) {
                      <a class="showtime-link" [routerLink]="['/booking/showtime', showtime.id]">
                        {{ showtime.startsAt | date: 'MMM d, h:mm a' }}
                      </a>
                    } @empty {
                      <span class="showtime-note">Sin funciones próximas</span>
                    }
                  } @else if (state.showtimesFailed()) {
                    <span class="showtime-note">No se pudieron cargar las funciones</span>
                  } @else {
                    <span class="showtime-note">Cargando funciones…</span>
                  }
                </div>

                <a class="primary-action" [routerLink]="getMovieRoute(movie)">
                  Ver película
                </a>
              </div>
            </article>
          }
        </section>

        @if (state.meta(); as meta) {
          @if (meta.totalPages > 1) {
            <nav class="pagination" aria-label="Paginación">
              <button type="button" class="previous" [disabled]="meta.page <= 1" (click)="state.goToPage(meta.page - 1)">Anterior</button>
              <span>Página {{ meta.page }} de {{ meta.totalPages }}</span>
              <button type="button" class="next" [disabled]="meta.page >= meta.totalPages" (click)="state.goToPage(meta.page + 1)">Siguiente</button>
            </nav>
          }
        }
      </main>
  `,
  styles: [`
    :host {
      --brand: #8B5CF6;
      --brand-hover: #A78BFA;
      --cyan: #38BDF8;
      --surface: #13172A;
      --border: rgba(255, 255, 255, 0.08);
      --text: #F1F5F9;
      --muted: #94A3B8;
      display: block;
      width: 100%;
      color: var(--text);
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    .content-wrapper { max-width: 1400px; width: 100%; margin: 0 auto; padding: 32px 24px 64px; box-sizing: border-box; }
    .hero-banner { background: linear-gradient(180deg, rgba(139, 92, 246, 0.12) 0%, rgba(11, 13, 23, 0) 100%); border: 1px solid rgba(139, 92, 246, 0.2); border-radius: 16px; padding: 48px 32px; margin-bottom: 28px; }
    .hero-badge { display: inline-block; background: rgba(139, 92, 246, 0.15); color: #C084FC; border: 1px solid rgba(139, 92, 246, 0.3); padding: 4px 12px; border-radius: 20px; font-size: 0.72rem; font-weight: 800; margin-bottom: 16px; }
    .hero-title { font-size: clamp(2.2rem, 4vw, 3.2rem); font-weight: 900; margin: 0 0 12px 0; }
    .highlight { background: linear-gradient(135deg, #A855F7, #6366F1); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .hero-subtitle { color: var(--muted); max-width: 620px; font-size: 0.98rem; margin: 0; }
    
    .filter-bar { display: flex; gap: 16px; margin-bottom: 32px; background: var(--surface); padding: 10px; border-radius: 12px; border: 1px solid var(--border); }
    .search-input { flex: 1; }
    .search-input input, .genre-select input, .duration-input input { width: 100%; background: var(--background); border: 1px solid rgba(255, 255, 255, 0.1); color: var(--text); padding: 10px 14px; border-radius: 8px; font-size: 0.9rem; box-sizing: border-box; outline: none; }
    .search-button, .retry, .pagination button { background: rgba(139, 92, 246, 0.15); color: #C084FC; border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 8px; font-weight: 700; padding: 10px 16px; cursor: pointer; }
    .pagination button:disabled { opacity: 0.4; cursor: default; }
    .pagination { display: flex; gap: 16px; align-items: center; justify-content: center; margin-top: 32px; color: var(--muted); }
    .status-message, .showtime-note { color: var(--muted); font-size: 0.85rem; }
    .status-message { text-align: center; padding: 24px 0; }
    .error-state { color: var(--text); text-align: center; padding: 32px 0; }

    .movie-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 24px; }
    .movie-card { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; overflow: hidden; display: flex; flex-direction: column; transition: transform 0.2s, border-color 0.2s; }
    .movie-card:hover { transform: translateY(-4px); border-color: rgba(139, 92, 246, 0.5); }

    /* Contenedor de Portada con Imagen */
    .poster {
      height: 240px;
      background-size: cover;
      background-position: center;
      position: relative;
      cursor: pointer;
    }

    .poster-overlay {
      width: 100%;
      height: 100%;
      background: linear-gradient(180deg, rgba(11, 13, 23, 0.2) 0%, rgba(19, 23, 42, 0.85) 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }

    .poster-rating {
      position: absolute;
      top: 12px;
      right: 12px;
      background: rgba(11, 13, 23, 0.85);
      color: #FBBF24;
      padding: 4px 8px;
      border-radius: 6px;
      font-weight: 800;
      font-size: 0.78rem;
    }

    .poster-mark { color: rgba(255, 255, 255, 0.2); font-size: 4rem; font-weight: 900; }

    .movie-info { padding: 18px; display: flex; flex-direction: column; flex: 1; }
    .movie-title { font-size: 1.15rem; font-weight: 700; margin: 0 0 4px 0; cursor: pointer; }
    .movie-genre { color: var(--cyan); font-size: 0.82rem; font-weight: 700; margin: 0 0 10px 0; }
    .movie-description { color: var(--muted); font-size: 0.85rem; line-height: 1.45; margin: 0 0 16px 0; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }

    .showtime-list { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
    .showtime-link { background: transparent; border: 1px solid var(--cyan); border-radius: 6px; color: var(--cyan); font-size: 0.8rem; font-weight: 700; padding: 6px 10px; text-decoration: none; transition: background 0.2s, color 0.2s; }
    .showtime-link:hover { background: var(--cyan); color: #071018; }

    .primary-action { background: rgba(139, 92, 246, 0.15); color: #C084FC; border: 1px solid rgba(139, 92, 246, 0.3); text-align: center; border-radius: 8px; font-weight: 700; padding: 10px 12px; text-decoration: none; font-size: 0.88rem; margin-top: auto; display: block; transition: background 0.2s; }
    .primary-action:hover { background: rgba(139, 92, 246, 0.35); color: #FFFFFF; }
    .empty-state { color: var(--muted); grid-column: 1 / -1; text-align: center; padding: 48px 0; }
  `],
})
export class BillboardPageComponent implements OnInit {
  protected readonly state = inject(BillboardSearchState);

  q = '';
  genre = '';
  durationMax: number | null = null;

  ngOnInit(): void {
    this.submit();
  }

  submit(): void {
    this.state.search({ q: this.q, genre: this.genre, durationMax: this.durationMax });
  }

  subtitle(movie: BillboardMovie): string {
    return [...(movie.genres ?? []), `${movie.durationMinutes} min`].join(' · ');
  }

  getMovieRoute(movie: BillboardMovie): string[] {
    return ['movies', movie.id];
  }
}
