import { useCallback, useEffect, useState } from "react"
import { useVisitorRequests } from "@/hooks/useVisitorRequests"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel"
import type { CarouselApi } from "@/components/ui/carousel"
import { UserGroupIcon, Tick02Icon, Cancel01Icon, Clock01Icon, ArrowLeft01Icon, ArrowRight01Icon } from "hugeicons-react"
import type { VisitorRequest } from "@/types/visitor"

const SLIDES = [
    { label: "Liste d'attente" },
    { label: "Demandes visiteurs" },
]

interface VisitorRequestsPanelProps {
    eventId: string | null
    className?: string
}

export function VisitorRequestsPanel({ eventId, className }: VisitorRequestsPanelProps) {
    const { requests, loading, fetchPendingForEvent, reviewRequest } = useVisitorRequests()
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

    useEffect(() => {
        if (eventId) {
            fetchPendingForEvent(eventId)
        }
    }, [eventId, fetchPendingForEvent])

    async function handleApprove(requestId: string) {
        await reviewRequest(requestId, "approved")
        if (eventId) {
            fetchPendingForEvent(eventId)
        }
    }

    async function handleReject(requestId: string) {
        await reviewRequest(requestId, "rejected")
        if (eventId) {
            fetchPendingForEvent(eventId)
        }
    }

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                    <UserGroupIcon size={16} className="text-foreground" />
                    {SLIDES[slideIndex].label}
                    {slideIndex === 1 && requests.length > 0 && (
                        <Badge variant="pending" className="ml-1">
                            {requests.length}
                        </Badge>
                    )}
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
            <CardContent>
                <Carousel setApi={setApi} opts={{ loop: false }}>
                    <CarouselContent>
                        <CarouselItem>
                            <div className="h-full flex flex-col items-center justify-center py-6 text-gray-400">
                                <Clock01Icon size={28} className="mb-3" />
                                <p className="text-sm text-center">Joueurs inscrits en attente d'un groupe</p>
                                <p className="text-xs mt-1">À venir</p>
                            </div>
                        </CarouselItem>
                        <CarouselItem>
                            <VisitorRequestsList
                                requests={requests}
                                loading={loading}
                                onApprove={handleApprove}
                                onReject={handleReject}
                            />
                        </CarouselItem>
                    </CarouselContent>
                </Carousel>
            </CardContent>
        </Card>
    )
}

function VisitorRequestsList({
    requests, loading, onApprove, onReject,
}: {
    requests: VisitorRequest[]
    loading: boolean
    onApprove: (id: string) => void
    onReject: (id: string) => void
}) {
    if (loading) {
        return (
            <div className="flex items-center justify-center py-8 text-gray-400">
                <p className="text-sm">Chargement...</p>
            </div>
        )
    }

    if (requests.length === 0) {
        return (
            <div className="py-12 flex flex-col items-center justify-center text-gray-400">
                <Clock01Icon size={28} className="mb-3" />
                <p className="text-sm">Aucune demande en attente</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-3">
            {requests.map((request) => (
                <RequestRow
                    key={request.id}
                    request={request}
                    onApprove={onApprove}
                    onReject={onReject}
                />
            ))}
        </div>
    )
}

function RequestRow({ request, onApprove, onReject }: {
    request: VisitorRequest
    onApprove: (id: string) => void
    onReject: (id: string) => void
}) {
    const playerName = request.profile
        ? `${request.profile.first_name} ${request.profile.last_name}`
        : "Joueur inconnu"
    const clubName = request.profile?.clubs?.club_name

    const formattedDate = new Date(request.created_at).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
    })

    return (
        <div className="flex items-center justify-between rounded-md border p-3">
            <div className="flex flex-col gap-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{playerName}</span>
                    {clubName && (
                        <Badge variant="visitor" className="text-xs">
                            {clubName}
                        </Badge>
                    )}
                </div>
                <span className="text-xs text-gray-400">{formattedDate}</span>
                {request.message && (
                    <p className="text-sm italic text-gray-500">{request.message}</p>
                )}
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-3">
                <Button
                    size="sm"
                    variant="default"
                    onClick={() => onApprove(request.id)}
                >
                    <Tick02Icon size={16} className="mr-1" />
                    Accepter
                </Button>
                <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => onReject(request.id)}
                >
                    <Cancel01Icon size={16} className="mr-1" />
                    Refuser
                </Button>
            </div>
        </div>
    )
}
