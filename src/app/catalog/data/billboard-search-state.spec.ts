import { TestBed } from '@angular/core/testing';
import { Observable, Subject, throwError } from 'rxjs';
import { ApiError } from '../../shell-contract';
import {
  BillboardItem,
  BillboardMovie,
  BillboardQuery,
  MovieSearchQuery,
  Page,
} from '../model/billboard';
import { BillboardSearchState } from './billboard-search-state';
import { CatalogApiService } from './catalog-api.service';

function movie(n: number, genres: string[] = ['Drama']): BillboardMovie {
  return { id: `movie-${n}`, title: `Movie ${n}`, durationMinutes: 100 + n, genres, classification: 'PG-13' };
}

function moviesPage(movies: BillboardMovie[], page = 1, limit = 12, total = movies.length): Page<BillboardMovie> {
  return { data: movies, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

function billboardOf(movieId: string, ids: string[]): Page<BillboardItem> {
  const data = ids.map(id => ({
    movie: { id: movieId, title: 'T', durationMinutes: 100, classification: 'PG-13' },
    room: { id: 'room-1', name: 'Room 1', capacity: 80 },
    showtime: { id, startsAt: '2026-11-01T20:00:00Z', endsAt: '2026-11-01T22:00:00Z', priceCents: 1500 },
  }));
  return { data, meta: { page: 1, limit: 100, total: data.length, totalPages: 1 } };
}

const API_ERROR: ApiError = {
  status: 503,
  code: 'SERVICE_UNAVAILABLE',
  message: 'the service is not available',
  details: [],
  traceId: 'trace-1',
  userMessage: 'The catalog is not available, try again later.',
};

/** A fake of the client: every call is a subject that the test answers, completes or leaves pending. */
class FakeCatalogApi {
  searches: { query: MovieSearchQuery; subject: Subject<Page<BillboardMovie>> }[] = [];
  billboards: { query: BillboardQuery; subject: Subject<Page<BillboardItem>> }[] = [];
  failNextSearch = false;

  searchMovies(query: MovieSearchQuery = {}): Observable<Page<BillboardMovie>> {
    if (this.failNextSearch) {
      this.failNextSearch = false;
      return throwError(() => API_ERROR);
    }
    const subject = new Subject<Page<BillboardMovie>>();
    this.searches.push({ query, subject });
    return subject.asObservable();
  }

  getBillboard(query: BillboardQuery = {}): Observable<Page<BillboardItem>> {
    const subject = new Subject<Page<BillboardItem>>();
    this.billboards.push({ query, subject });
    return subject.asObservable();
  }

  answerSearch(index: number, page: Page<BillboardMovie>): void {
    this.searches[index].subject.next(page);
    this.searches[index].subject.complete();
  }

  answerBillboard(index: number, page: Page<BillboardItem>): void {
    this.billboards[index].subject.next(page);
    this.billboards[index].subject.complete();
  }
}

describe('BillboardSearchState', () => {
  let api: FakeCatalogApi;
  let state: BillboardSearchState;

  beforeEach(() => {
    api = new FakeCatalogApi();
    TestBed.configureTestingModule({
      providers: [BillboardSearchState, { provide: CatalogApiService, useValue: api }],
    });
    state = TestBed.inject(BillboardSearchState);
  });

  const NO_FILTERS = { q: '', genre: '', durationMax: null };

  it('starts idle, with no movie and no request', () => {
    expect(state.status()).toBe('idle');
    expect(state.movies()).toEqual([]);
    expect(state.meta()).toBeNull();
    expect(api.searches.length).toBe(0);
  });

  describe('search', () => {
    it('is loading until the API answers and then shows the movies and the metadata', () => {
      state.search(NO_FILTERS);
      expect(state.status()).toBe('loading');

      api.answerSearch(0, moviesPage([movie(1), movie(2)]));

      expect(state.status()).toBe('ready');
      expect(state.movies().map(item => item.id)).toEqual(['movie-1', 'movie-2']);
      expect(state.meta()).toEqual({ page: 1, limit: 12, total: 2, totalPages: 1 });
    });

    it('asks the first page of twelve with the filters', () => {
      state.search({ q: 'space', genre: 'Drama', durationMax: 150 });

      expect(api.searches[0].query).toEqual({ q: 'space', genre: 'Drama', durationMax: 150, page: 1, limit: 12 });
      expect(state.filters()).toEqual({ q: 'space', genre: 'Drama', durationMax: 150 });
    });

    it('asks no maximum duration when the filter has none', () => {
      state.search(NO_FILTERS);

      expect(api.searches[0].query.durationMax).toBeUndefined();
    });

    it('goes back to the first page whatever page was shown', () => {
      state.search(NO_FILTERS);
      api.answerSearch(0, moviesPage([movie(1)], 1, 12, 30));
      state.goToPage(3);
      api.answerSearch(1, moviesPage([movie(25)], 3, 12, 30));

      state.search({ q: 'space', genre: '', durationMax: null });

      expect(api.searches[2].query.page).toBe(1);
    });

    it('is empty, not an error, when no movie matches', () => {
      state.search({ q: 'nothing', genre: '', durationMax: null });

      api.answerSearch(0, moviesPage([], 1, 12, 0));

      expect(state.status()).toBe('empty');
      expect(state.movies()).toEqual([]);
      expect(state.meta()?.total).toBe(0);
    });

    it('keeps the error of the API and shows no movie when the search fails', () => {
      api.failNextSearch = true;

      state.search(NO_FILTERS);

      expect(state.status()).toBe('error');
      expect(state.error()).toEqual(API_ERROR);
      expect(state.movies()).toEqual([]);
    });

    it('drops the answer of a search that a newer one replaced', () => {
      state.search({ q: 'old', genre: '', durationMax: null });
      state.search({ q: 'new', genre: '', durationMax: null });

      expect(api.searches[0].subject.observed).toBeFalse();
      api.searches[0].subject.next(moviesPage([movie(1)]));
      expect(state.status()).toBe('loading');
      expect(state.movies()).toEqual([]);

      api.answerSearch(1, moviesPage([movie(2)]));
      expect(state.movies().map(item => item.id)).toEqual(['movie-2']);
    });
  });

  describe('pages', () => {
    beforeEach(() => {
      state.search({ q: 'space', genre: 'Drama', durationMax: 150 });
      api.answerSearch(0, moviesPage([movie(1)], 1, 12, 30));
    });

    it('asks another page with the same filters', () => {
      state.goToPage(2);

      expect(api.searches[1].query).toEqual({ q: 'space', genre: 'Drama', durationMax: 150, page: 2, limit: 12 });
      expect(state.status()).toBe('loading');
    });

    it('ignores a page outside the range of the metadata', () => {
      state.goToPage(0);
      state.goToPage(4);
      state.goToPage(-1);

      expect(api.searches.length).toBe(1);
    });

    it('ignores any page before there is a metadata to judge it', () => {
      const fresh = TestBed.runInInjectionContext(() => new BillboardSearchState());

      fresh.goToPage(2);

      expect(api.searches.length).toBe(1);
    });
  });

  describe('retry', () => {
    it('asks again the same query after an error', () => {
      state.search({ q: 'space', genre: '', durationMax: null });
      api.answerSearch(0, moviesPage([movie(1)], 1, 12, 30));
      state.goToPage(2);
      api.searches[1].subject.error(API_ERROR);
      expect(state.status()).toBe('error');

      state.retry();

      expect(state.status()).toBe('loading');
      expect(state.error()).toBeNull();
      expect(api.searches[2].query).toEqual({ q: 'space', genre: '', durationMax: undefined, page: 2, limit: 12 });
    });

    it('does nothing before the first search', () => {
      state.retry();

      expect(api.searches.length).toBe(0);
      expect(state.status()).toBe('idle');
    });
  });

  describe('showtimes', () => {
    it('asks the upcoming showtimes of each movie of the page and keeps them by movie', () => {
      state.search(NO_FILTERS);
      api.answerSearch(0, moviesPage([movie(1), movie(2)]));

      expect(api.billboards.map(call => call.query)).toEqual([
        { movieId: 'movie-1', limit: 100 },
        { movieId: 'movie-2', limit: 100 },
      ]);
      api.answerBillboard(1, billboardOf('movie-2', ['s-3']));
      api.answerBillboard(0, billboardOf('movie-1', ['s-1', 's-2']));

      expect(state.showtimes().get('movie-1')?.map(item => item.id)).toEqual(['s-1', 's-2']);
      expect(state.showtimes().get('movie-2')?.map(item => item.id)).toEqual(['s-3']);
      expect(state.showtimesFailed()).toBeFalse();
    });

    it('shows the movies at once, before any showtime arrives', () => {
      state.search(NO_FILTERS);

      api.answerSearch(0, moviesPage([movie(1)]));

      expect(state.status()).toBe('ready');
      expect(state.showtimes().size).toBe(0);
    });

    it('asks at most four movies at a time', () => {
      state.search(NO_FILTERS);
      api.answerSearch(0, moviesPage(Array.from({ length: 10 }, (_, i) => movie(i + 1))));

      expect(api.billboards.length).toBe(4);
      api.answerBillboard(0, billboardOf('movie-1', []));
      expect(api.billboards.length).toBe(5);
    });

    it('marks that the showtimes of a movie failed and keeps the others', () => {
      state.search(NO_FILTERS);
      api.answerSearch(0, moviesPage([movie(1), movie(2)]));

      api.billboards[0].subject.error(API_ERROR);
      api.answerBillboard(1, billboardOf('movie-2', ['s-3']));

      expect(state.showtimesFailed()).toBeTrue();
      expect(state.showtimes().has('movie-1')).toBeFalse();
      expect(state.showtimes().get('movie-2')?.length).toBe(1);
      expect(state.status()).toBe('ready');
    });

    it('cancels the pending showtimes when a new search starts and forgets the old ones', () => {
      state.search(NO_FILTERS);
      api.answerSearch(0, moviesPage([movie(1)]));
      api.answerBillboard(0, billboardOf('movie-1', ['s-1']));
      state.search({ q: 'other', genre: '', durationMax: null });
      api.answerSearch(1, moviesPage([movie(2)]));

      expect(state.showtimes().size).toBe(0);
      expect(api.billboards[1].query.movieId).toBe('movie-2');
    });

    it('cancels the showtimes in flight when a new search replaces the page', () => {
      state.search(NO_FILTERS);
      api.answerSearch(0, moviesPage([movie(1)]));

      state.search({ q: 'other', genre: '', durationMax: null });

      expect(api.billboards[0].subject.observed).toBeFalse();
    });
  });

  describe('genres', () => {
    it('suggests every genre seen so far, once and in order', () => {
      state.search(NO_FILTERS);
      api.answerSearch(0, moviesPage([movie(1, ['Drama', 'Comedia']), movie(2, ['Acción'])], 1, 12, 30));
      state.goToPage(2);
      api.answerSearch(1, moviesPage([movie(3, ['Drama', 'Terror'])], 2, 12, 30));

      expect(state.genreSuggestions()).toEqual(['Acción', 'Comedia', 'Drama', 'Terror']);
    });

    it('keeps the suggestions of an earlier search when a filtered one finds fewer genres', () => {
      state.search(NO_FILTERS);
      api.answerSearch(0, moviesPage([movie(1, ['Drama']), movie(2, ['Terror'])]));

      state.search({ q: 'movie 1', genre: '', durationMax: null });
      api.answerSearch(1, moviesPage([movie(1, ['Drama'])]));

      expect(state.genreSuggestions()).toEqual(['Drama', 'Terror']);
    });

    it('ignores a movie with no genre', () => {
      state.search(NO_FILTERS);
      api.answerSearch(0, moviesPage([{ id: 'movie-9', title: 'Bare', durationMinutes: 90, classification: 'G' }]));

      expect(state.genreSuggestions()).toEqual([]);
    });
  });
});
