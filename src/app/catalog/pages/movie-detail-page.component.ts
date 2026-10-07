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
      <main class="detail-shell">
        <section class="detail-card">
          <div class="inner-content">
            <a class="back-link" routerLink="/">← Volver a la cartelera</a>

            <!-- Banner con imagen de fondo y botón de YouTube -->
            <div 
              class="trailer-container"
              [style.background-image]="'url(' + (currentMovie.imageUrl || '') + ')'"
            >
              <div class="trailer-overlay">
                <a 
                  [href]="currentMovie.trailerUrl" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  class="trailer-btn"
                >
                  <span class="play-icon">▶</span>
                  <span>Reproducir Tráiler en YouTube</span>
                </a>
              </div>
            </div>

            <div class="detail-content">
              <p class="eyebrow">
                {{ currentMovie.genres?.join(' · ') }}{{ currentMovie.rating != null ? ' · Rating: ★ ' + currentMovie.rating : '' }}
              </p>
              <h2>{{ currentMovie.title }}</h2>
              <p class="metadata">{{ currentMovie.durationMinutes }} minutos · Publicada</p>
              <p class="description">
                {{ currentMovie.description || 'Disfruta de esta película seleccionada en la cartelera de CineSync. Elige tu función disponible y reserva tus asientos.' }}
              </p>
              
              <h3>Horarios Disponibles:</h3>
              <ul class="showtime-grid">
                @for (showtime of showtimes; track showtime.id) {
                  <li>
                    <a class="showtime-button" [routerLink]="['/booking/showtime', showtime.id]">
                      {{ showtime.startsAt | date: 'shortTime' }}
                    </a>
                  </li>
                }
              </ul>
            </div>
          </div>
        </section>
      </main>
    } @else {
      <p role="alert">Película no encontrada.</p>
    }
  `,
  styles: [`
    :host { 
      color: #F1F5F9; 
      display: block; 
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; 
    }

    .detail-shell { 
      margin: 0 auto; 
      max-width: 860px; 
      padding: 40px 24px 72px; 
      box-sizing: border-box;
    }

    .detail-card { 
      background: #13172A; 
      border: 1px solid rgba(139, 92, 246, .3); 
      border-radius: 16px; 
      box-shadow: 0 0 40px rgba(0, 0, 0, .5); 
      overflow: hidden; 
      display: flex;
      flex-direction: column;
    }

    .inner-content { padding: 28px 32px 36px; }

    .back-link { color: #38BDF8; display: inline-block; font-weight: 700; margin-bottom: 24px; text-decoration: none; }
    .back-link:hover { text-decoration: underline; }

    .trailer-container {
      width: 100%;
      height: 320px;
      background-size: cover;
      background-position: center;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, .08);
    }

    .trailer-overlay {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      background: radial-gradient(circle, rgba(11, 13, 23, 0.3) 0%, rgba(11, 13, 23, 0.8) 100%);
    }

    .trailer-btn {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      background: rgba(15, 18, 30, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #FFFFFF;
      padding: 12px 24px;
      border-radius: 30px;
      text-decoration: none;
      font-weight: 700;
      font-size: 0.95rem;
      backdrop-filter: blur(8px);
      transition: all 0.25s ease;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
    }

    .trailer-btn:hover {
      background: #8B5CF6;
      border-color: #A78BFA;
      transform: scale(1.05);
      box-shadow: 0 0 25px rgba(139, 92, 246, 0.6);
    }

    .play-icon {
      background: #8B5CF6;
      color: white;
      width: 34px;
      height: 34px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.85rem;
      padding-left: 2px;
    }

    .trailer-btn:hover .play-icon {
      background: white;
      color: #8B5CF6;
    }

    .detail-content { padding-top: 28px; }
    .eyebrow { color: #38BDF8; font-size: .85rem; font-weight: 700; margin: 0 0 8px 0; }
    h2 { font-size: 2.2rem; font-weight: 900; letter-spacing: -.03em; margin: 0 0 12px 0; }
    h3 { margin: 28px 0 16px; font-size: 1.1rem; font-weight: 800; color: #F1F5F9; }
    .metadata { color: #94A3B8; font-size: 0.9rem; margin-bottom: 12px; }
    .description { color: #CBD5E1; line-height: 1.6; font-size: 0.95rem; margin: 0; }
    
    .showtime-grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); list-style: none; margin: 0; padding: 0; }
    .showtime-button { border: 1px solid rgba(56, 189, 248, 0.4); background: rgba(56, 189, 248, 0.05); border-radius: 8px; color: #38BDF8; display: block; font-weight: 700; padding: 12px; text-align: center; text-decoration: none; transition: all 0.2s; }
    .showtime-button:hover { background: #38BDF8; color: #071018; border-color: #38BDF8; }
  `],
})
export class MovieDetailPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly catalog = inject(SyntheticCatalogDataService);

  readonly movie = this.catalog.getMovie(
    this.route.snapshot.paramMap.get('id') ?? this.route.snapshot.paramMap.get('movieId') ?? ''
  );
  readonly showtimes = this.catalog.getShowtimes(this.movie?.id);
}