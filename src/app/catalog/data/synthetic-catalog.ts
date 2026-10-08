import { Showtime } from '../model/showtime';

export interface SyntheticMovie {
  id: string;
  title: string;
  duration: number;
  genres: string[];
  publicationStatus: 'PUBLISHED' | 'DRAFT';
  trailerUrl?: string;
  description?: string;
  imageUrl?: string;
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
      trailerUrl: 'https://www.youtube.com/watch?v=zSWdZVtXT7E',
      description: 'Una obra dramática clásica que explora los orígenes del cine mudo.',
      imageUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80'
    },
    {
      id: '22222222-2222-2222-2222-222222222222',
      title: 'Neon Sky',
      duration: 95,
      genres: ['Science Fiction', 'Cyberpunk'],
      publicationStatus: 'DRAFT',
      trailerUrl: 'https://www.youtube.com/watch?v=YoHD9XEInc0',
      description: 'En una metrópolis futurista, un hacker descubre una conspiración global.',
      imageUrl: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=600&q=80'
    },
    {
      id: 'a1111111-1111-1111-1111-111111111111',
      title: 'Interstellar',
      duration: 169,
      genres: ['Ciencia Ficción', 'Aventura'],
      publicationStatus: 'PUBLISHED',
      trailerUrl: 'https://www.youtube.com/watch?v=zSWdZVtXT7E',
      description: 'Un grupo de exploradores viaja a través de un agujero de gusano.',
      imageUrl: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=600&q=80'
    },
    {
      id: 'a2222222-2222-2222-2222-222222222222',
      title: 'Oppenheimer',
      duration: 180,
      genres: ['Biografía', 'Drama'],
      publicationStatus: 'PUBLISHED',
      trailerUrl: 'https://www.youtube.com/watch?v=uYPbbksJxIg',
      description: 'La historia del físico teórico J. Robert Oppenheimer.',
      imageUrl: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=600&q=80'
    },
    {
      id: 'a3333333-3333-3333-3333-333333333333',
      title: 'The Dark Knight',
      duration: 152,
      genres: ['Acción', 'Crimen'],
      publicationStatus: 'PUBLISHED',
      trailerUrl: 'https://www.youtube.com/watch?v=EXeTwQWrcwY',
      description: 'Batman se enfrenta al Guasón en la ciudad de Gotham.',
      imageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80'
    },
    {
      id: 'a4444444-4444-4444-4444-444444444444',
      title: 'Avatar: The Way of Water',
      duration: 192,
      genres: ['Acción', 'Aventura'],
      publicationStatus: 'PUBLISHED',
      trailerUrl: 'https://www.youtube.com/watch?v=d9MyW72ELq0',
      description: 'Jake Sully y Neytiri exploran las regiones acuáticas de Pandora.',
      imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80'
    }
  ],
  rooms: [
    {
      id: '33333333-3333-3333-3333-333333333333',
      name: 'Room 1',
      seatLabels: [
        'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8',
        'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8',
        'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8',
        'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8',
        'E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8',
        'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8'
      ],
    },
  ],
  showtimes: [
    { id: '44444444-4444-4444-4444-444444444444', movieId: '11111111-1111-1111-1111-111111111111', roomId: '33333333-3333-3333-3333-333333333333', startsAt: '2026-10-06T20:00:00', endsAt: '2026-10-06T22:00:00', status: 'SCHEDULED' },
    { id: 'st-draft', movieId: '22222222-2222-2222-2222-222222222222', roomId: '33333333-3333-3333-3333-333333333333', startsAt: '2026-10-06T18:00:00', endsAt: '2026-10-06T19:35:00', status: 'SCHEDULED' },
    { id: 'st-101', movieId: 'a1111111-1111-1111-1111-111111111111', roomId: '33333333-3333-3333-3333-333333333333', startsAt: '2026-10-06T10:00:00', endsAt: '2026-10-06T12:49:00', status: 'SCHEDULED' },
    { id: 'st-102', movieId: 'a1111111-1111-1111-1111-111111111111', roomId: '33333333-3333-3333-3333-333333333333', startsAt: '2026-10-06T13:30:00', endsAt: '2026-10-06T16:19:00', status: 'SCHEDULED' },
    { id: 'st-201', movieId: 'a2222222-2222-2222-2222-222222222222', roomId: '33333333-3333-3333-3333-333333333333', startsAt: '2026-10-06T11:00:00', endsAt: '2026-10-06T14:00:00', status: 'SCHEDULED' },
    { id: 'st-202', movieId: 'a2222222-2222-2222-2222-222222222222', roomId: '33333333-3333-3333-3333-333333333333', startsAt: '2026-10-06T15:00:00', endsAt: '2026-10-06T18:00:00', status: 'SCHEDULED' },
    { id: 'st-301', movieId: 'a3333333-3333-3333-3333-333333333333', roomId: '33333333-3333-3333-3333-333333333333', startsAt: '2026-10-06T14:15:00', endsAt: '2026-10-06T16:47:00', status: 'SCHEDULED' },
    { id: 'st-401', movieId: 'a4444444-4444-4444-4444-444444444444', roomId: '33333333-3333-3333-3333-333333333333', startsAt: '2026-10-06T16:30:00', endsAt: '2026-10-06T19:42:00', status: 'SCHEDULED' }
  ]
};