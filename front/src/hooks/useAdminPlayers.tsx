import { supabase } from "@/lib/supabaseClient"
import { useEffect, useState } from "react"
import type { PlayerType } from "@/types/player"

// Types pour les données Supabase
type SupabasePlayerStatus = {
    status: "active" | "inactive" | "member" | "visitor" | "paid" | "unpaid"
}

type SupabaseSchedule = {
    arrival: string
    departure: string
}

type SupabaseAbsence = {
    date: string
}

type SupabasePlayer = {
    id: string
    first_name: string
    last_name: string
    email: string
    phone: string
    power_ranking: string
    player_status?: SupabasePlayerStatus[]
    schedule?: SupabaseSchedule[]
    absences?: SupabaseAbsence[]
}

export function useAdminPlayers() {
    
    const [players, setPlayer] = useState<PlayerType[]>([])
    const [loading, setLoading] = useState<boolean>(false)
    const [error, setError] = useState<string | null>(null)

    // liste des joueurs
    const fetchPlayer = async () => {

        setLoading(true)

        const { data, error } = await supabase
            .from("profiles")
            .select("*, player_status(status), schedule(arrival, departure), absences(date)")
            .order("created_at", { ascending: false })
        
        console.log("Supabase response - data:", data)
        console.log("Supabase response - error:", error)

        if(error) {
            console.error("Erreur Supabase:", error.message)
            setError(error.message)
            setLoading(false)
            return
        }

        // Transformation des données pour correspondre au type PlayerType
        const transformedData: PlayerType[] = (data || []).map((player: SupabasePlayer) => ({
            id: player.id,
            first_name: player.first_name,
            last_name: player.last_name,
            full_name: `${player.first_name} ${player.last_name}`, // Ajout de full_name
            email: player.email || "",
            phone: player.phone || "",
            // Extraction des données imbriquées avec valeurs par défaut
            arrival: player.schedule?.[0]?.arrival || "",
            departure: player.schedule?.[0]?.departure || "",
            unavailable: player.absences?.map((d: SupabaseAbsence) => d.date) || [],
            status: player.player_status?.map((s: SupabasePlayerStatus) => s.status) || [],
            power_ranking: player.power_ranking || "",
        }))

        setPlayer(transformedData)
        setLoading(false)
    }

    //creation d'un joueur
    const addPlayer = async (player: Partial<PlayerType>) => {
        setLoading(true)
        const { first_name, last_name, email, phone, arrival, departure, status, power_ranking } = player

        // creation profile
        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .insert([
                {first_name, last_name, avatar_url: null, role: "user", power_ranking, phone, email}
            ])
            .select()
            .single()
        
        if(profileError) {
            setError(profileError.message)
            setLoading(false)
            return
        }

        //status joueur
        if (status && status.length > 0) {
            const statusInserts = status.map(s => ({
                profile_id: profile.id,
                status: s
            }))
            await supabase.from("player_status").insert(statusInserts)
        }

        // horaire joueur
        if(arrival || departure) {
            await supabase.from("schedule").insert([
                { profile_id: profile.id, arrival, departure}
            ])
        }

        await fetchPlayer()
        setLoading(false)
    }

    // mise à jour joueur
    const updatePlayer = async (id: string, updates: Partial<PlayerType>) => {
        
        setLoading(true)
        // Mise à jour du profil principal
        const profileUpdates: Partial<SupabasePlayer> = {}
        if (updates.first_name) profileUpdates.first_name = updates.first_name
        if (updates.last_name) profileUpdates.last_name = updates.last_name
        if (updates.email) profileUpdates.email = updates.email
        if (updates.phone) profileUpdates.phone = updates.phone
        if (updates.power_ranking) profileUpdates.power_ranking = updates.power_ranking

        if (Object.keys(profileUpdates).length > 0) {
            const { error } = await supabase
                .from("profiles")
                .update(profileUpdates)
                .eq("id", id)

            if (error) {
                setError(error.message)
            }
        }

        // Mise à jour du schedule si nécessaire
        if (updates.arrival || updates.departure) {
            await supabase
                .from("schedule")
                .upsert({
                    profile_id: id,
                    arrival: updates.arrival,
                    departure: updates.departure
                })
        }

        // Mise à jour des status si nécessaire
        if (updates.status) {
            // Supprimer les anciens status
            await supabase
                .from("player_status")
                .delete()
                .eq("profile_id", id)
            
            // Insérer les nouveaux
            const statusInserts = updates.status.map(s => ({
                profile_id: id,
                status: s
            }))

            await supabase.from("player_status").insert(statusInserts)
        }

        await fetchPlayer()
        setLoading(false)
    }
    
    useEffect(() => {
        fetchPlayer()
    }, [])

    return {
        players,
        loading,
        error,
        addPlayer,
        updatePlayer,
        fetchPlayer
    }
}