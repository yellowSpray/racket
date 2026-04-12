export type VisitorRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

export interface VisitorRequest {
  id: string
  event_id: string
  profile_id: string
  status: VisitorRequestStatus
  message?: string
  reviewed_by?: string
  reviewed_at?: string
  created_at: string
  updated_at: string
  event?: {
    event_name: string
    start_date: string
    end_date: string
    clubs?: { club_name: string; visitor_fee: number }
  }
  profile?: {
    first_name: string
    last_name: string
    email: string
    clubs?: { club_name: string }
  }
}

export interface DiscoverableEvent {
  id: string
  event_name: string
  description?: string
  start_date: string
  end_date: string
  open_to_visitors: boolean
  invite_token: string
  club_id: string
  clubs: { club_name: string; visitor_fee: number; country?: string | null; region?: string | null }
  player_count?: number
  my_request_status?: VisitorRequestStatus | null
}

export interface InviteEventInfo {
  id: string
  event_name: string
  description?: string
  start_date: string
  end_date: string
  open_to_visitors: boolean
  status: string
  club_name: string
  visitor_fee: number
}
