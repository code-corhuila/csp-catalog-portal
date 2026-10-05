import { TestBed } from '@angular/core/testing';
import { SyntheticCatalogDataService } from './synthetic-catalog-data.service';

describe('SyntheticCatalogDataService', () => {
  let service: SyntheticCatalogDataService;

  beforeEach(() => {
    service = TestBed.configureTestingModule({
      providers: [SyntheticCatalogDataService],
    }).inject(SyntheticCatalogDataService);
  });

  it('filters draft movies from the billboard', () => {
    expect(service.getPublishedMovies().map(movie => movie.title)).toEqual(['The Silent Reel']);
  });

  it('returns the exact synthetic seat labels with availability', () => {
    expect(service.getSeats('44444444-4444-4444-4444-444444444444')).toEqual([
      { label: 'A1', available: false },
      { label: 'A2', available: true },
      { label: 'A3', available: true },
      { label: 'B1', available: true },
      { label: 'B2', available: true },
      { label: 'B3', available: true },
    ]);
  });
});
