/**
 * What the public reads of the Catalog service answer (catalog-service.yaml 1.8.0, ADR-041 and ADR-044):
 * the public data of a published movie, a room and a scheduled showtime, and the pagination metadata.
 */
export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Page<T> {
  data: T[];
  meta: PageMeta;
}

export interface BillboardMovie {
  id: string;
  title: string;
  synopsis?: string;
  durationMinutes: number;
  genres?: string[];
  classification: string;
  posterUrl?: string;
  releaseDate?: string;
}

export interface BillboardRoom {
  id: string;
  name: string;
  capacity: number;
}

export interface BillboardShowtime {
  id: string;
  startsAt: string;
  endsAt: string;
  priceCents: number;
  audioLanguage?: string;
  subtitleLanguage?: string;
}

/** One showtime of the billboard with its movie and its room. */
export interface BillboardItem {
  movie: BillboardMovie;
  room: BillboardRoom;
  showtime: BillboardShowtime;
}

/** The filters of the billboard: a UTC day (YYYY-MM-DD) and a movie, with the window. */
export interface BillboardQuery {
  date?: string;
  movieId?: string;
  page?: number;
  limit?: number;
}

/** The filters of the movie search: a text, a genre (the exact stored value) and a maximum duration, with the window. */
export interface MovieSearchQuery {
  q?: string;
  genre?: string;
  durationMax?: number;
  page?: number;
  limit?: number;
}
