export type PlayerStatus = "active" | "inactive" | "member" | "visitor"
export type PaymentStatus = "paid" | "unpaid"

// Types de mapping Supabase → PlayerType
export type SupabasePlayerStatus = {
    status: PlayerStatus
}

export type SupabaseSchedule = {
    arrival: string
    departure: string
}

export type SupabaseAbsence = {
    absent_date: string
}

export type SupabaseGroupPlayer = {
    group_id: string
    groups: { group_name: string }
}

export type SupabasePayment = {
    status: PaymentStatus
    round_id: string
    event_rounds: { round_number: number; events: { event_name: string } }
}

export type SupabasePlayer = {
    id: string
    first_name: string
    last_name: string
    email: string
    phone: string
    power_ranking: number
    player_status?: SupabasePlayerStatus[]
    schedule?: SupabaseSchedule[]
    absences?: SupabaseAbsence[]
    group_players?: SupabaseGroupPlayer[]
    payments?: SupabasePayment[]
}

export type PlayerPayment = {
    round_id: string
    round_number: number
    event_name: string
    status: PaymentStatus
}

export type PlayerType = {
    id: string
    first_name: string
    last_name: string
    full_name: string
    email: string
    phone: string
    arrival: string
    departure: string
    unavailable: string[]
    status: PlayerStatus[]
    payment_status?: PaymentStatus
    payments: PlayerPayment[]
    power_ranking: number
    box: string
}

export interface PlayersContextType {
    players: PlayerType[];
    loading: boolean;
    error: string | null;
    addPlayer: (player: Partial<PlayerType>) => Promise<void>;
    updatePlayer: (id: string, updates: Partial<PlayerType>) => Promise<void>;
    deletePlayer: (id: string) => Promise<void>;
    removePlayerFromEvent: (id: string) => Promise<void>;
    updatePaymentStatus: (playerId: string, roundId: string, newStatus: PaymentStatus) => Promise<void>;
    updateAbsences: (playerId: string, dates: string[], roundId: string | null) => Promise<void>;
    fetchPlayer: () => Promise<void>;
    fetchPlayersByEvent: (eventId: string, roundId: string | null) => Promise<void>;
}
