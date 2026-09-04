import { supabase } from "@/lib/supabaseClient"
import type { Match } from "@/types/match"
import type { Group } from "@/types/draw"
import type { Event, EventRound } from "@/types/event"
import type { UnplacedMatch } from "@/lib/matchScheduler"
import { useCallback, useEffect, useRef, useState } from "react"
import { handleHookError, withTimeout } from "@/lib/handleHookError"
import { logger } from "@/lib/logger"
import { normalizeScoreForDb, computeWinnerId } from "@/lib/matchScore"
import { intervalToMinutes } from "@/lib/utils"
import {
    generateGroupRounds,
    mapRoundsToDatesByTemplate,
    assignTimeSlotsForDates,
    calculateTimeSlots,
    calculateDates,
    optimizePlayerOrderForAbsences,
    SCHEDULE_TEMPLATES,
    type PlayerConstraints,
} from "@/lib/matchScheduler"

/**
 * Extrait "HH:MM" depuis un timestamp Supabase (ex: "2026-03-05T20:00:00+00:00")
 * ou un time (ex: "20:00:00+00"). Évite les décalages de timezone de new Date().
 */
function extractTime(value: string): string {
    // Format timestamp ISO : "2026-03-05T20:00:00+00:00" → chercher après le T
    const isoMatch = value.match(/T(\d{2}:\d{2})/)
    if (isoMatch) return isoMatch[1]
    // Format time brut : "20:00:00+00" ou "20:00"
    const timeMatch = value.match(/^(\d{2}:\d{2})/)
    if (timeMatch) return timeMatch[1]
    return ""
}

