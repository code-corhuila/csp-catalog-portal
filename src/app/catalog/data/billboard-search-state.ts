import { Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Observable, Subject, catchError, from, mergeMap, switchMap, tap } from 'rxjs';
import { ApiError, asApiError } from '../../shell-contract';
import { BillboardMovie, BillboardShowtime, Page, PageMeta } from '../model/billboard';
import { CatalogApiService } from './catalog-api.service';

export type SearchStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'error';

/** What the client typed: a blank text or genre and no maximum duration mean no filter. */
export interface SearchFilters {
  q: string;
  genre: string;
  durationMax: number | null;
}

interface SearchRequest {
  filters: SearchFilters;
  page: number;
}

const PAGE_SIZE = 12;
/** The upcoming showtimes of one movie: the billboard answers at most 100 items per page. */
const SHOWTIMES_LIMIT = 100;
/** The gateway limits the rate of a client: the showtimes of a page are asked a few movies at a time. */
const SHOWTIME_CONCURRENCY = 4;

/**
 * The state of the billboard search: the filters, the page of published movies that match them, the upcoming
 * showtimes of those movies and the loading, empty and error states. A new request cancels the previous one, so
 * a slow answer never replaces a newer one. It never falls back to synthetic data: an error is shown as an error.
 * Provide it where it is used so that each screen has its own state.
 */
@Injectable()
export class BillboardSearchState {
  private readonly api = inject(CatalogApiService);
  private readonly requests = new Subject<SearchRequest>();
  private last: SearchRequest | null = null;

  readonly filters = signal<SearchFilters>({ q: '', genre: '', durationMax: null });
  readonly status = signal<SearchStatus>('idle');
  readonly movies = signal<BillboardMovie[]>([]);
  readonly meta = signal<PageMeta | null>(null);
  readonly error = signal<ApiError | null>(null);
  /** The upcoming showtimes of the movies of the page, by movie id; they arrive after the movies. */
  readonly showtimes = signal<ReadonlyMap<string, BillboardShowtime[]>>(new Map());
  readonly showtimesFailed = signal(false);
  /** Every genre of the movies seen so far, so the client can pick one: the search filters by its exact value. */
  readonly genreSuggestions = signal<string[]>([]);

  constructor() {
    this.requests
      .pipe(
        switchMap(({ filters, page }) =>
          this.api
            .searchMovies({
              q: filters.q,
              genre: filters.genre,
              durationMax: filters.durationMax ?? undefined,
              page,
              limit: PAGE_SIZE,
            })
            .pipe(
              tap(result => this.show(result)),
              switchMap(result => this.loadShowtimes(result.data)),
              catchError((failure: unknown) => {
                this.fail(failure);
                return EMPTY;
              }),
            ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe();
  }

  /** A new search always starts at the first page. */
  search(filters: SearchFilters): void {
    this.request({ filters, page: 1 });
  }

  /** Another page of the same search; a page outside the metadata of the last answer is ignored. */
  goToPage(page: number): void {
    const meta = this.meta();
    if (meta === null || page < 1 || page > meta.totalPages) {
      return;
    }
    this.request({ filters: this.filters(), page });
  }

  /** Asks again the last query, after an error. */
  retry(): void {
    if (this.last !== null) {
      this.request(this.last);
    }
  }

  private request(request: SearchRequest): void {
    this.last = request;
    this.filters.set(request.filters);
    this.status.set('loading');
    this.error.set(null);
    this.requests.next(request);
  }

  private show(result: Page<BillboardMovie>): void {
    this.movies.set(result.data);
    this.meta.set(result.meta);
    this.status.set(result.data.length === 0 ? 'empty' : 'ready');
    this.showtimes.set(new Map());
    this.showtimesFailed.set(false);
    const genres = new Set(this.genreSuggestions());
    result.data.forEach(movie => movie.genres?.forEach(genre => genres.add(genre)));
    this.genreSuggestions.set([...genres].sort((left, right) => left.localeCompare(right, 'es')));
  }

  private fail(failure: unknown): void {
    this.status.set('error');
    this.error.set(asApiError(failure));
    this.movies.set([]);
    this.meta.set(null);
  }

  private loadShowtimes(movies: BillboardMovie[]): Observable<unknown> {
    return from(movies).pipe(
      mergeMap(
        movie =>
          this.api.getBillboard({ movieId: movie.id, limit: SHOWTIMES_LIMIT }).pipe(
            tap(page =>
              this.showtimes.update(known =>
                new Map(known).set(movie.id, page.data.map(item => item.showtime)),
              ),
            ),
            catchError(() => {
              this.showtimesFailed.set(true);
              return EMPTY;
            }),
          ),
        SHOWTIME_CONCURRENCY,
      ),
    );
  }
}
