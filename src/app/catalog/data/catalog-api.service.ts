import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  BillboardItem,
  BillboardMovie,
  BillboardQuery,
  MovieSearchQuery,
  Page,
} from '../model/billboard';

/** The query parameters that have a value: an absent or blank one is left out. */
function toParams(values: Record<string, string | number | undefined>): HttpParams {
  let params = new HttpParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && String(value).trim() !== '') {
      params = params.set(key, String(value));
    }
  }
  return params;
}

/**
 * Typed calls to the public reads of the Catalog service. The injected HttpClient is the SHELL's: its
 * interceptor completes the '/api/v1/...' path with the gateway, attaches the correlation id (and the token, if
 * there is a session) and normalises every error, so this service sets no header and catches nothing.
 */
@Injectable({ providedIn: 'root' })
export class CatalogApiService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/catalog';

  /** The scheduled showtimes that can still be attended, with their movie and room (public, ADR-041). */
  getBillboard(query: BillboardQuery = {}): Observable<Page<BillboardItem>> {
    const params = toParams({
      date: query.date,
      movieId: query.movieId,
      page: query.page,
      limit: query.limit,
    });
    return this.http.get<Page<BillboardItem>>(`${this.base}/billboard`, { params });
  }

  /** The published movies that match every filter, ordered by title (public, ADR-044). */
  searchMovies(query: MovieSearchQuery = {}): Observable<Page<BillboardMovie>> {
    const params = toParams({
      q: query.q?.trim(),
      genre: query.genre?.trim(),
      durationMax: query.durationMax,
      page: query.page,
      limit: query.limit,
    });
    return this.http.get<Page<BillboardMovie>>(`${this.base}/billboard/movies`, { params });
  }
}
