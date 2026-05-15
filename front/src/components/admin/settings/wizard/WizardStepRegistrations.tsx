import type { Event, EventRound } from "@/types/event"
import { useState, useEffect, useCallback, useMemo } from "react"
import { supabase } from "@/lib/supabaseClient"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search01Icon, UserGroupIcon, ArrowLeft01Icon, ArrowRight01Icon } from "hugeicons-react"

type RegistrationPlayer = {
    id: string
    first_name: string
    last_name: string
    power_ranking: number
    statuses: string[]
}

interface WizardStepRegistrationsProps {
    event: Event
    round: EventRound
    onRegistrationsChanged: (playerIds: Set<string>) => void
    onNext: () => void
    onPrevious: () => void
}

function toggleSetItem(setter: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) {
    setter(prev => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
    })
}

export function WizardStepRegistrations({ event, round, onRegistrationsChanged, onNext, onPrevious }: WizardStepRegistrationsProps) {
    const [allPlayers, setAllPlayers] = useState<RegistrationPlayer[]>([])
    const [registeredIds, setRegisteredIds] = useState<Set<string>>(new Set())
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [selectedRegisteredIds, setSelectedRegisteredIds] = useState<Set<string>>(new Set())
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [searchRegistered, setSearchRegistered] = useState("")

    const fetchData = useCallback(async () => {
        setLoading(true)
        const previousRound = (event.event_rounds ?? []).find(r => r.round_number === round.round_number - 1)
        const noOp = Promise.resolve({ data: null as null, error: null })

        const [profilesRes, registrationsRes, prevGroupsRes] = await Promise.all([
            supabase
                .from("profiles")
                .select("id, first_name, last_name, power_ranking, player_status(status)")
                .eq("club_id", event.club_id)
                .order("last_name"),
            previousRound
                ? supabase.from("event_players").select("profile_id").eq("event_id", event.id)
                : noOp,
            previousRound
                ? supabase.from("groups").select("group_players(profile_id)").eq("round_id", previousRound.id)
                : noOp,
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

        const ids = new Set<string>()
        if (registrationsRes.data) {
            for (const r of registrationsRes.data) ids.add(r.profile_id as string)
        }
        if (prevGroupsRes.data) {
            for (const group of prevGroupsRes.data) {
                for (const gp of (group.group_players || [])) ids.add(gp.profile_id as string)
            }
        }

        setRegisteredIds(ids)
        onRegistrationsChanged(ids)
        setLoading(false)
    }, [event.id, round.round_number]) // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => { fetchData() }, [fetchData])

    const updateIds = useCallback((next: Set<string>) => {
        setRegisteredIds(next)
        onRegistrationsChanged(next)
    }, [onRegistrationsChanged])

    const addSelectedPlayers = async () => {
        if (selectedIds.size === 0) return
        const inserts = Array.from(selectedIds).map(profileId => ({
            event_id: event.id,
            profile_id: profileId,
        }))
        const { error } = await supabase
            .from("event_players")
            .upsert(inserts, { onConflict: "event_id,profile_id", ignoreDuplicates: true })
        if (error) return
        const next = new Set(registeredIds)
        for (const id of selectedIds) next.add(id)
        updateIds(next)
        setSelectedIds(new Set())
    }

    const removeSelectedPlayers = async () => {
        if (selectedRegisteredIds.size === 0) return
        const { error } = await supabase
            .from("event_players")
            .delete()
            .eq("event_id", event.id)
            .in("profile_id", Array.from(selectedRegisteredIds))
        if (error) return
        const next = new Set(registeredIds)
        for (const id of selectedRegisteredIds) next.delete(id)
        updateIds(next)
        setSelectedRegisteredIds(new Set())
    }

    const filteredAvailable = useMemo(() => {
        const q = search.toLowerCase().trim()
        const unregistered = allPlayers.filter(p => !registeredIds.has(p.id))
        if (!q) return unregistered
        return unregistered.filter(p =>
            `${p.first_name} ${p.last_name}`.toLowerCase().includes(q)
        )
    }, [allPlayers, registeredIds, search])

    const filteredRegistered = useMemo(() => {
        const q = searchRegistered.toLowerCase().trim()
        const players = allPlayers.filter(p => registeredIds.has(p.id))
        if (!q) return players
        return players.filter(p =>
            `${p.first_name} ${p.last_name}`.toLowerCase().includes(q)
        )
    }, [allPlayers, registeredIds, searchRegistered])

    return (
        <div className="py-4 flex flex-col gap-4">
            <div className="relative grid grid-cols-2 gap-4 min-h-0">

                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                    <Button
                        size="icon"
                        className="rounded-full h-10 w-10 shadow-md"
                        disabled={selectedIds.size === 0 && selectedRegisteredIds.size === 0}
                        variant={selectedRegisteredIds.size > 0 ? "destructive" : "default"}
                        onClick={selectedIds.size > 0 ? addSelectedPlayers : removeSelectedPlayers}
                    >
                        {selectedRegisteredIds.size > 0
                            ? <ArrowLeft01Icon className="h-5 w-5" />
                            : <ArrowRight01Icon className="h-5 w-5" />
                        }
                    </Button>
                </div>

                <PlayerColumn
                    title="Disponibles"
                    count={allPlayers.length - registeredIds.size}
                    search={search}
                    onSearchChange={setSearch}
                    players={filteredAvailable}
                    loading={loading}
                    emptyText="Aucun joueur disponible"
                    action="add"
                    selectedIds={selectedIds}
                    onToggleSelect={id => toggleSetItem(setSelectedIds, id)}
                />

                <PlayerColumn
                    title="Inscrits"
                    count={registeredIds.size}
                    search={searchRegistered}
                    onSearchChange={setSearchRegistered}
                    players={filteredRegistered}
                    emptyText="Aucun joueur inscrit"
                    action="remove"
                    selectedIds={selectedRegisteredIds}
                    onToggleSelect={id => toggleSetItem(setSelectedRegisteredIds, id)}
                />
            </div>

            <div className="flex justify-between pt-2">
                <Button type="button" size="lg" variant="outline" onClick={onPrevious}>
                    <ArrowLeft01Icon className="h-4 w-4" />
                    Précédent
                </Button>
                <Button type="button" size="lg" onClick={onNext} disabled={registeredIds.size === 0}>
                    Suivant
                    <ArrowRight01Icon className="h-4 w-4" />
                </Button>
            </div>
        </div>
    )
}

function PlayerColumn({
    title,
    count,
    search,
    onSearchChange,
    players,
    loading,
    emptyText,
    action,
    selectedIds,
    onToggleSelect,
}: {
    title: string
    count: number
    search: string
    onSearchChange: (v: string) => void
    players: RegistrationPlayer[]
    loading?: boolean
    emptyText: string
    action: "add" | "remove"
    selectedIds: Set<string>
    onToggleSelect: (id: string) => void
}) {
    return (
        <div className="flex flex-col gap-2 border rounded-lg p-3">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-muted-foreground">{title}</h4>
                <Badge variant="default" className="text-xs gap-1">
                    <UserGroupIcon className="h-3 w-3" />
                    {count}
                </Badge>
            </div>
            <div className="relative">
                <Search01Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    value={search}
                    onChange={e => onSearchChange(e.target.value)}
                    placeholder="Rechercher..."
                    className="pl-9 h-8 text-sm"
                />
            </div>
            <ScrollArea type="always" className="h-[300px]">
                {loading ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Chargement...</p>
                ) : players.length === 0 ? (
                    <div className="h-[300px] flex items-center justify-center">
                        <p className="text-sm text-muted-foreground italic">{emptyText}</p>
                    </div>
                ) : (
                    <ul className="space-y-1 pr-2">
                        {players.map(player => (
                            <PlayerRow
                                key={player.id}
                                player={player}
                                action={action}
                                selected={selectedIds.has(player.id)}
                                onToggleSelect={() => onToggleSelect(player.id)}
                            />
                        ))}
                    </ul>
                )}
            </ScrollArea>
        </div>
    )
}

function PlayerRow({ player, action, selected, onToggleSelect }: {
    player: RegistrationPlayer
    action: "add" | "remove"
    selected?: boolean
    onToggleSelect?: () => void
}) {
    const isVisitor = player.statuses.includes("visitor")

    return (
        <li
            className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md transition-colors hover:bg-muted/50 cursor-pointer"
            onClick={onToggleSelect}
        >
            <div className="flex items-center gap-2 min-w-0">
                <div className={cn(
                    "w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                    selected
                        ? action === "add" ? "bg-primary border-primary" : "bg-destructive border-destructive"
                        : "border-muted-foreground/40"
                )}>
                    {selected && (
                        <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 fill-none stroke-white stroke-[2.5] stroke-linecap-round stroke-linejoin-round">
                            <polyline points="2,6 5,9 10,3" />
                        </svg>
                    )}
                </div>
                <span className="text-sm font-medium truncate">
                    {player.first_name} {player.last_name}
                </span>
                {isVisitor && (
                    <Badge variant="visitor" className="text-xs shrink-0">
                        Visiteur
                    </Badge>
                )}
            </div>
            {player.power_ranking > 0 && (
                <span className="text-xs text-muted-foreground shrink-0">{player.power_ranking}</span>
            )}
        </li>
    )
}
