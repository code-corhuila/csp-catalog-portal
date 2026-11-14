import { Movie } from './movie';
import { Room, Seat } from './room';
import { Showtime } from './showtime';

/**
 * What the administration routes of the Catalog service accept and answer (catalog-service.yaml 1.11.0):
 * the full records, the create bodies (the record without its id) and the update bodies (any field of it).
 */
export type MovieRecord = Movie;
export type CreateMovieRequest = Omit<Movie, 'id'>;
export type UpdateMovieRequest = Partial<CreateMovieRequest>;

export type RoomRecord = Room;
export type CreateRoomRequest = { name: string; seats: Seat[]; capacity?: number };
export type UpdateRoomRequest = Partial<Pick<CreateRoomRequest, 'name' | 'seats'>>;

export interface ShowtimeRecord extends Showtime {
  priceCents: number;
}
export type CreateShowtimeRequest = Omit<ShowtimeRecord, 'id' | 'status'>;
export type UpdateShowtimeRequest = Partial<Omit<ShowtimeRecord, 'id' | 'movieId' | 'roomId'>>;
