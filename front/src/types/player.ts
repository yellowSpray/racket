export type PlayerStatus = "active" | "inactive" | "member" | "visitor"
export type PaymentStatus = "paid" | "unpaid"

export type PlayerPayment = {
    event_id: string
    event_name: string
    status: PaymentStatus
}

export type PlayerType = {
    id: string
    first_name: string
    last_name: string
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
    removePlayerFromEvent: (id: string) => Promise<void>;
    updatePaymentStatus: (playerId: string, eventId: string, newStatus: PaymentStatus) => Promise<void>;
    updateAbsences: (playerId: string, dates: string[]) => Promise<void>;
    fetchPlayer: () => Promise<void>;
    fetchPlayersByEvent: (id: string) => Promise<void>;
}