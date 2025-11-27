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
        setError(null)

        try {

            const { data, error: fetchError } = await supabase
                .from("profiles")
                .select("*, player_status(status), schedule(arrival, departure), absences(absent_date)")
                .order("created_at", { ascending: false })

            if(fetchError) {
                console.error("Erreur Supabase:", fetchError.message)
                setError(fetchError.message)
                return
            }

            // Transformation des données pour correspondre au type PlayerType
            const transformedData: PlayerType[] = (data || []).map((player: SupabasePlayer) => {

                let arrivalTime = ""
                let departureTime = ""

                if (player.schedule?.[0]?.arrival) {
                    const arrivalDate = new Date(player.schedule[0].arrival)
                    arrivalTime = arrivalDate.toLocaleTimeString('fr-FR', { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        hour12: false,
                        timeZone: 'UTC' 
                    })
                }

                if (player.schedule?.[0]?.departure) {
                    const departureDate = new Date(player.schedule[0].departure)
                    departureTime = departureDate.toLocaleTimeString('fr-FR', { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        hour12: false,
                        timeZone: 'UTC' 
                    })
                }

                // trier les status 
                const statusOrder = ['member', 'visitor', 'active', 'inactive', 'paid', 'unpaid']
                const sortedStatus = (player.player_status?.map((s: SupabasePlayerStatus) => s.status) || [])
                    .sort((a, b) => {
                        const indexA = statusOrder.indexOf(a)
                        const indexB = statusOrder.indexOf(b)
                        return indexA - indexB
                    })

                return {
                    id: player.id,
                    first_name: player.first_name,
                    last_name: player.last_name,
                    full_name: `${player.first_name} ${player.last_name}`,
                    email: player.email || "",
                    phone: player.phone || "",
                    arrival: arrivalTime,
                    departure: departureTime,
                    unavailable: player.absences?.map((d: SupabaseAbsence) => d.date) || [],
                    status: sortedStatus,
                    power_ranking: player.power_ranking || "",
                }

            })

            setPlayer(transformedData)

        } catch (err) {
            console.error("Erreur inattendue:", err)
            setError(err instanceof Error ? err.message : "Erreur inconnue")
        } finally {
            setLoading(false)
        }
        
    }

    // creation d'un joueur
    const addPlayer = async (player: Partial<PlayerType>) => {

        setLoading(true)
        setError(null)

        try {

            console.log("Données reçues:", player)

            const { data, error: rpcError } = await supabase.rpc('upsert_player', {
                p_profile_id: null,
                p_first_name: player.first_name || '',
                p_last_name: player.last_name || '',
                p_phone: player.phone || '',
                p_email: player.email || '',
                p_power_ranking: player.power_ranking ? parseInt(player.power_ranking) : 0,
                p_avatar_url: null,
                p_club_id: null,
                p_statuses: player.status || [],
                p_arrival_time: player.arrival || null,
                p_departure_time: player.departure || null,
                p_event_id: null,
                p_event_date: null,
                p_payment_amount: 0
            })

            if (rpcError) {
                console.error("Erreur RPC:", rpcError)
                setError(rpcError.message)
                return
            }

            console.log("Réponse de upsert_player:", data)

            if (data && typeof data === 'object' && 'success' in data) {
                if (!data.success) {
                    console.error("Erreur dans la fonction:", data.error)
                    setError(data.error as string)
                    return
                }
                console.log("Joueur créé:", data.profile_id)
            }

            // Rafraîchir la liste
            await fetchPlayer()

        } catch (err) {
            console.error("Erreur inattendue:", err)
            setError(err instanceof Error ? err.message : "Erreur inconnue")
        } finally {
            setLoading(false)
        }

    }
    
    // mise à jour joueur
    const updatePlayer = async (id: string, updates: Partial<PlayerType>) => {
        
        setLoading(true)
        setError(null)

        try {

            console.log("Player ID:", id)
            console.log("Updates:", updates)

            // Récupérer le joueur actuel
            const currentPlayer = players.find(p => p.id === id)
            if (!currentPlayer) {
                setError("Joueur non trouvé")
                return
            }

            // Appel de la fonction PostgreSQL upsert_player
            const { data, error: rpcError } = await supabase.rpc('upsert_player', {
                p_profile_id: id, 
                p_first_name: updates.first_name || currentPlayer.first_name,
                p_last_name: updates.last_name || currentPlayer.last_name,
                p_phone: updates.phone || currentPlayer.phone,
                p_email: updates.email || currentPlayer.email,
                p_power_ranking: updates.power_ranking 
                    ? parseInt(updates.power_ranking) 
                    : parseInt(currentPlayer.power_ranking || '0'),
                p_avatar_url: null,
                p_club_id: null,
                p_statuses: updates.status || currentPlayer.status,
                p_arrival_time: updates.arrival || currentPlayer.arrival || null,
                p_departure_time: updates.departure || currentPlayer.departure || null,
                p_event_id: null,
                p_event_date: null,
                p_payment_amount: 0
            })

            if (rpcError) {
                console.error("Erreur RPC:", rpcError)
                setError(rpcError.message)
                return
            }

            console.log("Réponse de upsert_player:", data)

            // Vérifier le succès
            if (data && typeof data === 'object' && 'success' in data) {
                if (!data.success) {
                    console.error("Erreur dans la fonction:", data.error)
                    setError(data.error as string)
                    return
                }
                console.log("Joueur mis à jour:", data.profile_id)
            }

            // Rafraîchir la liste
            await fetchPlayer()

        } catch (err) {
            console.error("Erreur inattendue:", err)
            setError(err instanceof Error ? err.message : "Erreur inconnue")
        } finally {
            setLoading(false)
        }        
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