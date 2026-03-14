import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router"
import { useAuth } from "@/contexts/AuthContext"
import { useInviteLink } from "@/hooks/useInviteLink"
import { useVisitorRequests } from "@/hooks/useVisitorRequests"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
import { Calendar03Icon } from "hugeicons-react"

function formatDate(date: string) {
    return new Date(date).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
    })
}

export function EventInvite() {
    const { token } = useParams<{ token: string }>()
    const navigate = useNavigate()
    const { profile } = useAuth()
    const { eventInfo, loading: loadingEvent, error: eventError, fetchEventByToken } = useInviteLink()
    const { createRequest, loading: loadingRequest } = useVisitorRequests()
    const [message, setMessage] = useState("")
    const [requestSent, setRequestSent] = useState(false)
    const [submitError, setSubmitError] = useState<string | null>(null)

    useEffect(() => {
        if (token) {
            fetchEventByToken(token)
        }
    }, [token, fetchEventByToken])

    const handleSubmit = async () => {
        if (!eventInfo) return
        setSubmitError(null)
        const result = await createRequest(eventInfo.id, message || undefined)
        if (result.success) {
            setRequestSent(true)
        } else {
            setSubmitError(result.error || "Une erreur est survenue")
        }
    }

    if (loadingEvent) {
        return (
            <div className="flex items-center justify-center py-20">
                <Spinner />
            </div>
        )
    }

    if (eventError || !eventInfo) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <p className="text-gray-500">{eventError || "Lien d'invitation invalide"}</p>
                <Button variant="outline" onClick={() => navigate("/user")}>
                    Retour à l'accueil
                </Button>
            </div>
        )
    }

    const isSameClub = profile?.club_id && eventInfo.club_name === profile.club_id
    const isEventClosed = !eventInfo.open_to_visitors

    return (
        <div className="flex flex-col items-center justify-center py-12 px-4">
            <Card className="w-full max-w-lg">
                <CardHeader>
                    <p className="text-sm text-gray-500">{eventInfo.club_name}</p>
                    <CardTitle>{eventInfo.event_name}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    {eventInfo.description && (
                        <p className="text-sm text-gray-600">{eventInfo.description}</p>
                    )}

                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar03Icon size={16} />
                        <span>{formatDate(eventInfo.start_date)} — {formatDate(eventInfo.end_date)}</span>
                    </div>

                    {eventInfo.visitor_fee > 0 && (
                        <div className="flex items-center gap-2">
                            <Badge variant="visitor">Frais visiteur : {eventInfo.visitor_fee} €</Badge>
                        </div>
                    )}

                    {requestSent ? (
                        <div className="flex flex-col items-center gap-3 py-4">
                            <Badge variant="pending">En attente</Badge>
                            <p className="text-sm text-gray-500 text-center">
                                Votre demande a été envoyée. L'organisateur vous donnera une réponse prochainement.
                            </p>
                            <Button variant="outline" onClick={() => navigate("/user/discover")}>
                                Voir mes demandes
                            </Button>
                        </div>
                    ) : isSameClub ? (
                        <p className="text-sm text-amber-600 text-center py-4">
                            Vous êtes déjà membre de ce club.
                        </p>
                    ) : isEventClosed ? (
                        <p className="text-sm text-gray-500 text-center py-4">
                            Cet événement n'accepte pas les visiteurs pour le moment.
                        </p>
                    ) : (
                        <div className="flex flex-col gap-3">
                            <Textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Message pour l'organisateur (optionnel)"
                                rows={3}
                            />
                            {submitError && (
                                <p className="text-sm text-red-500">{submitError}</p>
                            )}
                            <Button onClick={handleSubmit} disabled={loadingRequest}>
                                {loadingRequest ? "Envoi..." : "Demander à rejoindre"}
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
