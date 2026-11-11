import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { ApiError, asApiError } from '../../../shell-contract';
import { CatalogAdminApiService, RetryKeys } from '../../data/catalog-admin-api.service';
import { CreateMovieRequest, MovieRecord } from '../../model/admin';
import { httpUrlOrNull } from '../../model/web-url';
import { AdminResult } from './admin-catalog-state.service';

/** The state of a list read from the service. */
export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

/** What the administrator typed in the form; a blank poster or trailer link is left out. */
export interface NewMovieInput {
  title: string;
  genre: string;
  duration: number | null;
  classification: string;
  synopsis: string;
  poster: string;
  trailer: string;
}

const INVALID_TRAILER = 'El enlace del tráiler debe ser una dirección http o https de hasta 2048 caracteres.';

function toRequest(input: NewMovieInput): CreateMovieRequest | null {
  const title = input.title.trim();
  const genre = input.genre.trim();
  const synopsis = input.synopsis.trim();
  const poster = input.poster.trim();
  const trailer = input.trailer.trim();

  if (!title || !genre || !input.duration || input.duration < 1 || !input.classification || !synopsis) {
    return null;
  }
  return {
    title,
    synopsis,
    durationMinutes: Math.trunc(input.duration),
    classification: input.classification,
    genres: [genre],
    status: 'PUBLISHED',
    ...(poster ? { posterUrl: poster } : {}),
    ...(trailer ? { trailerUrl: trailer } : {}),
  };
}

/**
 * The movies of the administration screen, read from and written to the real Catalog service (HU-FE-CATALOG-001
 * administration slice, csp-catalog-portal#82). It never falls back to synthetic data: a failure is shown as a failure.
 *
 * Each write has an Idempotency-Key. A retry of the same write reuses it, so the service answers the original
 * result instead of doing the write twice; a changed movie takes a new key, because the service answers 409 when a
 * key comes with another payload.
 */
@Injectable({ providedIn: 'root' })
export class AdminMoviesState {
  private readonly api = inject(CatalogAdminApiService);
  private readonly keys = new RetryKeys();

  readonly movies = signal<MovieRecord[]>([]);
  readonly status = signal<LoadStatus>('idle');
  readonly error = signal<ApiError | null>(null);

  /** Every movie, drafts and archived ones included. */
  load(): void {
    this.status.set('loading');
    this.error.set(null);
    this.api.movies
      .listAll()
      .subscribe({
        next: movies => {
          this.movies.set(movies);
          this.status.set('ready');
        },
        error: (failure: unknown) => {
          this.error.set(asApiError(failure));
          this.status.set('error');
        },
      });
  }

  create(input: NewMovieInput): Observable<AdminResult> {
    if (input.trailer.trim() && httpUrlOrNull(input.trailer) === null) {
      return of({ ok: false, message: INVALID_TRAILER });
    }

    const body = toRequest(input);
    if (body === null) {
      return of({ ok: false, message: 'Completa todos los campos de la película.' });
    }

    const write = `create:${JSON.stringify(body)}`;
    return this.api.movies.create(body, this.keys.keyFor(write)).pipe(
      tap(created => {
        this.movies.update(list => [...list, created]);
        this.keys.release(write);
      }),
      map((): AdminResult => ({ ok: true, message: 'Película guardada correctamente.' })),
      catchError((failure: unknown) => of(this.refused(failure))),
    );
  }

  /** Archives the movie: the service keeps it, and the list shows it as archived. */
  archive(movieId: string): Observable<AdminResult> {
    const write = `archive:${movieId}`;
    return this.api.movies.remove(movieId, this.keys.keyFor(write)).pipe(
      tap(() => {
        this.movies.update(list =>
          list.map(movie => (movie.id === movieId ? { ...movie, status: 'ARCHIVED' as const } : movie)),
        );
        this.keys.release(write);
      }),
      map((): AdminResult => ({ ok: true, message: 'Película archivada.' })),
      catchError((failure: unknown) => of(this.refused(failure))),
    );
  }

  private refused(failure: unknown): AdminResult {
    return { ok: false, message: asApiError(failure).userMessage };
  }
}
