import { supabase } from "@/lib/supabaseClient"
import { useCallback, useEffect, useState } from "react"
import type { PlayerType, PlayerStatus, PaymentStatus } from "@/types/player"
import { useAuth } from "@/contexts/AuthContext"
import { handleHookError, withTimeout } from "@/lib/handleHookError"
import { logger } from "@/lib/logger"

// Types pour les données Supabase
type SupabasePlayerStatus = {
    status: PlayerStatus
}

type SupabaseSchedule = {
    arrival: string
    departure: string
}

type SupabaseAbsence = {
    absent_date: string
}

type SupabaseGroupPlayer = {
    group_id: string
    groups: { group_name: string }
}

type SupabasePayment = {
    status: PaymentStatus
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
    group_players?: SupabaseGroupPlayer[]
    payments?: SupabasePayment[]
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

            // trier les status joueur (sans paid/unpaid)
            const statusOrder = ['member', 'visitor', 'active', 'inactive']
            const sortedStatus = (player.player_status?.map((s: SupabasePlayerStatus) => s.status) || [])
                .sort((a, b) => {
                    const indexA = statusOrder.indexOf(a)
                    const indexB = statusOrder.indexOf(b)
                    return indexA - indexB
                })

            // Récupérer le statut de paiement depuis la table payments (contexte événement)
            const paymentStatus = player.payments?.[0]?.status as PaymentStatus | undefined

            // Récupérer le nom du groupe (box) si disponible
            const groupName = player.group_players?.[0]?.groups?.group_name || ""

            return {
                id: player.id,
                first_name: player.first_name,
                last_name: player.last_name,
                full_name: `${player.first_name} ${player.last_name}`,
                email: player.email || "",
                phone: player.phone || "",
                arrival: arrivalTime,
                departure: departureTime,
                unavailable: player.absences?.map((d: SupabaseAbsence) => d.absent_date) || [],
                status: sortedStatus,
                payment_status: paymentStatus,
                power_ranking: player.power_ranking || "",
                box: groupName,
            }
        })
    }, [])

    // liste des joueurs
    const fetchPlayer = useCallback(async () => {

        setLoading(true)
        setError(null)
        setCurrentEventId(null)
        const endLog = logger.start("useAdminPlayers.fetchAll")

        try {

            const { data, error: fetchError } = await withTimeout(
                supabase
                    .from("profiles")
                    .select("*, player_status(status), schedule(arrival, departure), absences(absent_date)")
                    .order("created_at", { ascending: false }),
                "useAdminPlayers.fetchAll"
            )

            if(fetchError) {
                endLog({ error: fetchError.message })
                handleHookError(fetchError, setError, "useAdminPlayers.fetch")
                return
            }

            const transformedData = transformPlayerData(data as SupabasePlayer[])
            setPlayer(transformedData)
            endLog()

        } catch (err) {
            endLog({ error: err instanceof Error ? err.message : "Erreur inconnue" })
            handleHookError(err, setError, "useAdminPlayers.fetch")
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

            const endLog = logger.start(`useAdminPlayers.fetchByEvent(${eventId.slice(0, 8)})`)

            const { data, error: fetchError } = await withTimeout(
                supabase
                    .from("profiles")
                    .select(`
                        *,
                        player_status(status),
                        schedule(arrival, departure),
                        absences(absent_date),
                        event_players!inner(event_id),
                        group_players!left(group_id, groups!inner(group_name, event_id)),
                        payments(status)
                    `)
                    .eq("event_players.event_id", eventId)
                    .eq("group_players.groups.event_id", eventId)
                    .eq("payments.event_id", eventId)
                    .order("created_at", { ascending: false }),
                "useAdminPlayers.fetchByEvent"
            )

            if(fetchError) {
                endLog({ error: fetchError.message })
                handleHookError(fetchError, setError, "useAdminPlayers.fetchByEvent")
                return
            }

            const transformedData = transformPlayerData(data as SupabasePlayer[])
            setPlayer(transformedData)
            endLog()

        } catch (err) {
            handleHookError(err, setError, "useAdminPlayers.fetchByEvent")
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

        // Séparer les statuts joueur du statut de paiement
        const playerStatuses = (player.status || []) as string[]
        const isPaid = player.payment_status === "paid"

        // Construire le tableau p_statuses avec paid/unpaid pour la logique paiement côté SQL
        const rpcStatuses = [...playerStatuses]
        if (playerStatuses.includes("visitor")) {
            rpcStatuses.push(isPaid ? "paid" : "unpaid")
        }

        const rpcParams = {
            p_profile_id: null,
            p_first_name: player.first_name || '',
            p_last_name: player.last_name || '',
            p_phone: player.phone || '',
            p_email: player.email || '',
            p_power_ranking: player.power_ranking ? parseInt(player.power_ranking) : 0,
            p_avatar_url: null,
            p_club_id: profile?.club_id ?? null,
            p_statuses: rpcStatuses,
            p_arrival_time: player.arrival || null,
            p_departure_time: player.departure || null,
            p_event_id: currentEventId,
            p_event_date: null,
            p_payment_amount: 0
        }

        // Pas de setState avant l'appel RPC pour éviter un re-render qui démonte le dialog
        const { data, error: rpcError } = await supabase.rpc('upsert_player', rpcParams)

        if (rpcError) {
            handleHookError(rpcError, setError, "useAdminPlayers.add")
            return
        }

        if (data && typeof data === 'object' && 'success' in data) {
            if (!data.success) {
                handleHookError(data.error as string, setError, "useAdminPlayers.add")
                return
            }
        }

        await refreshCurrentView()

    }

    // mise à jour joueur
    const updatePlayer = async (id: string, updates: Partial<PlayerType>) => {

        setError(null)

        try {

            // Récupérer le joueur actuel
            const currentPlayer = players.find(p => p.id === id)
            if (!currentPlayer) {
                setError("Joueur non trouvé")
                return
            }

            // Séparer les statuts joueur du statut de paiement
            const playerStatuses = (updates.status || currentPlayer.status) as string[]
            const isPaid = (updates.payment_status ?? currentPlayer.payment_status) === "paid"

            // Construire le tableau p_statuses avec paid/unpaid pour la logique paiement côté SQL
            const rpcStatuses = [...playerStatuses]
            if (playerStatuses.includes("visitor")) {
                rpcStatuses.push(isPaid ? "paid" : "unpaid")
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
                p_statuses: rpcStatuses,
                p_arrival_time: updates.arrival || currentPlayer.arrival || null,
                p_departure_time: updates.departure || currentPlayer.departure || null,
                p_event_id: currentEventId,
                p_event_date: null,
                p_payment_amount: 0
            })

            if (rpcError) {
                handleHookError(rpcError, setError, "useAdminPlayers.update")
                return
            }

            if (data && typeof data === 'object' && 'success' in data) {
                if (!data.success) {
                    handleHookError(data.error as string, setError, "useAdminPlayers.update")
                    return
                }
            }

            // rafraîchir la vue actuelle (filtrée ou complète)
            await refreshCurrentView()

        } catch (err) {
            handleHookError(err, setError, "useAdminPlayers.update")
        }
    }

    // retirer un joueur de l'événement courant
    const removePlayerFromEvent = async (playerId: string) => {
        if (!currentEventId) {
            setError("Aucun événement sélectionné")
            return
        }

        setLoading(true)
        setError(null)

        try {
            const { error: deleteError } = await supabase
                .from("event_players")
                .delete()
                .eq("profile_id", playerId)
                .eq("event_id", currentEventId)

            if (deleteError) {
                handleHookError(deleteError, setError, "useAdminPlayers.remove")
                setLoading(false)
                return
            }

            await refreshCurrentView()
        } catch (err) {
            handleHookError(err, setError, "useAdminPlayers.remove")
            setLoading(false)
        }
    }

    // charger les joueurs au montage seulement
    useEffect(() => {
        fetchPlayer()
    }, [fetchPlayer])

    return {
        players,
        loading,
        error,
        addPlayer,
        updatePlayer,
        removePlayerFromEvent,
        fetchPlayer,
        fetchPlayersByEvent
    }
}