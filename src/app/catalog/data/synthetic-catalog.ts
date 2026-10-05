import { Showtime } from '../model/showtime';

interface SyntheticMovie {
  id: string;
  title: string;
  duration: number;
  genres: string[];
  publicationStatus: 'PUBLISHED' | 'DRAFT';
}

interface SyntheticRoom {
  id: string;
  name: string;
  seatLabels: string[];
}

export interface SyntheticCatalog {
  movies: SyntheticMovie[];
  rooms: SyntheticRoom[];
  showtimes: Showtime[];
}

export const SYNTHETIC_CATALOG: SyntheticCatalog = {
  movies: [
    {
      id: '11111111-1111-1111-1111-111111111111',
      title: 'The Silent Reel',
      duration: 120,
      genres: ['Drama'],
      publicationStatus: 'PUBLISHED',
    },
    {
      id: '22222222-2222-2222-2222-222222222222',
      title: 'Neon Sky',
      duration: 95,
      genres: ['Science Fiction'],
      publicationStatus: 'DRAFT',
    },
  ],
  rooms: [
    {
      id: '33333333-3333-3333-3333-333333333333',
      name: 'Room 1',
      seatLabels: ['A1', 'A2', 'A3', 'B1', 'B2', 'B3'],
    },
  ],
  showtimes: [
    {
      id: '44444444-4444-4444-4444-444444444444',
      movieId: '11111111-1111-1111-1111-111111111111',
      roomId: '33333333-3333-3333-3333-333333333333',
      startsAt: '2026-10-02T20:00:00Z',
      endsAt: '2026-10-02T22:00:00Z',
      status: 'SCHEDULED',
    },
  ],
};
