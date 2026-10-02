import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { BillboardItem } from '../model/billboard';
import { AvailabilityResponse } from '../model/showtime';

@Injectable({
  providedIn: 'root'
})
export class CatalogApiService {
  getBillboard(): Observable<BillboardItem[]> {
    return of([]);
  }

  getShowtimeAvailability(showtimeId: string): Observable<AvailabilityResponse> {
    return of({} as AvailabilityResponse);
  }
}
