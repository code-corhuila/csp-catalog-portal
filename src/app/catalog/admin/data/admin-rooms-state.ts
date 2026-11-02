import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { ApiError, asApiError } from '../../../shell-contract';
import { CatalogAdminApiService, RetryKeys } from '../../data/catalog-admin-api.service';
import { CreateRoomRequest, RoomRecord } from '../../model/admin';
import { Seat } from '../../model/room';
import { AdminResult } from './admin-catalog-state.service';
import { LoadStatus } from './admin-movies-state';

/** What the administrator typed in the form: the layout of the room is built from its capacity. */
export interface NewRoomInput {
  name: string;
  capacity: number | null;
}

/** A room has at most 500 seats (ADR-038). */
const MAX_SEATS = 500;
const SEATS_PER_ROW = 8;

/** Seats are laid out in rows of eight: A1..A8, B1..B8, and so on. */
function buildSeats(capacity: number): Seat[] {
  return Array.from({ length: capacity }, (_, index) => {
    const row = String.fromCharCode(65 + Math.floor(index / SEATS_PER_ROW));
    const number = (index % SEATS_PER_ROW) + 1;
    return { label: `${row}${number}`, row, number };
  });
}

function toRequest(input: NewRoomInput): CreateRoomRequest | string {
  const name = input.name.trim();
  if (!name || !input.capacity || input.capacity < 1) {
    return 'Ingresa un nombre y una capacidad válidos.';
  }
  const capacity = Math.trunc(input.capacity);
  if (capacity > MAX_SEATS) {
    return `Una sala admite como máximo ${MAX_SEATS} asientos.`;
  }
  return { name, capacity, seats: buildSeats(capacity) };
}

/**
 * The rooms of the administration screen, read from and written to the real Catalog service (csp-catalog-portal#82).
 * It never falls back to synthetic data. An archived room leaves the list: the service keeps it, excludes it from
 * `GET /rooms` and reserves its name (ADR-038). A name already in use is a 409 that the shell turns into its message.
 * The writes carry an Idempotency-Key that a retry of the same write reuses (see `RetryKeys`).
 */
@Injectable({ providedIn: 'root' })
export class AdminRoomsState {
  private readonly api = inject(CatalogAdminApiService);
  private readonly keys = new RetryKeys();

  readonly rooms = signal<RoomRecord[]>([]);
  readonly status = signal<LoadStatus>('idle');
  readonly error = signal<ApiError | null>(null);

  load(): void {
    this.status.set('loading');
    this.error.set(null);
    this.api.rooms.listAll().subscribe({
      next: rooms => {
        this.rooms.set(rooms);
        this.status.set('ready');
      },
      error: (failure: unknown) => {
        this.error.set(asApiError(failure));
        this.status.set('error');
      },
    });
  }

  create(input: NewRoomInput): Observable<AdminResult> {
    const body = toRequest(input);
    if (typeof body === 'string') {
      return of({ ok: false, message: body });
    }

    const write = `create:${JSON.stringify(body)}`;
    return this.api.rooms.create(body, this.keys.keyFor(write)).pipe(
      tap(created => {
        this.rooms.update(list => [...list, created]);
        this.keys.release(write);
      }),
      map((): AdminResult => ({ ok: true, message: 'Sala registrada exitosamente.' })),
      catchError((failure: unknown) => of(this.refused(failure))),
    );
  }

  archive(roomId: string): Observable<AdminResult> {
    const write = `archive:${roomId}`;
    return this.api.rooms.remove(roomId, this.keys.keyFor(write)).pipe(
      tap(() => {
        this.rooms.update(list => list.filter(room => room.id !== roomId));
        this.keys.release(write);
      }),
      map((): AdminResult => ({ ok: true, message: 'Sala archivada.' })),
      catchError((failure: unknown) => of(this.refused(failure))),
    );
  }

  private refused(failure: unknown): AdminResult {
    return { ok: false, message: asApiError(failure).userMessage };
  }
}
