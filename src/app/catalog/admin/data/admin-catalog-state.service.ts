import { Injectable, computed, signal } from '@angular/core';
import { SYNTHETIC_CATALOG, SyntheticMovie } from '../../data/synthetic-catalog';
import { Showtime } from '../../model/showtime';

/**
 * Cut 2 admin state (HU-FE-CATALOG-001 administration slice).
 *
 * The service seeds its own mutable copy from the burned-in dataset so the admin
 * screens can create and delete entries during the session without ever mutating
 * the `SYNTHETIC_CATALOG` constant the public screens and the unit tests read.
 * It never talks to HttpClient: the portal has no client of its own.
 */

/** Synthetic movie plus the classification label collected by the admin form. */
export interface AdminMovie extends SyntheticMovie {
  classification?: string;
}

export interface AdminRoom {
  id: string;
  name: string;
  seatLabels: string[];
}

export type AdminShowtime = Showtime;

export interface AdminResult {
  ok: boolean;
  message: string;
  conflict?: boolean;
}

export interface NewMovieInput {
  title: string;
  genre: string;
  duration: number | null;
  classification: string;
  synopsis: string;
  trailer: string;
}

export interface RoomOccupancy {
  id: string;
  name: string;
  capacityLabel: string;
  showtimes: number;
  status: string;
}

export interface ShowtimeSummary {
  id: string;
  movie: string;
  room: string;
  status: string;
}

const STATUS_LABELS: Record<Showtime['status'], string> = {
  SCHEDULED: 'Publicada',
  CANCELLED: 'Cancelada',
  COMPLETED: 'Finalizada',
};

/** Accepts both `yyyy-MM-ddTHH:mm` and `yyyy-MM-ddTHH:mm:ss` and parses it as local time. */
export function parseDateTimeLocal(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) {
    return Number.NaN;
  }
  return Date.parse(trimmed.length === 16 ? `${trimmed}:00` : trimmed);
}

