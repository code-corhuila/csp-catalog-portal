import { TestBed } from '@angular/core/testing';
import { SyntheticCatalogDataService } from './synthetic-catalog-data.service';
import { SYNTHETIC_CATALOG } from './synthetic-catalog';

describe('SyntheticCatalogDataService', () => {
  let service: SyntheticCatalogDataService;

  beforeEach(() => {
    service = TestBed.configureTestingModule({
      providers: [SyntheticCatalogDataService],
    }).inject(SyntheticCatalogDataService);
  });

  it('filters draft movies from the billboard', () => {
    const publishedMovies = service.getPublishedMovies();
    const publishedTitles = new Set(publishedMovies.map(movie => movie.title));

    expect(publishedMovies.length).toBe(
      SYNTHETIC_CATALOG.movies.filter(movie => movie.publicationStatus === 'PUBLISHED').length,
    );
    expect(publishedMovies.every(movie => movie.status === 'PUBLISHED')).toBeTrue();
    expect(
      SYNTHETIC_CATALOG.movies
        .filter(movie => movie.publicationStatus === 'DRAFT')
        .every(movie => !publishedTitles.has(movie.title)),
    ).toBeTrue();
  });

  it('returns every seat from the room with deterministic availability', () => {
    const seats = service.getSeats(SYNTHETIC_CATALOG.showtimes[0].id);
    const expectedLabels = SYNTHETIC_CATALOG.rooms[0].seatLabels;

    expect(seats.map(seat => seat.label)).toEqual(expectedLabels);
    expect(seats.length).toBe(expectedLabels.length);
    expect(seats[0].available).toBeFalse();
    expect(seats.slice(1).every(seat => seat.available)).toBeTrue();
  });
});
