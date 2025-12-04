export type PlayerType = {
    id: string
    first_name: string
    last_name: string
    email: string
    phone: string
    arrival: string
    departure: string
    unavailable: string[]
    status: ("active" | "inactive" | "member" | "visitor" | "paid" | "unpaid" )[]
    power_ranking: string
}

export interface PlayersContextType {
    players: PlayerType[];
    loading: boolean;
    error: string | null;
    addPlayer: (player: Partial<PlayerType>) => Promise<void>;
    updatePlayer: (id: string, updates: Partial<PlayerType>) => Promise<void>;
    fetchPlayer: () => Promise<void>;
    fetchPlayersByEvent: (id: string) => Promise<void>;
}