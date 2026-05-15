import type { ScorePointsEntry } from './settings'

export type EventStatus = 'upcoming' | 'active' | 'completed'

export type CalendarType = 'day_selection' | 'period'

export interface EventScoringRules {
  id: string
  event_id: string
  score_points: ScorePointsEntry[]
  created_at?: string
  updated_at?: string
}

export interface EventPromotionRules {
  id: string
  event_id: string
  promoted_count: number
  relegated_count: number
  created_at?: string
  updated_at?: string
}

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
  new_player_count?: number
  removed_player_count?: number
}

export interface Event {
  id: string
  club_id: string | null
  event_name: string
  description?: string
  open_to_visitors?: boolean
  auto_renew?: boolean
  invite_token?: string
  calendar_type?: CalendarType
  created_at?: string
  updated_at?: string
  // Rounds de la série (chargés avec l'event)
  event_rounds?: EventRound[]
  // Nombre de joueurs inscrits à la série
  player_count?: number
  // Règles spécifiques à l'event (chargées à la demande)
  scoring_rules?: EventScoringRules
  promotion_rules?: EventPromotionRules
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
