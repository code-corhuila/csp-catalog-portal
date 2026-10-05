import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SyntheticCatalogDataService } from '../data/synthetic-catalog-data.service';

@Component({
  selector: 'app-seat-map-page',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main>
      <a routerLink="/">Back to billboard</a>
      <h2>Seat map</h2>
      <div class="seat-map" aria-label="Seat map">
        @for (seat of seats; track seat.label) {
          <button type="button" [disabled]="!seat.available" [attr.aria-label]="seat.label + (seat.available ? ' available' : ' unavailable')">
            {{ seat.label }}
          </button>
        }
      </div>
    </main>
  `,
})
export class SeatMapPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly catalog = inject(SyntheticCatalogDataService);
  readonly seats = this.catalog.getSeats(this.route.snapshot.paramMap.get('showtimeId') ?? '');
}
