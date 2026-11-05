import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiError, asApiError } from '../../shell-contract';
import { CatalogApiService } from '../data/catalog-api.service';
import { BillboardMovie, BillboardShowtime } from '../model/billboard';

@Component({
  selector: 'app-movie-detail-page',
  standalone: true,
  imports: [DatePipe, RouterLink],
  template: `
    @switch (status()) {
      @case ('loading') {
        <p class="status-message" role="status">Cargando película…</p>
      }
      @case ('error') {
        <div class="error-state" role="alert">
          <p>{{ error()?.userMessage }}</p>
          <button type="button" class="retry" (click)="load()">Reintentar</button>
        </div>
      }
      @case ('unavailable') {
        <main class="detail-shell">
          <p role="alert">Película no disponible: no está publicada o no tiene funciones próximas.</p>
          <a class="back-link" routerLink="../">← Volver a la cartelera</a>
        </main>
      }
      @case ('ready') {
        @if (movie(); as currentMovie) {
          <main class="detail-shell">
            <section class="detail-card">
              <div class="inner-content">
                <a class="back-link" routerLink="../">← Volver a la cartelera</a>

                <div
                  class="banner"
                  [style.background-image]="currentMovie.posterUrl ? 'url(' + currentMovie.posterUrl + ')' : ''"
                ></div>

                <div class="detail-content">
                  <p class="eyebrow">{{ eyebrow(currentMovie) }}</p>
                  <h2>{{ currentMovie.title }}</h2>
                  <p class="metadata">{{ currentMovie.durationMinutes }} minutos</p>
                  <p class="description">
                    {{ currentMovie.synopsis || 'Disfruta de esta película seleccionada en la cartelera de CineSync. Elige tu función disponible y reserva tus asientos.' }}
                  </p>

                  <h3>Horarios Disponibles:</h3>
                  @switch (showtimesStatus()) {
                    @case ('loading') {
                      <p class="showtime-note">Cargando funciones…</p>
                    }
                    @case ('failed') {
                      <p class="showtime-note">No se pudieron cargar las funciones</p>
                    }
                    @default {
                      <ul class="showtime-grid">
                        @for (showtime of showtimes(); track showtime.id) {
                          <li>
                            <a class="showtime-button" [routerLink]="['/booking/showtime', showtime.id]">
                              {{ showtime.startsAt | date: 'EEE d MMM, h:mm a' }}
                            </a>
                          </li>
                        } @empty {
                          <li class="showtime-note">Sin funciones próximas</li>
                        }
                      </ul>
                    }
                  }
                </div>
              </div>
            </section>
          </main>
        }
      }
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

    .banner {
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

    .detail-content { padding-top: 28px; }
    .status-message, .showtime-note { color: #94A3B8; font-size: 0.9rem; }
    .status-message, .error-state { text-align: center; padding: 48px 0; }
    .retry { background: rgba(139, 92, 246, 0.15); color: #C084FC; border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 8px; font-weight: 700; padding: 10px 16px; cursor: pointer; }
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
export class MovieDetailPageComponent implements OnInit {
  private readonly api = inject(CatalogApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly movieId = inject(ActivatedRoute).snapshot.paramMap.get('movieId') ?? '';

  readonly movie = signal<BillboardMovie | null>(null);
  readonly showtimes = signal<BillboardShowtime[]>([]);
  readonly status = signal<'loading' | 'ready' | 'unavailable' | 'error'>('loading');
  readonly showtimesStatus = signal<'loading' | 'ready' | 'failed'>('loading');
  readonly error = signal<ApiError | null>(null);

  constructor() {
    // The billboard passes the movie it already has, so the page can show it before the showtimes arrive.
    const passed = inject(Router).getCurrentNavigation()?.extras.state?.['movie'] as BillboardMovie | undefined;
    if (passed?.id === this.movieId) {
      this.movie.set(passed);
      this.status.set('ready');
    }
  }

  ngOnInit(): void {
    this.load();
  }

  /** The API has no route for one movie: its upcoming showtimes carry the movie, so a movie with none is not available. */
  load(): void {
    this.error.set(null);
    this.showtimesStatus.set('loading');
    if (this.movie() === null) {
      this.status.set('loading');
    }
    this.api
      .getBillboard({ movieId: this.movieId, limit: 100 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: page => {
          this.showtimes.set(page.data.map(item => item.showtime));
          this.showtimesStatus.set('ready');
          const known = page.data[0]?.movie ?? this.movie();
          this.movie.set(known);
          this.status.set(known === null ? 'unavailable' : 'ready');
        },
        error: (failure: unknown) => {
          this.showtimesStatus.set('failed');
          if (this.movie() === null) {
            this.error.set(asApiError(failure));
            this.status.set('error');
          }
        },
      });
  }

  eyebrow(movie: BillboardMovie): string {
    return [...(movie.genres ?? []), movie.classification].join(' · ');
  }
}
