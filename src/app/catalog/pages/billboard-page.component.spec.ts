import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { RouterLink, provideRouter } from '@angular/router';
import { NEVER, Observable, of, Subject, throwError } from 'rxjs';
import { CatalogApiService } from '../data/catalog-api.service';
import { SYNTHETIC_CATALOG } from '../data/synthetic-catalog';
import { BillboardItem, BillboardMovie, Page } from '../model/billboard';
import { ApiError } from '../../shell-contract';
import { BillboardPageComponent } from './billboard-page.component';

function movie(n: number, overrides: Partial<BillboardMovie> = {}): BillboardMovie {
  return {
    id: `movie-${n}`,
    title: `Real Movie ${n}`,
    synopsis: `Synopsis of movie ${n}`,
    durationMinutes: 100 + n,
    genres: ['Drama', 'Comedia'],
    classification: 'PG-13',
    posterUrl: `https://example.com/poster-${n}.png`,
    ...overrides,
  };
}

function moviesPage(movies: BillboardMovie[], page = 1, totalPages = 1): Page<BillboardMovie> {
  return { data: movies, meta: { page, limit: 12, total: movies.length * totalPages, totalPages } };
}

function showtimesOf(movieId: string, ids: string[]): Page<BillboardItem> {
  const data = ids.map(id => ({
    movie: movie(0, { id: movieId }),
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

describe('BillboardPageComponent', () => {
  let api: jasmine.SpyObj<CatalogApiService>;

  beforeEach(() => {
    api = jasmine.createSpyObj<CatalogApiService>('CatalogApiService', ['searchMovies', 'getBillboard']);
    api.getBillboard.and.callFake(query => of(showtimesOf(query?.movieId ?? '', [])));
  });

  const create = (search: Observable<Page<BillboardMovie>>) => {
    api.searchMovies.and.returnValue(search);
    const fixture = TestBed.configureTestingModule({
      imports: [BillboardPageComponent],
      providers: [provideRouter([]), { provide: CatalogApiService, useValue: api }],
    }).createComponent(BillboardPageComponent);
    fixture.detectChanges();
    return fixture;
  };

  const text = (fixture: { nativeElement: HTMLElement }) => fixture.nativeElement.textContent ?? '';
  const query = (fixture: { nativeElement: HTMLElement }, selector: string) =>
    fixture.nativeElement.querySelector(selector);
  const queryAll = (fixture: { nativeElement: HTMLElement }, selector: string) =>
    Array.from(fixture.nativeElement.querySelectorAll(selector));

  function type(fixture: { nativeElement: HTMLElement; detectChanges(): void }, selector: string, value: string) {
    const input = query(fixture, selector) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  describe('the billboard of the real API', () => {
    it('asks the first page with no filter when it opens and lists the movies', () => {
      const fixture = create(of(moviesPage([movie(1), movie(2)])));

      expect(api.searchMovies).toHaveBeenCalledOnceWith(
        jasmine.objectContaining({ q: '', genre: '', page: 1 }),
      );
      expect(queryAll(fixture, '.movie-card').length).toBe(2);
    });

    it('shows the title, the duration, the genres and the synopsis of each movie', () => {
      const fixture = create(of(moviesPage([movie(1)])));

      const card = query(fixture, '.movie-card') as HTMLElement;
      expect(card.textContent).toContain('Real Movie 1');
      expect(card.textContent).toContain('101 min');
      expect(card.textContent).toContain('Drama · Comedia');
      expect(card.textContent).toContain('Synopsis of movie 1');
    });

    it('uses the poster of the movie and shows no rating, which the API does not have', () => {
      const fixture = create(of(moviesPage([movie(1)])));

      const poster = query(fixture, '.poster') as HTMLElement;
      expect(poster.style.backgroundImage).toContain('https://example.com/poster-1.png');
      expect(query(fixture, '.poster-rating')).toBeNull();
    });

    it('links each movie to its detail', () => {
      const fixture = create(of(moviesPage([movie(1)])));

      const link = query(fixture, 'a.primary-action') as HTMLAnchorElement;
      expect(link.getAttribute('href')).toBe('/movies/movie-1');
    });

    it('passes the movie with each link to its detail, so the detail can show it at once', () => {
      const fixture = create(of(moviesPage([movie(1)])));

      const links = fixture.debugElement
        .queryAll(By.directive(RouterLink))
        .filter(item => (item.nativeElement as HTMLElement).matches('.poster, .movie-title, a.primary-action'));

      expect(links.length).toBe(3);
      links.forEach(item => expect(item.injector.get(RouterLink).state).toEqual({ movie: movie(1) }));
    });

    it('never shows the synthetic dataset', () => {
      const fixture = create(of(moviesPage([movie(1)])));

      SYNTHETIC_CATALOG.movies.forEach(synthetic => expect(text(fixture)).not.toContain(synthetic.title));
    });

    it('keeps the hero of the page and shows no authentication button', () => {
      const fixture = create(of(moviesPage([movie(1)])));

      expect(text(fixture)).toContain('TU CINE, TU EXPERIENCIA');
      expect(text(fixture)).toContain('Vive el cine');
      expect(text(fixture)).not.toContain('Iniciar sesión');
      expect(text(fixture)).not.toContain('Registrarse');
    });
  });

  describe('the showtimes', () => {
    it('links each showtime of a movie to the booking of that showtime', () => {
      api.getBillboard.and.callFake(query => of(showtimesOf(query?.movieId ?? '', ['s-1', 's-2'])));
      const fixture = create(of(moviesPage([movie(1)])));

      const links = queryAll(fixture, '.showtime-link') as HTMLAnchorElement[];
      expect(links.map(link => link.getAttribute('href'))).toEqual(['/booking/showtime/s-1', '/booking/showtime/s-2']);
    });

    it('says that a movie has no upcoming showtime', () => {
      const fixture = create(of(moviesPage([movie(1)])));

      expect(text(fixture)).toContain('Sin funciones próximas');
      expect(queryAll(fixture, '.showtime-link').length).toBe(0);
    });

    it('says that the showtimes are loading until they arrive', () => {
      const pending = new Subject<Page<BillboardItem>>();
      api.getBillboard.and.returnValue(pending);
      const fixture = create(of(moviesPage([movie(1)])));

      expect(text(fixture)).toContain('Cargando funciones');
      expect(text(fixture)).not.toContain('Sin funciones próximas');

      pending.next(showtimesOf('movie-1', ['s-1']));
      pending.complete();
      fixture.detectChanges();
      expect(queryAll(fixture, '.showtime-link').length).toBe(1);
    });

    it('says that the showtimes could not be loaded, not that there are none', () => {
      api.getBillboard.and.returnValue(throwError(() => API_ERROR));
      const fixture = create(of(moviesPage([movie(1)])));

      expect(text(fixture)).toContain('No se pudieron cargar las funciones');
      expect(text(fixture)).not.toContain('Sin funciones próximas');
    });
  });

  describe('the states', () => {
    it('shows that it is loading and no card while the search is pending', () => {
      const fixture = create(NEVER);

      expect(text(fixture)).toContain('Cargando cartelera');
      expect(queryAll(fixture, '.movie-card').length).toBe(0);
    });

    it('shows the empty state when no movie matches', () => {
      const fixture = create(of(moviesPage([], 1, 0)));

      expect(text(fixture)).toContain('No se encontraron películas que coincidan con los criterios de búsqueda.');
      expect(queryAll(fixture, '.movie-card').length).toBe(0);
    });

    it('shows the message of the error and a retry that asks again, with no synthetic fallback', () => {
      const fixture = create(throwError(() => API_ERROR));

      expect(text(fixture)).toContain('The catalog is not available, try again later.');
      expect(queryAll(fixture, '.movie-card').length).toBe(0);
      SYNTHETIC_CATALOG.movies.forEach(synthetic => expect(text(fixture)).not.toContain(synthetic.title));

      api.searchMovies.and.returnValue(of(moviesPage([movie(1)])));
      (query(fixture, 'button.retry') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(api.searchMovies).toHaveBeenCalledTimes(2);
      expect(queryAll(fixture, '.movie-card').length).toBe(1);
    });
  });

  describe('the search form', () => {
    it('asks the first page with the text, the genre and the maximum duration that were typed', async () => {
      const fixture = create(of(moviesPage([movie(1)])));
      await fixture.whenStable();
      api.searchMovies.calls.reset();

      type(fixture, 'input[name="q"]', 'space action');
      type(fixture, 'input[name="genre"]', 'Drama');
      type(fixture, 'input[name="durationMax"]', '150');
      (query(fixture, 'button[type="submit"]') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(api.searchMovies).toHaveBeenCalledOnceWith(
        jasmine.objectContaining({ q: 'space action', genre: 'Drama', durationMax: 150, page: 1 }),
      );
    });

    it('asks no maximum duration when the field is empty', () => {
      const fixture = create(of(moviesPage([movie(1)])));
      api.searchMovies.calls.reset();

      (query(fixture, 'button[type="submit"]') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(api.searchMovies.calls.mostRecent().args[0]?.durationMax).toBeUndefined();
    });

    it('suggests the genres of the movies already seen', () => {
      const fixture = create(
        of(moviesPage([movie(1, { genres: ['Terror'] }), movie(2, { genres: ['Acción', 'Terror'] })])),
      );

      const options = queryAll(fixture, 'datalist option') as HTMLOptionElement[];
      expect(options.map(option => option.value)).toEqual(['Acción', 'Terror']);
    });
  });

  describe('the pages', () => {
    it('shows no pagination when there is one page', () => {
      const fixture = create(of(moviesPage([movie(1)], 1, 1)));

      expect(query(fixture, 'nav.pagination')).toBeNull();
    });

    it('shows the page and asks the next one with the same filters', () => {
      const fixture = create(of(moviesPage([movie(1)], 1, 3)));
      api.searchMovies.calls.reset();
      api.searchMovies.and.returnValue(of(moviesPage([movie(2)], 2, 3)));

      expect(text(fixture)).toContain('Página 1 de 3');
      (query(fixture, 'button.next') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(api.searchMovies).toHaveBeenCalledOnceWith(jasmine.objectContaining({ page: 2 }));
      expect(text(fixture)).toContain('Página 2 de 3');
    });

    it('disables the previous page on the first page and the next page on the last', () => {
      const first = create(of(moviesPage([movie(1)], 1, 2)));
      expect((query(first, 'button.previous') as HTMLButtonElement).disabled).toBeTrue();
      expect((query(first, 'button.next') as HTMLButtonElement).disabled).toBeFalse();
      TestBed.resetTestingModule();

      api.getBillboard.and.callFake(q => of(showtimesOf(q?.movieId ?? '', [])));
      const last = create(of(moviesPage([movie(2)], 2, 2)));
      expect((last.nativeElement.querySelector('button.next') as HTMLButtonElement).disabled).toBeTrue();
      expect((last.nativeElement.querySelector('button.previous') as HTMLButtonElement).disabled).toBeFalse();
    });
  });
});
