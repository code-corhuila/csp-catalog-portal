import { TestBed } from '@angular/core/testing';
import { SyntheticCatalogDataService } from './synthetic-catalog-data.service';
import { SYNTHETIC_CATALOG } from './synthetic-catalog';

describe('SyntheticCatalogDataService', () => {
  let service: SyntheticCatalogDataService;

  beforeEach(() => {
    service = TestBed.configureTestingModule({
      providers: [SyntheticCatalogDataService],
    }).inject(SyntheticCatalogDataService);
  });

  it('filters draft movies from the billboard', () => {
    const publishedMovies = service.getPublishedMovies();
    const publishedTitles = new Set(publishedMovies.map(movie => movie.title));

    expect(publishedMovies.length).toBe(
      SYNTHETIC_CATALOG.movies.filter(movie => movie.publicationStatus === 'PUBLISHED').length,
    );
    expect(publishedMovies.every(movie => movie.status === 'PUBLISHED')).toBeTrue();
    expect(
      SYNTHETIC_CATALOG.movies
        .filter(movie => movie.publicationStatus === 'DRAFT')
        .every(movie => !publishedTitles.has(movie.title)),
    ).toBeTrue();
  });

  it('returns every seat from the room with deterministic availability', () => {
    const seats = service.getSeats(SYNTHETIC_CATALOG.showtimes[0].id);
    const expectedLabels = SYNTHETIC_CATALOG.rooms[0].seatLabels;

    expect(seats.map(seat => seat.label)).toEqual(expectedLabels);
    expect(seats.length).toBe(expectedLabels.length);
    expect(seats[0].available).toBeFalse();
    expect(seats.slice(1).every(seat => seat.available)).toBeTrue();
  });

  it('does not expose showtimes or seats for a draft movie', () => {
    expect(service.getShowtimes('22222222-2222-2222-2222-222222222222')).toEqual([]);
    expect(service.getSeats('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')).toEqual([]);
  });

  describe('getMovie', () => {
    it('returns a published movie by id', () => {
      const publishedMovie = SYNTHETIC_CATALOG.movies.find(m => m.publicationStatus === 'PUBLISHED')!;
      const movie = service.getMovie(publishedMovie.id);

      expect(movie).toBeDefined();
      expect(movie!.id).toBe(publishedMovie.id);
      expect(movie!.title).toBe(publishedMovie.title);
      expect(movie!.status).toBe('PUBLISHED');
    });

    it('returns undefined for a draft movie id', () => {
      const draftMovie = SYNTHETIC_CATALOG.movies.find(m => m.publicationStatus === 'DRAFT')!;
      const movie = service.getMovie(draftMovie.id);

      expect(movie).toBeUndefined();
    });

    it('returns undefined for a non-existent id', () => {
      const movie = service.getMovie('non-existent-id');
      expect(movie).toBeUndefined();
    });
  });

  describe('getShowtimes', () => {
    it('returns only showtimes of published movies when called without arguments', () => {
      const showtimes = service.getShowtimes();
      const publishedMovieIds = new Set(
        SYNTHETIC_CATALOG.movies.filter(m => m.publicationStatus === 'PUBLISHED').map(m => m.id),
      );

      expect(showtimes.length).toBeGreaterThan(0);
      expect(showtimes.every(st => publishedMovieIds.has(st.movieId))).toBeTrue();
    });

    it('returns all showtimes for a published movie id', () => {
      const publishedMovie = SYNTHETIC_CATALOG.movies.find(m => m.publicationStatus === 'PUBLISHED')!;
      const showtimes = service.getShowtimes(publishedMovie.id);
      const expectedCount = SYNTHETIC_CATALOG.showtimes.filter(st => st.movieId === publishedMovie.id).length;

      expect(showtimes.length).toBe(expectedCount);
      expect(showtimes.every(st => st.movieId === publishedMovie.id)).toBeTrue();
    });

    it('returns empty array for a draft movie id', () => {
      const draftMovie = SYNTHETIC_CATALOG.movies.find(m => m.publicationStatus === 'DRAFT')!;
      const showtimes = service.getShowtimes(draftMovie.id);

      expect(showtimes).toEqual([]);
    });
  });

  describe('getRoom', () => {
    it('returns room with mapped seats for an existing room id', () => {
      const room = service.getRoom(SYNTHETIC_CATALOG.rooms[0].id);

      expect(room).toBeDefined();
      expect(room!.id).toBe(SYNTHETIC_CATALOG.rooms[0].id);
      expect(room!.name).toBe(SYNTHETIC_CATALOG.rooms[0].name);
      expect(room!.seats.map(s => s.label)).toEqual(SYNTHETIC_CATALOG.rooms[0].seatLabels);
    });

    it('returns undefined for a non-existent room id', () => {
      const room = service.getRoom('non-existent-room');
      expect(room).toBeUndefined();
    });
  });

  describe('getSeats', () => {
    it('returns seats with deterministic availability for a published showtime', () => {
      const publishedShowtime = SYNTHETIC_CATALOG.showtimes.find(st =>
        SYNTHETIC_CATALOG.movies.some(m => m.id === st.movieId && m.publicationStatus === 'PUBLISHED'),
      )!;
      const seats = service.getSeats(publishedShowtime.id);
      const expectedLabels = SYNTHETIC_CATALOG.rooms[0].seatLabels;

      expect(seats.map(s => s.label)).toEqual(expectedLabels);
      expect(seats[0].available).toBeFalse();
      expect(seats.slice(1).every(s => s.available)).toBeTrue();
    });

    it('returns empty array for a draft movie showtime', () => {
      const draftShowtime = SYNTHETIC_CATALOG.showtimes.find(st =>
        SYNTHETIC_CATALOG.movies.some(m => m.id === st.movieId && m.publicationStatus === 'DRAFT'),
      )!;
      const seats = service.getSeats(draftShowtime.id);

      expect(seats).toEqual([]);
    });

    it('returns empty array for a non-existent showtime id', () => {
      const seats = service.getSeats('non-existent-showtime');
      expect(seats).toEqual([]);
    });
  });

  describe('cross-cutting DRAFT rules', () => {
    it('all published movies are visible through the public API', () => {
      const publishedMovies = SYNTHETIC_CATALOG.movies.filter(m => m.publicationStatus === 'PUBLISHED');

      publishedMovies.forEach(movie => {
        expect(service.getMovie(movie.id)).toBeDefined();
        expect(service.getShowtimes(movie.id).length).toBeGreaterThan(0);
      });
    });

    it('all draft movies and their showtimes are hidden from the public API', () => {
      const draftMovies = SYNTHETIC_CATALOG.movies.filter(m => m.publicationStatus === 'DRAFT');

      draftMovies.forEach(movie => {
        expect(service.getMovie(movie.id)).toBeUndefined();
        expect(service.getShowtimes(movie.id)).toEqual([]);

        const draftShowtimes = SYNTHETIC_CATALOG.showtimes.filter(st => st.movieId === movie.id);
        draftShowtimes.forEach(st => {
          expect(service.getSeats(st.id)).toEqual([]);
        });
      });
    });
  });
});
