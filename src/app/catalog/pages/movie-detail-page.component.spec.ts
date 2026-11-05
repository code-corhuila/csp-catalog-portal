import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Navigation, Router } from '@angular/router';
import { Observable, Subject, of, throwError } from 'rxjs';
import { ApiError } from '../../shell-contract';
import { CatalogApiService } from '../data/catalog-api.service';
import { SYNTHETIC_CATALOG } from '../data/synthetic-catalog';
import { BillboardItem, BillboardMovie, Page } from '../model/billboard';
import { MovieDetailPageComponent } from './movie-detail-page.component';

const MOVIE: BillboardMovie = {
  id: '11111111-1111-4111-8111-111111111111',
  title: 'Real Movie',
  synopsis: 'A synopsis of the real movie',
  durationMinutes: 121,
  genres: ['Drama', 'Comedia'],
  classification: 'PG-13',
  posterUrl: 'https://example.com/poster.png',
  releaseDate: '2026-12-01',
};

function showtimesOf(ids: string[], movie: BillboardMovie = MOVIE): Page<BillboardItem> {
  const data = ids.map(id => ({
    movie,
    room: { id: 'room-1', name: 'Room 1', capacity: 80 },
    showtime: {
      id,
      startsAt: '2026-11-01T20:00:00Z',
      endsAt: '2026-11-01T22:00:00Z',
      priceCents: 1500,
      audioLanguage: 'es',
      subtitleLanguage: 'en',
    },
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

describe('MovieDetailPageComponent', () => {
  let api: jasmine.SpyObj<CatalogApiService>;

  beforeEach(() => {
    api = jasmine.createSpyObj<CatalogApiService>('CatalogApiService', ['getBillboard']);
  });

  /** Opens the detail of `movieId`; `known` is the movie that the billboard passed in the navigation state. */
  const open = (answer: Observable<Page<BillboardItem>>, known?: BillboardMovie, movieId = MOVIE.id) => {
    api.getBillboard.and.returnValue(answer);
    TestBed.configureTestingModule({
      imports: [MovieDetailPageComponent],
      providers: [
        { provide: CatalogApiService, useValue: api },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => movieId } } } },
      ],
    });
    spyOn(TestBed.inject(Router), 'getCurrentNavigation').and.returnValue(
      (known ? { extras: { state: { movie: known } } } : null) as Navigation | null,
    );
    const fixture = TestBed.createComponent(MovieDetailPageComponent);
    fixture.detectChanges();
    return fixture;
  };

  const text = (fixture: { nativeElement: HTMLElement }) => fixture.nativeElement.textContent ?? '';
  const links = (fixture: { nativeElement: HTMLElement }) =>
    (Array.from(fixture.nativeElement.querySelectorAll('.showtime-button')) as HTMLAnchorElement[]).map(link =>
      link.getAttribute('href'),
    );

  describe('the movie of the URL', () => {
    it('asks the upcoming showtimes of that movie', () => {
      open(of(showtimesOf(['s-1'])));

      expect(api.getBillboard).toHaveBeenCalledOnceWith({ movieId: MOVIE.id, limit: 100 });
    });

    it('shows the movie and links its showtimes to the booking when it arrives from the URL alone', () => {
      const fixture = open(of(showtimesOf(['s-1', 's-2'])));

      expect(text(fixture)).toContain('Real Movie');
      expect(text(fixture)).toContain('121 minutos');
      expect(text(fixture)).toContain('Drama · Comedia');
      expect(text(fixture)).toContain('PG-13');
      expect(text(fixture)).toContain('A synopsis of the real movie');
      expect(links(fixture)).toEqual(['/booking/showtime/s-1', '/booking/showtime/s-2']);
    });

    it('shows the poster as the banner and no trailer or rating, which the API does not have', () => {
      const fixture = open(of(showtimesOf(['s-1'])));

      const banner = fixture.nativeElement.querySelector('.banner') as HTMLElement;
      expect(banner.style.backgroundImage).toContain('https://example.com/poster.png');
      expect(fixture.nativeElement.querySelector('.trailer-btn')).toBeNull();
      expect(text(fixture)).not.toContain('Rating');
    });

    it('says that it is loading until the API answers', () => {
      const pending = new Subject<Page<BillboardItem>>();
      const fixture = open(pending);

      expect(text(fixture)).toContain('Cargando película');
      expect(fixture.nativeElement.querySelector('h2')).toBeNull();
    });

    it('offers the way back to the billboard', () => {
      const fixture = open(of(showtimesOf(['s-1'])));

      expect(text(fixture)).toContain('Volver a la cartelera');
    });
  });

  describe('the movie that the billboard passed', () => {
    it('shows it at once, before the showtimes arrive, and says that they are loading', () => {
      const pending = new Subject<Page<BillboardItem>>();
      const fixture = open(pending, MOVIE);

      expect(text(fixture)).toContain('Real Movie');
      expect(text(fixture)).toContain('Cargando funciones');

      pending.next(showtimesOf(['s-1']));
      pending.complete();
      fixture.detectChanges();
      expect(links(fixture)).toEqual(['/booking/showtime/s-1']);
      expect(text(fixture)).not.toContain('Cargando funciones');
    });

    it('ignores the movie of another URL', () => {
      const other: BillboardMovie = { ...MOVIE, id: '99999999-9999-4999-8999-999999999999', title: 'Other Movie' };
      const pending = new Subject<Page<BillboardItem>>();
      const fixture = open(pending, other);

      expect(text(fixture)).not.toContain('Other Movie');
      expect(text(fixture)).toContain('Cargando película');
    });

    it('keeps showing the movie, with no showtime, when it has none upcoming', () => {
      const fixture = open(of(showtimesOf([])), MOVIE);

      expect(text(fixture)).toContain('Real Movie');
      expect(text(fixture)).toContain('Sin funciones próximas');
      expect(links(fixture)).toEqual([]);
    });

    it('says that the showtimes could not be loaded, not that there are none', () => {
      const fixture = open(throwError(() => API_ERROR), MOVIE);

      expect(text(fixture)).toContain('Real Movie');
      expect(text(fixture)).toContain('No se pudieron cargar las funciones');
      expect(text(fixture)).not.toContain('Sin funciones próximas');
    });
  });

  describe('when the movie cannot be shown', () => {
    it('says that the movie is not available when it has no upcoming showtime and nothing was passed', () => {
      const fixture = open(of(showtimesOf([])));

      expect(text(fixture)).toContain('Película no disponible');
      expect(fixture.nativeElement.querySelector('h2')).toBeNull();
    });

    it('shows the message of the error and a retry that asks again', () => {
      const fixture = open(throwError(() => API_ERROR));

      expect(text(fixture)).toContain('The catalog is not available, try again later.');

      api.getBillboard.and.returnValue(of(showtimesOf(['s-1'])));
      (fixture.nativeElement.querySelector('button.retry') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(api.getBillboard).toHaveBeenCalledTimes(2);
      expect(text(fixture)).toContain('Real Movie');
    });

    it('never shows the synthetic dataset, not even for the id of a synthetic movie', () => {
      const synthetic = SYNTHETIC_CATALOG.movies[0];
      const fixture = open(of(showtimesOf([])), undefined, synthetic.id);

      expect(text(fixture)).toContain('Película no disponible');
      SYNTHETIC_CATALOG.movies.forEach(item => expect(text(fixture)).not.toContain(item.title));
    });
  });
});