/** Formats a timestamp back to the `datetime-local` value format. */
export function toDateTimeLocalValue(timestamp: number): string {
  const date = new Date(timestamp);
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Seats are laid out in rows of eight: A1..A8, B1..B8, and so on. */
function buildSeatLabels(capacity: number): string[] {
  const labels: string[] = [];
  for (let index = 0; index < capacity; index += 1) {
    const row = String.fromCharCode(65 + Math.floor(index / 8));
    labels.push(`${row}${(index % 8) + 1}`);
  }
  return labels;
}

@Injectable({ providedIn: 'root' })
export class AdminCatalogStateService {
readonly movies = signal<AdminMovie[]>(
  SYNTHETIC_CATALOG.movies.map((movie) => {
    const defaultClassifications: Record<string, string> = {
      '11111111-1111-1111-1111-111111111111': 'TP', // The Silent Reel
      '22222222-2222-2222-2222-222222222222': '+7', // Neon Sky
      'a1111111-1111-1111-1111-111111111111': '+12', // Interstellar
      'a2222222-2222-2222-2222-222222222222': '+18', // Oppenheimer
      'a3333333-3333-3333-3333-333333333333': '+16', // The Dark Knight
      // Avatar: The Way of Water (a4444444-...) keeps the '+12' fallback.
    };

    return {
      ...movie,
      genres: [...movie.genres],
      classification: (movie as AdminMovie).classification || defaultClassifications[movie.id] || '+12',
    };
  }),
);

  readonly rooms = signal<AdminRoom[]>(
    SYNTHETIC_CATALOG.rooms.map((room) => ({
      id: room.id,
      name: room.name,
      seatLabels: [...room.seatLabels],
    })),
  );

  readonly showtimes = signal<AdminShowtime[]>(
    SYNTHETIC_CATALOG.showtimes.map((showtime) => ({ ...showtime })),
  );

  readonly metrics = computed(() => ({
    showtimes: this.showtimes().length,
    rooms: this.rooms().length,
    movies: this.movies().length,
  }));

  readonly occupancy = computed<RoomOccupancy[]>(() =>
    this.rooms().map((room) => {
      const scheduled = this.showtimes().filter((showtime) => showtime.roomId === room.id).length;
      return {
        id: room.id,
        name: room.name,
        capacityLabel: `${room.seatLabels.length} asientos`,
        showtimes: scheduled,
        status: scheduled > 0 ? 'Con funciones' : 'Sin funciones',
      };
    }),
  );

  readonly summary = computed<ShowtimeSummary[]>(() =>
    this.showtimes().map((showtime) => ({
      id: showtime.id,
      movie: this.movieTitle(showtime.movieId),
      room: this.roomName(showtime.roomId),
      status: this.statusLabel(showtime.status),
    })),
  );

  movieTitle(movieId: string): string {
    return this.movies().find((movie) => movie.id === movieId)?.title ?? '—';
  }

  roomName(roomId: string): string {
    return this.rooms().find((room) => room.id === roomId)?.name ?? '—';
  }

  durationOf(movieId: string): number {
    return this.movies().find((movie) => movie.id === movieId)?.duration ?? 0;
  }

  statusLabel(status: Showtime['status']): string {
    return STATUS_LABELS[status];
  }

  /** Mockup renders `2026-10-06 20:00`, without the seconds of the burned-in dataset. */
  displayDateTime(value: string): string {
    return value.slice(0, 16).replace('T', ' ');
  }

  addMovie(input: NewMovieInput): AdminResult {
    const title = input.title.trim();
    const synopsis = input.synopsis.trim();
    const trailer = input.trailer.trim();
    const genre = input.genre.trim();

    if (!title || !genre || !input.duration || input.duration < 1 || !input.classification || !synopsis || !trailer) {
      return { ok: false, message: 'Completa todos los campos de la película.' };
    }

    const movie: AdminMovie = {
      id: this.newId(),
      title,
      duration: Math.trunc(input.duration),
      genres: [genre],
      publicationStatus: 'PUBLISHED',
      description: synopsis,
      trailerUrl: trailer,
      classification: input.classification,
    };

    this.movies.update((list) => [...list, movie]);
    return { ok: true, message: 'Película guardada correctamente.' };
  }

  removeMovie(movieId: string): AdminResult {
    const movie = this.movies().find((item) => item.id === movieId);
    if (!movie) {
      return { ok: false, message: 'La película no existe.' };
    }

    if (this.hasScheduledShowtimes((showtime) => showtime.movieId === movieId)) {
      return { ok: false, message: 'No se puede eliminar una película que tiene funciones programadas.' };
    }

    this.movies.update((list) => list.filter((item) => item.id !== movieId));
    return { ok: true, message: 'Película eliminada.' };
  }

  addRoom(name: string, capacity: number): AdminResult {
    const roomName = name.trim();
    if (!roomName || !capacity || capacity < 1) {
      return { ok: false, message: 'Ingresa un nombre y una capacidad válidos.' };
    }

    const room: AdminRoom = {
      id: this.newId(),
      name: roomName,
      seatLabels: buildSeatLabels(Math.trunc(capacity)),
    };

    this.rooms.update((list) => [...list, room]);
    return { ok: true, message: 'Sala registrada exitosamente.' };
  }

  removeRoom(roomId: string): AdminResult {
    const room = this.rooms().find((item) => item.id === roomId);
    if (!room) {
      return { ok: false, message: 'La sala no existe.' };
    }

    if (this.hasScheduledShowtimes((showtime) => showtime.roomId === roomId)) {
      return { ok: false, message: 'No se puede eliminar una sala que tiene funciones programadas.' };
    }

    this.rooms.update((list) => list.filter((item) => item.id !== roomId));
    return { ok: true, message: 'Sala eliminada.' };
  }

  scheduleShowtime(movieId: string, roomId: string, startsAt: string): AdminResult {
    const movie = this.movies().find((item) => item.id === movieId);
    const room = this.rooms().find((item) => item.id === roomId);

    if (!movie || !room || !startsAt.trim()) {
      return { ok: false, message: 'Completa todos los campos.' };
    }

    const start = parseDateTimeLocal(startsAt);
    if (Number.isNaN(start)) {
      return { ok: false, message: 'Completa todos los campos.' };
    }

    const end = start + movie.duration * 60_000;

    const hasConflict = this.showtimes().some((showtime) => {
      if (showtime.roomId !== roomId) {
        return false;
      }
      const existingStart = parseDateTimeLocal(showtime.startsAt);
      const existingEnd = parseDateTimeLocal(showtime.endsAt);
      return start < existingEnd && end > existingStart;
    });

    if (hasConflict) {
      return {
        ok: false,
        conflict: true,
        message: `Error: La ${room.name} ya tiene una función programada en ese horario.`,
      };
    }

    const showtime: AdminShowtime = {
      id: this.newId(),
      movieId,
      roomId,
      startsAt: toDateTimeLocalValue(start),
      endsAt: toDateTimeLocalValue(end),
      status: 'SCHEDULED',
    };

    this.showtimes.update((list) => [...list, showtime]);
    return { ok: true, message: 'Función programada exitosamente.' };
  }

  removeShowtime(showtimeId: string): AdminResult {
    const exists = this.showtimes().some((showtime) => showtime.id === showtimeId);
    if (!exists) {
      return { ok: false, message: 'La función no existe.' };
    }

    this.showtimes.update((list) => list.filter((showtime) => showtime.id !== showtimeId));
    return { ok: true, message: 'Función retirada de cartelera.' };
  }

  private hasScheduledShowtimes(predicate: (showtime: AdminShowtime) => boolean): boolean {
    return this.showtimes().some(predicate);
  }

  private newId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `admin-${Date.now().toString(16)}-${(this.idCounter += 1).toString(16)}`;
  }

  private idCounter = 0;
}
