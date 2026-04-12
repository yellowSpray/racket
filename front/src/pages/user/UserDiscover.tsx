import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useEvent } from "@/contexts/EventContext"
import { useDiscoverEvents } from "@/hooks/useDiscoverEvents"
import { useVisitorRequests } from "@/hooks/useVisitorRequests"
import { useClubConfig } from "@/hooks/useClubConfig"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Toggle } from "@/components/ui/toggle"
import { Search01Icon, Cancel01Icon, Calendar03Icon, UserGroupIcon } from "hugeicons-react"
import { VisitorRequestDialog } from "@/components/user/VisitorRequestDialog"
import { EventInfoCard } from "@/components/user/dashboard/EventInfoCard"
import type { DiscoverableEvent } from "@/types/visitor"

function formatDateRange(startDate: string, endDate: string): string {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }
    const startStr = start.toLocaleDateString("fr-FR", options)
    const endStr = end.toLocaleDateString("fr-FR", options)
    return `${startStr} – ${endStr}`
}

export function UserDiscover() {
    const { profile } = useAuth()
    const { currentEvent } = useEvent()
    const { events, fetchDiscoverableEvents } = useDiscoverEvents()
    const { createRequest } = useVisitorRequests()
    const { clubConfig, fetchClubConfig } = useClubConfig()
    const [search, setSearch] = useState("")
    const [selectedCountries, setSelectedCountries] = useState<Set<string>>(new Set())
    const [selectedRegions, setSelectedRegions] = useState<Set<string>>(new Set())
    const [dialogOpen, setDialogOpen] = useState(false)
    const [selectedEvent, setSelectedEvent] = useState<DiscoverableEvent | null>(null)

    useEffect(() => {
        if (profile?.club_id) {
            fetchDiscoverableEvents(profile.club_id)
            fetchClubConfig(profile.club_id)
        }
    }, [profile?.club_id, fetchDiscoverableEvents, fetchClubConfig])

    const countries = useMemo(() =>
        [...new Set(events.map(e => e.clubs.country).filter(Boolean) as string[])].sort(),
        [events]
    )
    const regions = useMemo(() =>
        [...new Set(events.map(e => e.clubs.region).filter(Boolean) as string[])].sort(),
        [events]
    )

    function toggleCountry(c: string) {
        setSelectedCountries(prev => {
            const next = new Set(prev)
            if (next.has(c)) next.delete(c)
            else next.add(c)
            return next
        })
    }

    function toggleRegion(r: string) {
        setSelectedRegions(prev => {
            const next = new Set(prev)
            if (next.has(r)) next.delete(r)
            else next.add(r)
            return next
        })
    }

    const filteredEvents = events.filter(e => {
        if (search) {
            const q = search.toLowerCase()
            const matchText = e.event_name.toLowerCase().includes(q) || e.clubs.club_name.toLowerCase().includes(q)
            if (!matchText) return false
        }
        if (selectedCountries.size > 0 && !selectedCountries.has(e.clubs.country ?? "")) return false
        if (selectedRegions.size > 0 && !selectedRegions.has(e.clubs.region ?? "")) return false
        return true
    })

    function handleRequestClick(evt: DiscoverableEvent) {
        setSelectedEvent(evt)
        setDialogOpen(true)
    }

    function renderStatus(evt: DiscoverableEvent) {
        switch (evt.my_request_status) {
            case "pending":
                return <Badge variant="pending">En attente</Badge>
            case "approved":
                return <Badge variant="approved">Acceptée</Badge>
            case "rejected":
                return (
                    <div className="flex items-center gap-2">
                        <Badge variant="rejected">Refusée</Badge>
                        <Button size="sm" variant="outline" onClick={() => handleRequestClick(evt)}>
                            Relancer
                        </Button>
                    </div>
                )
            default:
                return (
                    <Button size="sm" onClick={() => handleRequestClick(evt)}>
                        Demander à rejoindre
                    </Button>
                )
        }
    }

    return (
        <div className="flex flex-col h-full min-h-0 gap-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 shrink-0">
                <h3 className="text-lg font-semibold shrink-0">Découvrir</h3>

                <div className="relative w-64 shrink-0">
                    <Search01Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Événement ou club..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 pr-9 rounded-full h-10"
                    />
                    {search && (
                        <button
                            onClick={() => setSearch("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                            <Cancel01Icon className="h-4 w-4" />
                        </button>
                    )}
                </div>

                {countries.length > 0 && (
                    <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-xs text-muted-foreground font-medium">Pays</span>
                        {countries.map(c => (
                            <Toggle
                                key={c}
                                pressed={selectedCountries.has(c)}
                                onPressedChange={() => toggleCountry(c)}
                                variant="outline"
                                size="sm"
                                className="rounded-full h-7 px-3 text-xs"
                            >
                                {c}
                            </Toggle>
                        ))}
                    </div>
                )}

                {regions.length > 0 && (
                    <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-xs text-muted-foreground font-medium">Région</span>
                        {regions.map(r => (
                            <Toggle
                                key={r}
                                pressed={selectedRegions.has(r)}
                                onPressedChange={() => toggleRegion(r)}
                                variant="outline"
                                size="sm"
                                className="rounded-full h-7 px-3 text-xs"
                            >
                                {r}
                            </Toggle>
                        ))}
                    </div>
                )}
            </div>

            <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-12 gap-6">

                {/* Colonne gauche — mon événement */}
                <EventInfoCard
                    className="xl:col-span-4"
                    event={currentEvent}
                    clubConfig={clubConfig}
                    profileId={profile?.id ?? ""}
                />

                {/* Colonne droite — découverte */}
                <div className="xl:col-span-8 flex flex-col gap-4 min-h-0">

                    {filteredEvents.length === 0 ? (
                        <div className="flex-1 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-3 text-gray-400">
                            <Calendar03Icon size={36} strokeWidth={1.5} />
                            <div className="flex flex-col items-center gap-1">
                                <p className="text-sm font-medium text-gray-500">
                                    {search ? "Aucun résultat pour cette recherche" : "Aucun événement disponible"}
                                </p>
                                <p className="text-xs text-gray-400">
                                    {search ? "Essayez un autre mot-clé" : "Les événements ouverts apparaîtront ici"}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {filteredEvents.map(evt => (
                                    <Card key={evt.id}>
                                        <CardHeader>
                                            <p className="text-sm text-gray-500">{evt.clubs.club_name}</p>
                                            <CardTitle className="font-semibold">{evt.event_name}</CardTitle>
                                        </CardHeader>
                                        <CardContent className="flex flex-col gap-3">
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <Calendar03Icon size={14} />
                                                <span>{formatDateRange(evt.start_date, evt.end_date)}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <UserGroupIcon size={14} />
                                                <span>{evt.player_count} joueurs inscrits</span>
                                            </div>
                                            {evt.clubs.visitor_fee > 0 && (
                                                <p className="text-sm text-gray-600">
                                                    Frais visiteur : {evt.clubs.visitor_fee} €
                                                </p>
                                            )}
                                            <div className="pt-2">
                                                {renderStatus(evt)}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

            </div>

            <VisitorRequestDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                event={selectedEvent}
                onSubmit={async (eventId: string, message?: string) => {
                    const result = await createRequest(eventId, message)
                    if (result.success && profile?.club_id) {
                        setDialogOpen(false)
                        fetchDiscoverableEvents(profile.club_id)
                    }
                    return result
                }}
            />
        </div>
    )
}
