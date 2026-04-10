import { useState } from "react"
import { Navigate, useNavigate } from "react-router"
import { useEvent } from "@/contexts/EventContext"
import { OnboardingWelcomeStep } from "@/components/admin/onboarding/OnboardingWelcomeStep"
import { OnboardingImportPlayersStep } from "@/components/admin/onboarding/OnboardingImportPlayersStep"
import { EventWizardDialog } from "@/components/admin/settings/EventWizardDialog"

type Step = 1 | 2 | 3

export function AdminOnboarding() {
    const navigate = useNavigate()
    const { events, loading: eventsLoading } = useEvent()

    const [step, setStep] = useState<Step>(1)
    const [wizardOpen, setWizardOpen] = useState(false)

    // Si le club a déjà un event → retour au dashboard
    if (!eventsLoading && events.length > 0) {
        return <Navigate to="/admin" replace />
    }

    const handleWizardSuccess = () => {
        navigate("/admin/draws", { replace: true })
    }

    const goToStep = (s: Step) => {
        if (s === 3) {
            setWizardOpen(true)
        }
        setStep(s)
    }

    return (
        <div className="flex flex-col min-h-full items-center justify-center px-4 py-12">
            {/* Indicateur d'étapes */}
            <div className="flex items-center gap-2 mb-10">
                {([1, 2, 3] as Step[]).map((s) => (
                    <div key={s} className="flex items-center gap-2">
                        <div
                            className={`flex size-7 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                                step >= s
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-muted-foreground"
                            }`}
                        >
                            {s}
                        </div>
                        {s < 3 && (
                            <div
                                className={`h-px w-12 transition-colors ${
                                    step > s ? "bg-primary" : "bg-muted"
                                }`}
                            />
                        )}
                    </div>
                ))}
            </div>

            {/* Contenu de l'étape */}
            <div className="w-full max-w-2xl">
                {step === 1 && (
                    <OnboardingWelcomeStep onNext={() => setStep(2)} />
                )}
                {step === 2 && (
                    <OnboardingImportPlayersStep
                        onNext={() => goToStep(3)}
                        onSkip={() => goToStep(3)}
                    />
                )}
            </div>

            {/* EventWizardDialog — étape 3 */}
            <EventWizardDialog
                open={wizardOpen}
                onOpenChange={(open) => {
                    setWizardOpen(open)
                    // Si l'admin ferme le dialog sans terminer, on reste sur la page
                }}
                event={null}
                onSuccess={handleWizardSuccess}
            />
        </div>
    )
}
