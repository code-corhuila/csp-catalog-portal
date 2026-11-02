import { HttpErrorResponse, HttpInterceptorFn, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { MovieRecord } from '../../model/admin';
import { AdminToastService } from '../data/admin-toast.service';
import { AdminMoviesPageComponent } from './admin-movies-page.component';

const MOVIES = '/api/v1/catalog/movies';

const MOVIE_LIST: MovieRecord[] = [
  { id: '0b1f6f0e-0000-4000-8000-00000000000a', title: 'Interstellar', durationMinutes: 169, classification: '+12', genres: ['Ciencia ficción'], status: 'PUBLISHED' },
  { id: '0b1f6f0e-0000-4000-8000-00000000000b', title: 'Neon Sky', durationMinutes: 95, classification: '+7', genres: [], status: 'DRAFT' },
  { id: '0b1f6f0e-0000-4000-8000-00000000000c', title: 'Old Reel', durationMinutes: 80, classification: 'TP', genres: ['Drama'], status: 'ARCHIVED' },
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

describe('AdminMoviesPageComponent', () => {
  let http: HttpTestingController;

  const createComponent = () => {
    TestBed.configureTestingModule({
      imports: [AdminMoviesPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([asShellError])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    return TestBed.createComponent(AdminMoviesPageComponent);
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

  /** Creates the page and answers the list request of its first render with the given movies. */
  const loaded = (movies: MovieRecord[] = MOVIE_LIST) => {
    const fixture = createComponent();
    sync(fixture);
    http
      .expectOne(req => req.url === MOVIES)
      .flush({ data: movies, meta: { page: 1, limit: 100, total: movies.length, totalPages: 1 } });
    sync(fixture);
    return fixture;
  };

  const fillDraft = (component: AdminMoviesPageComponent) => {
    component.draft.title = 'Cinema Paradiso';
    component.draft.genre = 'Suspenso';
    component.draft.duration = 124;
    component.draft.classification = 'TP';
    component.draft.synopsis = 'Un homenaje al cine de barrio.';
    component.draft.poster = '';
  };

  const rowsOf = (fixture: ComponentFixture<AdminMoviesPageComponent>): HTMLTableRowElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll('.data-table tbody tr'));

  afterEach(() => http.verify());

  it('renders the page header', () => {
    const fixture = loaded();
    const content = fixture.nativeElement.textContent;

    expect(content).toContain('Gestión de Películas');
    expect(content).toContain('Administra las películas disponibles para programar funciones.');
  });

  it('renders every field of the registration form, with an optional poster instead of a trailer', () => {
    const fixture = loaded();

    expect(fixture.nativeElement.querySelector('#new-movie-title')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('#new-movie-genre').options.length).toBe(7);
    expect(fixture.nativeElement.querySelector('#new-movie-duration')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('#new-movie-rating').options.length).toBe(6);
    expect(fixture.nativeElement.querySelector('#new-movie-synopsis').tagName).toBe('TEXTAREA');
    const poster = fixture.nativeElement.querySelector('#new-movie-poster');
    expect(poster.getAttribute('type')).toBe('url');
    expect(poster.required).toBeFalse();
    expect(fixture.nativeElement.querySelector('#new-movie-trailer')).toBeNull();
    expect(fixture.nativeElement.querySelector('button[type=submit]').textContent.trim()).toBe('Guardar Película');
  });

  it('lists the movies of the API with their duration, classification and status', () => {
    const fixture = loaded();
    const rows = rowsOf(fixture);

    expect(rows.length).toBe(MOVIE_LIST.length);
    expect(rows[0].textContent).toContain('Interstellar');
    expect(rows[0].textContent).toContain('Ciencia ficción');
    expect(rows[0].textContent).toContain('169 min');
    expect(rows.map(row => (row.children[3].textContent ?? '').trim())).toEqual(['+12', '+7', 'TP']);
    expect(rows.map(row => (row.children[4].textContent ?? '').trim())).toEqual(['Publicada', 'Borrador', 'Archivada']);
    expect(rows[1].children[1].textContent?.trim()).toBe('N/A');
  });

  it('asks the real API and shows no synthetic title while it loads', () => {
    const fixture = createComponent();
    sync(fixture);

    expect(fixture.nativeElement.textContent).toContain('Cargando películas…');
    expect(fixture.nativeElement.textContent).not.toContain('The Silent Reel');
    http.expectOne(req => req.url === MOVIES).flush({ data: [], meta: { page: 1, limit: 100, total: 0, totalPages: 0 } });
    sync(fixture);
    expect(fixture.nativeElement.textContent).toContain('No hay películas registradas.');
  });

  it('shows the error and retries when the API does not answer', () => {
    const fixture = createComponent();
    sync(fixture);
    http
      .expectOne(req => req.url === MOVIES)
      .flush({ error: 'SERVICE_UNAVAILABLE', message: 'Servicio no disponible.' }, { status: 503, statusText: 'x' });
    sync(fixture);

    expect(fixture.nativeElement.textContent).toContain('Servicio no disponible.');
    fixture.nativeElement.querySelector('tbody button').click();
    http.expectOne(req => req.url === MOVIES).flush({ data: MOVIE_LIST, meta: { page: 1, limit: 100, total: 3, totalPages: 1 } });
    sync(fixture);

    expect(rowsOf(fixture).length).toBe(MOVIE_LIST.length);
  });

  it('adds a movie, resets the form and toasts the confirmation', () => {
    const fixture = loaded();
    const component = fixture.componentInstance;

    fillDraft(component);
    component.saveMovie();
    http.expectOne(MOVIES).flush(
      { id: '0b1f6f0e-0000-4000-8000-00000000000d', title: 'Cinema Paradiso', durationMinutes: 124, classification: 'TP', genres: ['Suspenso'], status: 'PUBLISHED' },
      { status: 201, statusText: 'Created' },
    );
    sync(fixture);

    const rows = rowsOf(fixture);
    expect(rows.length).toBe(MOVIE_LIST.length + 1);
    expect(rows[rows.length - 1].textContent).toContain('Cinema Paradiso');
    expect(toasts()).toContain('Película guardada correctamente.');
    expect(component.draft.title).toBe('');
    expect(component.draft.duration).toBeNull();
    expect(component.draft.classification).toBe('');
  });

  it('rejects an incomplete movie without calling the API and keeps the list untouched', () => {
    const fixture = loaded();

    fixture.componentInstance.saveMovie();
    sync(fixture);

    http.expectNone(MOVIES);
    expect(rowsOf(fixture).length).toBe(MOVIE_LIST.length);
    expect(toasts()).toContain('Completa todos los campos de la película.');
  });

  it('toasts the message of the API and keeps the form when the API refuses the movie', () => {
    const fixture = loaded();
    const component = fixture.componentInstance;

    fillDraft(component);
    component.saveMovie();
    http.expectOne(MOVIES).flush({ error: 'CONFLICT', message: 'La película ya existe.' }, { status: 409, statusText: 'x' });
    sync(fixture);

    expect(toasts()).toContain('La película ya existe.');
    expect(component.draft.title).toBe('Cinema Paradiso');
    expect(rowsOf(fixture).length).toBe(MOVIE_LIST.length);
  });

  it('archives a movie, shows it as archived and removes its action', () => {
    const fixture = loaded();

    (rowsOf(fixture)[0].querySelector('.btn-danger') as HTMLButtonElement).click();
    http.expectOne(`${MOVIES}/${MOVIE_LIST[0].id}`).flush(null, { status: 204, statusText: 'No Content' });
    sync(fixture);

    const row = rowsOf(fixture)[0];
    expect(row.children[4].textContent?.trim()).toBe('Archivada');
    expect(row.querySelector('.btn-danger')).toBeNull();
    expect(toasts()).toContain('Película archivada.');
  });

  it('offers no action on a movie that is already archived', () => {
    const fixture = loaded();

    expect(rowsOf(fixture)[2].querySelector('.btn-danger')).toBeNull();
  });

  it('toasts the message of the API when it refuses to archive the movie', () => {
    const fixture = loaded();

    (rowsOf(fixture)[0].querySelector('.btn-danger') as HTMLButtonElement).click();
    http
      .expectOne(`${MOVIES}/${MOVIE_LIST[0].id}`)
      .flush({ error: 'BUSINESS_RULE_VIOLATION', message: 'La película tiene funciones programadas.' }, { status: 422, statusText: 'x' });
    sync(fixture);

    expect(toasts()).toContain('La película tiene funciones programadas.');
    expect(rowsOf(fixture)[0].children[4].textContent?.trim()).toBe('Publicada');
  });
});
