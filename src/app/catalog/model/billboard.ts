import { Movie } from './movie';
import { Room } from './room';
import { Showtime } from './showtime';

export interface BillboardItem {
  movie: Movie;
  room: Room;
  showtime: Showtime;
}

export interface Page<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
