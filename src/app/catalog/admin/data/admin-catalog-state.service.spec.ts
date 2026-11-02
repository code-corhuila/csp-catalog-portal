import { TestBed } from '@angular/core/testing';
import { AdminCatalogStateService } from './admin-catalog-state.service';
import { SYNTHETIC_CATALOG } from '../../data/synthetic-catalog';

describe('AdminCatalogStateService', () => {
  let service: AdminCatalogStateService;

  beforeEach(() => {
    service = TestBed.configureTestingModule({
      providers: [AdminCatalogStateService],
    }).inject(AdminCatalogStateService);
  });

  it('seeds every movie, room and showtime of the burned-in dataset', () => {
    expect(service.movies().length).toBe(SYNTHETIC_CATALOG.movies.length);
    expect(service.rooms().length).toBe(SYNTHETIC_CATALOG.rooms.length);
    expect(service.showtimes().length).toBe(SYNTHETIC_CATALOG.showtimes.length);

    // Identity, not just cardinality: every seeded entry keeps its key and headline properties.
    SYNTHETIC_CATALOG.movies.forEach((movie) => {
      const seeded = service.movies().find((entry) => entry.id === movie.id);

      expect(seeded?.title).toBe(movie.title);
      expect(seeded?.genres).toEqual(movie.genres);
      expect(seeded?.duration).toBe(movie.duration);
    });
    SYNTHETIC_CATALOG.rooms.forEach((room) => {
      const seeded = service.rooms().find((entry) => entry.id === room.id);

      expect(seeded?.name).toBe(room.name);
      expect(seeded?.seatLabels).toEqual(room.seatLabels);
    });
    SYNTHETIC_CATALOG.showtimes.forEach((showtime) => {
      const seeded = service.showtimes().find((entry) => entry.id === showtime.id);

      expect(seeded?.movieId).toBe(showtime.movieId);
      expect(seeded?.roomId).toBe(showtime.roomId);
      expect(seeded?.startsAt).toBe(showtime.startsAt);
    });
  });

  it('lists drafts alongside published movies for the administrator', () => {
    const draft = SYNTHETIC_CATALOG.movies.find((movie) => movie.publicationStatus === 'DRAFT')!;

    expect(service.movies().some((movie) => movie.id === draft.id)).toBeTrue();
    expect(service.movieTitle(draft.id)).toBe(draft.title);
  });

  it('reports metrics, room occupancy and the showtime summary', () => {
    const metrics = service.metrics();
    expect(metrics.movies).toBe(SYNTHETIC_CATALOG.movies.length);
    expect(metrics.rooms).toBe(SYNTHETIC_CATALOG.rooms.length);
    expect(metrics.showtimes).toBe(SYNTHETIC_CATALOG.showtimes.length);

    const occupancy = service.occupancy();
    expect(occupancy.length).toBe(SYNTHETIC_CATALOG.rooms.length);
    expect(occupancy[0].name).toBe(SYNTHETIC_CATALOG.rooms[0].name);
    expect(occupancy[0].capacityLabel).toBe('48 asientos');
    expect(occupancy[0].showtimes).toBe(SYNTHETIC_CATALOG.showtimes.length);
    expect(occupancy[0].status).toBe('Con funciones');

    const summary = service.summary();
    expect(summary.length).toBe(SYNTHETIC_CATALOG.showtimes.length);
    expect(summary[0].movie).toBe(service.movieTitle(SYNTHETIC_CATALOG.showtimes[0].movieId));
    expect(summary[0].room).toBe(service.roomName(SYNTHETIC_CATALOG.showtimes[0].roomId));
    expect(summary[0].status).toBe('Publicada');
  });

  it('resolves titles and rooms of unknown ids with a placeholder', () => {
    expect(service.movieTitle('missing-movie')).toBe('—');
    expect(service.roomName('missing-room')).toBe('—');
    expect(service.roomName(SYNTHETIC_CATALOG.rooms[0].id)).toBe(SYNTHETIC_CATALOG.rooms[0].name);
  });
});
