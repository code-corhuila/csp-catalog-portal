import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { ApiError, asApiError } from '../../../shell-contract';
import { CatalogAdminApiService, RetryKeys } from '../../data/catalog-admin-api.service';
import { CreateShowtimeRequest, ShowtimeRecord } from '../../model/admin';
import { AdminResult, parseDateTimeLocal, toDateTimeLocalValue } from './admin-catalog-state.service';
import { LoadStatus } from './admin-movies-state';

/** What the administrator typed in the form: local times as `datetime-local` gives them, the price in pesos. */
export interface NewShowtimeInput {
  movieId: string;
  roomId: string;
  startsAt: string;
  endsAt: string;
  price: number | null;
}

/** The price is an amount in cents (Rule 2026-B) and the currency of the cinema is the Colombian peso. */
const CENTS_PER_PESO = 100;

const INCOMPLETE = 'Completa todos los campos.';

/** An instant of the service (UTC) shown as `yyyy-MM-dd HH:mm` in the local time of the administrator. */
export function displayDateTime(instant: string): string {
  return toDateTimeLocalValue(Date.parse(instant)).replace('T', ' ');
}

/** A price in cents shown as Colombian pesos, e.g. `$15.000 COP`. */
export function formatPrice(priceCents: number): string {
  return `$${(priceCents / CENTS_PER_PESO).toLocaleString('es-CO')} COP`;
}

function toRequest(input: NewShowtimeInput): CreateShowtimeRequest | null {
  const start = parseDateTimeLocal(input.startsAt);
  const end = parseDateTimeLocal(input.endsAt);
  const price = input.price;

  if (!input.movieId || !input.roomId || Number.isNaN(start) || Number.isNaN(end) || end <= start) {
    return null;
  }
  if (price === null || !Number.isFinite(price) || price < 0) {
    return null;
  }
  return {
    movieId: input.movieId,
    roomId: input.roomId,
    startsAt: new Date(start).toISOString(),
    endsAt: new Date(end).toISOString(),
    priceCents: Math.round(price * CENTS_PER_PESO),
  };
}

/**
 * The showtimes of the administration screen, read from and written to the real Catalog service
 * (csp-catalog-portal#82). It never falls back to synthetic data. The service decides what the portal does not: an
 * overlap in the room is a 409 (ADR-039 D1), flagged as a conflict so that the screen can show it, and a movie that is
 * not published or a room that is archived is a 422. Cancelling keeps the showtime as `CANCELLED`; it cannot be reopened.
 * The writes carry an Idempotency-Key that a retry of the same write reuses (see `RetryKeys`).
 */
@Injectable({ providedIn: 'root' })
export class AdminShowtimesState {
  private readonly api = inject(CatalogAdminApiService);
  private readonly keys = new RetryKeys();

  readonly showtimes = signal<ShowtimeRecord[]>([]);
  readonly status = signal<LoadStatus>('idle');
  readonly error = signal<ApiError | null>(null);

  /** Every showtime, cancelled and completed ones included. */
  load(): void {
    this.status.set('loading');
    this.error.set(null);
    this.api.showtimes.listAll().subscribe({
      next: showtimes => {
        this.showtimes.set(showtimes);
        this.status.set('ready');
      },
      error: (failure: unknown) => {
        this.error.set(asApiError(failure));
        this.status.set('error');
      },
    });
  }

  create(input: NewShowtimeInput): Observable<AdminResult> {
    const body = toRequest(input);
    if (body === null) {
      return of({ ok: false, message: INCOMPLETE });
    }

    const write = `create:${JSON.stringify(body)}`;
    return this.api.showtimes.create(body, this.keys.keyFor(write)).pipe(
      tap(created => {
        this.showtimes.update(list => [...list, created]);
        this.keys.release(write);
      }),
      map((): AdminResult => ({ ok: true, message: 'Función programada exitosamente.' })),
      catchError((failure: unknown) => of(this.refusedCreate(failure))),
    );
  }

  cancel(showtimeId: string): Observable<AdminResult> {
    const write = `cancel:${showtimeId}`;
    return this.api.showtimes.remove(showtimeId, this.keys.keyFor(write)).pipe(
      tap(() => {
        this.showtimes.update(list =>
          list.map(showtime =>
            showtime.id === showtimeId ? { ...showtime, status: 'CANCELLED' as const } : showtime,
          ),
        );
        this.keys.release(write);
      }),
      map((): AdminResult => ({ ok: true, message: 'Función cancelada.' })),
      catchError((failure: unknown) => of(this.refused(failure))),
    );
  }

  private refused(failure: unknown): AdminResult {
    return { ok: false, message: asApiError(failure).userMessage };
  }

  /** A 409 on create is the overlap of the room: the screen shows it next to the form. */
  private refusedCreate(failure: unknown): AdminResult {
    const refusal = this.refused(failure);
    return asApiError(failure).status === 409 ? { ...refusal, conflict: true } : refusal;
  }
}
