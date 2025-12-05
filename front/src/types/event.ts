export interface Event {
  id: string
  event_name: string
  description?: string
  start_date: string
  end_date: string
  start_time?: string
  end_time?: string
  number_of_courts: number
  player_count?: number
  estimated_match_duration?: string
  created_at?: string
  updated_at?: string
};

export interface EventContextType {
  currentEvent: Event | null;
  events: Event[];
  loading: boolean;
  error: string | null;
  setCurrentEvent: (eventId: string | null) => void;
  fetchEvents: () => Promise<void>;
};
