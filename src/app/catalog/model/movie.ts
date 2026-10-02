export interface Movie {
  id: string;
  title: string;
  synopsis?: string;
  durationMinutes: number;
  classification?: string;
  genres?: string[];
  releaseDate?: string;
  posterUrl?: string;
  cast?: string[];
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
}
