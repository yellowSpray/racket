import type { Event, EventRound } from "@/types/event"
import type { Group } from "@/types/draw"
import type { Match } from "@/types/match"
import { Fragment, useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRoundRegistrations } from "@/hooks/useRoundRegistrations"
import { sortGroupsByName, intervalToMinutes, formatTimeForInput } from "@/lib/utils"
import { transformGroups } from "@/types/draw"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowRight01Icon } from "hugeicons-react"
import { WizardRoundStepConfig, type WizardRoundConfigData } from "../wizard/round/WizardRoundStepConfig"
import { WizardRoundStepCalendar } from "../wizard/round/WizardRoundStepCalendar"
import { WizardStepRegistrations } from "../wizard/WizardStepRegistrations"
import { WizardStepGroups } from "../wizard/WizardStepGroups"
import { WizardStepMatches } from "../wizard/WizardStepMatches"

interface RoundSectionsEditorProps {
    event: Event
    round: EventRound
    /** Appelé après un enregistrement, pour rafraîchir la liste en amont. */
    onSaved: (round: EventRound) => void
    /** Contenu placé à gauche des onglets, sur la même ligne (bouton retour). */
    leading?: ReactNode
}

/** Sections de la série, dans l'ordre du fil d'Ariane. */
const SECTIONS = [
    { value: "settings", label: "Paramètres" },
    { value: "registrations", label: "Inscriptions" },
    { value: "groups", label: "Tableaux" },
    { value: "matches", label: "Matchs" },
] as const

/** Valeurs de configuration lues sur la série, pour que la section s'affiche complète dès le premier rendu. */
function configFromRound(round: EventRound): WizardRoundConfigData {
    return {
        startTime: formatTimeForInput(round.start_time) || "19:00",
        endTime: formatTimeForInput(round.end_time) || "23:00",
        courts: round.number_of_courts,
        matchDuration: intervalToMinutes(round.estimated_match_duration),
    }
}

/**
 * Édition d'une série existante, par sections librement accessibles.
 *
 * Contrairement au wizard de création, aucun ordre n'est imposé : on va
 * directement à ce que l'on veut modifier. Inscriptions, tableaux et matchs
 * sont enregistrés à la volée ; seule la section « Paramètres » (configuration
 * + calendrier, indissociables en base) a un bouton d'enregistrement.
 */
