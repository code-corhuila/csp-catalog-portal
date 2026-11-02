import { HttpErrorResponse, HttpInterceptorFn, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { catchError, throwError } from 'rxjs';
import { RoomRecord } from '../../model/admin';
import { AdminRoomsState } from './admin-rooms-state';

const ROOMS = '/api/v1/catalog/rooms';
const A = '0b1f6f0e-0000-4000-8000-00000000000a';
const B = '0b1f6f0e-0000-4000-8000-00000000000b';

const room = (id: string, seats = 8): RoomRecord => ({
  id,
  name: `Sala ${id.slice(-1)}`,
  capacity: seats,
  seats: Array.from({ length: seats }, (_, index) => ({ label: `A${index + 1}`, row: 'A', number: index + 1 })),
});

const page = (data: RoomRecord[]) => ({ data, meta: { page: 1, limit: 100, total: data.length, totalPages: 1 } });

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

describe('AdminRoomsState', () => {
  let state: AdminRoomsState;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([asShellError])), provideHttpClientTesting()],
    });
    state = TestBed.inject(AdminRoomsState);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('load', () => {
    it('lists the rooms of the real API', () => {
      state.load();
      expect(state.status()).toBe('loading');

      http.expectOne(req => req.url === ROOMS).flush(page([room(A), room(B, 16)]));

      expect(state.status()).toBe('ready');
      expect(state.rooms().map(item => item.id)).toEqual([A, B]);
    });

    it('shows an error, never the synthetic data, when the API fails', () => {
      state.load();
      http
        .expectOne(req => req.url === ROOMS)
        .flush({ error: 'SERVICE_UNAVAILABLE', message: 'Servicio no disponible.' }, { status: 503, statusText: 'x' });

      expect(state.status()).toBe('error');
      expect(state.error()?.userMessage).toBe('Servicio no disponible.');
      expect(state.rooms()).toEqual([]);
    });
  });

  describe('create', () => {
    it('sends the trimmed name and its seats in rows of eight, with an Idempotency-Key, and adds the answer', () => {
      let result: unknown;
      state.create({ name: '  Sala 02 - VIP  ', capacity: 10.4 }).subscribe(value => (result = value));

      const request = http.expectOne(ROOMS);
      expect(request.request.method).toBe('POST');
      expect(request.request.body.name).toBe('Sala 02 - VIP');
      expect(request.request.body.capacity).toBe(10);
      expect(request.request.body.seats.length).toBe(10);
      expect(request.request.body.seats[0]).toEqual({ label: 'A1', row: 'A', number: 1 });
      expect(request.request.body.seats[8]).toEqual({ label: 'B1', row: 'B', number: 1 });
      expect(request.request.body.seats[9]).toEqual({ label: 'B2', row: 'B', number: 2 });
      expect(request.request.headers.get('Idempotency-Key')).toBeTruthy();
      request.flush(room(A, 10), { status: 201, statusText: 'Created' });

      expect(result).toEqual({ ok: true, message: 'Sala registrada exitosamente.' });
      expect(state.rooms().map(item => item.id)).toEqual([A]);
    });

    it('rejects a room without a name or a positive capacity without calling the API', () => {
      const results: unknown[] = [];
      state.create({ name: '   ', capacity: 60 }).subscribe(value => results.push(value));
      state.create({ name: 'Sala 03', capacity: 0 }).subscribe(value => results.push(value));
      state.create({ name: 'Sala 03', capacity: null }).subscribe(value => results.push(value));

      http.expectNone(ROOMS);
      expect(results).toEqual(Array(3).fill({ ok: false, message: 'Ingresa un nombre y una capacidad válidos.' }));
    });

    it('rejects more seats than the service accepts without calling the API', () => {
      let result: unknown;
      state.create({ name: 'Sala 03', capacity: 501 }).subscribe(value => (result = value));

      http.expectNone(ROOMS);
      expect(result).toEqual({ ok: false, message: 'Una sala admite como máximo 500 asientos.' });
    });

    it('answers with the message of the shell and keeps the list when the name is already in use', () => {
      let result: unknown;
      state.create({ name: 'Sala 02', capacity: 20 }).subscribe(value => (result = value));

      http
        .expectOne(ROOMS)
        .flush({ error: 'CONFLICT', message: 'El nombre de la sala ya está en uso.' }, { status: 409, statusText: 'x' });

      expect(result).toEqual({ ok: false, message: 'El nombre de la sala ya está en uso.' });
      expect(state.rooms()).toEqual([]);
    });

    it('reuses the key to retry the same room and takes a new one for another room or after a success', () => {
      const keys: (string | null)[] = [];
      const send = (name: string, outcome: 'fail' | 'ok') => {
        state.create({ name, capacity: 20 }).subscribe();
        const request = http.expectOne(ROOMS);
        keys.push(request.request.headers.get('Idempotency-Key'));
        if (outcome === 'fail') {
          request.flush({ error: 'SERVICE_UNAVAILABLE', message: 'x' }, { status: 503, statusText: 'x' });
        } else {
          request.flush(room(A, 20), { status: 201, statusText: 'Created' });
        }
      };

      send('Sala 02', 'fail');
      send('Sala 02', 'fail');
      send('Sala 03', 'ok');
      send('Sala 03', 'fail');

      expect(keys[1]).toBe(keys[0]);
      expect(keys[2]).not.toBe(keys[1]);
      expect(keys[3]).not.toBe(keys[2]);
    });
  });

  describe('archive', () => {
    beforeEach(() => {
      state.load();
      http.expectOne(req => req.url === ROOMS).flush(page([room(A), room(B)]));
    });

    it('archives with DELETE and an Idempotency-Key, and takes the room out of the list', () => {
      let result: unknown;
      state.archive(A).subscribe(value => (result = value));

      const request = http.expectOne(`${ROOMS}/${A}`);
      expect(request.request.method).toBe('DELETE');
      expect(request.request.headers.get('Idempotency-Key')).toBeTruthy();
      request.flush(null, { status: 204, statusText: 'No Content' });

      expect(result).toEqual({ ok: true, message: 'Sala archivada.' });
      expect(state.rooms().map(item => item.id)).toEqual([B]);
    });

    it('answers with the message of the shell and keeps the room when the API refuses', () => {
      let result: unknown;
      state.archive(A).subscribe(value => (result = value));

      http
        .expectOne(`${ROOMS}/${A}`)
        .flush({ error: 'CONFLICT', message: 'La sala no se puede archivar.' }, { status: 409, statusText: 'x' });

      expect(result).toEqual({ ok: false, message: 'La sala no se puede archivar.' });
      expect(state.rooms().length).toBe(2);
    });

    it('reuses the key to retry the same room', () => {
      const keys: (string | null)[] = [];
      for (let attempt = 0; attempt < 2; attempt += 1) {
        state.archive(A).subscribe();
        const request = http.expectOne(`${ROOMS}/${A}`);
        keys.push(request.request.headers.get('Idempotency-Key'));
        request.flush({ error: 'SERVICE_UNAVAILABLE', message: 'x' }, { status: 503, statusText: 'x' });
      }

      expect(keys[1]).toBe(keys[0]);
    });
  });
});
