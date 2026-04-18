import { useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table"
import {
    UserGroupIcon,
    ArrowLeft01Icon,
    ArrowRight01Icon,
    Tick02Icon,
    Cancel01Icon,
    Clock01Icon,
} from "hugeicons-react"
import { usePlayerMovements, type PlayerMovement } from "@/hooks/usePlayerMovements"
import { useVisitorRequests } from "@/hooks/useVisitorRequests"
import { formatRelativeTime } from "@/lib/formatRelativeTime"
import type { VisitorRequest } from "@/types/visitor"
import { useState } from "react"

const SLIDES = [
    { label: "Inscrits" },
    { label: "Désinscrits" },
    { label: "Liste d'attente" },
    { label: "Demandes visiteurs" },
]

interface PlayersStatusCardProps {
    eventId: string | null
    clubId: string | null
    className?: string
}

export function PlayersStatusCard({ eventId, clubId, className }: PlayersStatusCardProps) {
    const { movements, loading: movementsLoading } = usePlayerMovements(eventId, clubId)
    const { requests, loading: requestsLoading, fetchPendingForEvent, reviewRequest } = useVisitorRequests()
    const [slideIndex, setSlideIndex] = useState(0)

    useEffect(() => {
        if (eventId) {
            fetchPendingForEvent(eventId)
        }
    }, [eventId, fetchPendingForEvent])

    async function handleApprove(requestId: string) {
        await reviewRequest(requestId, "approved")
        if (eventId) fetchPendingForEvent(eventId)
    }

    async function handleReject(requestId: string) {
        await reviewRequest(requestId, "rejected")
        if (eventId) fetchPendingForEvent(eventId)
    }

    const inactiveMovements = movements.filter((m) => m.status === "inactive")

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                    <UserGroupIcon size={16} className="text-foreground" />
                    {SLIDES[slideIndex].label}
                    {slideIndex === 3 && requests.length > 0 && (
                        <Badge variant="pending" className="ml-1">
                            {requests.length}
                        </Badge>
                    )}
                    <div className="ml-auto flex items-center gap-1">
                        <button
                            onClick={() => setSlideIndex((i) => Math.max(0, i - 1))}
                            disabled={slideIndex === 0}
                            className="p-0.5 rounded transition-colors hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                            aria-label="Slide précédent"
                        >
                            <ArrowLeft01Icon size={14} />
                        </button>
                        <button
                            onClick={() => setSlideIndex((i) => Math.min(SLIDES.length - 1, i + 1))}
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
                {slideIndex === 0 && (
                    <MovementsList movements={movements} loading={movementsLoading} />
                )}
                {slideIndex === 1 && (
                    <MovementsList movements={inactiveMovements} loading={movementsLoading} />
                )}
                {slideIndex === 2 && <WaitingListPlaceholder />}
                {slideIndex === 3 && (
                    <VisitorRequestsList
                        requests={requests}
                        loading={requestsLoading}
                        onApprove={handleApprove}
                        onReject={handleReject}
                    />
                )}
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
                <UserGroupIcon size={28} className="mb-3" />
                <p className="text-sm">Aucun mouvement récent</p>
            </div>
        )
    }

    return (
        <ScrollArea className="h-full" type="auto">
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

function WaitingListPlaceholder() {
    return (
        <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <Clock01Icon size={28} className="mb-3" />
            <p className="text-sm text-center">Joueurs inscrits en attente d'un groupe</p>
            <p className="text-xs mt-1">À venir</p>
        </div>
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
            <div className="h-full flex items-center justify-center text-gray-400">
                <p className="text-sm">Chargement...</p>
            </div>
        )
    }

    if (requests.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
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
