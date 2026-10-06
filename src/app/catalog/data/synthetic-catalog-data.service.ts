import { Injectable } from '@angular/core';
import { Movie } from '../model/movie';
import { Room } from '../model/room';
import { Showtime } from '../model/showtime';
import { SYNTHETIC_CATALOG } from './synthetic-catalog';

export interface SeatAvailability {
  label: string;
  available: boolean;
}

export type MovieExtended = Movie & {
  trailerUrl?: string;
  description?: string;
  imageUrl?: string;
};

@Injectable({ providedIn: 'root' })
export class SyntheticCatalogDataService {
  getPublishedMovies(): MovieExtended[] {
    return SYNTHETIC_CATALOG.movies
      .filter(movie => movie.publicationStatus === 'PUBLISHED')
      .map(movie => ({
        id: movie.id,
        title: movie.title,
        durationMinutes: movie.duration,
        genres: movie.genres,
        status: movie.publicationStatus,
        trailerUrl: movie.trailerUrl,
        description: movie.description,
        imageUrl: movie.imageUrl,
      }));
  }

  getShowtimes(movieId?: string): Showtime[] {
    return SYNTHETIC_CATALOG.showtimes.filter(showtime =>
      (!movieId || showtime.movieId === movieId) && this.isPublishedMovie(showtime.movieId),
    );
  }

  getMovie(movieId: string): MovieExtended | undefined {
    return this.getPublishedMovies().find(movie => movie.id === movieId);
  }

  getRoom(roomId: string): Room | undefined {
    const room = SYNTHETIC_CATALOG.rooms.find(item => item.id === roomId);
    return room
      ? { id: room.id, name: room.name, seats: room.seatLabels.map(label => ({ label })) }
      : undefined;
  }

  getSeats(showtimeId: string): SeatAvailability[] {
    const showtime = SYNTHETIC_CATALOG.showtimes.find(item => item.id === showtimeId);
    if (!showtime || !this.isPublishedMovie(showtime.movieId)) {
      return [];
    }

    const room = showtime ? this.getRoom(showtime.roomId) : undefined;
    return (room?.seats ?? []).map((seat, index) => ({ label: seat.label, available: index > 0 }));
  }

  private isPublishedMovie(movieId: string): boolean {
    return SYNTHETIC_CATALOG.movies.some(
      movie => movie.id === movieId && movie.publicationStatus === 'PUBLISHED',
    );
  }
}