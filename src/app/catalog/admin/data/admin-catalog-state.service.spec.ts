import { TestBed } from '@angular/core/testing';
import {
  AdminCatalogStateService,
  parseDateTimeLocal,
  toDateTimeLocalValue,
} from './admin-catalog-state.service';
import { SYNTHETIC_CATALOG } from '../../data/synthetic-catalog';

describe('AdminCatalogStateService', () => {
  let service: AdminCatalogStateService;

  beforeEach(() => {
    service = TestBed.configureTestingModule({
      providers: [AdminCatalogStateService],
    }).inject(AdminCatalogStateService);
  });

  const lastMovieId = () => service.movies()[service.movies().length - 1].id;
  const lastRoomId = () => service.rooms()[service.rooms().length - 1].id;

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

  it('never mutates the SYNTHETIC_CATALOG constant', () => {
    const movies = SYNTHETIC_CATALOG.movies.length;
    const rooms = SYNTHETIC_CATALOG.rooms.length;
    const showtimes = SYNTHETIC_CATALOG.showtimes.length;
    // Deep snapshot: detects field-level changes on the existing entries, not only new rows.
    const snapshot = structuredClone(SYNTHETIC_CATALOG);

    service.addMovie({
      title: 'Cinema Paradiso',
      genre: 'Suspenso',
      duration: 124,
      classification: 'TP',
      synopsis: 'Un homenaje al cine de barrio.',
      trailer: 'https://www.youtube.com/watch?v=abc',
    });
    service.addRoom('Sala 02 - VIP', 40);
    service.scheduleShowtime(lastMovieId(), lastRoomId(), '2026-11-02T09:00');

    expect(SYNTHETIC_CATALOG).toEqual(snapshot);
    expect(SYNTHETIC_CATALOG.movies.length).toBe(movies);
    expect(SYNTHETIC_CATALOG.rooms.length).toBe(rooms);
    expect(SYNTHETIC_CATALOG.showtimes.length).toBe(showtimes);
    expect(SYNTHETIC_CATALOG.movies.some((movie) => movie.title === 'Cinema Paradiso')).toBeFalse();
  });

  it('lists drafts alongside published movies for the administrator', () => {
    const draft = SYNTHETIC_CATALOG.movies.find((movie) => movie.publicationStatus === 'DRAFT')!;

    expect(service.movies().some((movie) => movie.id === draft.id)).toBeTrue();
    expect(service.movieTitle(draft.id)).toBe(draft.title);
  });

  it('adds a published movie with its classification', () => {
    const before = service.movies().length;

    const result = service.addMovie({
      title: '  Cinema Paradiso  ',
      genre: 'Suspenso',
      duration: 124.7,
      classification: 'TP',
      synopsis: ' Un homenaje al cine de barrio. ',
      trailer: ' https://www.youtube.com/watch?v=abc ',
    });

    expect(result.ok).toBeTrue();
    const created = service.movies()[service.movies().length - 1];
    expect(service.movies().length).toBe(before + 1);
    expect(created.title).toBe('Cinema Paradiso');
    expect(created.duration).toBe(124);
    expect(created.genres).toEqual(['Suspenso']);
    expect(created.classification).toBe('TP');
    expect(created.description).toBe('Un homenaje al cine de barrio.');
    expect(created.trailerUrl).toBe('https://www.youtube.com/watch?v=abc');
    expect(created.publicationStatus).toBe('PUBLISHED');
  });

  it('rejects an incomplete movie', () => {
    const before = service.movies().length;

    const result = service.addMovie({
      title: '   ',
      genre: '',
      duration: null,
      classification: '',
      synopsis: '',
      trailer: '',
    });

    expect(result.ok).toBeFalse();
    expect(result.message).toBe('Completa todos los campos de la película.');
    expect(service.movies().length).toBe(before);
  });

  it('does not delete a movie that has scheduled showtimes', () => {
    const movie = SYNTHETIC_CATALOG.movies[0];
    const before = service.movies().length;

    const result = service.removeMovie(movie.id);

    expect(result.ok).toBeFalse();
    expect(result.message).toBe('No se puede eliminar una película que tiene funciones programadas.');
    expect(service.movies().length).toBe(before);
    expect(service.movies().some((item) => item.id === movie.id)).toBeTrue();
  });

  it('deletes a movie without showtimes', () => {
    service.addMovie({
      title: 'Cinema Paradiso',
      genre: 'Suspenso',
      duration: 124,
      classification: 'TP',
      synopsis: 'Un homenaje al cine de barrio.',
      trailer: 'https://www.youtube.com/watch?v=abc',
    });
    const before = service.movies().length;

    const result = service.removeMovie(lastMovieId());

    expect(result.ok).toBeTrue();
    expect(result.message).toBe('Película eliminada.');
    expect(service.movies().length).toBe(before - 1);
  });

  it('creates a room with seat labels in rows of eight', () => {
    const before = service.rooms().length;

    const result = service.addRoom('  Sala 02 - VIP  ', 20.4);

    expect(result.ok).toBeTrue();
    expect(result.message).toBe('Sala registrada exitosamente.');
    expect(service.rooms().length).toBe(before + 1);
    const room = service.rooms()[service.rooms().length - 1];
    expect(room.name).toBe('Sala 02 - VIP');
    expect(room.seatLabels.length).toBe(20);
    expect(room.seatLabels[0]).toBe('A1');
    expect(room.seatLabels[19]).toBe('C4');
  });

  it('rejects a room without a name or a positive capacity', () => {
    const before = service.rooms().length;

    expect(service.addRoom('   ', 120).ok).toBeFalse();
    expect(service.addRoom('Sala 03', 0).ok).toBeFalse();
    expect(service.rooms().length).toBe(before);
  });

  it('does not delete a room that has scheduled showtimes', () => {
    const room = SYNTHETIC_CATALOG.rooms[0];
    const before = service.rooms().length;

    const result = service.removeRoom(room.id);

    expect(result.ok).toBeFalse();
    expect(result.message).toBe('No se puede eliminar una sala que tiene funciones programadas.');
    expect(service.rooms().length).toBe(before);
  });

  it('deletes a room without showtimes', () => {
    service.addRoom('Sala 02 - VIP', 40);
    const before = service.rooms().length;

    const result = service.removeRoom(lastRoomId());

    expect(result.ok).toBeTrue();
    expect(result.message).toBe('Sala eliminada.');
    expect(service.rooms().length).toBe(before - 1);
  });

  it('computes the end time from the movie duration', () => {
    const movie = service.movies()[0];
    const room = service.rooms()[0];
    const before = service.showtimes().length;

    const result = service.scheduleShowtime(movie.id, room.id, '2026-11-02T10:30');

    expect(result.ok).toBeTrue();
    expect(result.message).toBe('Función programada exitosamente.');
    const created = service.showtimes()[service.showtimes().length - 1];
    expect(service.showtimes().length).toBe(before + 1);
    expect(created.startsAt).toBe('2026-11-02T10:30');
    expect(created.endsAt).toBe(
      toDateTimeLocalValue(parseDateTimeLocal('2026-11-02T10:30') + movie.duration * 60_000),
    );
    expect(created.status).toBe('SCHEDULED');
    expect(service.statusLabel(created.status)).toBe('Publicada');
  });

  it('rejects a showtime that overlaps an existing one in the same room', () => {
    const busy = service.showtimes()[0];
    const before = service.showtimes().length;

    const result = service.scheduleShowtime(busy.movieId, busy.roomId, '2026-10-06T21:00');

    expect(result.ok).toBeFalse();
    expect(result.conflict).toBeTrue();
    expect(result.message).toContain(service.roomName(busy.roomId));
    expect(result.message).toContain('ya tiene una función programada en ese horario');
    expect(service.showtimes().length).toBe(before);
  });

  it('accepts a showtime outside the occupied window of the same room', () => {
    const busy = service.showtimes()[0];
    const before = service.showtimes().length;

    const result = service.scheduleShowtime(busy.movieId, busy.roomId, '2026-10-06T23:00');

    expect(result.ok).toBeTrue();
    expect(service.showtimes().length).toBe(before + 1);
  });

  it('asks for every field when the schedule is incomplete', () => {
    const before = service.showtimes().length;

    expect(service.scheduleShowtime('', '', '').ok).toBeFalse();
    expect(service.scheduleShowtime('', '', 'not-a-date').ok).toBeFalse();
    expect(service.showtimes().length).toBe(before);
  });

  it('removes a showtime from the schedule', () => {
    const showtime = service.showtimes()[0];
    const before = service.showtimes().length;

    const result = service.removeShowtime(showtime.id);

    expect(result.ok).toBeTrue();
    expect(result.message).toBe('Función retirada de cartelera.');
    expect(service.showtimes().length).toBe(before - 1);
    expect(service.removeShowtime('missing-id').ok).toBeFalse();
  });

  it('formats dataset timestamps without seconds for the table', () => {
    expect(service.displayDateTime('2026-10-06T20:00:00')).toBe('2026-10-06 20:00');
    expect(service.displayDateTime('2026-10-06T20:00')).toBe('2026-10-06 20:00');
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

  it('resolves titles, rooms and durations of unknown ids with a placeholder', () => {
    expect(service.movieTitle('missing-movie')).toBe('—');
    expect(service.roomName('missing-room')).toBe('—');
    expect(service.durationOf('missing-movie')).toBe(0);
    expect(service.roomName(SYNTHETIC_CATALOG.rooms[0].id)).toBe(SYNTHETIC_CATALOG.rooms[0].name);
  });
});
