import { supabase } from "@/lib/supabaseClient"
import { useCallback, useEffect, useState } from "react"
import type { PlayerType } from "@/types/player"
import { useAuth } from "@/contexts/AuthContext"

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

    const { profile } = useAuth()
    const [players, setPlayer] = useState<PlayerType[]>([])
    const [loading, setLoading] = useState<boolean>(false)
    const [error, setError] = useState<string | null>(null)
    const [currentEventId, setCurrentEventId] = useState<string | null>(null)

    // transformation commune
    const transformPlayerData = useCallback((data: SupabasePlayer[]): PlayerType[] => {
        return (data || []).map((player: SupabasePlayer) => {
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
    }, [])

    // liste des joueurs
    const fetchPlayer = useCallback(async () => {

        setLoading(true)
        setError(null)
        setCurrentEventId(null)

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

            const transformedData = transformPlayerData(data as SupabasePlayer[])
            setPlayer(transformedData)

        } catch (err) {
            console.error("Erreur inattendue:", err)
            setError(err instanceof Error ? err.message : "Erreur inconnue")
        } finally {
            setLoading(false)
        }
        
    }, [transformPlayerData])

    // filtre par event
    const fetchPlayersByEvent = useCallback(async (eventId: string | null) => {

        setLoading(true)
        setError(null)
        setCurrentEventId(eventId)

        try {
            // si pas d'id, charge tout les joueurs
            if(!eventId){
                await fetchPlayer()
                return 
            }

            const { data, error: fetchError } = await supabase
                .from("profiles")
                .select(`
                    *,
                    player_status(status),
                    schedule(arrival, departure),
                    absences(absent_date),
                    event_players!inner(event_id)
                `)
                .eq("event_players.event_id", eventId)
                .order("created_at", { ascending: false })
            
            if(fetchError) {
                console.error("Erreur supabase", fetchError.message)
                setError(fetchError.message)
                return
            }

            const transformedData = transformPlayerData(data as SupabasePlayer[])
            setPlayer(transformedData)

        } catch (err) {
            console.error("Erreur inattendue", err)
            setError(err instanceof Error ? err.message : "Erreur inconnue")
        } finally {
            setLoading(false)
        }

    }, [transformPlayerData, fetchPlayer])

    // fonction pour rafraîchir la vue actuelle
    const refreshCurrentView = useCallback(async () => {
        if(currentEventId) {
            await fetchPlayersByEvent(currentEventId)
        } else {
            await fetchPlayer()
        }
    }, [currentEventId, fetchPlayer, fetchPlayersByEvent])

    // creation d'un joueur
    const addPlayer = async (player: Partial<PlayerType>) => {

        setLoading(true)
        setError(null)

        try {
            const { data, error: rpcError } = await supabase.rpc('upsert_player', {
                p_profile_id: null,
                p_first_name: player.first_name || '',
                p_last_name: player.last_name || '',
                p_phone: player.phone || '',
                p_email: player.email || '',
                p_power_ranking: player.power_ranking ? parseInt(player.power_ranking) : 0,
                p_avatar_url: null,
                p_club_id: profile?.club_id ?? null,
                p_statuses: player.status || [],
                p_arrival_time: player.arrival || null,
                p_departure_time: player.departure || null,
                p_event_id: null,
                p_event_date: null,
                p_payment_amount: 0
            })

            if (rpcError) {
                setError(rpcError.message)
                setLoading(false)
                return
            }

            if (data && typeof data === 'object' && 'success' in data) {
                if (!data.success) {
                    setError(data.error as string)
                    setLoading(false)
                    return
                }
            }

            await refreshCurrentView()

        } catch (err) {
            setError(err instanceof Error ? err.message : "Erreur inconnue")
            setLoading(false)
        }

    }
    
    // mise à jour joueur
    const updatePlayer = async (id: string, updates: Partial<PlayerType>) => {
        
        setLoading(true)
        setError(null)

        try {

            // Récupérer le joueur actuel
            const currentPlayer = players.find(p => p.id === id)
            if (!currentPlayer) {
                setError("Joueur non trouvé")
                setLoading(false)
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
                p_club_id: profile?.club_id ?? null,
                p_statuses: updates.status || currentPlayer.status,
                p_arrival_time: updates.arrival || currentPlayer.arrival || null,
                p_departure_time: updates.departure || currentPlayer.departure || null,
                p_event_id: null,
                p_event_date: null,
                p_payment_amount: 0
            })

            if (rpcError) {
                setError(rpcError.message)
                setLoading(false)
                return
            }

            if (data && typeof data === 'object' && 'success' in data) {
                if (!data.success) {
                    setError(data.error as string)
                    setLoading(false)
                    return
                }
            }

            // rafraîchir la vue actuelle (filtrée ou complète)
            await refreshCurrentView()

        } catch (err) {
            console.error("Erreur inattendue:", err)
            setError(err instanceof Error ? err.message : "Erreur inconnue")
            setLoading(false)
        }        
    }

    // charger les joueurs au montage seulement
    useEffect(() => {
        fetchPlayer()
    }, []) // pas de dépendance fetchPlayer pour éviter les boucles

    return {
        players,
        loading,
        error,
        addPlayer,
        updatePlayer,
        fetchPlayer,
        fetchPlayersByEvent
    }
}