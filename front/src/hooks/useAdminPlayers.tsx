import { supabase } from "@/lib/supabaseClient"
import { useEffect, useState } from "react"

interface PlayerInput {
    first_name: string
    last_name: string
    email: string
    phone: string
    arrival?: string
    departure?: string
    status: string
    force_ranking: number
}

export function useAdminPlayers() {
    
    const [players, setPlayers] = useState<PlayerInput[]>([])
    const [loading, setLoading] = useState<boolean>(false)
    const [error, setError] = useState<string | null>(null)

    // liste des joueurs
    const fetchPlayers = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from("profiles")
            .select("*, player_status(status), schedule(arrival, departure)")
            .order("created_at", { ascending: false })
        if(error) {
            setError(error.message)
        }
        setPlayers(data || [])
        setLoading(false)
    }

    //creation d'un joueur
    const addPlayer = async (player: PlayerInput) => {
        setLoading(true)
        const { first_name, last_name, email, phone, arrival, departure, status, force_ranking } = player

        // creation profile
        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .insert([
                {first_name, last_name, avatar_url: null, role: "user", force_ranking, phone, email}
            ])
            .select()
            .single()
        
        if(profileError) {
            setError(profileError.message)
            setLoading(false)
            return
        }

        //status joueur
        await supabase.from("player_status").insert([
            { profile_id: profile.id, status}
        ])

        // horaire joueur
        if(arrival || departure) {
            await supabase.from("schedule").insert([
                { profile_id: profile.id, arrival, departure}
            ])
        }

        await fetchPlayers()
        setLoading(false)
    }

    // mise à jour joueur
    const updatePlayer = async (id: string, updates: []) => {
        const { error } = await supabase
            .from("profiles")
            .update(updates)
            .eq("id", id)
        if (error) {
            setError(error.message)
        }
        await fetchPlayers()
    }
    
    useEffect(() => {
        fetchPlayers()
    }, [])

    return {
        players,
        loading,
        error,
        addPlayer,
        updatePlayer,
        fetchPlayers
    }
}