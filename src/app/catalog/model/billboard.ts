import { Movie } from './movie';
import { Room } from './room';
import { Showtime } from './showtime';

export interface BillboardItem {
  movie: Movie;
  room: Room;
  showtime: Showtime;
}
