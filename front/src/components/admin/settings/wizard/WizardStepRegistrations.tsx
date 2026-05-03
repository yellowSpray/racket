import type { Event } from "@/types/event"
import { useState, useEffect, useCallback, useMemo } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { UserAdd01Icon, UserRemove01Icon, Search01Icon, UserGroupIcon } from "hugeicons-react"

type RegistrationPlayer = {
    id: string
    first_name: string
    last_name: string
    power_ranking: number
    statuses: string[]
}

interface WizardStepRegistrationsProps {
    event: Event
    onRegistrationsChanged: (playerIds: Set<string>) => void
    onNext: () => void
    onPrevious: () => void
}

export function WizardStepRegistrations({ event, onRegistrationsChanged, onNext, onPrevious }: WizardStepRegistrationsProps) {
    const [allPlayers, setAllPlayers] = useState<RegistrationPlayer[]>([])
    const [registeredIds, setRegisteredIds] = useState<Set<string>>(new Set())
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")

    const fetchData = useCallback(async () => {
        setLoading(true)
        const [profilesRes, registrationsRes] = await Promise.all([
            supabase
                .from("profiles")
                .select("id, first_name, last_name, power_ranking, player_status(status)")
                .order("last_name"),
            supabase
                .from("event_players")
                .select("profile_id")
                .eq("event_id", event.id)
        ])

        if (profilesRes.data) {
            setAllPlayers(profilesRes.data.map(p => ({
                id: p.id,
                first_name: p.first_name,
                last_name: p.last_name,
                power_ranking: p.power_ranking ?? 0,
                statuses: (p.player_status || []).map((s: { status: string }) => s.status),
            })))
        }

        if (registrationsRes.data) {
            const ids = new Set(registrationsRes.data.map(r => r.profile_id as string))
            setRegisteredIds(ids)
            onRegistrationsChanged(ids)
        }

        setLoading(false)
    }, [event.id]) // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const updateIds = useCallback((next: Set<string>) => {
        setRegisteredIds(next)
        onRegistrationsChanged(next)
    }, [onRegistrationsChanged])

    const addPlayer = async (playerId: string) => {
        const { error } = await supabase
            .from("event_players")
            .insert({ event_id: event.id, profile_id: playerId })
        if (error) return
        const next = new Set(registeredIds)
        next.add(playerId)
        updateIds(next)
    }

    const removePlayer = async (playerId: string) => {
        const { error } = await supabase
            .from("event_players")
            .delete()
            .eq("event_id", event.id)
            .eq("profile_id", playerId)
        if (error) return
        const next = new Set(registeredIds)
        next.delete(playerId)
        updateIds(next)
    }

    const filteredAvailable = useMemo(() => {
        const q = search.toLowerCase().trim()
        const unregistered = allPlayers.filter(p => !registeredIds.has(p.id))
        if (!q) return unregistered
        return unregistered.filter(p =>
            `${p.first_name} ${p.last_name}`.toLowerCase().includes(q)
        )
    }, [allPlayers, registeredIds, search])

    const registered = useMemo(
        () => allPlayers.filter(p => registeredIds.has(p.id)),
        [allPlayers, registeredIds]
    )

    return (
        <div className="py-4 flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4 min-h-0">

                {/* Colonne gauche : joueurs disponibles */}
                <div className="flex flex-col gap-2 border rounded-lg p-3">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-muted-foreground">Disponibles</h4>
                        <Badge variant="outline" className="text-xs">
                            {allPlayers.length - registeredIds.size}
                        </Badge>
                    </div>
                    <div className="relative">
                        <Search01Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Rechercher..."
                            className="pl-9 h-8 text-sm"
                        />
                    </div>
                    <ScrollArea className="h-[340px]">
                        {loading ? (
                            <p className="text-sm text-muted-foreground text-center py-8">Chargement...</p>
                        ) : filteredAvailable.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-8 italic">Aucun joueur disponible</p>
                        ) : (
                            <ul className="space-y-1 pr-2">
                                {filteredAvailable.map(player => (
                                    <PlayerRow
                                        key={player.id}
                                        player={player}
                                        action="add"
                                        onAction={() => addPlayer(player.id)}
                                    />
                                ))}
                            </ul>
                        )}
                    </ScrollArea>
                </div>

                {/* Colonne droite : joueurs inscrits */}
                <div className="flex flex-col gap-2 border rounded-lg p-3">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-muted-foreground">Inscrits</h4>
                        <Badge variant="default" className="text-xs gap-1">
                            <UserGroupIcon className="h-3 w-3" />
                            {registeredIds.size}
                        </Badge>
                    </div>
                    <ScrollArea className="h-[372px]">
                        {registered.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-8 italic">Aucun joueur inscrit</p>
                        ) : (
                            <ul className="space-y-1 pr-2">
                                {registered.map(player => (
                                    <PlayerRow
                                        key={player.id}
                                        player={player}
                                        action="remove"
                                        onAction={() => removePlayer(player.id)}
                                    />
                                ))}
                            </ul>
                        )}
                    </ScrollArea>
                </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between pt-2">
                <Button type="button" size="lg" variant="outline" onClick={onPrevious}>
                    Précédent
                </Button>
                <Button type="button" size="lg" onClick={onNext} disabled={registeredIds.size === 0}>
                    Suivant
                </Button>
            </div>
        </div>
    )
}

function PlayerRow({ player, action, onAction }: {
    player: RegistrationPlayer
    action: "add" | "remove"
    onAction: () => void
}) {
    const isVisitor = player.statuses.includes("visitor")

    return (
        <li className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-medium truncate">
                    {player.first_name} {player.last_name}
                </span>
                {isVisitor && (
                    <Badge variant="outline" className="text-xs shrink-0 text-amber-600 border-amber-300">
                        Visiteur
                    </Badge>
                )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
                {player.power_ranking > 0 && (
                    <span className="text-xs text-muted-foreground">{player.power_ranking}</span>
                )}
                <button
                    onClick={onAction}
                    className={
                        action === "add"
                            ? "text-primary hover:text-primary/80 transition-colors"
                            : "text-muted-foreground hover:text-destructive transition-colors"
                    }
                >
                    {action === "add"
                        ? <UserAdd01Icon className="h-4 w-4" />
                        : <UserRemove01Icon className="h-4 w-4" />
                    }
                </button>
            </div>
        </li>
    )
}
