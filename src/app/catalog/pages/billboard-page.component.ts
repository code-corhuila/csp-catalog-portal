import { Component, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SyntheticCatalogDataService, MovieExtended } from '../data/synthetic-catalog-data.service';

@Component({
  selector: 'app-billboard-page',
  standalone: true,
  imports: [CommonModule, DatePipe, FormsModule, RouterLink],
  template: `
    <div class="page-container">
      <header class="site-header" aria-label="Navegación CineSync">
        <a class="brand" routerLink="/" aria-label="Inicio CineSync">
          <img class="brand-logo" src="/assets/logos/icon-csp.svg" alt="CineSync">
          <span class="brand-name">Cine<span>Sync</span></span>
        </a>
        <div class="auth-buttons">
          <button type="button" class="btn-secondary">Iniciar sesión</button>
          <button type="button" class="btn-primary">Registrarse</button>
        </div>
      </header>

      <main class="content-wrapper">
        <section class="hero-banner">
          <span class="hero-badge">TU CINE, TU EXPERIENCIA</span>
          <h1 class="hero-title">Vive el cine <span class="highlight">como nunca.</span></h1>
          <p class="hero-subtitle">
            Descubre todas nuestras funciones disponibles, consulta horarios, selecciona tus asientos y disfruta una experiencia cinematográfica digital.
          </p>
        </section>

        <section class="filter-bar">
          <div class="search-input">
            <input 
              type="text" 
              placeholder="Buscar película por título..." 
              [(ngModel)]="searchTerm" 
            />
          </div>
          <div class="genre-select">
            <select [(ngModel)]="selectedGenre">
              <option value="">Todos los géneros</option>
              @for (genre of availableGenres; track genre) {
                <option [value]="genre">{{ genre }}</option>
              }
            </select>
          </div>
        </section>

        <section class="movie-grid" aria-label="Películas en cartelera">
          @for (movie of filteredMovies; track movie.id) {
            <article class="movie-card">
              <!-- Imagen de Portada con Badge -->
              <div 
                class="poster" 
                [style.background-image]="'url(' + (movie.imageUrl || '') + ')'"
                [routerLink]="['/movies', movie.id]"
              >
                <div class="poster-overlay">
                  <span class="poster-rating">★ 9.2</span>
                  <span class="poster-mark">CS</span>
                </div>
              </div>

              <div class="movie-info">
                <h3 class="movie-title" [routerLink]="['/movies', movie.id]">{{ movie.title }}</h3>
                <p class="movie-genre">{{ movie.genres?.join(' · ') }} · {{ movie.durationMinutes }} min</p>
                <p class="movie-description">{{ movie.description }}</p>
                
                <div class="showtime-list">
                  @for (showtime of getMovieShowtimes(movie.id); track showtime.id) {
                    <a 
                      class="showtime-link" 
                      [routerLink]="['/showtimes', showtime.id, 'seats']"
                    >
                      {{ showtime.startsAt | date: 'shortTime' }}
                    </a>
                  }
                </div>

                <a class="primary-action" [routerLink]="['/movies', movie.id]">
                  Ver película
                </a>
              </div>
            </article>
          } @empty {
            <p class="empty-state">No se encontraron películas que coincidan con los criterios de búsqueda.</p>
          }
        </section>
      </main>
    </div>
  `,
  styles: [`
    :host {
      --brand: #8B5CF6;
      --brand-hover: #A78BFA;
      --cyan: #38BDF8;
      --background: #0B0D17;
      --surface: #13172A;
      --border: rgba(255, 255, 255, 0.08);
      --text: #F1F5F9;
      --muted: #94A3B8;
      display: block;
      width: 100%;
      min-height: 100vh;
      background: var(--background);
      color: var(--text);
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    .page-container { width: 100%; min-height: 100vh; display: flex; flex-direction: column; }
    .site-header { width: 100%; display: flex; align-items: center; justify-content: space-between; padding: 16px 32px; background: #070913; border-bottom: 1px solid var(--border); box-sizing: border-box; }
    .brand { display: inline-flex; align-items: center; gap: 10px; text-decoration: none; color: var(--text); }
    .brand-logo { width: 38px; height: 38px; object-fit: contain; }
    .brand-name { font-size: 1.2rem; font-weight: 800; }
    .brand-name span { color: var(--cyan); }
    .auth-buttons { display: flex; gap: 12px; }
    .btn-secondary { background: transparent; border: 1px solid rgba(255, 255, 255, 0.2); color: white; padding: 8px 16px; border-radius: 8px; font-weight: 600; font-size: 0.85rem; cursor: pointer; }
    .btn-primary { background: var(--brand); border: none; color: white; padding: 8px 16px; border-radius: 8px; font-weight: 600; font-size: 0.85rem; cursor: pointer; }
    .content-wrapper { max-width: 1400px; width: 100%; margin: 0 auto; padding: 32px 24px 64px; box-sizing: border-box; }
    .hero-banner { background: linear-gradient(180deg, rgba(139, 92, 246, 0.12) 0%, rgba(11, 13, 23, 0) 100%); border: 1px solid rgba(139, 92, 246, 0.2); border-radius: 16px; padding: 48px 32px; margin-bottom: 28px; }
    .hero-badge { display: inline-block; background: rgba(139, 92, 246, 0.15); color: #C084FC; border: 1px solid rgba(139, 92, 246, 0.3); padding: 4px 12px; border-radius: 20px; font-size: 0.72rem; font-weight: 800; margin-bottom: 16px; }
    .hero-title { font-size: clamp(2.2rem, 4vw, 3.2rem); font-weight: 900; margin: 0 0 12px 0; }
    .highlight { background: linear-gradient(135deg, #A855F7, #6366F1); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .hero-subtitle { color: var(--muted); max-width: 620px; font-size: 0.98rem; margin: 0; }
    
    .filter-bar { display: flex; gap: 16px; margin-bottom: 32px; background: var(--surface); padding: 10px; border-radius: 12px; border: 1px solid var(--border); }
    .search-input { flex: 1; }
    .search-input input, .genre-select select { width: 100%; background: var(--background); border: 1px solid rgba(255, 255, 255, 0.1); color: var(--text); padding: 10px 14px; border-radius: 8px; font-size: 0.9rem; box-sizing: border-box; outline: none; }
    .genre-select select option { background: var(--surface); color: var(--text); }

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
export class BillboardPageComponent {
  private readonly dataService = inject(SyntheticCatalogDataService);

  readonly movies: MovieExtended[] = this.dataService.getPublishedMovies();

  searchTerm: string = '';
  selectedGenre: string = '';

  get availableGenres(): string[] {
    const genresSet = new Set<string>();
    this.movies.forEach(movie => {
      movie.genres?.forEach(genre => genresSet.add(genre));
    });
    return Array.from(genresSet);
  }

  get filteredMovies(): MovieExtended[] {
    return this.movies.filter(movie => {
      const matchesTitle = movie.title.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchesGenre = !this.selectedGenre || movie.genres?.includes(this.selectedGenre);
      return matchesTitle && matchesGenre;
    });
  }

  getMovieShowtimes(movieId: string) {
    return this.dataService.getShowtimes(movieId);
  }
}