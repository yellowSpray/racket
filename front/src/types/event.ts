export type EventStatus = 'upcoming' | 'active' | 'completed'

export interface EventRound {
  id: string
  event_id: string
  round_number: number
  start_date: string
  end_date: string
  start_time?: string
  end_time?: string
  number_of_courts: number
  estimated_match_duration?: string
  playing_dates?: string[] | null
  deadline?: string | null
  status: EventStatus
  created_at?: string
  updated_at?: string
  player_count?: number
}

export interface Event {
  id: string
  club_id: string | null
  event_name: string
  description?: string
  open_to_visitors?: boolean
  auto_renew?: boolean
  invite_token?: string
  created_at?: string
  updated_at?: string
  // Rounds de la série (chargés avec l'event)
  event_rounds?: EventRound[]
  // Nombre de joueurs inscrits à la série
  player_count?: number
}

export interface EventContextType {
  currentEvent: Event | null
  currentRound: EventRound | null
  events: Event[]
  loading: boolean
  error: string | null
  setCurrentEvent: (eventId: string | null) => void
  fetchEvents: () => Promise<void>
}
