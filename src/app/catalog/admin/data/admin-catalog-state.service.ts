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
