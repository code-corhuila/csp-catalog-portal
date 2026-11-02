import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CreateMovieRequest,
  CreateRoomRequest,
  CreateShowtimeRequest,
  MovieRecord,
  RoomRecord,
  ShowtimeRecord,
  UpdateMovieRequest,
  UpdateRoomRequest,
  UpdateShowtimeRequest,
} from '../model/admin';
import { Page } from '../model/billboard';

/** A key for one write: the contract asks for 8 to 128 characters, and a retry of the same write reuses it. */
export function newIdempotencyKey(): string {
  return crypto.randomUUID();
}

function withKey(key: string): { headers: HttpHeaders } {
  return { headers: new HttpHeaders({ 'Idempotency-Key': key }) };
}

/** The six administration operations that the three collections of the Catalog service share. */
export class AdminResource<T, Create, Update> {
  constructor(
    private readonly http: HttpClient,
    private readonly path: string,
  ) {}

  list(query: { page?: number; limit?: number } = {}): Observable<Page<T>> {
    let params = new HttpParams();
    if (query.page !== undefined) params = params.set('page', query.page);
    if (query.limit !== undefined) params = params.set('limit', query.limit);
    return this.http.get<Page<T>>(this.path, { params });
  }

  get(id: string): Observable<T> {
    return this.http.get<T>(`${this.path}/${id}`);
  }

  create(body: Create, key: string): Observable<T> {
    return this.http.post<T>(this.path, body, withKey(key));
  }

  update(id: string, body: Update, key: string): Observable<T> {
    return this.http.patch<T>(`${this.path}/${id}`, body, withKey(key));
  }

  /** Archives a movie or a room and cancels a showtime: the record is kept (DELETE answers 204). */
  remove(id: string, key: string): Observable<void> {
    return this.http.delete<void>(`${this.path}/${id}`, withKey(key));
  }
}

/**
 * Typed calls to the administration routes of the Catalog service (movies, rooms and showtimes,
 * catalog-service.yaml 1.10.0). The injected HttpClient is the SHELL's: its interceptor completes the
 * '/api/v1/...' path with the gateway, attaches the correlation id and the token, and normalises every error, so
 * this service catches nothing and only adds the Idempotency-Key that each write needs.
 */
@Injectable({ providedIn: 'root' })
export class CatalogAdminApiService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/catalog';

  readonly movies = new AdminResource<MovieRecord, CreateMovieRequest, UpdateMovieRequest>(
    this.http,
    `${this.base}/movies`,
  );
  readonly rooms = new AdminResource<RoomRecord, CreateRoomRequest, UpdateRoomRequest>(
    this.http,
    `${this.base}/rooms`,
  );
  readonly showtimes = new AdminResource<ShowtimeRecord, CreateShowtimeRequest, UpdateShowtimeRequest>(
    this.http,
    `${this.base}/showtimes`,
  );
}
