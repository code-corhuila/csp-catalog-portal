import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { BillboardItem, BillboardMovie, Page } from '../model/billboard';
import { CatalogApiService } from './catalog-api.service';

const BILLBOARD = '/api/v1/catalog/billboard';
const SEARCH = '/api/v1/catalog/billboard/movies';

const MOVIE: BillboardMovie = {
  id: '11111111-1111-4111-8111-111111111111',
  title: 'Synthetic Movie',
  synopsis: 'A synopsis',
  durationMinutes: 120,
  genres: ['Drama'],
  classification: 'PG-13',
  posterUrl: 'https://example.com/poster.png',
  releaseDate: '2026-12-01',
};

const ITEM: BillboardItem = {
  movie: MOVIE,
  room: { id: '22222222-2222-4222-8222-222222222222', name: 'Room 1', capacity: 80 },
  showtime: {
    id: '33333333-3333-4333-8333-333333333333',
    startsAt: '2026-11-01T20:00:00Z',
    endsAt: '2026-11-01T22:00:00Z',
    priceCents: 1500,
    audioLanguage: 'es',
    subtitleLanguage: 'en',
  },
};

describe('CatalogApiService', () => {
  let service: CatalogApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CatalogApiService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CatalogApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('getBillboard', () => {
    it('asks the public billboard route with no parameter when there is no filter', () => {
      service.getBillboard().subscribe();

      const request = http.expectOne(BILLBOARD);
      expect(request.request.method).toBe('GET');
      expect(request.request.params.keys().length).toBe(0);
      request.flush({ data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } });
    });

    it('sends the date, the movie and the window as query parameters', () => {
      service.getBillboard({ date: '2026-11-01', movieId: MOVIE.id, page: 3, limit: 50 }).subscribe();

      const request = http.expectOne(req => req.url === BILLBOARD);
      expect(request.request.params.get('date')).toBe('2026-11-01');
      expect(request.request.params.get('movieId')).toBe(MOVIE.id);
      expect(request.request.params.get('page')).toBe('3');
      expect(request.request.params.get('limit')).toBe('50');
      request.flush({ data: [], meta: { page: 3, limit: 50, total: 0, totalPages: 0 } });
    });

    it('leaves out the filters that are absent or blank', () => {
      service.getBillboard({ date: '', movieId: undefined, page: undefined, limit: undefined }).subscribe();

      const request = http.expectOne(BILLBOARD);
      expect(request.request.params.keys().length).toBe(0);
      request.flush({ data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } });
    });

    it('answers the page the API sent, untouched', () => {
      const page: Page<BillboardItem> = { data: [ITEM], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } };
      let received: Page<BillboardItem> | undefined;
      service.getBillboard().subscribe(answer => (received = answer));

      http.expectOne(BILLBOARD).flush(page);

      expect(received).toEqual(page);
    });
  });

  describe('searchMovies', () => {
    it('asks the public search route with no parameter when there is no filter', () => {
      service.searchMovies().subscribe();

      const request = http.expectOne(SEARCH);
      expect(request.request.method).toBe('GET');
      expect(request.request.params.keys().length).toBe(0);
      request.flush({ data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } });
    });

    it('sends the text, the genre, the maximum duration and the window as query parameters', () => {
      service
        .searchMovies({ q: 'space action', genre: 'Ciencia ficción', durationMax: 150, page: 2, limit: 10 })
        .subscribe();

      const request = http.expectOne(req => req.url === SEARCH);
      expect(request.request.params.get('q')).toBe('space action');
      expect(request.request.params.get('genre')).toBe('Ciencia ficción');
      expect(request.request.params.get('durationMax')).toBe('150');
      expect(request.request.params.get('page')).toBe('2');
      expect(request.request.params.get('limit')).toBe('10');
      request.flush({ data: [], meta: { page: 2, limit: 10, total: 0, totalPages: 0 } });
    });

    it('trims the text and leaves out a blank text or genre and an absent duration', () => {
      service.searchMovies({ q: '  space  ', genre: '   ', durationMax: undefined }).subscribe();

      const request = http.expectOne(req => req.url === SEARCH);
      expect(request.request.params.get('q')).toBe('space');
      expect(request.request.params.has('genre')).toBeFalse();
      expect(request.request.params.has('durationMax')).toBeFalse();
      request.flush({ data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } });

      service.searchMovies({ q: '   ' }).subscribe();
      const blank = http.expectOne(SEARCH);
      expect(blank.request.params.keys().length).toBe(0);
      blank.flush({ data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } });
    });

    it('encodes the text so that a plus sign or an ampersand reaches the API as typed', () => {
      service.searchMovies({ q: 'c++ & más', genre: 'Acción' }).subscribe();

      const request = http.expectOne(req => req.url === SEARCH);
      expect(request.request.urlWithParams).toContain('q=c%2B%2B%20%26%20m%C3%A1s');
      expect(request.request.urlWithParams).toContain('genre=Acci%C3%B3n');
      request.flush({ data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } });
    });

    it('answers the page of movies the API sent, untouched', () => {
      const page: Page<BillboardMovie> = { data: [MOVIE], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } };
      let received: Page<BillboardMovie> | undefined;
      service.searchMovies({ q: 'synthetic' }).subscribe(answer => (received = answer));

      http.expectOne(req => req.url === SEARCH).flush(page);

      expect(received).toEqual(page);
    });
  });

  it('sets no header of its own: the shell adds the token, the correlation id and the gateway', () => {
    service.getBillboard().subscribe();
    service.searchMovies({ q: 'space' }).subscribe();

    const requests = [http.expectOne(BILLBOARD), http.expectOne(req => req.url === SEARCH)];
    requests.forEach(request => {
      expect(request.request.headers.keys().length).toBe(0);
      request.flush({ data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } });
    });
  });

  it('lets an error of the API reach the caller without a retry or a fallback', () => {
    let failure: { status: number } | undefined;
    service.searchMovies({ durationMax: 0 }).subscribe({ error: error => (failure = error) });

    http.expectOne(req => req.url === SEARCH).flush({ error: 'VALIDATION_ERROR' }, { status: 400, statusText: 'Bad Request' });

    expect(failure?.status).toBe(400);
  });
});