export function RoundSectionsEditor({ event, round, onSaved, leading }: RoundSectionsEditorProps) {
    const [currentRound, setCurrentRound] = useState<EventRound>(round)
    const [roundConfig, setRoundConfig] = useState<WizardRoundConfigData>(() => configFromRound(round))
    const [groups, setGroups] = useState<Group[]>([])
    const [matches, setMatches] = useState<Match[]>([])

    /** Série qui précède celle-ci dans le même événement, source du pré-remplissage. */
    const previousRoundId = useMemo(() => {
        const previous = (event.event_rounds ?? [])
            .filter(r => r.round_number < round.round_number)
            .sort((a, b) => b.round_number - a.round_number)[0]
        return previous?.id ?? null
    }, [event.event_rounds, round.round_number])

    /*
     * La section Inscriptions tient sa propre instance du hook. On garde donc
     * une copie locale, initialisée par le hook et remise à jour par la section
     * quand l'admin ajoute ou retire quelqu'un, pour que l'onglet Tableaux voie
     * le changement sans recharger la page.
     */
    const { registeredIds: loadedRegistrations } = useRoundRegistrations(event.id, round.id, previousRoundId)
    const [registeredPlayerIds, setRegisteredPlayerIds] = useState<Set<string>>(new Set())

    useEffect(() => { setRegisteredPlayerIds(loadedRegistrations) }, [loadedRegistrations])

    useEffect(() => {
        setCurrentRound(round)
        setRoundConfig(configFromRound(round))
    }, [round])

    const loadRoundData = useCallback(async (_eventId: string, roundId: string) => {
        // Les inscrits ne sont plus lus ici : `useRoundRegistrations` les résout
        // au niveau de la série. Relire `event_players` à l'échelle de
        // l'événement ramenait des joueurs d'un autre événement dans les tableaux.
        const groupsRes = await supabase
            .from("groups")
            .select("*, group_players(profile_id, profiles(id, first_name, last_name, phone, power_ranking))")
            .eq("round_id", roundId)
            .order("group_name")

        if (!groupsRes.data) return

        const transformed = sortGroupsByName(transformGroups(groupsRes.data))
        setGroups(transformed)

        if (groupsRes.data.length === 0) return

        const groupIds = groupsRes.data.map(g => g.id)
        const { data: matchesData } = await supabase
            .from("matches")
            .select(`
                *,
                player1:profiles!matches_player1_id_fkey(id, first_name, last_name),
                player2:profiles!matches_player2_id_fkey(id, first_name, last_name),
                group:groups(id, group_name, round_id)
            `)
            .in("group_id", groupIds)
            .order("match_date")
            .order("match_time")

        if (matchesData) setMatches(matchesData)
    }, [])

    useEffect(() => {
        loadRoundData(event.id, round.id)
    }, [event.id, round.id, loadRoundData])

    const handleSaved = (savedRound: EventRound) => {
        setCurrentRound(savedRound)
        onSaved(savedRound)
    }

    return (
        <Tabs defaultValue="settings" className="flex flex-col flex-1 min-h-0">
            {/* Barre d'outils : le bouton retour est aligné sur le fil d'Ariane */}
            <div className="flex items-center gap-3 mb-4">
                {leading}
                {leading && <div className="w-px self-stretch bg-border" />}

                {/*
                 * Présentation en fil d'Ariane, mais sémantique d'onglets conservée
                 * (rôles tab/tabpanel, navigation clavier Radix) : les quatre sections
                 * sont des sœurs librement accessibles, pas un chemin hiérarchique.
                 */}
                <TabsList className="h-auto bg-transparent p-0 gap-1">
                    {SECTIONS.map((section, index) => (
                        <Fragment key={section.value}>
                            {index > 0 && (
                                <span
                                    data-testid="breadcrumb-separator"
                                    aria-hidden="true"
                                    className="text-muted-foreground/60 shrink-0 flex items-center"
                                >
                                    <ArrowRight01Icon className="h-3.5 w-3.5" />
                                </span>
                            )}
                            <TabsTrigger
                                value={section.value}
                                className="
                                    flex-none h-auto rounded-md border-0 px-2 py-1 shadow-none
                                    text-muted-foreground hover:text-foreground
                                    data-[state=active]:bg-transparent data-[state=active]:shadow-none
                                    data-[state=active]:text-foreground data-[state=active]:font-semibold
                                "
                            >
                                {section.label}
                            </TabsTrigger>
                        </Fragment>
                    ))}
                </TabsList>
            </div>

            <div className="flex flex-col flex-1 min-h-0">
                <TabsContent value="settings" className="flex flex-col flex-1 min-h-0 overflow-y-auto">
                    {/* Configuration et calendrier forment un seul enregistrement en base */}
                    <WizardRoundStepConfig
                        round={currentRound}
                        configData={null}
                        onChange={setRoundConfig}
                    />
                    <WizardRoundStepCalendar
                        event={event}
                        round={currentRound}
                        nextRoundNumber={currentRound.round_number}
                        configData={roundConfig}
                        onSave={handleSaved}
                        submitLabel="Enregistrer"
                    />

                </TabsContent>

                <TabsContent value="registrations" className="flex flex-col flex-1 min-h-0 overflow-y-auto">
                    <WizardStepRegistrations
                        event={event}
                        round={currentRound}
                        onRegistrationsChanged={setRegisteredPlayerIds}
                    />
                </TabsContent>

                <TabsContent value="groups" className="flex flex-col flex-1 min-h-0 overflow-y-auto">
                    <WizardStepGroups
                        event={event}
                        round={currentRound}
                        groups={groups}
                        eventPlayerIds={registeredPlayerIds}
                        onGroupsChanged={setGroups}
                    />
                </TabsContent>

                <TabsContent value="matches" className="flex flex-col flex-1 min-h-0 overflow-y-auto">
                    <WizardStepMatches
                        event={event}
                        round={currentRound}
                        groups={groups}
                        matches={matches}
                        onMatchesChanged={setMatches}
                    />
                </TabsContent>
            </div>
        </Tabs>
    )
}
