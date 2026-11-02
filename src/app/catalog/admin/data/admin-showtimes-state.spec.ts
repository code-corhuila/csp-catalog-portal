import { HttpErrorResponse, HttpInterceptorFn, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { catchError, throwError } from 'rxjs';
import { ShowtimeRecord } from '../../model/admin';
import { AdminResult } from './admin-catalog-state.service';
import { AdminShowtimesState, NewShowtimeInput, displayDateTime, formatPrice } from './admin-showtimes-state';

const SHOWTIMES = '/api/v1/catalog/showtimes';
const A = '0b1f6f0e-0000-4000-8000-00000000000a';
const B = '0b1f6f0e-0000-4000-8000-00000000000b';
const MOVIE = '0b1f6f0e-0000-4000-8000-0000000000e1';
const ROOM = '0b1f6f0e-0000-4000-8000-0000000000f1';

const showtime = (id: string, status: ShowtimeRecord['status'] = 'SCHEDULED'): ShowtimeRecord => ({
  id,
  movieId: MOVIE,
  roomId: ROOM,
  startsAt: '2026-11-02T20:00:00Z',
  endsAt: '2026-11-02T22:00:00Z',
  priceCents: 1500000,
  status,
});

const page = (data: ShowtimeRecord[]) => ({ data, meta: { page: 1, limit: 100, total: data.length, totalPages: 1 } });

const INPUT: NewShowtimeInput = {
  movieId: MOVIE,
  roomId: ROOM,
  startsAt: '2026-11-02T20:00',
  endsAt: '2026-11-02T22:00',
  price: 15000,
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

describe('AdminShowtimesState', () => {
  let state: AdminShowtimesState;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([asShellError])), provideHttpClientTesting()],
    });
    state = TestBed.inject(AdminShowtimesState);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('load', () => {
    it('lists the showtimes of the real API, cancelled ones included', () => {
      state.load();
      expect(state.status()).toBe('loading');

      http.expectOne(req => req.url === SHOWTIMES).flush(page([showtime(A), showtime(B, 'CANCELLED')]));

      expect(state.status()).toBe('ready');
      expect(state.showtimes().map(item => item.id)).toEqual([A, B]);
    });

    it('shows an error, never the synthetic data, when the API fails', () => {
      state.load();
      http
        .expectOne(req => req.url === SHOWTIMES)
        .flush({ error: 'SERVICE_UNAVAILABLE', message: 'Servicio no disponible.' }, { status: 503, statusText: 'x' });

      expect(state.status()).toBe('error');
      expect(state.error()?.userMessage).toBe('Servicio no disponible.');
      expect(state.showtimes()).toEqual([]);
    });
  });

  describe('create', () => {
    it('sends the instants in UTC and the price in cents, with an Idempotency-Key, and adds the answer', () => {
      let result: unknown;
      state.create(INPUT).subscribe(value => (result = value));

      const request = http.expectOne(SHOWTIMES);
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual({
        movieId: MOVIE,
        roomId: ROOM,
        startsAt: new Date('2026-11-02T20:00').toISOString(),
        endsAt: new Date('2026-11-02T22:00').toISOString(),
        priceCents: 1500000,
      });
      expect(request.request.headers.get('Idempotency-Key')).toBeTruthy();
      request.flush(showtime(A), { status: 201, statusText: 'Created' });

      expect(result).toEqual({ ok: true, message: 'Función programada exitosamente.' });
      expect(state.showtimes().map(item => item.id)).toEqual([A]);
    });

    it('accepts a price of zero', () => {
      state.create({ ...INPUT, price: 0 }).subscribe();

      const request = http.expectOne(SHOWTIMES);
      expect(request.request.body.priceCents).toBe(0);
      request.flush(showtime(A), { status: 201, statusText: 'Created' });
    });

    it('rejects an incomplete or inconsistent showtime without calling the API', () => {
      const results: AdminResult[] = [];
      const attempt = (input: NewShowtimeInput) => state.create(input).subscribe(value => results.push(value));

      attempt({ ...INPUT, movieId: '' });
      attempt({ ...INPUT, roomId: '' });
      attempt({ ...INPUT, startsAt: '' });
      attempt({ ...INPUT, endsAt: '' });
      attempt({ ...INPUT, price: null });
      attempt({ ...INPUT, price: -1 });
      attempt({ ...INPUT, endsAt: INPUT.startsAt });

      http.expectNone(SHOWTIMES);
      expect(results.length).toBe(7);
      results.forEach(result => expect(result).toEqual({ ok: false, message: 'Completa todos los campos.' }));
    });

    it('flags the overlap of the room as a conflict with the message of the shell', () => {
      let result: AdminResult | undefined;
      state.create(INPUT).subscribe(value => (result = value));

      http
        .expectOne(SHOWTIMES)
        .flush(
          { error: 'CONFLICT', message: 'La sala ya tiene una función en ese horario.' },
          { status: 409, statusText: 'x' },
        );

      expect(result).toEqual({ ok: false, conflict: true, message: 'La sala ya tiene una función en ese horario.' });
      expect(state.showtimes()).toEqual([]);
    });

    it('answers with the message of the shell, without a conflict flag, for another refusal', () => {
      let result: AdminResult | undefined;
      state.create(INPUT).subscribe(value => (result = value));

      http
        .expectOne(SHOWTIMES)
        .flush(
          { error: 'BUSINESS_RULE_VIOLATION', message: 'La película no está publicada.' },
          { status: 422, statusText: 'x' },
        );

      expect(result).toEqual({ ok: false, message: 'La película no está publicada.' });
    });

    it('reuses the key to retry the same showtime and takes a new one for another or after a success', () => {
      const keys: (string | null)[] = [];
      const send = (input: NewShowtimeInput, outcome: 'fail' | 'ok') => {
        state.create(input).subscribe();
        const request = http.expectOne(SHOWTIMES);
        keys.push(request.request.headers.get('Idempotency-Key'));
        if (outcome === 'fail') {
          request.flush({ error: 'SERVICE_UNAVAILABLE', message: 'x' }, { status: 503, statusText: 'x' });
        } else {
          request.flush(showtime(A), { status: 201, statusText: 'Created' });
        }
      };

      send(INPUT, 'fail');
      send(INPUT, 'fail');
      send({ ...INPUT, price: 20000 }, 'ok');
      send({ ...INPUT, price: 20000 }, 'fail');

      expect(keys[1]).toBe(keys[0]);
      expect(keys[2]).not.toBe(keys[1]);
      expect(keys[3]).not.toBe(keys[2]);
    });
  });

  describe('cancel', () => {
    beforeEach(() => {
      state.load();
      http.expectOne(req => req.url === SHOWTIMES).flush(page([showtime(A), showtime(B)]));
    });

    it('cancels with DELETE and an Idempotency-Key, and marks the showtime as cancelled', () => {
      let result: unknown;
      state.cancel(A).subscribe(value => (result = value));

      const request = http.expectOne(`${SHOWTIMES}/${A}`);
      expect(request.request.method).toBe('DELETE');
      expect(request.request.headers.get('Idempotency-Key')).toBeTruthy();
      request.flush(null, { status: 204, statusText: 'No Content' });

      expect(result).toEqual({ ok: true, message: 'Función cancelada.' });
      expect(state.showtimes().find(item => item.id === A)?.status).toBe('CANCELLED');
      expect(state.showtimes().find(item => item.id === B)?.status).toBe('SCHEDULED');
    });

    it('answers with the message of the shell and keeps the status when the API refuses', () => {
      let result: unknown;
      state.cancel(A).subscribe(value => (result = value));

      http
        .expectOne(`${SHOWTIMES}/${A}`)
        .flush({ error: 'CONFLICT', message: 'La función ya terminó.' }, { status: 409, statusText: 'x' });

      expect(result).toEqual({ ok: false, message: 'La función ya terminó.' });
      expect(state.showtimes().find(item => item.id === A)?.status).toBe('SCHEDULED');
    });

    it('reuses the key to retry the same showtime', () => {
      const keys: (string | null)[] = [];
      for (let attempt = 0; attempt < 2; attempt += 1) {
        state.cancel(A).subscribe();
        const request = http.expectOne(`${SHOWTIMES}/${A}`);
        keys.push(request.request.headers.get('Idempotency-Key'));
        request.flush({ error: 'SERVICE_UNAVAILABLE', message: 'x' }, { status: 503, statusText: 'x' });
      }

      expect(keys[1]).toBe(keys[0]);
    });
  });

  describe('formatting', () => {
    it('shows an instant of the service in local time, without seconds', () => {
      const instant = '2026-11-02T20:00:00Z';
      const local = new Date(instant);
      const pad = (value: number) => String(value).padStart(2, '0');

      expect(displayDateTime(instant)).toBe(
        `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())} ${pad(local.getHours())}:${pad(local.getMinutes())}`,
      );
    });

    it('shows the price in cents as Colombian pesos', () => {
      expect(formatPrice(1500000)).toBe('$15.000 COP');
      expect(formatPrice(0)).toBe('$0 COP');
    });
  });
});
