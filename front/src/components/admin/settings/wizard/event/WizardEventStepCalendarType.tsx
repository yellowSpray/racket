import type { CalendarType, Event } from "@/types/event"
import { useState } from "react"
import type React from "react"
import { Button } from "@/components/ui/button"
import { Calendar03Icon, CalendarCheckOut02Icon, ArrowLeft01Icon, ArrowRight01Icon } from "hugeicons-react"
import { cn } from "@/lib/utils"

interface WizardEventStepCalendarTypeProps {
    event: Event | null
    eventName: string
    onNext: (calendarType: CalendarType) => void
    onPrevious: () => void
    loading?: boolean
}

interface CalendarOption {
    value: CalendarType
    title: string
    description: string
    example: string
    icon: React.ElementType
}

const OPTIONS: CalendarOption[] = [
    {
        value: "day_selection",
        title: "Sélection de jours",
        description: "Pour chaque round, l'admin choisit des dates précises parmi un calendrier.",
        example: "Ex : les mardis 4, 11 et 18 mars",
        icon: Calendar03Icon,
    },
    {
        value: "period",
        title: "Période continue",
        description: "Pour chaque round, l'admin définit une plage de dates — tous les jours de la période sont inclus.",
        example: "Ex : du 1er au 31 mars",
        icon: CalendarCheckOut02Icon,
    },
]

export function WizardEventStepCalendarType({
    event,
    eventName,
    onNext,
    onPrevious,
    loading,
}: WizardEventStepCalendarTypeProps) {
    const [selected, setSelected] = useState<CalendarType>(
        event?.calendar_type ?? "day_selection"
    )

    return (
        <div className="grid gap-6 pt-2 pb-4">
            <div>
                <p className="text-sm text-muted-foreground mb-6">
                    Choisissez comment les dates seront sélectionnées pour chaque round de{" "}
                    <span className="font-medium text-foreground">{eventName}</span>.
                    Ce mode s'appliquera par défaut à tous les rounds de cet événement.
                </p>

                <div className="grid grid-cols-2 gap-4">
                    {OPTIONS.map((opt) => (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => setSelected(opt.value)}
                            className={cn(
                                "text-left rounded-xl border-2 p-5 transition-all",
                                selected === opt.value
                                    ? "border-primary bg-primary/5"
                                    : "border-gray-200 hover:border-gray-300 bg-white"
                            )}
                        >
                            <div className="flex items-start gap-3">
                                <div className={cn(
                                    "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                                    selected === opt.value ? "bg-primary text-white" : "bg-gray-100 text-gray-400"
                                )}>
                                    <opt.icon className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="font-semibold text-sm">{opt.title}</p>
                                    <p className="text-xs text-muted-foreground mt-1">{opt.description}</p>
                                    <p className="text-xs text-foreground/60 font-medium mt-2 italic">{opt.example}</p>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex justify-between pt-4">
                <Button type="button" size="lg" variant="outline" onClick={onPrevious}>
                    <ArrowLeft01Icon className="h-4 w-4" />
                    Précédent
                </Button>
                <Button
                    type="button"
                    size="lg"
                    onClick={() => onNext(selected)}
                    disabled={loading}
                >
                    {loading ? "Enregistrement…" : "Suivant"}
                    <ArrowRight01Icon className="h-4 w-4" />
                </Button>
            </div>
        </div>
    )
}
