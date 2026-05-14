import { supabase } from "@/lib/supabaseClient"
import { useCallback, useEffect, useState } from "react"
import type {
    PlayerType, PaymentStatus, PlayerPayment,
    SupabasePlayer, SupabasePlayerStatus, SupabaseAbsence
} from "@/types/player"
import { useAuth } from "@/contexts/AuthContext"
import { handleHookError, withTimeout } from "@/lib/handleHookError"
import { logger } from "@/lib/logger"

export function useAdminPlayers() {

    const { profile } = useAuth()
    const [players, setPlayer] = useState<PlayerType[]>([])
    const [loading, setLoading] = useState<boolean>(false)
    const [error, setError] = useState<string | null>(null)
    const [currentEventId, setCurrentEventId] = useState<string | null>(null)
    const [currentRoundId, setCurrentRoundId] = useState<string | null>(null)

    /**
     * Transforme les données brutes Supabase en objets PlayerType exploitables.
     * Extrait les horaires d'arrivée/départ depuis le schedule, trie les statuts
     * joueur par priorité (member > visitor > active > inactive), récupère le
     * paiement courant et l'historique multi-rounds, et résout le groupe (box).
     */
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

            const statusOrder = ['member', 'visitor', 'active', 'inactive']
            const sortedStatus = (player.player_status?.map((s: SupabasePlayerStatus) => s.status) || [])
                .sort((a, b) => statusOrder.indexOf(a) - statusOrder.indexOf(b))

            const paymentStatus = player.payments?.[0]?.status as PaymentStatus | undefined

            const payments: PlayerPayment[] = (player.payments || [])
                .filter(p => p.event_rounds?.events?.event_name)
                .map(p => ({
                    round_id: p.round_id,
                    round_number: p.event_rounds.round_number,
                    event_name: p.event_rounds.events.event_name,
                    status: p.status,
                }))
                .sort((a, b) => {
                    const nameOrder = a.event_name.localeCompare(b.event_name, 'fr')
                    return nameOrder !== 0 ? nameOrder : a.round_number - b.round_number
                })

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
                payments,
                power_ranking: player.power_ranking ?? 0,
                box: groupName,
            }
        })
    }, [])

    /**
     * Récupère tous les joueurs du club sans filtre d'événement.
     */
    const fetchPlayer = useCallback(async () => {

        setLoading(true)
        setError(null)
        setCurrentEventId(null)
        setCurrentRoundId(null)
        const endLog = logger.start("useAdminPlayers.fetchAll")

        try {
            const { data, error: fetchError } = await withTimeout(
                supabase
                    .from("profiles")
                    .select(`
                        *,
                        player_status(status),
                        schedule(arrival, departure),
                        absences(absent_date),
                        payments(status, round_id, event_rounds(round_number, events(event_name)))
                    `)
                    .order("created_at", { ascending: false }),
                "useAdminPlayers.fetchAll"
            )

            if(fetchError) {
                endLog({ error: fetchError.message })
                handleHookError(fetchError, setError, "useAdminPlayers.fetch")
                return
            }

            setPlayer(transformPlayerData(data as SupabasePlayer[]))
            endLog()

        } catch (err) {
            endLog({ error: err instanceof Error ? err.message : "Erreur inconnue" })
            handleHookError(err, setError, "useAdminPlayers.fetch")
        } finally {
            setLoading(false)
        }

    }, [transformPlayerData])

    /**
     * Récupère les joueurs inscrits à une série (eventId) avec leurs groupes
     * du round courant (roundId). Si eventId est null, retombe sur fetchPlayer.
     */
    const fetchPlayersByEvent = useCallback(async (eventId: string | null, roundId: string | null = null) => {

        setLoading(true)
        setError(null)
        setCurrentEventId(eventId)
        setCurrentRoundId(roundId)

        try {
            if(!eventId){
                await fetchPlayer()
                return
            }

            const endLog = logger.start(`useAdminPlayers.fetchByEvent(${eventId.slice(0, 8)})`)

            let query = supabase
                .from("profiles")
                .select(`
                    *,
                    player_status(status),
                    schedule(arrival, departure),
                    absences(absent_date),
                    event_players!inner(event_id),
                    group_players!left(group_id, groups!inner(group_name, round_id)),
                    payments(status, round_id, event_rounds(round_number, events(event_name)))
                `)
                .eq("event_players.event_id", eventId)
                .order("created_at", { ascending: false })

            // Filtrer les groupes par round si disponible
            if (roundId) {
                query = query.eq("group_players.groups.round_id", roundId)
            }

            const { data, error: fetchError } = await withTimeout(query, "useAdminPlayers.fetchByEvent")

            if(fetchError) {
                endLog({ error: fetchError.message })
                handleHookError(fetchError, setError, "useAdminPlayers.fetchByEvent")
                return
            }

            setPlayer(transformPlayerData(data as SupabasePlayer[]))
            endLog()

        } catch (err) {
            handleHookError(err, setError, "useAdminPlayers.fetchByEvent")
        } finally {
            setLoading(false)
        }

    }, [transformPlayerData, fetchPlayer])

    /**
     * Rafraîchit la liste des joueurs selon le contexte actuel.
     */
    const refreshCurrentView = useCallback(async () => {
        if(currentEventId) {
            await fetchPlayersByEvent(currentEventId, currentRoundId)
        } else {
            await fetchPlayer()
        }
    }, [currentEventId, currentRoundId, fetchPlayer, fetchPlayersByEvent])

    /**
     * Crée un nouveau joueur via la fonction RPC upsert_player.
     */
    const addPlayer = async (player: Partial<PlayerType>) => {

        const playerStatuses = (player.status || []).filter(s => s !== "active" && s !== "inactive") as string[]
        const isPaid = player.payment_status === "paid"

        const rpcStatuses = [...playerStatuses, "inactive"]
        if (playerStatuses.includes("visitor")) {
            rpcStatuses.push(isPaid ? "paid" : "unpaid")
        }

        const rpcParams = {
            p_profile_id: null,
            p_first_name: player.first_name || '',
            p_last_name: player.last_name || '',
            p_phone: player.phone || '',
            p_email: player.email || '',
            p_power_ranking: player.power_ranking ?? 0,
            p_avatar_url: null,
            p_club_id: profile?.club_id ?? null,
            p_statuses: rpcStatuses,
            p_arrival_time: player.arrival || null,
            p_departure_time: player.departure || null,
            p_event_id: currentEventId,
            p_round_id: currentRoundId,
            p_event_date: null,
            p_payment_amount: 0
        }

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

    /**
     * Met à jour un joueur existant via la fonction RPC upsert_player.
     */
    const updatePlayer = async (id: string, updates: Partial<PlayerType>) => {

        setError(null)

        try {
            const currentPlayer = players.find(p => p.id === id)
            if (!currentPlayer) {
                setError("Joueur non trouvé")
                return
            }

            const baseStatuses = ((updates.status || currentPlayer.status) as string[])
                .filter(s => s !== "active" && s !== "inactive")
            const currentActiveStatus = (currentPlayer.status as string[])
                .find(s => s === "active" || s === "inactive") ?? "inactive"
            const isPaid = (updates.payment_status ?? currentPlayer.payment_status) === "paid"

            const rpcStatuses = [...baseStatuses, currentActiveStatus]
            if (baseStatuses.includes("visitor")) {
                rpcStatuses.push(isPaid ? "paid" : "unpaid")
            }

            const { data, error: rpcError } = await supabase.rpc('upsert_player', {
                p_profile_id: id,
                p_first_name: updates.first_name || currentPlayer.first_name,
                p_last_name: updates.last_name || currentPlayer.last_name,
                p_phone: updates.phone || currentPlayer.phone,
                p_email: updates.email || currentPlayer.email,
                p_power_ranking: updates.power_ranking ?? currentPlayer.power_ranking ?? 0,
                p_avatar_url: null,
                p_club_id: profile?.club_id ?? null,
                p_statuses: rpcStatuses,
                p_arrival_time: updates.arrival || currentPlayer.arrival || null,
                p_departure_time: updates.departure || currentPlayer.departure || null,
                p_event_id: null,
                p_round_id: null,
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

            await refreshCurrentView()

        } catch (err) {
            handleHookError(err, setError, "useAdminPlayers.update")
        }
    }

    /**
     * Retire un joueur de la série (event_players) courante.
     */
    const removePlayerFromEvent = async (playerId: string) => {
        if (!currentEventId) {
            setError("Aucune série sélectionnée")
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

    /**
     * Supprime définitivement un joueur du club (suppression du profil).
     */
    const deletePlayer = async (playerId: string) => {
        console.log("[deletePlayer] start", playerId)
        setLoading(true)
        setError(null)

        try {
            const { data, error: deleteError, status, statusText } = await supabase
                .from("profiles")
                .delete()
                .eq("id", playerId)
                .select()

            console.log("[deletePlayer] response", { data, error: deleteError, status, statusText })

            if (deleteError) {
                console.error("[deletePlayer] error", deleteError)
                handleHookError(deleteError, setError, "useAdminPlayers.delete")
                setLoading(false)
                return
            }

            console.log("[deletePlayer] success, refreshing...")
            await refreshCurrentView()
        } catch (err) {
            console.error("[deletePlayer] caught exception", err)
            handleHookError(err, setError, "useAdminPlayers.delete")
            setLoading(false)
        }
    }

    /**
     * Met à jour le statut de paiement d'un joueur pour un round donné.
     */
    const updatePaymentStatus = async (playerId: string, roundId: string, newStatus: PaymentStatus) => {
        setError(null)

        const { error: updateError } = await supabase
            .from("payments")
            .update({
                status: newStatus,
                paid_at: newStatus === "paid" ? new Date().toISOString() : null,
                updated_at: new Date().toISOString()
            })
            .eq("profile_id", playerId)
            .eq("round_id", roundId)

        if (updateError) {
            handleHookError(updateError, setError, "useAdminPlayers.updatePayment")
            return
        }

        await refreshCurrentView()
    }

    /**
     * Remplace les absences d'un joueur pour un round par un nouveau jeu de dates.
     * Si roundId est null, gère les absences globales (sans round).
     */
    const updateAbsences = async (playerId: string, dates: string[], roundId: string | null) => {
        setError(null)

        // Supprimer les absences existantes pour ce joueur dans ce round
        let deleteQuery = supabase
            .from("absences")
            .delete()
            .eq("profile_id", playerId)

        deleteQuery = roundId
            ? deleteQuery.eq("round_id", roundId)
            : deleteQuery.is("round_id", null)

        const { error: deleteError } = await deleteQuery

        if (deleteError) {
            handleHookError(deleteError, setError, "useAdminPlayers.updateAbsences")
            return
        }

        if (dates.length > 0) {
            const rows = dates.map(date => ({
                profile_id: playerId,
                absent_date: date,
                round_id: roundId ?? null,
            }))

            const { error: insertError } = await supabase
                .from("absences")
                .insert(rows)

            if (insertError) {
                handleHookError(insertError, setError, "useAdminPlayers.updateAbsences")
                return
            }
        }

        await refreshCurrentView()
    }

    useEffect(() => {
        fetchPlayer()
    }, [fetchPlayer])

    return {
        players,
        loading,
        error,
        addPlayer,
        updatePlayer,
        deletePlayer,
        removePlayerFromEvent,
        updatePaymentStatus,
        updateAbsences,
        fetchPlayer,
        fetchPlayersByEvent
    }
}
