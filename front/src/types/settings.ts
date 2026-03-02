export interface ScoringRules {
  id: string
  club_id: string
  points_win: number
  points_loss: number
  points_draw: number
  points_walkover_win: number
  points_walkover_loss: number
  points_absence: number
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
  default_max_players_per_group: number
}
