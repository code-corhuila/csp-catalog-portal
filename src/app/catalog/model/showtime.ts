export interface Showtime {
  id: string;
  movieId: string;
  roomId: string;
  startsAt: string;
  endsAt: string;
  audioLanguage?: string;
  subtitleLanguage?: string;
  status: 'SCHEDULED' | 'CANCELLED' | 'COMPLETED';
}

export interface AvailabilityResponse {
  showtimeId: string;
  movieTitle: string;
  roomName: string;
  startsAt: string;
  endsAt: string;
  price: number;
  seats: string[];
}
