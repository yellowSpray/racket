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

/**
 * Transforme les données brutes Supabase en objets Group exploitables.
 * Extrait les joueurs depuis les jointures group_players > profiles.
 */
export function transformGroups(data: SupabaseGroup[]): Group[] {
    return data.map(g => ({
        id: g.id,
        event_id: g.event_id,
        group_name: g.group_name,
        max_players: g.max_players,
        created_at: g.created_at,
        players: (g.group_players || [])
            .filter(gp => gp.profiles)
            .map(gp => ({
                id: gp.profiles.id,
                first_name: gp.profiles.first_name,
                last_name: gp.profiles.last_name,
                phone: gp.profiles.phone,
                power_ranking: gp.profiles.power_ranking ?? 0,
            })),
    }))
}