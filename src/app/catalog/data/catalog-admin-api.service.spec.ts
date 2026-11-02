import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AdminResource, CatalogAdminApiService, RetryKeys, newIdempotencyKey } from './catalog-admin-api.service';

const BASE = '/api/v1/catalog';
const ID = '0b1f6f0e-0000-4000-8000-000000000001';
const KEY = 'key-12345678';

type AnyResource = AdminResource<unknown, unknown, unknown>;

describe('CatalogAdminApiService', () => {
  let api: CatalogAdminApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CatalogAdminApiService, provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(CatalogAdminApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const resources = () => [
    { name: 'movies', resource: api.movies as unknown as AnyResource, path: `${BASE}/movies` },
    { name: 'rooms', resource: api.rooms as unknown as AnyResource, path: `${BASE}/rooms` },
    { name: 'showtimes', resource: api.showtimes as unknown as AnyResource, path: `${BASE}/showtimes` },
  ];

  for (const name of ['movies', 'rooms', 'showtimes'] as const) {
    describe(name, () => {
      const target = () => resources().find(item => item.name === name)!;

      it('lists with the page and the limit as query parameters and no Idempotency-Key', () => {
        target().resource.list({ page: 2, limit: 10 }).subscribe();

        const request = http.expectOne(req => req.url === target().path);
        expect(request.request.method).toBe('GET');
        expect(request.request.params.get('page')).toBe('2');
        expect(request.request.params.get('limit')).toBe('10');
        expect(request.request.headers.has('Idempotency-Key')).toBeFalse();
        request.flush({ data: [], meta: { page: 2, limit: 10, total: 0, totalPages: 0 } });
      });

      it('leaves out the page and the limit when they are absent', () => {
        target().resource.list().subscribe();

        const request = http.expectOne(target().path);
        expect(request.request.params.keys().length).toBe(0);
        request.flush({ data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } });
      });

      it('lists every record, asking the next page while there are more', () => {
        let all: unknown[] = [];
        target().resource.listAll().subscribe(records => (all = records));

        const first = http.expectOne(req => req.url === target().path && req.params.get('page') === '1');
        expect(first.request.params.get('limit')).toBe('100');
        first.flush({ data: [{ id: 'a' }], meta: { page: 1, limit: 100, total: 2, totalPages: 2 } });
        http
          .expectOne(req => req.url === target().path && req.params.get('page') === '2')
          .flush({ data: [{ id: 'b' }], meta: { page: 2, limit: 100, total: 2, totalPages: 2 } });

        expect(all).toEqual([{ id: 'a' }, { id: 'b' }]);
      });

      it('gets one record by its id', () => {
        target().resource.get(ID).subscribe();

        const request = http.expectOne(`${target().path}/${ID}`);
        expect(request.request.method).toBe('GET');
        request.flush({ id: ID });
      });

      it('creates with the body and the Idempotency-Key', () => {
        const body = { name: 'x' };
        target().resource.create(body, KEY).subscribe();

        const request = http.expectOne(target().path);
        expect(request.request.method).toBe('POST');
        expect(request.request.body).toEqual(body);
        expect(request.request.headers.get('Idempotency-Key')).toBe(KEY);
        request.flush({ id: ID }, { status: 201, statusText: 'Created' });
      });

      it('updates with PATCH, the body and the Idempotency-Key', () => {
        const body = { name: 'y' };
        target().resource.update(ID, body, KEY).subscribe();

        const request = http.expectOne(`${target().path}/${ID}`);
        expect(request.request.method).toBe('PATCH');
        expect(request.request.body).toEqual(body);
        expect(request.request.headers.get('Idempotency-Key')).toBe(KEY);
        request.flush({ id: ID });
      });

      it('archives or cancels with DELETE and the Idempotency-Key, and completes on 204', () => {
        let completed = false;
        target().resource.remove(ID, KEY).subscribe({ complete: () => (completed = true) });

        const request = http.expectOne(`${target().path}/${ID}`);
        expect(request.request.method).toBe('DELETE');
        expect(request.request.headers.get('Idempotency-Key')).toBe(KEY);
        request.flush(null, { status: 204, statusText: 'No Content' });
        expect(completed).toBeTrue();
      });

      it('lets the error of the shell reach the caller untouched', () => {
        let error: unknown;
        target().resource.create({}, KEY).subscribe({ error: e => (error = e) });

        http.expectOne(target().path).flush(
          { error: 'CONFLICT' },
          { status: 409, statusText: 'Conflict' },
        );
        expect((error as { status: number }).status).toBe(409);
      });
    });
  }

  describe('RetryKeys', () => {
    it('gives the same key to the same write until it is released, and its own key to another write', () => {
      const keys = new RetryKeys();

      const first = keys.keyFor('create:a');
      expect(keys.keyFor('create:a')).toBe(first);
      expect(keys.keyFor('create:b')).not.toBe(first);

      keys.release('create:a');
      expect(keys.keyFor('create:a')).not.toBe(first);
    });
  });

  describe('newIdempotencyKey', () => {
    it('gives a different key of 8 to 128 characters each time', () => {
      const first = newIdempotencyKey();
      const second = newIdempotencyKey();

      expect(first).not.toBe(second);
      expect(first.length).toBeGreaterThanOrEqual(8);
      expect(first.length).toBeLessThanOrEqual(128);
    });
  });
});