export function useMatches() {

    const [matches, setMatches] = useState<Match[]>([])
    const [unplacedMatches, setUnplacedMatches] = useState<UnplacedMatch[]>([])
    const [playerConstraints, setPlayerConstraints] = useState<Map<string, PlayerConstraints>>(new Map())
    const [loading, setLoading] = useState<boolean>(false)
    const [error, setError] = useState<string | null>(null)
    const subscribedGroupIds = useRef<string[]>([])

    /**
     * Récupère tous les matchs d'un round avec les profils joueurs et le groupe.
     * Filtre via les groupes du round puis charge les matchs triés par date/heure.
     */
    const fetchMatchesByRound = useCallback(async (roundId: string | null) => {
        if (!roundId) {
            setMatches([])
            return
        }

        setLoading(true)
        setError(null)
        const endLog = logger.start("useMatches.fetch")

        try {
            // Récupérer les groups du round pour filtrer
            const { data: groups, error: groupsError } = await withTimeout(
                supabase
                    .from("groups")
                    .select("id")
                    .eq("round_id", roundId),
                "useMatches.fetchGroups"
            )

            if (groupsError) {
                endLog({ error: groupsError.message })
                handleHookError(groupsError, setError, "useMatches.fetch")
                return
            }

            if (!groups || groups.length === 0) {
                setMatches([])
                endLog()
                return
            }

            const groupIds = groups.map(g => g.id)
            subscribedGroupIds.current = groupIds

            const { data, error: fetchError } = await withTimeout(
                supabase
                    .from("matches")
                    .select(`
                        *,
                        player1:profiles!matches_player1_id_fkey(id, first_name, last_name, avatar_url),
                        player2:profiles!matches_player2_id_fkey(id, first_name, last_name, avatar_url),
                        group:groups(id, group_name, round_id)
                    `)
                    .in("group_id", groupIds)
                    .order("match_date", { ascending: true })
                    .order("match_time", { ascending: true }),
                "useMatches.fetchMatches"
            )

            if (fetchError) {
                endLog({ error: fetchError.message })
                handleHookError(fetchError, setError, "useMatches.fetch")
                return
            }

            setMatches((data as Match[]) || [])
            endLog()
        } catch (err) {
            endLog({ error: err instanceof Error ? err.message : "Erreur inconnue" })
            handleHookError(err, setError, "useMatches")
        } finally {
            setLoading(false)
        }
    }, [])

    const generateMatches = async (round: EventRound, event: Event, groups: Group[]): Promise<{ total: number; placed: number; unplaced: UnplacedMatch[] } | null> => {
        setLoading(true)
        setError(null)

        try {
            // 1. Calculer les dates de jeu (nécessaire pour le bye optimization)
            const dates = calculateDates(round.start_date, round.end_date, round.playing_dates)
            const durationMin = intervalToMinutes(round.estimated_match_duration)
            const timeSlots = calculateTimeSlots(
                round.start_time || "19:00",
                round.end_time || "23:00",
                durationMin
            )

            // 3. Récupérer les contraintes des joueurs (arrivée, départ, absences)
            const playerIds = new Set<string>()
            for (const group of groups) {
                for (const player of group.players || []) {
                    playerIds.add(player.id)
                }
            }

            const constraints = new Map<string, PlayerConstraints>()

            if (playerIds.size > 0) {
                const ids = Array.from(playerIds)

                const [scheduleEventRes, scheduleGeneralRes, absencesEventRes, absencesGeneralRes] = await Promise.all([
                    // Schedules liés à cet événement
                    supabase
                        .from("schedule")
                        .select("profile_id, arrival, departure")
                        .eq("event_id", event.id)
                        .in("profile_id", ids),
                    // Schedules généraux (sans event_id) — fallback
                    supabase
                        .from("schedule")
                        .select("profile_id, arrival, departure")
                        .is("event_id", null)
                        .in("profile_id", ids),
                    // Absences liées à ce round
                    supabase
                        .from("absences")
                        .select("profile_id, absent_date")
                        .eq("round_id", round.id)
                        .in("profile_id", ids),
                    // Absences générales (sans round_id) — fallback
                    supabase
                        .from("absences")
                        .select("profile_id, absent_date")
                        .is("round_id", null)
                        .in("profile_id", ids),
                ])

                // Construire la map de contraintes
                for (const id of ids) {
                    constraints.set(id, { arrival: "", departure: "", unavailable: [] })
                }

                // D'abord appliquer les schedules généraux (fallback)
                if (scheduleGeneralRes.data) {
                    for (const s of scheduleGeneralRes.data) {
                        const c = constraints.get(s.profile_id)
                        if (c && s.arrival) {
                            c.arrival = extractTime(s.arrival)
                        }
                        if (c && s.departure) {
                            c.departure = extractTime(s.departure)
                        }
                    }
                }

                // Puis écraser avec les schedules spécifiques à l'événement (prioritaires)
                if (scheduleEventRes.data) {
                    for (const s of scheduleEventRes.data) {
                        const c = constraints.get(s.profile_id)
                        if (c && s.arrival) {
                            c.arrival = extractTime(s.arrival)
                        }
                        if (c && s.departure) {
                            c.departure = extractTime(s.departure)
                        }
                    }
                }

                // Absences générales (fallback)
                if (absencesGeneralRes.data) {
                    for (const a of absencesGeneralRes.data) {
                        const c = constraints.get(a.profile_id)
                        if (c && !c.unavailable.includes(a.absent_date)) {
                            c.unavailable.push(a.absent_date)
                        }
                    }
                }

                // Absences spécifiques à l'événement (prioritaires, ajoutées en plus)
                if (absencesEventRes.data) {
                    for (const a of absencesEventRes.data) {
                        const c = constraints.get(a.profile_id)
                        if (c && !c.unavailable.includes(a.absent_date)) {
                            c.unavailable.push(a.absent_date)
                        }
                    }
                }
            }

            // exposer les contraintes pour l'affichage (MatchScheduleGrid)
            setPlayerConstraints(constraints)

            // 2. Construire la map d'absences pour l'optimisation des byes
            const absencesMap = new Map<string, string[]>()
            for (const [id, c] of constraints.entries()) {
                if (c.unavailable.length > 0) {
                    absencesMap.set(id, c.unavailable)
                }
            }

            // 3. Réordonner les joueurs dans chaque groupe pour minimiser les conflits d'absence
            // Pour les groupes impairs (bye), place les absents à la position bye du bon jour.
            // Pour les groupes pairs, aucune optimisation possible (chaque joueur joue chaque date).
            const optimizedGroups = absencesMap.size > 0
                ? groups.map(group => {
                    const players = group.players || []
                    const template = SCHEDULE_TEMPLATES[players.length]
                    if (!template) return group
                    return { ...group, players: optimizePlayerOrderForAbsences(players, template, dates, absencesMap) }
                })
                : groups

            // 4. Générer les rounds structurés par groupe (optimise aussi les byes hors-template)
            const groupRounds = generateGroupRounds(optimizedGroups, dates, absencesMap)

            // 5. Mapper les rounds sur les dates via le template de planification
            const datePlans = mapRoundsToDatesByTemplate(groupRounds, optimizedGroups, dates)
            const totalPairings = datePlans.reduce((sum, p) => sum + p.pairings.length, 0)

            if (totalPairings === 0) {
                setError("Aucun match à générer (pas assez de joueurs dans les groupes)")
                return null
            }

            // 6. Assigner les créneaux horaires et terrains par date
            const { assignments, unplaced } = assignTimeSlotsForDates(
                datePlans,
                timeSlots,
                round.number_of_courts,
                constraints,
                durationMin
            )

            if (assignments.length === 0) {
                setError(
                    `Pas assez de créneaux : aucun match placé sur ${totalPairings}. ` +
                    `Ajoutez des dates ou des terrains.`
                )
                return null
            }

            // 7. Insérer en batch dans Supabase
            const matchRows = assignments.map(a => ({
                group_id: a.groupId,
                player1_id: a.player1Id,
                player2_id: a.player2Id,
                match_date: a.matchDate,
                match_time: a.matchTime,
                court_number: a.courtNumber,
            }))

            const { error: insertError } = await supabase
                .from("matches")
                .insert(matchRows)

            if (insertError) {
                handleHookError(insertError, setError, "useMatches.generate")
                return null
            }

            // 8. Refresh
            await fetchMatchesByRound(round.id)

            setUnplacedMatches(unplaced)

            const result = { total: totalPairings, placed: assignments.length, unplaced }

            if (unplaced.length > 0) {
                const details = unplaced
                    .map(u => `${u.pairing.player1Name} vs ${u.pairing.player2Name} (${u.pairing.groupName}, ${u.date})`)
                    .join(", ")
                setError(
                    `${assignments.length}/${totalPairings} matchs placés. ` +
                    `${unplaced.length} match(s) sans créneau : ${details}. ` +
                    `Ajoutez des dates ou des terrains.`
                )
            }

            return result
        } catch (err) {
            handleHookError(err, setError, "useMatches")
            return null
        } finally {
            setLoading(false)
        }
    }

    /** Supprime tous les matchs d'un round via ses groupes. */
    const deleteMatchesByRound = async (roundId: string) => {
        setError(null)

        try {
            const { data: groups, error: groupsError } = await supabase
                .from("groups")
                .select("id")
                .eq("round_id", roundId)

            if (groupsError) {
                handleHookError(groupsError, setError, "useMatches.delete")
                return false
            }

            if (!groups || groups.length === 0) return true

            const groupIds = groups.map(g => g.id)

            const { error: deleteError } = await supabase
                .from("matches")
                .delete()
                .in("group_id", groupIds)

            if (deleteError) {
                handleHookError(deleteError, setError, "useMatches.delete")
                return false
            }

            setMatches([])
            return true
        } catch (err) {
            handleHookError(err, setError, "useMatches")
            return false
        }
    }

    /**
     * Met à jour les résultats de plusieurs matchs en parallèle.
     * Applique les changements en local après succès pour un retour immédiat.
     */
    const updateMatchResults = useCallback(async (
        results: { matchId: string; winnerId: string | null; score: string }[]
    ): Promise<boolean> => {
        if (results.length === 0) return true

        setError(null)

        try {
            const updates = results.map(({ matchId, winnerId, score }) =>
                supabase
                    .from("matches")
                    .update({ winner_id: winnerId, score, updated_at: new Date().toISOString() })
                    .eq("id", matchId)
            )

            const responses = await Promise.all(updates)

            const firstError = responses.find(r => r.error)
            if (firstError?.error) {
                handleHookError(firstError.error, setError, "useMatches.updateResults")
                return false
            }

            // Mettre à jour le state local
            setMatches(prev =>
                prev.map(m => {
                    const update = results.find(r => r.matchId === m.id)
                    if (update) {
                        return { ...m, winner_id: update.winnerId, score: update.score }
                    }
                    return m
                })
            )

            return true
        } catch (err) {
            handleHookError(err, setError, "useMatches")
            return false
        }
    }, [])

    /**
     * Clôture une série en anticipé : passe le statut à 'completed'.
     *
     * Sans intervention, la série serait clôturée de toute façon : le RPC
     * `update_event_statuses`, appelé à chaque chargement, bascule celles dont
     * la date de fin est passée.
     *
     * **Les classements Elo ne dépendent plus de cette clôture.** Ils sont
     * recalculés en base à chaque saisie de score, par le trigger
     * `trg_elo_on_match_result`. Clôturer ne fait donc que marquer la série
     * comme terminée, et aucune condition ne bloque l'opération.
     */
    const closeRound = async (roundId: string): Promise<{ success: boolean }> => {
        setError(null)

        try {
            const { error: statusError } = await supabase
                .from("event_rounds")
                .update({ status: "completed" })
                .eq("id", roundId)

            if (statusError) {
                handleHookError(statusError, setError, "useMatches.closeRound")
                return { success: false }
            }

            return { success: true }
        } catch (err) {
            handleHookError(err, setError, "useMatches.closeRound")
            return { success: false }
        }
    }

    /** Met à jour le créneau (date, heure, terrain) d'un match. */
    const updateMatchSchedule = useCallback(async (
        matchId: string,
        updates: { match_date?: string; match_time?: string; court_number?: string }
    ): Promise<boolean> => {
        setError(null)

        try {
            const { error: updateError } = await supabase
                .from("matches")
                .update(updates)
                .eq("id", matchId)

            if (updateError) {
                handleHookError(updateError, setError, "useMatches.updateSchedule")
                return false
            }

            setMatches(prev =>
                prev.map(m => m.id === matchId ? { ...m, ...updates } : m)
            )

            return true
        } catch (err) {
            handleHookError(err, setError, "useMatches.updateSchedule")
            return false
        }
    }, [])

    /**
     * Soumet un score en attente de confirmation par l'adversaire.
     * Relit le match depuis Supabase pour éviter les stale closures.
     * Si l'adversaire a déjà soumis le même score → validé automatiquement.
     * Si scores différents → conflit (les deux pending restent, admin tranche).
     */
    const submitPendingScore = useCallback(async (
        matchId: string,
        playerId: string,
        score: string
    ): Promise<"confirmed" | "pending" | "conflict" | false> => {
        setError(null)

        try {
            // Relire le match depuis Supabase pour avoir l'état le plus récent
            const { data: freshMatch, error: fetchErr } = await supabase
                .from("matches")
                .select("id, player1_id, player2_id, pending_score_p1, pending_score_p2")
                .eq("id", matchId)
                .single()

            if (fetchErr || !freshMatch) {
                setError("Match introuvable")
                return false
            }

            const isPlayer1 = freshMatch.player1_id === playerId
            const normalizedScore = normalizeScoreForDb(score, isPlayer1)
            const otherPendingScore = isPlayer1 ? freshMatch.pending_score_p2 : freshMatch.pending_score_p1

            const now = new Date().toISOString()
            const myField = isPlayer1 ? "pending_score_p1" : "pending_score_p2"

            // L'autre joueur a déjà soumis un score
            if (otherPendingScore) {
                if (otherPendingScore === normalizedScore) {
                    // Même score → valider le match
                    const winnerId = computeWinnerId(normalizedScore, freshMatch.player1_id, freshMatch.player2_id)
                    const { error: updateError } = await supabase
                        .from("matches")
                        .update({
                            [myField]: normalizedScore,
                            score: normalizedScore,
                            winner_id: winnerId,
                            pending_at: null,
                            pending_by: null,
                            updated_at: now,
                        })
                        .eq("id", matchId)

                    if (updateError) {
                        handleHookError(updateError, setError, "useMatches.submitPending")
                        return false
                    }

                    setMatches(prev => prev.map(m =>
                        m.id === matchId
                            ? { ...m, [myField]: normalizedScore, score: normalizedScore, winner_id: winnerId, pending_at: null, pending_by: null }
                            : m
                    ))
                    return "confirmed"
                } else {
                    // Scores différents → conflit
                    const { error: updateError } = await supabase
                        .from("matches")
                        .update({ [myField]: normalizedScore, updated_at: now })
                        .eq("id", matchId)

                    if (updateError) {
                        handleHookError(updateError, setError, "useMatches.submitPending")
                        return false
                    }

                    setMatches(prev => prev.map(m =>
                        m.id === matchId ? { ...m, [myField]: normalizedScore } : m
                    ))
                    return "conflict"
                }
            }

            // Premier à soumettre → pending
            const { error: updateError } = await supabase
                .from("matches")
                .update({
                    [myField]: normalizedScore,
                    pending_at: now,
                    pending_by: playerId,
                    updated_at: now,
                })
                .eq("id", matchId)

            if (updateError) {
                handleHookError(updateError, setError, "useMatches.submitPending")
                return false
            }

            setMatches(prev => prev.map(m =>
                m.id === matchId
                    ? { ...m, [myField]: normalizedScore, pending_at: now, pending_by: playerId }
                    : m
            ))
            return "pending"
        } catch (err) {
            handleHookError(err, setError, "useMatches.submitPending")
            return false
        }
    }, [])

    // Souscription Realtime : met à jour les matchs en direct quand un score change en DB
    useEffect(() => {
        const channel = supabase
            .channel("matches-realtime")
            .on(
                "postgres_changes",
                { event: "UPDATE", schema: "public", table: "matches" },
                (payload) => {
                    const updated = payload.new as Match
                    if (!subscribedGroupIds.current.includes(updated.group_id)) return
                    setMatches(prev => prev.map(m =>
                        m.id === updated.id
                            ? { ...m, score: updated.score, winner_id: updated.winner_id, updated_at: updated.updated_at }
                            : m
                    ))
                }
            )
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [])

    return {
        matches,
        unplacedMatches,
        playerConstraints,
        loading,
        error,
        fetchMatchesByRound,
        generateMatches,
        deleteMatchesByRound,
        updateMatchResults,
        updateMatchSchedule,
        submitPendingScore,
        closeRound,
    }
}
