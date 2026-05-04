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

    /**
     * Transforme les données brutes Supabase en objets PlayerType exploitables.
     * Extrait les horaires d'arrivée/départ depuis le schedule, trie les statuts
     * joueur par priorité (member > visitor > active > inactive), récupère le
     * paiement courant et l'historique multi-séries, et résout le groupe (box).
     */
    const transformPlayerData = useCallback((data: SupabasePlayer[]): PlayerType[] => {
        return (data || []).map((player: SupabasePlayer) => {
            // extraire les horaires d'arrivée et de départ depuis le schedule
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

            // récupérer le statut de paiement de l'événement courant
            const paymentStatus = player.payments?.[0]?.status as PaymentStatus | undefined

            // mapper l'historique des paiements sur toutes les séries (du plus ancien au plus récent)
            const payments: PlayerPayment[] = (player.payments || [])
                .filter(p => p.events?.event_name)
                .map(p => ({
                    event_id: p.event_id,
                    event_name: p.events.event_name,
                    status: p.status,
                }))
                .sort((a, b) => a.event_name.localeCompare(b.event_name, 'fr'))

            // récupérer le nom du groupe (box) si disponible
            const groupName = player.group_players?.[0]?.groups?.group_name || ""

            // assembler l'objet PlayerType final
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
     * Charge les profils avec leurs statuts, horaires, absences et paiements,
     * puis les transforme en PlayerType via transformPlayerData.
     */
    const fetchPlayer = useCallback(async () => {

        setLoading(true)
        setError(null)
        setCurrentEventId(null)
        const endLog = logger.start("useAdminPlayers.fetchAll")

        try {
            // requête avec jointures : statuts, schedule, absences et paiements
            const { data, error: fetchError } = await withTimeout(
                supabase
                    .from("profiles")
                    .select("*, player_status(status), schedule(arrival, departure), absences(absent_date), payments(status, event_id, events(event_name))")
                    .order("created_at", { ascending: false }),
                "useAdminPlayers.fetchAll"
            )

            if(fetchError) {
                endLog({ error: fetchError.message })
                handleHookError(fetchError, setError, "useAdminPlayers.fetch")
                return
            }

            // transformer les données brutes en objets PlayerType
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

    /**
     * Récupère les joueurs inscrits à un événement spécifique.
     * Filtre via event_players et résout le groupe (box) de l'événement.
     * Si eventId est null, retombe sur fetchPlayer (tous les joueurs).
     */
    const fetchPlayersByEvent = useCallback(async (eventId: string | null) => {

        setLoading(true)
        setError(null)
        setCurrentEventId(eventId)

        try {
            // si pas d'id, charger tous les joueurs sans filtre
            if(!eventId){
                await fetchPlayer()
                return
            }

            const endLog = logger.start(`useAdminPlayers.fetchByEvent(${eventId.slice(0, 8)})`)

            // requête filtrée par event_players + jointure groupe de l'événement
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
                        payments(status, event_id, events(event_name))
                    `)
                    .eq("event_players.event_id", eventId)
                    .eq("group_players.groups.event_id", eventId)
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

    /**
     * Rafraîchit la liste des joueurs selon le contexte actuel.
     * Recharge par événement si un eventId est sélectionné, sinon tous les joueurs.
     */
    const refreshCurrentView = useCallback(async () => {
        if(currentEventId) {
            await fetchPlayersByEvent(currentEventId)
        } else {
            await fetchPlayer()
        }
    }, [currentEventId, fetchPlayer, fetchPlayersByEvent])

    /**
     * Crée un nouveau joueur via la fonction RPC upsert_player.
     * Fusionne les statuts joueur et paiement dans un seul tableau pour le SQL,
     * puis rafraîchit la vue après insertion.
     */
    const addPlayer = async (player: Partial<PlayerType>) => {

        // séparer les statuts joueur du statut de paiement
        // active/inactive géré par trigger SQL, on force inactive à la création
        const playerStatuses = (player.status || []).filter(s => s !== "active" && s !== "inactive") as string[]
        const isPaid = player.payment_status === "paid"

        const rpcStatuses = [...playerStatuses, "inactive"]
        if (playerStatuses.includes("visitor")) {
            rpcStatuses.push(isPaid ? "paid" : "unpaid")
        }

        // construire les paramètres pour la fonction RPC
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
            p_event_date: null,
            p_payment_amount: 0
        }

        // appel RPC (pas de setState avant pour éviter un re-render qui démonte le dialog)
        const { data, error: rpcError } = await supabase.rpc('upsert_player', rpcParams)

        if (rpcError) {
            handleHookError(rpcError, setError, "useAdminPlayers.add")
            return
        }

        // vérifier le retour de la fonction SQL
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
     * Fusionne les nouvelles valeurs avec les données actuelles du joueur,
     * reconstruit le tableau de statuts et rafraîchit la vue.
     */
    const updatePlayer = async (id: string, updates: Partial<PlayerType>) => {

        setError(null)

        try {
            // récupérer le joueur actuel pour fusionner les champs non modifiés
            const currentPlayer = players.find(p => p.id === id)
            if (!currentPlayer) {
                setError("Joueur non trouvé")
                return
            }

            // séparer les statuts joueur du statut de paiement
            // active/inactive géré par trigger SQL — on préserve l'état courant du joueur
            const baseStatuses = ((updates.status || currentPlayer.status) as string[])
                .filter(s => s !== "active" && s !== "inactive")
            const currentActiveStatus = (currentPlayer.status as string[])
                .find(s => s === "active" || s === "inactive") ?? "inactive"
            const isPaid = (updates.payment_status ?? currentPlayer.payment_status) === "paid"

            const rpcStatuses = [...baseStatuses, currentActiveStatus]
            if (baseStatuses.includes("visitor")) {
                rpcStatuses.push(isPaid ? "paid" : "unpaid")
            }

            // appel RPC avec les champs fusionnés (updates + valeurs actuelles)
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
                p_event_date: null,
                p_payment_amount: 0
            })

            if (rpcError) {
                handleHookError(rpcError, setError, "useAdminPlayers.update")
                return
            }

            // vérifier le retour de la fonction SQL
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
     * Retire un joueur de l'événement courant.
     * Supprime l'entrée dans event_players et rafraîchit la liste.
     */
    const removePlayerFromEvent = async (playerId: string) => {
        if (!currentEventId) {
            setError("Aucun événement sélectionné")
            return
        }

        setLoading(true)
        setError(null)

        try {
            // supprimer l'inscription du joueur à l'événement
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
     * Les entrées liées (event_players, player_status, schedule, absences) sont
     * supprimées en cascade côté base de données.
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
     * Met à jour le statut de paiement d'un joueur pour un événement donné.
     * Bascule entre paid/unpaid et enregistre la date de paiement si applicable.
     */
    const updatePaymentStatus = async (playerId: string, eventId: string, newStatus: PaymentStatus) => {
        setError(null)

        // mettre à jour le paiement avec la date si payé, null sinon
        const { error: updateError } = await supabase
            .from("payments")
            .update({
                status: newStatus,
                paid_at: newStatus === "paid" ? new Date().toISOString() : null,
                updated_at: new Date().toISOString()
            })
            .eq("profile_id", playerId)
            .eq("event_id", eventId)

        if (updateError) {
            handleHookError(updateError, setError, "useAdminPlayers.updatePayment")
            return
        }

        await refreshCurrentView()
    }

    /**
     * Remplace les absences d'un joueur par un nouveau jeu de dates.
     * Supprime toutes les absences existantes puis insère les nouvelles.
     */
    const updateAbsences = async (playerId: string, dates: string[]) => {
        setError(null)

        // supprimer toutes les absences existantes du joueur
        const { error: deleteError } = await supabase
            .from("absences")
            .delete()
            .eq("profile_id", playerId)

        if (deleteError) {
            handleHookError(deleteError, setError, "useAdminPlayers.updateAbsences")
            return
        }

        // insérer les nouvelles dates d'absence
        if (dates.length > 0) {
            const rows = dates.map(date => ({
                profile_id: playerId,
                absent_date: date,
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
        deletePlayer,
        removePlayerFromEvent,
        updatePaymentStatus,
        updateAbsences,
        fetchPlayer,
        fetchPlayersByEvent
    }
}