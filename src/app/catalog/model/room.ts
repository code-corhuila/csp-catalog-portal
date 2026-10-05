export interface Seat {
  label: string;
  row?: string;
  number?: number;
  type?: string;
}

export interface Room {
  id: string;
  name: string;
  capacity?: number;
  seats: Seat[];
}
