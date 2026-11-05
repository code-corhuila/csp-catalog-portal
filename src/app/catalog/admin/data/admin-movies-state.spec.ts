import { HttpErrorResponse, HttpInterceptorFn, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { catchError, throwError } from 'rxjs';
import { MovieRecord } from '../../model/admin';
import { AdminMoviesState, NewMovieInput } from './admin-movies-state';

const MOVIES = '/api/v1/catalog/movies';
const A = '0b1f6f0e-0000-4000-8000-00000000000a';
const B = '0b1f6f0e-0000-4000-8000-00000000000b';

const movie = (id: string, status: MovieRecord['status'] = 'PUBLISHED'): MovieRecord => ({
  id,
  title: `Movie ${id.slice(-1)}`,
  durationMinutes: 100,
  classification: 'TP',
  genres: ['Drama'],
  status,
});

const page = (data: MovieRecord[], pageNumber = 1, totalPages = 1) => ({
  data,
  meta: { page: pageNumber, limit: 100, total: data.length, totalPages },
});

const INPUT: NewMovieInput = {
  title: '  Cinema Paradiso  ',
  genre: 'Suspenso',
  duration: 124.7,
  classification: 'TP',
  synopsis: ' Un homenaje al cine de barrio. ',
  poster: ' https://example.com/poster.png ',
};

/** What the interceptor of the shell does: a failed request reaches the portal as an ApiError. */
const asShellError: HttpInterceptorFn = (request, next) =>
  next(request).pipe(
    catchError((failure: HttpErrorResponse) =>
      throwError(() => ({
        status: failure.status,
        code: failure.error?.error ?? 'ERROR',
        message: 'failed',
        details: [],
        traceId: 'trace',
        userMessage: failure.error?.message ?? 'Algo salió mal.',
      })),
    ),
  );

describe('AdminMoviesState', () => {
  let state: AdminMoviesState;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([asShellError])), provideHttpClientTesting()],
    });
    state = TestBed.inject(AdminMoviesState);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('load', () => {
    it('lists the movies of the real API, drafts and archived ones included', () => {
      state.load();
      expect(state.status()).toBe('loading');

      const request = http.expectOne(req => req.url === MOVIES);
      expect(request.request.params.get('page')).toBe('1');
      expect(request.request.params.get('limit')).toBe('100');
      request.flush(page([movie(A), movie(B, 'ARCHIVED')]));

      expect(state.status()).toBe('ready');
      expect(state.movies().map(item => item.id)).toEqual([A, B]);
    });

    it('asks the next page while there are more', () => {
      state.load();
      http.expectOne(req => req.url === MOVIES && req.params.get('page') === '1').flush(page([movie(A)], 1, 2));
      http.expectOne(req => req.url === MOVIES && req.params.get('page') === '2').flush(page([movie(B)], 2, 2));

      expect(state.movies().map(item => item.id)).toEqual([A, B]);
      expect(state.status()).toBe('ready');
    });

    it('shows an error, never the synthetic data, when the API fails', () => {
      state.load();
      http
        .expectOne(req => req.url === MOVIES)
        .flush({ error: 'SERVICE_UNAVAILABLE', message: 'Servicio no disponible.' }, { status: 503, statusText: 'x' });

      expect(state.status()).toBe('error');
      expect(state.error()?.userMessage).toBe('Servicio no disponible.');
      expect(state.movies()).toEqual([]);
    });
  });

  describe('create', () => {
    it('sends the trimmed movie as published, with an Idempotency-Key, and adds the answer to the list', () => {
      let result: unknown;
      state.create(INPUT).subscribe(value => (result = value));

      const request = http.expectOne(MOVIES);
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual({
        title: 'Cinema Paradiso',
        synopsis: 'Un homenaje al cine de barrio.',
        durationMinutes: 124,
        classification: 'TP',
        genres: ['Suspenso'],
        status: 'PUBLISHED',
        posterUrl: 'https://example.com/poster.png',
      });
      expect(request.request.headers.get('Idempotency-Key')).toBeTruthy();
      request.flush(movie(A), { status: 201, statusText: 'Created' });

      expect(result).toEqual({ ok: true, message: 'Película guardada correctamente.' });
      expect(state.movies().map(item => item.id)).toEqual([A]);
    });

    it('leaves the poster out when it is blank', () => {
      state.create({ ...INPUT, poster: '  ' }).subscribe();

      const request = http.expectOne(MOVIES);
      expect('posterUrl' in request.request.body).toBeFalse();
      request.flush(movie(A), { status: 201, statusText: 'Created' });
    });

    it('rejects an incomplete movie without calling the API', () => {
      let result: unknown;
      state
        .create({ title: ' ', genre: '', duration: null, classification: '', synopsis: '', poster: '' })
        .subscribe(value => (result = value));

      http.expectNone(MOVIES);
      expect(result).toEqual({ ok: false, message: 'Completa todos los campos de la película.' });
    });

    it('answers with the message of the shell and keeps the list when the API refuses', () => {
      let result: { ok: boolean; message: string } | undefined;
      state.create(INPUT).subscribe(value => (result = value));

      http
        .expectOne(MOVIES)
        .flush({ error: 'CONFLICT', message: 'La película ya existe.' }, { status: 409, statusText: 'x' });

      expect(result).toEqual({ ok: false, message: 'La película ya existe.' });
      expect(state.movies()).toEqual([]);
    });

    it('reuses the key to retry the same movie and takes a new one for a changed movie or after a success', () => {
      const keys: (string | null)[] = [];
      const send = (input: NewMovieInput, outcome: 'fail' | 'ok') => {
        state.create(input).subscribe();
        const request = http.expectOne(MOVIES);
        keys.push(request.request.headers.get('Idempotency-Key'));
        if (outcome === 'fail') {
          request.flush({ error: 'SERVICE_UNAVAILABLE', message: 'x' }, { status: 503, statusText: 'x' });
        } else {
          request.flush(movie(A), { status: 201, statusText: 'Created' });
        }
      };

      send(INPUT, 'fail');
      send(INPUT, 'fail');
      send({ ...INPUT, title: 'Another title' }, 'fail');
      send({ ...INPUT, title: 'Another title' }, 'ok');
      send({ ...INPUT, title: 'Another title' }, 'fail');

      expect(keys[1]).toBe(keys[0]);
      expect(keys[2]).not.toBe(keys[1]);
      expect(keys[3]).toBe(keys[2]);
      expect(keys[4]).not.toBe(keys[3]);
    });
  });

  describe('archive', () => {
    beforeEach(() => {
      state.load();
      http.expectOne(req => req.url === MOVIES).flush(page([movie(A), movie(B)]));
    });

    it('archives with DELETE and an Idempotency-Key, and marks the movie as archived', () => {
      let result: unknown;
      state.archive(A).subscribe(value => (result = value));

      const request = http.expectOne(`${MOVIES}/${A}`);
      expect(request.request.method).toBe('DELETE');
      expect(request.request.headers.get('Idempotency-Key')).toBeTruthy();
      request.flush(null, { status: 204, statusText: 'No Content' });

      expect(result).toEqual({ ok: true, message: 'Película archivada.' });
      expect(state.movies().find(item => item.id === A)?.status).toBe('ARCHIVED');
      expect(state.movies().find(item => item.id === B)?.status).toBe('PUBLISHED');
    });

    it('answers with the message of the shell and keeps the status when the API refuses', () => {
      let result: unknown;
      state.archive(A).subscribe(value => (result = value));

      http
        .expectOne(`${MOVIES}/${A}`)
        .flush(
          { error: 'BUSINESS_RULE_VIOLATION', message: 'La película tiene funciones programadas.' },
          { status: 422, statusText: 'x' },
        );

      expect(result).toEqual({ ok: false, message: 'La película tiene funciones programadas.' });
      expect(state.movies().find(item => item.id === A)?.status).toBe('PUBLISHED');
    });

    it('reuses the key to retry the same movie', () => {
      const keys: (string | null)[] = [];
      for (let attempt = 0; attempt < 2; attempt += 1) {
        state.archive(A).subscribe();
        const request = http.expectOne(`${MOVIES}/${A}`);
        keys.push(request.request.headers.get('Idempotency-Key'));
        request.flush({ error: 'SERVICE_UNAVAILABLE', message: 'x' }, { status: 503, statusText: 'x' });
      }

      expect(keys[1]).toBe(keys[0]);
    });
  });
});
