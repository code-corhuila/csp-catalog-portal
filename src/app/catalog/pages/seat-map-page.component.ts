import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SyntheticCatalogDataService } from '../data/synthetic-catalog-data.service';

@Component({
  selector: 'app-seat-map-page',
  standalone: true,
  imports: [DatePipe, RouterLink],
  template: `
    <main class="seat-shell">
      <section class="seat-card">
        <div class="inner-content">
          <a class="back-link" routerLink="/">← Volver a la cartelera</a>

          <header>
            <p class="eyebrow">{{ roomName }} · {{ movieTitle }} - Función: {{ showtimeStart | date: 'shortTime' }}</p>
            <h2>Selección de Asientos</h2>
            <p class="subtitle">Selecciona tus asientos disponibles para esta función.</p>
          </header>

          <div class="screen-container">
            <div class="screen"></div>
            <span>PANTALLA</span>
          </div>

          <div class="seat-map" aria-label="Mapa de asientos">
            @for (seat of seats; track seat.label) {
              <button
                type="button"
                class="seat"
                [class.occupied]="!seat.available"
                [class.selected]="isSelected(seat.label)"
                [disabled]="!seat.available"
                (click)="toggleSeat(seat.label)"
                [attr.aria-label]="'Asiento ' + seat.label + (isSelected(seat.label) ? ' seleccionado' : seat.available ? ' disponible' : ' ocupado')"
              >
                {{ seat.label }}
              </button>
            }
          </div>

          <div class="legend" aria-label="Leyenda de disponibilidad de asientos">
            <span><i class="legend-box available"></i>Disponible</span>
            <span><i class="legend-box selected"></i>Seleccionado</span>
            <span><i class="legend-box occupied"></i>Ocupado</span>
          </div>
        </div>
      </section>
    </main>
  `,
  styles: [`
    :host { 
      background: #0B0D17; 
      color: #F1F5F9; 
      display: block; 
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; 
    }

    .seat-shell { 
      margin: 0 auto; 
      max-width: 860px; 
      padding: 40px 24px 72px; 
      box-sizing: border-box;
    }

    .seat-card { 
      background: #13172A; 
      border: 1px solid rgba(139, 92, 246, .4); 
      border-radius: 16px; 
      box-shadow: 0 0 40px rgba(139, 92, 246, .18); 
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .inner-content { padding: 28px 32px 40px; }

    .back-link { color: #38BDF8; display: inline-block; font-weight: 700; margin-bottom: 24px; text-decoration: none; }
    .back-link:hover { text-decoration: underline; }
    
    header { text-align: center; }
    .eyebrow { color: #38BDF8; font-size: .85rem; font-weight: 800; letter-spacing: .08em; margin: 0 0 10px; text-transform: uppercase; }
    h2 { font-size: clamp(2rem, 5vw, 2.8rem); letter-spacing: -.04em; margin: 0; }
    .subtitle { color: #94A3B8; margin: 10px 0 0; font-size: 0.95rem; }
    
    .screen-container { perspective: 400px; margin: 32px auto 28px; max-width: 580px; text-align: center; }
    .screen { background: #38BDF8; border-radius: 6px; box-shadow: 0 3px 22px rgba(56, 189, 248, .8); height: 8px; transform: rotateX(-30deg) scale(.95); }
    .screen-container span { color: #64748B; display: block; font-size: .75rem; font-weight: 800; letter-spacing: .25em; margin-top: 12px; }
    
    .seat-map { 
      display: grid; 
      gap: 10px; 
      grid-template-columns: repeat(8, minmax(36px, 1fr)); 
      margin: 0 auto 32px; 
      max-width: 620px; 
    }
    
    .seat { 
      background: #1E293B; 
      border: 1px solid rgba(255, 255, 255, 0.15); 
      border-radius: 6px; 
      color: #F1F5F9; 
      cursor: pointer; 
      font-size: .85rem; 
      font-weight: 700; 
      min-height: 42px; 
      transition: all 0.2s ease; 
    }
    
    .seat:hover:not(:disabled):not(.selected) { 
      border-color: #38BDF8; 
      color: #38BDF8; 
      transform: translateY(-2px); 
    }
    
    .seat.selected { 
      background: #10B981; 
      border-color: #34D399; 
      color: #042F2E; 
      box-shadow: 0 0 12px rgba(16, 185, 129, 0.5); 
    }
    
    .seat.occupied { 
      background: #0F172A; 
      border-color: #1E293B; 
      color: #475569; 
      cursor: not-allowed; 
      opacity: .5; 
    }
    
    .legend { border-top: 1px solid #1E293B; color: #94A3B8; display: flex; flex-wrap: wrap; gap: 24px; justify-content: center; padding-top: 24px; font-weight: 600; font-size: .85rem; }
    .legend span { align-items: center; display: inline-flex; gap: 8px; }
    .legend-box { border-radius: 4px; display: inline-block; height: 14px; width: 14px; }
    .legend-box.available { background: #1E293B; border: 1px solid rgba(255, 255, 255, 0.15); }
    .legend-box.selected { background: #10B981; border: 1px solid #34D399; }
    .legend-box.occupied { background: #0F172A; border: 1px solid #1E293B; }
  `],
})
export class SeatMapPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly catalog = inject(SyntheticCatalogDataService);

  readonly showtimeId = this.route.snapshot.paramMap.get('showtimeId') ?? '';
  readonly seats = this.catalog.getSeats(this.showtimeId);

  selectedSeats: string[] = [];

  get movieTitle(): string {
    const showtime = this.catalog.getShowtimes().find(s => s.id === this.showtimeId);
    if (!showtime) return 'Película';
    const movie = this.catalog.getMovie(showtime.movieId);
    return movie?.title ?? 'Película';
  }

  get roomName(): string {
    const showtime = this.catalog.getShowtimes().find(s => s.id === this.showtimeId);
    if (!showtime) return 'SALA 1';
    const room = this.catalog.getRoom(showtime.roomId);
    return room?.name ?? 'SALA 1';
  }

  get showtimeStart(): string | null {
    const showtime = this.catalog.getShowtimes().find(s => s.id === this.showtimeId);
    return showtime?.startsAt ?? null;
  }

  isSelected(label: string): boolean {
    return this.selectedSeats.includes(label);
  }

  toggleSeat(label: string): void {
    if (this.isSelected(label)) {
      this.selectedSeats = this.selectedSeats.filter(s => s !== label);
    } else {
      this.selectedSeats.push(label);
    }
  }
}