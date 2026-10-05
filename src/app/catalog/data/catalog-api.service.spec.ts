import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { CatalogApiService } from './catalog-api.service';

describe('CatalogApiService', () => {
  let service: CatalogApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CatalogApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('requests the billboard with pagination and filters', () => {
    service.getBillboard(2, 10, '2026-04-01', 'movie/1').subscribe();

    const request = http.expectOne(
      request => request.url === '/api/v1/catalog/billboard',
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('limit')).toBe('10');
    expect(request.request.params.get('date')).toBe('2026-04-01');
    expect(request.request.params.get('movieId')).toBe('movie/1');
    request.flush({ data: [], meta: { page: 2, limit: 10, total: 0, totalPages: 0 } });
  });

  it('encodes the showtime ID in availability requests', () => {
    service.getShowtimeAvailability('showtime/1').subscribe();

    const request = http.expectOne('/api/v1/catalog/showtimes/showtime%2F1/availability');
    expect(request.request.method).toBe('GET');
    request.flush({
      showtimeId: 'showtime/1',
      movieTitle: 'Movie',
      roomName: 'Room',
      startsAt: '2026-04-01T20:00:00Z',
      endsAt: '2026-04-01T22:00:00Z',
      price: 1200,
      seats: ['A1'],
    });
  });
});
