import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useDiscoverEvents } from "@/hooks/useDiscoverEvents"
import { useVisitorRequests } from "@/hooks/useVisitorRequests"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search01Icon, Calendar03Icon, UserGroupIcon } from "hugeicons-react"
import { VisitorRequestDialog } from "@/components/user/VisitorRequestDialog"
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
    const { events, fetchDiscoverableEvents } = useDiscoverEvents()
    const { createRequest } = useVisitorRequests()
    const [search, setSearch] = useState("")
    const [dialogOpen, setDialogOpen] = useState(false)
    const [selectedEvent, setSelectedEvent] = useState<DiscoverableEvent | null>(null)

    useEffect(() => {
        if (profile?.club_id) {
            fetchDiscoverableEvents(profile.club_id)
        }
    }, [profile?.club_id, fetchDiscoverableEvents])

    const filteredEvents = events.filter((evt) => {
        const q = search.toLowerCase()
        return (
            evt.event_name.toLowerCase().includes(q) ||
            evt.clubs.club_name.toLowerCase().includes(q)
        )
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
        <div className="flex flex-col h-full min-h-0 gap-6">
            <h3 className="text-lg font-semibold">Découvrir</h3>

            <div className="relative max-w-sm">
                <Search01Icon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                    placeholder="Rechercher un événement ou un club..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                />
            </div>

            {filteredEvents.length === 0 ? (
                <div className="border-2 border-dashed rounded-lg py-12 flex flex-col items-center justify-center text-gray-400">
                    <p className="text-sm">Aucun événement disponible</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredEvents.map((evt) => (
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
            )}

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
