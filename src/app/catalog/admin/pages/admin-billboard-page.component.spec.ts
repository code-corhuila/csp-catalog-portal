import { HttpErrorResponse, HttpInterceptorFn, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { MovieRecord, RoomRecord, ShowtimeRecord } from '../../model/admin';
import { AdminToastService } from '../data/admin-toast.service';
import { AdminBillboardPageComponent } from './admin-billboard-page.component';

const API = '/api/v1/catalog';
const MOVIES = `${API}/movies`;
const ROOMS = `${API}/rooms`;
const SHOWTIMES = `${API}/showtimes`;

const MOVIE: MovieRecord = {
  id: '0b1f6f0e-0000-4000-8000-0000000000e1',
  title: 'Interstellar',
  durationMinutes: 120,
  classification: '+12',
  genres: ['Ciencia ficción'],
  status: 'PUBLISHED',
};
const DRAFT: MovieRecord = { ...MOVIE, id: '0b1f6f0e-0000-4000-8000-0000000000e2', title: 'Neon Sky', status: 'DRAFT' };
const ARCHIVED: MovieRecord = { ...MOVIE, id: '0b1f6f0e-0000-4000-8000-0000000000e3', title: 'Old Reel', status: 'ARCHIVED' };
const ROOM: RoomRecord = {
  id: '0b1f6f0e-0000-4000-8000-0000000000f1',
  name: 'Sala 01 - IMAX',
  capacity: 48,
  seats: [{ label: 'A1' }],
};
const SHOWTIME: ShowtimeRecord = {
  id: '0b1f6f0e-0000-4000-8000-0000000000a1',
  movieId: MOVIE.id,
  roomId: ROOM.id,
  startsAt: '2026-11-02T20:00:00Z',
  endsAt: '2026-11-02T22:00:00Z',
  priceCents: 1500000,
  status: 'SCHEDULED',
};
const CANCELLED: ShowtimeRecord = { ...SHOWTIME, id: '0b1f6f0e-0000-4000-8000-0000000000a2', status: 'CANCELLED' };

const page = <T>(data: T[]) => ({ data, meta: { page: 1, limit: 100, total: data.length, totalPages: 1 } });

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

describe('AdminBillboardPageComponent', () => {
  let http: HttpTestingController;

  const createComponent = () => {
    TestBed.configureTestingModule({
      imports: [AdminBillboardPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([asShellError])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    return TestBed.createComponent(AdminBillboardPageComponent);
  };

  /** Messages pushed to the bottom-right toast queue. */
  const toasts = () => TestBed.inject(AdminToastService).toasts().map(toast => toast.message);

  /**
   * Runs change detection after mutating the component outside of an event handler: zoneless Angular only
   * refreshes views marked for check, otherwise dev mode reports NG0100.
   */
  const sync = <T>(fixture: ComponentFixture<T>) => {
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
  };

  const answer = (path: string, body: object) => http.expectOne(req => req.url === path).flush(body);

  /** Creates the page and answers the three list requests of its first render. */
  const loaded = (showtimes: ShowtimeRecord[] = [SHOWTIME, CANCELLED]) => {
    const fixture = createComponent();
    sync(fixture);
    answer(MOVIES, page([MOVIE, DRAFT, ARCHIVED]));
    answer(ROOMS, page([ROOM]));
    answer(SHOWTIMES, page(showtimes));
    sync(fixture);
    return fixture;
  };

  const fillForm = (component: AdminBillboardPageComponent) => {
    component.onMovieChange(MOVIE.id);
    component.selectedRoomId = ROOM.id;
    component.onStartChange('2026-11-02T20:00');
    component.price = 15000;
  };

  const rowsOf = (fixture: ComponentFixture<AdminBillboardPageComponent>): HTMLTableRowElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll('.data-table tbody tr'));

  afterEach(() => http.verify());

  it('renders the page header', () => {
    const fixture = loaded();
    const content = fixture.nativeElement.textContent;

    expect(content).toContain('Gestión de Cartelera y Funciones');
    expect(content).toContain('Programa y administra las funciones disponibles del cine.');
  });

  it('offers only the published movies and the rooms of the API in the schedule form', () => {
    const fixture = loaded();

    const movieSelect: HTMLSelectElement = fixture.nativeElement.querySelector('#movie-select');
    const roomSelect: HTMLSelectElement = fixture.nativeElement.querySelector('#room-select');

    expect(Array.from(movieSelect.options).map(option => option.textContent?.trim())).toEqual([
      'Seleccionar película...',
      'Interstellar (120 min)',
    ]);
    expect(Array.from(roomSelect.options).map(option => option.textContent?.trim())).toEqual([
      'Seleccionar sala...',
      'Sala 01 - IMAX (48 asientos)',
    ]);
  });

  it('asks for the price in Colombian pesos', () => {
    const fixture = loaded();
    const price: HTMLInputElement = fixture.nativeElement.querySelector('#showtime-price');

    expect(fixture.nativeElement.querySelector('label[for=showtime-price]').textContent).toContain('Precio (COP)');
    expect(price.getAttribute('type')).toBe('number');
    expect(price.required).toBeTrue();
    expect(price.min).toBe('0');
  });

  it('lists the showtimes of the API with movie, room, local times, price and status', () => {
    const fixture = loaded();
    const rows = rowsOf(fixture);
    const local = new Date(SHOWTIME.startsAt);
    const pad = (value: number) => String(value).padStart(2, '0');

    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('Interstellar');
    expect(rows[0].textContent).toContain('Sala 01 - IMAX');
    expect(rows[0].textContent).toContain(
      `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())} ${pad(local.getHours())}:${pad(local.getMinutes())}`,
    );
    expect(rows[0].textContent).toContain('$15.000 COP');
    expect(rows.map(row => row.children[5].textContent?.trim())).toEqual(['Publicada', 'Cancelada']);
  });

  it('offers to cancel a scheduled showtime and not a cancelled one', () => {
    const fixture = loaded();
    const rows = rowsOf(fixture);

    expect(rows[0].querySelector('.btn-danger')?.textContent?.trim()).toBe('Cancelar');
    expect(rows[1].querySelector('.btn-danger')).toBeNull();
  });

  it('asks the real API and shows no synthetic showtime while it loads', () => {
    const fixture = createComponent();
    sync(fixture);

    expect(fixture.nativeElement.textContent).toContain('Cargando funciones…');
    answer(MOVIES, page([]));
    answer(ROOMS, page([]));
    answer(SHOWTIMES, page([]));
    sync(fixture);
    expect(fixture.nativeElement.textContent).toContain('No hay funciones programadas.');
  });

  it('shows the error and retries when the API does not answer', () => {
    const fixture = createComponent();
    sync(fixture);
    answer(MOVIES, page([MOVIE]));
    answer(ROOMS, page([ROOM]));
    http
      .expectOne(req => req.url === SHOWTIMES)
      .flush({ error: 'SERVICE_UNAVAILABLE', message: 'Servicio no disponible.' }, { status: 503, statusText: 'x' });
    sync(fixture);

    expect(fixture.nativeElement.textContent).toContain('Servicio no disponible.');
    fixture.nativeElement.querySelector('tbody button').click();
    answer(SHOWTIMES, page([SHOWTIME]));
    sync(fixture);

    expect(rowsOf(fixture).length).toBe(1);
  });

  it('computes the end time from the duration of the movie', () => {
    const fixture = loaded();
    const component = fixture.componentInstance;

    fillForm(component);

    expect(component.endTime).toBe('2026-11-02T22:00');
  });

  it('schedules a showtime, resets the form and toasts the confirmation', () => {
    const fixture = loaded([]);
    const component = fixture.componentInstance;

    fillForm(component);
    component.schedule();
    const request = http.expectOne(SHOWTIMES);
    expect(request.request.body.priceCents).toBe(1500000);
    request.flush(SHOWTIME, { status: 201, statusText: 'Created' });
    sync(fixture);

    expect(rowsOf(fixture).length).toBe(1);
    expect(toasts()).toContain('Función programada exitosamente.');
    expect(component.selectedMovieId).toBe('');
    expect(component.price).toBeNull();
    expect(component.alertMessage).toBe('');
  });

  it('asks for every field without calling the API', () => {
    const fixture = loaded();

    fixture.componentInstance.schedule();
    sync(fixture);

    http.expectNone(SHOWTIMES);
    expect(toasts()).toContain('Completa todos los campos.');
  });

  it('shows the overlap of the room that the API refuses as a conflict next to the form', () => {
    const fixture = loaded([]);
    const component = fixture.componentInstance;

    fillForm(component);
    component.schedule();
    http
      .expectOne(SHOWTIMES)
      .flush(
        { error: 'CONFLICT', message: 'La sala ya tiene una función en ese horario.' },
        { status: 409, statusText: 'x' },
      );
    sync(fixture);

    expect(fixture.nativeElement.querySelector('.alert').textContent).toContain(
      'La sala ya tiene una función en ese horario.',
    );
    expect(toasts()).toContain('Conflicto detectado en la programación.');
    expect(component.selectedMovieId).toBe(MOVIE.id);
  });

  describe('after the room overlap was shown', () => {
    const refuseOverlap = (fixture: ComponentFixture<AdminBillboardPageComponent>) => {
      fillForm(fixture.componentInstance);
      fixture.componentInstance.schedule();
      http
        .expectOne(SHOWTIMES)
        .flush(
          { error: 'CONFLICT', message: 'La sala ya tiene una función en ese horario.' },
          { status: 409, statusText: 'x' },
        );
      sync(fixture);
      expect(fixture.nativeElement.querySelector('.alert')).not.toBeNull();
    };

    const edits: Array<[string, (component: AdminBillboardPageComponent) => void]> = [
      ['movie', (component) => component.onMovieChange(MOVIE.id)],
      ['room', (component) => component.onRoomChange(ROOM.id)],
      ['start time', (component) => component.onStartChange('2026-11-03T20:00')],
      ['price', (component) => component.onPriceChange(18000)],
    ];

    for (const [field, edit] of edits) {
      it(`clears the alert when the person edits the ${field}`, () => {
        const fixture = loaded([]);
        refuseOverlap(fixture);

        edit(fixture.componentInstance);
        sync(fixture);

        expect(fixture.nativeElement.querySelector('.alert')).toBeNull();
      });
    }

    it('clears the alert when a showtime is cancelled, because its slot may be free now', () => {
      const fixture = loaded();
      refuseOverlap(fixture);

      (rowsOf(fixture)[0].querySelector('.btn-danger') as HTMLButtonElement).click();
      http.expectOne(`${SHOWTIMES}/${SHOWTIME.id}`).flush(null, { status: 204, statusText: 'No Content' });
      sync(fixture);

      expect(fixture.nativeElement.querySelector('.alert')).toBeNull();
    });
  });

  it('toasts the message of the API when it refuses the showtime for another reason', () => {
    const fixture = loaded([]);
    const component = fixture.componentInstance;

    fillForm(component);
    component.schedule();
    http
      .expectOne(SHOWTIMES)
      .flush(
        { error: 'BUSINESS_RULE_VIOLATION', message: 'La película no está publicada.' },
        { status: 422, statusText: 'x' },
      );
    sync(fixture);

    expect(toasts()).toContain('La película no está publicada.');
    expect(fixture.nativeElement.querySelector('.alert')).toBeNull();
  });

  it('cancels a showtime and shows it as cancelled without an action', () => {
    const fixture = loaded();

    (rowsOf(fixture)[0].querySelector('.btn-danger') as HTMLButtonElement).click();
    http.expectOne(`${SHOWTIMES}/${SHOWTIME.id}`).flush(null, { status: 204, statusText: 'No Content' });
    sync(fixture);

    const row = rowsOf(fixture)[0];
    expect(row.children[5].textContent?.trim()).toBe('Cancelada');
    expect(row.querySelector('.btn-danger')).toBeNull();
    expect(toasts()).toContain('Función cancelada.');
  });

  it('toasts the message of the API when it refuses to cancel the showtime', () => {
    const fixture = loaded();

    (rowsOf(fixture)[0].querySelector('.btn-danger') as HTMLButtonElement).click();
    http
      .expectOne(`${SHOWTIMES}/${SHOWTIME.id}`)
      .flush({ error: 'CONFLICT', message: 'La función ya terminó.' }, { status: 409, statusText: 'x' });
    sync(fixture);

    expect(toasts()).toContain('La función ya terminó.');
    expect(rowsOf(fixture)[0].children[5].textContent?.trim()).toBe('Publicada');
  });
});
