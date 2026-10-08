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

  it('enables available seats and disables occupied seat', () => {
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
    const seats = fixture.nativeElement.querySelectorAll('button[aria-label^="Asiento "]');

    expect(seats.length).toBe(SYNTHETIC_CATALOG.rooms[0].seatLabels.length);
    expect(seats[0].disabled).toBeTrue();

    for (let i = 1; i < seats.length; i++) {
      expect(seats[i].disabled).toBeFalse();
    }
  });

  it('does not render seats for a draft movie showtime', () => {
    const draftShowtime = SYNTHETIC_CATALOG.showtimes.find(st =>
      SYNTHETIC_CATALOG.movies.some(m => m.id === st.movieId && m.publicationStatus === 'DRAFT'),
    )!;
    const fixture = TestBed.configureTestingModule({
      imports: [SeatMapPageComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => draftShowtime.id } } },
        },
      ],
    }).createComponent(SeatMapPageComponent);

    fixture.detectChanges();
    const content = fixture.nativeElement.textContent;

    SYNTHETIC_CATALOG.rooms[0].seatLabels.forEach(label => {
      expect(content).not.toContain(label);
    });
  });
});
