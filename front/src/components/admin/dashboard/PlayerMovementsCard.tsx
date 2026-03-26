import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table"
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel"
import type { CarouselApi } from "@/components/ui/carousel"
import { UserSwitchIcon, ArrowLeft01Icon, ArrowRight01Icon } from "hugeicons-react"
import { usePlayerMovements, type PlayerMovement } from "@/hooks/usePlayerMovements"
import { formatRelativeTime } from "@/lib/formatRelativeTime"

const SLIDES = [
    { label: "Inscrits" },
    { label: "Désinscrits" },
]

interface PlayerMovementsCardProps {
    eventId: string | null
    clubId: string | null
    className?: string
}

export function PlayerMovementsCard({ eventId, clubId, className }: PlayerMovementsCardProps) {
    const playerMovements = usePlayerMovements(eventId, clubId)
    const [slideIndex, setSlideIndex] = useState(0)
    const [api, setApi] = useState<CarouselApi>()

    const onSelect = useCallback(() => {
        if (!api) return
        setSlideIndex(api.selectedScrollSnap())
    }, [api])

    useEffect(() => {
        if (!api) return
        api.on("select", onSelect)
        return () => { api.off("select", onSelect) }
    }, [api, onSelect])

    const activeMovements = playerMovements.movements.filter((m) => m.status === "active")
    const inactiveMovements = playerMovements.movements.filter((m) => m.status === "inactive")

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                    <UserSwitchIcon size={16} className="text-foreground" />
                    {SLIDES[slideIndex].label}
                    <div className="ml-auto flex items-center gap-1">
                        <button
                            onClick={() => api?.scrollPrev()}
                            disabled={slideIndex === 0}
                            className="p-0.5 rounded transition-colors hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                            aria-label="Slide précédent"
                        >
                            <ArrowLeft01Icon size={14} />
                        </button>
                        <button
                            onClick={() => api?.scrollNext()}
                            disabled={slideIndex === SLIDES.length - 1}
                            className="p-0.5 rounded transition-colors hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                            aria-label="Slide suivant"
                        >
                            <ArrowRight01Icon size={14} />
                        </button>
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0">
                <Carousel setApi={setApi} opts={{ loop: false }} className="h-full">
                    <CarouselContent className="h-full">
                        <CarouselItem className="h-full">
                            <MovementsList movements={activeMovements} loading={playerMovements.loading} />
                        </CarouselItem>
                        <CarouselItem className="h-full">
                            <MovementsList movements={inactiveMovements} loading={playerMovements.loading} />
                        </CarouselItem>
                    </CarouselContent>
                </Carousel>
            </CardContent>
        </Card>
    )
}

function MovementsList({ movements, loading }: { movements: PlayerMovement[]; loading: boolean }) {
    if (loading) {
        return (
            <div className="h-full flex items-center justify-center text-gray-400">
                <p className="text-sm">Chargement...</p>
            </div>
        )
    }

    if (movements.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <UserSwitchIcon size={28} className="mb-3" />
                <p className="text-sm">Aucun mouvement récent</p>
            </div>
        )
    }

    return (
        <ScrollArea className="h-full max-h-48" type="auto">
            <div>
                <Table>
                    <TableBody>
                        {movements.map((m) => (
                            <TableRow key={`${m.profileId}-${m.updatedAt}`}>
                                <TableCell className="text-sm truncate py-1.5">
                                    {m.firstName} {m.lastName}
                                </TableCell>
                                <TableCell className="text-right whitespace-nowrap py-1.5">
                                    <div className="flex items-center justify-end gap-2">
                                        <Badge
                                            variant={m.status === "active" ? "active" : "inactive"}
                                            className="text-[10px] px-1.5 py-0"
                                        >
                                            {m.status === "active" ? "Inscrit" : "Désinscrit"}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground">
                                            {formatRelativeTime(m.updatedAt)}
                                        </span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </ScrollArea>
    )
}
