import { useNavigate, useParams } from "react-router"
import { useEvent } from "@/contexts/EventContext"
import { useHeaderSlot } from "@/contexts/HeaderSlotContext"
import { Button } from "@/components/ui/button"
import { ArrowLeft01Icon } from "hugeicons-react"
import { RoundWizardStepper } from "@/components/admin/settings/round/RoundWizardStepper"
import { RoundSectionsEditor } from "@/components/admin/settings/round/RoundSectionsEditor"

const SETTINGS_PATH = "/admin/settings"

/**
 * Page de configuration d'une série.
 *
 * - `/admin/settings/events/:eventId/rounds/new` → parcours guidé de création
 * - `/admin/settings/events/:eventId/rounds/:roundId` → édition par sections
 *
 * Remplace l'ancien `RoundWizardDialog` : la configuration d'une série est trop
 * dense pour une modale (l'étape Matchs demandait déjà 1200px de large).
 */
export function AdminRoundConfig() {
    const { eventId, roundId } = useParams()
    const navigate = useNavigate()
    const { events, loading, fetchEvents } = useEvent()

    const event = events.find(e => e.id === eventId) ?? null
    const rounds = event?.event_rounds ?? []
    const round = roundId ? rounds.find(r => r.id === roundId) ?? null : null
    const isCreating = !roundId

    const nextRoundNumber = rounds.length > 0
        ? Math.max(...rounds.map(r => r.round_number)) + 1
        : 1

    // On revient immédiatement ; la liste se rafraîchit derrière, sans bloquer le retour.
    const goBack = () => {
        navigate(SETTINGS_PATH)
        fetchEvents()
    }

    const title = isCreating
        ? `Créer la Série ${nextRoundNumber}`
        : `Série ${round?.round_number ?? ""}`

    // Le bouton retour n'est pas dans le header : il est passé aux orchestrateurs
    // pour vivre sur la même ligne que les onglets (édition) ou le fil d'étapes (création).
    const backButton = (
        <Button variant="outline" size="sm" onClick={goBack}>
            <ArrowLeft01Icon className="h-4 w-4" strokeWidth={2} />
            Retour
        </Button>
    )

    const heading = (
        <>
            <h3 className="text-lg font-semibold">{title}</h3>
            {event && (
                <span className="text-sm text-muted-foreground">- {event.event_name}</span>
            )}
        </>
    )

    const headerPortal = useHeaderSlot(heading)

    // Secours quand le portail du header n'est pas monté (page ouverte seule, tests)
    const fallbackHeading = !headerPortal && (
        <div className="flex items-center gap-2 mb-4">{heading}</div>
    )

    let body

    if (loading && !event) {
        body = (
            <>
                <div className="flex items-center gap-3 mb-4">{backButton}</div>
                <div className="flex-1 flex items-center justify-center py-20">
                    <p className="text-sm text-muted-foreground">Chargement…</p>
                </div>
            </>
        )
    } else if (!event || (roundId && !round)) {
        body = (
            <div className="flex-1 flex items-center justify-center border-2 border-dashed rounded-xl py-20">
                <div className="text-center">
                    <h3 className="text-lg font-semibold">
                        {!event ? "Événement introuvable" : "Série introuvable"}
                    </h3>
                    <p className="text-muted-foreground mt-2 text-sm">
                        Il a peut-être été supprimé depuis un autre onglet.
                    </p>
                    <Button onClick={goBack} size="lg" className="mt-6">
                        Retour aux paramètres
                    </Button>
                </div>
            </div>
        )
    } else if (round) {
        body = (
            <RoundSectionsEditor
                event={event}
                round={round}
                onSaved={fetchEvents}
                leading={backButton}
            />
        )
    } else {
        body = (
            <RoundWizardStepper
                event={event}
                nextRoundNumber={nextRoundNumber}
                onFinish={goBack}
                leading={backButton}
            />
        )
    }

    return (
        <div className="flex flex-col flex-1 min-h-0 h-full">
            {headerPortal}
            {fallbackHeading}
            {body}
        </div>
    )
}
