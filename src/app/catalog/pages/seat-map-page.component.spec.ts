import { ActivatedRoute } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { SeatMapPageComponent } from './seat-map-page.component';
import { SYNTHETIC_CATALOG } from '../data/synthetic-catalog';

describe('SeatMapPageComponent', () => {
  it('renders every seat label from the selected room', () => {
    const fixture = TestBed.configureTestingModule({
      imports: [SeatMapPageComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => SYNTHETIC_CATALOG.showtimes[0].id } } },
        },
      ],
    }).createComponent(SeatMapPageComponent);

    fixture.detectChanges();
    const content = fixture.nativeElement.textContent;
    SYNTHETIC_CATALOG.rooms[0].seatLabels.forEach(label => {
      expect(content).toContain(label);
    });

    const firstSeat = fixture.nativeElement.querySelector('button[aria-label="Asiento A1 ocupado"]');
    expect(firstSeat).not.toBeNull();
    expect(firstSeat.disabled).toBeTrue();
  });
});
