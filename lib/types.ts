export interface Reservation {
  id: string;
  date: string; // 'YYYY-MM-DD'
  start_hour: number;
  end_hour: number;
  name: string;
  phone: string;
  email: string;
  purpose: string;
  recurrence_id: string | null;
  created_at: string;
}

// Veřejně viditelná data - bez osobních údajů
export interface AvailabilitySlot {
  date: string;
  start_hour: number;
  end_hour: number;
}

export interface CreateReservationInput {
  date: string;
  start_hour: number;
  end_hour: number;
  name: string;
  phone: string;
  email: string;
  purpose: string;
  recurrence: {
    enabled: boolean;
    frequency: 'weekly' | 'monthly';
    count: number;
  };
}

export const OPEN_HOUR = 8;
export const CLOSE_HOUR = 22;
export const MAX_DAYS_AHEAD = 365;
