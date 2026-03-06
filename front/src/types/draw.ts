export type GroupPlayer = {
    id: string
    first_name: string
    last_name: string
    phone: string
    power_ranking: number
}

export type Group = {
    id: string
    event_id: string
    group_name: string
    max_players: number
    created_at: string
    players?: GroupPlayer[]
}

export type SupabaseProfile = {
    id: string
    first_name: string
    last_name: string
    phone: string
    power_ranking: number
}

export type SupabaseGroupPlayer = {
    profile_id: string
    profiles: SupabaseProfile
}

export type SupabaseGroup = {
    id: string
    event_id: string
    group_name: string
    max_players: number
    created_at: string
    group_players?: SupabaseGroupPlayer[]
}