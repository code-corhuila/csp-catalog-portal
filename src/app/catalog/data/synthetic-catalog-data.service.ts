import { Injectable } from '@angular/core';
import { Movie } from '../model/movie';
import { Room } from '../model/room';
import { Showtime } from '../model/showtime';
import { SYNTHETIC_CATALOG } from './synthetic-catalog';

export interface SeatAvailability {
  label: string;
  available: boolean;
}

@Injectable({ providedIn: 'root' })
export class SyntheticCatalogDataService {
  getPublishedMovies(): Movie[] {
    return SYNTHETIC_CATALOG.movies
      .filter(movie => movie.publicationStatus === 'PUBLISHED')
      .map(movie => ({
        id: movie.id,
        title: movie.title,
        durationMinutes: movie.duration,
        genres: movie.genres,
        status: movie.publicationStatus,
      }));
  }

  getShowtimes(movieId?: string): Showtime[] {
    return SYNTHETIC_CATALOG.showtimes.filter(showtime => !movieId || showtime.movieId === movieId);
  }

  getMovie(movieId: string): Movie | undefined {
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
    const room = showtime ? this.getRoom(showtime.roomId) : undefined;
    return (room?.seats ?? []).map((seat, index) => ({ label: seat.label, available: index > 0 }));
  }
}
