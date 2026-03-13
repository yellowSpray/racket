export interface ScorePointsEntry {
  score: string          // "3-0", "3-1", "3-2", "WO", "ABS"
  winner_points: number
  loser_points: number
}

export interface ScoringRules {
  id: string
  club_id: string
  score_points: ScorePointsEntry[]
  created_at?: string
  updated_at?: string
}

export interface PromotionRules {
  id: string
  club_id: string
  promoted_count: number
  relegated_count: number
  created_at?: string
  updated_at?: string
}

export interface EventCourt {
  id: string
  event_id: string
  court_name: string
  available_from: string
  available_to: string
  sort_order: number
  created_at?: string
}

export interface ClubConfig {
  id: string
  club_name: string
  club_address?: string
  club_email?: string
  default_min_players_per_group: number
  default_max_players_per_group: number
  visitor_fee: number
  default_start_time: string
  default_end_time: string
  default_number_of_courts: number
  default_match_duration: number
}
