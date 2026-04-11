import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Location01Icon, Building04Icon } from "hugeicons-react"
import { useEvent } from "@/contexts/EventContext"
import { useEventRegistration } from "@/hooks/useEventRegistration"
import type { Event } from "@/types/event"
import type { ClubConfig } from "@/types/settings"

interface EventInfoCardProps {
    event: Event | null
    clubConfig: ClubConfig | null
    profileId: string
    className?: string
}

function getClubInitials(name: string): string {
    return name
        .split(" ")
        .map(w => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
}

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
}

export function EventInfoCard({ event, clubConfig, profileId, className }: EventInfoCardProps) {
    const { isRegistered, loading, register, unregister } = useEventRegistration(event?.id, profileId)
    const { events } = useEvent()

    const nextEvent = events
        .filter(e => e.id !== event?.id && e.status === "upcoming")
        .sort((a, b) => a.start_date.localeCompare(b.start_date))[0] ?? null

    return (
        <Card className={`${className} flex flex-col`}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                    <Building04Icon size={16} className="text-foreground" />
                    Mon événement
                </CardTitle>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col min-h-0">
                {/* Photo — pleine largeur, 1/3 de la hauteur */}
                <div className="flex-[2] w-full bg-primary/10 rounded-lg flex items-center justify-center overflow-hidden">
                    {clubConfig?.logo_url ? (
                        <img src={clubConfig.logo_url} alt={clubConfig.club_name} className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-3xl font-bold text-primary">
                            {clubConfig ? getClubInitials(clubConfig.club_name) : "—"}
                        </span>
                    )}
                </div>

                {/* Contenu — 2/3 de la hauteur */}
                <div className="flex-[2] flex flex-col gap-3 p-4">
                    {/* Club name + address */}
                    <div>
                        <p className="text-sm font-semibold truncate">{clubConfig?.club_name ?? "—"}</p>
                        {clubConfig?.club_address && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                                <Location01Icon size={11} />
                                {clubConfig.club_address}
                            </p>
                        )}
                    </div>

                    <div className="h-px bg-border" />

                    {/* Événement actuel */}
                    <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Événement actuel</p>
                        {event ? (
                            <div className="flex items-baseline gap-2 min-w-0">
                                <p className="text-sm font-medium truncate shrink-0">{event.event_name}</p>
                                <p className="text-xs text-muted-foreground truncate">{formatDate(event.start_date)} → {formatDate(event.end_date)}</p>
                            </div>
                        ) : (
                            <p className="text-xs text-muted-foreground italic">À venir</p>
                        )}
                    </div>

                    <div className="h-px bg-border" />

                    {/* Prochain événement */}
                    <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Prochain événement</p>
                        {nextEvent ? (
                            <div className="flex items-baseline gap-2 min-w-0">
                                <p className="text-sm font-medium truncate shrink-0">{nextEvent.event_name}</p>
                                <p className="text-xs text-muted-foreground truncate">{formatDate(nextEvent.start_date)} → {formatDate(nextEvent.end_date)}</p>
                            </div>
                        ) : (
                            <p className="text-xs text-muted-foreground italic">À venir</p>
                        )}
                    </div>

                    {/* Registration button */}
                    <div className="mt-auto">
                        {isRegistered ? (
                            <Button variant="outline" size="sm" className="w-full" onClick={unregister} disabled={loading || !event}>
                                Se désinscrire
                            </Button>
                        ) : (
                            <Button variant="default" size="sm" className="w-full" onClick={register} disabled={loading || !event}>
                                S'inscrire
                            </Button>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
