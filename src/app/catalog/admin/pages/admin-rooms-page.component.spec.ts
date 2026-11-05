import { HttpErrorResponse, HttpInterceptorFn, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { RoomRecord } from '../../model/admin';
import { AdminToastService } from '../data/admin-toast.service';
import { AdminRoomsPageComponent } from './admin-rooms-page.component';

const ROOMS = '/api/v1/catalog/rooms';

const seats = (count: number) =>
  Array.from({ length: count }, (_, index) => ({ label: `A${index + 1}`, row: 'A', number: index + 1 }));

const ROOM_LIST: RoomRecord[] = [
  { id: '0b1f6f0e-0000-4000-8000-00000000000a', name: 'Sala 01 - IMAX', capacity: 48, seats: seats(48) },
  { id: '0b1f6f0e-0000-4000-8000-00000000000b', name: 'Sala 02', seats: seats(12) },
];

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

describe('AdminRoomsPageComponent', () => {
  let http: HttpTestingController;

  const createComponent = () => {
    TestBed.configureTestingModule({
      imports: [AdminRoomsPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([asShellError])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    return TestBed.createComponent(AdminRoomsPageComponent);
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

  /** Creates the page and answers the list request of its first render with the given rooms. */
  const loaded = (rooms: RoomRecord[] = ROOM_LIST) => {
    const fixture = createComponent();
    sync(fixture);
    http
      .expectOne(req => req.url === ROOMS)
      .flush({ data: rooms, meta: { page: 1, limit: 100, total: rooms.length, totalPages: 1 } });
    sync(fixture);
    return fixture;
  };

  const rowsOf = (fixture: ComponentFixture<AdminRoomsPageComponent>): HTMLTableRowElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll('.data-table tbody tr'));

  afterEach(() => http.verify());

  it('renders the page header', () => {
    const fixture = loaded();
    const content = fixture.nativeElement.textContent;

    expect(content).toContain('Configuración de Salas');
    expect(content).toContain('Administra las salas y su capacidad de asientos.');
  });

  it('renders the room creation form', () => {
    const fixture = loaded();

    expect(fixture.nativeElement.querySelector('#new-room-name')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('#new-room-capacity').getAttribute('type')).toBe('number');
    expect(fixture.nativeElement.querySelector('button[type=submit]').textContent.trim()).toBe('Guardar Sala');
  });

  it('lists the rooms of the API with their capacity, or their seats when the capacity is missing', () => {
    const fixture = loaded();
    const rows = rowsOf(fixture);

    expect(rows.length).toBe(ROOM_LIST.length);
    expect(rows[0].textContent).toContain('Sala 01 - IMAX');
    expect(rows[0].textContent).toContain('48 asientos');
    expect(rows[1].textContent).toContain('12 asientos');
    expect(rows[0].querySelector('.btn-danger')?.textContent?.trim()).toBe('Archivar');
  });

  it('asks the real API and shows no synthetic room while it loads', () => {
    const fixture = createComponent();
    sync(fixture);

    expect(fixture.nativeElement.textContent).toContain('Cargando salas…');
    http.expectOne(req => req.url === ROOMS).flush({ data: [], meta: { page: 1, limit: 100, total: 0, totalPages: 0 } });
    sync(fixture);
    expect(fixture.nativeElement.textContent).toContain('No hay salas registradas.');
  });

  it('shows the error and retries when the API does not answer', () => {
    const fixture = createComponent();
    sync(fixture);
    http
      .expectOne(req => req.url === ROOMS)
      .flush({ error: 'SERVICE_UNAVAILABLE', message: 'Servicio no disponible.' }, { status: 503, statusText: 'x' });
    sync(fixture);

    expect(fixture.nativeElement.textContent).toContain('Servicio no disponible.');
    fixture.nativeElement.querySelector('tbody button').click();
    http.expectOne(req => req.url === ROOMS).flush({ data: ROOM_LIST, meta: { page: 1, limit: 100, total: 2, totalPages: 1 } });
    sync(fixture);

    expect(rowsOf(fixture).length).toBe(ROOM_LIST.length);
  });

  it('creates a room, resets the form and toasts the confirmation', () => {
    const fixture = loaded();
    const component = fixture.componentInstance;

    component.draft.name = 'Sala 03 - VIP';
    component.draft.capacity = 60;
    component.saveRoom();
    http.expectOne(ROOMS).flush(
      { id: '0b1f6f0e-0000-4000-8000-00000000000c', name: 'Sala 03 - VIP', capacity: 60, seats: seats(60) },
      { status: 201, statusText: 'Created' },
    );
    sync(fixture);

    const rows = rowsOf(fixture);
    expect(rows.length).toBe(ROOM_LIST.length + 1);
    expect(rows[rows.length - 1].textContent).toContain('Sala 03 - VIP');
    expect(rows[rows.length - 1].textContent).toContain('60 asientos');
    expect(toasts()).toContain('Sala registrada exitosamente.');
    expect(component.draft.name).toBe('');
    expect(component.draft.capacity).toBeNull();
  });

  it('rejects a room without a name or a positive capacity without calling the API', () => {
    const fixture = loaded();
    const component = fixture.componentInstance;

    component.draft.name = '   ';
    component.draft.capacity = 60;
    component.saveRoom();
    component.draft.name = 'Sala 03';
    component.draft.capacity = 0;
    component.saveRoom();
    sync(fixture);

    http.expectNone(ROOMS);
    expect(rowsOf(fixture).length).toBe(ROOM_LIST.length);
    expect(toasts()).toContain('Ingresa un nombre y una capacidad válidos.');
  });

  it('toasts the message of the API and keeps the form when the name is already in use', () => {
    const fixture = loaded();
    const component = fixture.componentInstance;

    component.draft.name = 'Sala 02';
    component.draft.capacity = 20;
    component.saveRoom();
    http
      .expectOne(ROOMS)
      .flush({ error: 'CONFLICT', message: 'El nombre de la sala ya está en uso.' }, { status: 409, statusText: 'x' });
    sync(fixture);

    expect(toasts()).toContain('El nombre de la sala ya está en uso.');
    expect(component.draft.name).toBe('Sala 02');
    expect(rowsOf(fixture).length).toBe(ROOM_LIST.length);
  });

  it('archives a room and takes it out of the list', () => {
    const fixture = loaded();

    (rowsOf(fixture)[0].querySelector('.btn-danger') as HTMLButtonElement).click();
    http.expectOne(`${ROOMS}/${ROOM_LIST[0].id}`).flush(null, { status: 204, statusText: 'No Content' });
    sync(fixture);

    const rows = rowsOf(fixture);
    expect(rows.length).toBe(ROOM_LIST.length - 1);
    expect(rows[0].textContent).toContain('Sala 02');
    expect(toasts()).toContain('Sala archivada.');
  });

  it('toasts the message of the API when it refuses to archive the room', () => {
    const fixture = loaded();

    (rowsOf(fixture)[0].querySelector('.btn-danger') as HTMLButtonElement).click();
    http
      .expectOne(`${ROOMS}/${ROOM_LIST[0].id}`)
      .flush({ error: 'CONFLICT', message: 'La sala no se puede archivar.' }, { status: 409, statusText: 'x' });
    sync(fixture);

    expect(toasts()).toContain('La sala no se puede archivar.');
    expect(rowsOf(fixture).length).toBe(ROOM_LIST.length);
  });
});
