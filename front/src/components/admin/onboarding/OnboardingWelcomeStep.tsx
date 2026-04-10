import { Users, CalendarDays, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface OnboardingWelcomeStepProps {
    onNext: () => void
    className?: string
}

const steps = [
    {
        icon: Upload,
        title: "Importer vos joueurs",
        description: "Chargez votre liste depuis un fichier Excel ou CSV.",
    },
    {
        icon: CalendarDays,
        title: "Créer votre premier événement",
        description: "Configurez les groupes, le calendrier et les matchs.",
    },
    {
        icon: Users,
        title: "C'est parti !",
        description: "Votre club est opérationnel sur Event Fest.",
    },
]

export function OnboardingWelcomeStep({ onNext, className }: OnboardingWelcomeStepProps) {
    return (
        <div className={cn("flex flex-col items-center gap-10 py-8 max-w-xl mx-auto text-center", className)}>
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Bienvenue sur Event Fest</h1>
                <p className="text-muted-foreground text-base">
                    Votre club vient de rejoindre la plateforme. Suivez ces quelques étapes
                    pour démarrer rapidement.
                </p>
            </div>

            <div className="flex flex-col gap-5 w-full">
                {steps.map((step, index) => (
                    <div
                        key={index}
                        className="flex items-start gap-4 rounded-xl border bg-card p-4 text-left"
                    >
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                            <step.icon className="size-5 text-primary" />
                        </div>
                        <div className="flex flex-col gap-0.5">
                            <p className="font-medium text-sm">
                                <span className="text-muted-foreground mr-1">{index + 1}.</span>
                                {step.title}
                            </p>
                            <p className="text-sm text-muted-foreground">{step.description}</p>
                        </div>
                    </div>
                ))}
            </div>

            <Button size="lg" onClick={onNext} className="w-full sm:w-auto">
                Commencer
            </Button>
        </div>
    )
}
