import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { BillboardItem, Page } from '../model/billboard';
import { AvailabilityResponse } from '../model/showtime';

@Injectable({ providedIn: 'root' })
export class CatalogApiService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/catalog';

  getBillboard(page = 1, limit = 20, date?: string, movieId?: string): Observable<Page<BillboardItem>> {
    let params = new HttpParams().set('page', page).set('limit', limit);
    if (date) params = params.set('date', date);
    if (movieId) params = params.set('movieId', movieId);
    return this.http.get<Page<BillboardItem>>(`${this.base}/billboard`, { params });
  }

  getShowtimeAvailability(showtimeId: string): Observable<AvailabilityResponse> {
    return this.http.get<AvailabilityResponse>(
      `${this.base}/showtimes/${encodeURIComponent(showtimeId)}/availability`,
    );
  }
}
