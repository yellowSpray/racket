import { useCallback, useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { logger } from "@/lib/logger"
import { resolveRegisteredIds, type RegistrationSource } from "@/lib/roundRegistrations"

/** Ligne de la jointure groups > group_players. */
interface GroupRow { group_players: { profile_id: string }[] | null }

const profileIdsOf = (rows: GroupRow[] | null) =>
    (rows ?? []).flatMap(g => (g.group_players ?? []).map(gp => gp.profile_id))

/**
 * Les joueurs inscrits à une série, et les moyens de modifier cette liste.
 *
 * Une inscription est rattachée à une série (`event_players.round_id`). Les
 * lignes sans série valent « inscrit à l'événement » et ne servent plus qu'à la
 * première série : c'est ce qui empêchait auparavant deux événements du même
 * club de rester séparés.
 *
 * Quand la liste est héritée (tableaux de la série, série précédente,
 * inscriptions de l'événement), elle est immédiatement écrite comme
 * inscriptions de la série. Sans cette matérialisation, retirer un joueur
 * hérité ne supprimerait aucune ligne et il reviendrait au rechargement.
 *
 * @param eventId - événement de la série
 * @param roundId - série configurée
 * @param previousRoundId - série qui précède, `null` pour la première
 */
export function useRoundRegistrations(
    eventId: string | null,
    roundId: string | null,
    previousRoundId: string | null,
) {
    const [registeredIds, setRegisteredIds] = useState<Set<string>>(new Set())
    const [source, setSource] = useState<RegistrationSource>("round")
    const [loading, setLoading] = useState(true)

    const materialize = useCallback(async (ids: string[]) => {
        if (!eventId || !roundId || ids.length === 0) return
        await supabase.from("event_players").upsert(
            ids.map(profile_id => ({ event_id: eventId, profile_id, round_id: roundId })),
            { onConflict: "event_id,profile_id,round_id", ignoreDuplicates: true },
        )
    }, [eventId, roundId])

    const load = useCallback(async () => {
        if (!eventId || !roundId) {
            setRegisteredIds(new Set())
            setLoading(false)
            return
        }

        setLoading(true)
        const endLog = logger.start("useRoundRegistrations.load")

        const noRows = Promise.resolve({ data: [] as GroupRow[] })

        try {
            const [roundRegsRes, eventRegsRes, ownGroupsRes, prevGroupsRes] = await Promise.all([
                supabase.from("event_players").select("profile_id").eq("event_id", eventId).eq("round_id", roundId),
                supabase.from("event_players").select("profile_id").eq("event_id", eventId).is("round_id", null),
                supabase.from("groups").select("group_players(profile_id)").eq("round_id", roundId),
                previousRoundId
                    ? supabase.from("groups").select("group_players(profile_id)").eq("round_id", previousRoundId)
                    : noRows,
            ])

            const resolved = resolveRegisteredIds({
                roundRegistrations: (roundRegsRes.data ?? []).map(r => r.profile_id as string),
                eventRegistrations: (eventRegsRes.data ?? []).map(r => r.profile_id as string),
                ownGroupMembers: profileIdsOf(ownGroupsRes.data as GroupRow[] | null),
                previousGroupMembers: profileIdsOf(prevGroupsRes.data as GroupRow[] | null),
                hasPreviousRound: !!previousRoundId,
            })

            setRegisteredIds(resolved.ids)
            setSource(resolved.source)

            if (resolved.needsMaterialization) {
                await materialize([...resolved.ids])
            }

            endLog()
        } catch (err) {
            endLog({ error: err instanceof Error ? err.message : "Erreur inconnue" })
            setRegisteredIds(new Set())
        } finally {
            setLoading(false)
        }
    }, [eventId, roundId, previousRoundId, materialize])

    useEffect(() => { load() }, [load])

    const addPlayers = useCallback(async (ids: string[]) => {
        if (!eventId || !roundId || ids.length === 0) return
        const { error } = await supabase.from("event_players").upsert(
            ids.map(profile_id => ({ event_id: eventId, profile_id, round_id: roundId })),
            { onConflict: "event_id,profile_id,round_id", ignoreDuplicates: true },
        )
        if (error) return
        setRegisteredIds(prev => new Set([...prev, ...ids]))
    }, [eventId, roundId])

    const removePlayers = useCallback(async (ids: string[]) => {
        if (!eventId || !roundId || ids.length === 0) return
        // Le filtre porte sur la série : une inscription à une autre série du
        // même événement ne doit pas sauter au passage.
        const { error } = await supabase
            .from("event_players")
            .delete()
            .eq("event_id", eventId)
            .eq("round_id", roundId)
            .in("profile_id", ids)
        if (error) return
        setRegisteredIds(prev => {
            const next = new Set(prev)
            for (const id of ids) next.delete(id)
            return next
        })
    }, [eventId, roundId])

    return { registeredIds, source, loading, addPlayers, removePlayers, reload: load }
}
