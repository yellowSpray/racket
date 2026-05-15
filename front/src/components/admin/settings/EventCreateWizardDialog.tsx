import type { Event } from "@/types/event"
import type { CalendarType } from "@/types/event"
import type { ScorePointsEntry } from "@/types/settings"
import { useCallback, useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useAuth } from "@/contexts/AuthContext"
import { useEventRules } from "@/hooks/useEventRules"
import { toast } from "sonner"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import {
    Stepper,
    StepperContent,
    StepperItem,
    StepperNav,
    StepperTrigger,
    StepperIndicator,
    StepperSeparator,
    StepperTitle,
} from "@/components/ui/stepper"
import { Tick02Icon, Delete02Icon } from "hugeicons-react"
import { DeleteEventDialog } from "./DeleteEventDialog"
import { WizardEventStepInfo } from "./wizard/event/WizardEventStepInfo"
import { WizardEventStepCalendarType } from "./wizard/event/WizardEventStepCalendarType"
import { WizardEventStepPromotionRules } from "./wizard/event/WizardEventStepPromotionRules"
import { WizardEventStepScoringRules } from "./wizard/event/WizardEventStepScoringRules"

interface EventCreateWizardDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    event: Event | null
    onSuccess: (event: Event) => void
    /** Appelé à la fin si on veut enchaîner sur le wizard Round */
    onCreateFirstRound?: (event: Event) => void
    /** Appelé après suppression réussie de l'événement */
    onDelete?: () => void
}

export function EventCreateWizardDialog({
    open,
    onOpenChange,
    event,
    onSuccess,
    onCreateFirstRound,
    onDelete,
}: EventCreateWizardDialogProps) {
    const { profile } = useAuth()
    const {
        scoringRules,
        promotionRules,
        fetchEventRules,
        upsertEventScoringRules,
        upsertEventPromotionRules,
    } = useEventRules()

    const isEditing = !!event

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [activeStep, setActiveStep] = useState(1)
    const [eventName, setEventName] = useState("")
    const [wizardEvent, setWizardEvent] = useState<Event | null>(null)
    const [saving, setSaving] = useState(false)

    // Étapes complétées
    const step1Completed = !!eventName
    const step2Completed = !!wizardEvent
    const step3Completed = !!promotionRules
    const step4Completed = !!scoringRules

    const reset = useCallback(() => {
        setActiveStep(1)
        setEventName("")
        setWizardEvent(null)
        setSaving(false)
    }, [])

    useEffect(() => {
        if (!open) return
        if (event) {
            setWizardEvent(event)
            setEventName(event.event_name)
            setActiveStep(1)
            fetchEventRules(event.id)
        } else {
            reset()
        }
    }, [open, event])

    const handleStepChange = (step: number) => {
        if (step > 1 && !step1Completed) return
        if (step > 2 && !step2Completed) return
        if (step > 3 && !step3Completed) return
        setActiveStep(step)
    }

    // Étape 1 → 2 : juste stocker le nom
    const handleInfoNext = (name: string) => {
        setEventName(name)
        setActiveStep(2)
    }

    // Étape 2 → 3 : créer ou mettre à jour l'event en DB
    const handleCalendarTypeNext = async (calendarType: CalendarType) => {
        setSaving(true)
        try {
            if (isEditing && wizardEvent) {
                const updatePayload = { event_name: eventName, calendar_type: calendarType }
                console.log("[EventWizard] UPDATE payload:", updatePayload, "id:", wizardEvent.id)
                const { error } = await supabase
                    .from("events")
                    .update(updatePayload)
                    .eq("id", wizardEvent.id)

                console.log("[EventWizard] UPDATE error:", error)
                if (error) { toast.error("Impossible de mettre à jour l'événement"); return }
                setWizardEvent(prev => prev ? { ...prev, event_name: eventName, calendar_type: calendarType } : prev)
                toast.success("Événement mis à jour")
            } else {
                const clubId = profile?.club_id
                console.log("[EventWizard] club_id:", clubId, "profile:", profile)
                if (!clubId) { toast.error("Club introuvable"); return }

                const insertPayload = { club_id: clubId, event_name: eventName, calendar_type: calendarType }
                console.log("[EventWizard] INSERT payload:", insertPayload)
                const { data, error } = await supabase
                    .from("events")
                    .insert(insertPayload)
                    .select()
                    .single()

                console.log("[EventWizard] INSERT result — data:", data, "error:", error)
                if (error || !data) { toast.error("Impossible de créer l'événement"); return }
                setWizardEvent(data as Event)
                toast.success("Événement créé")
            }
            setActiveStep(3)
        } finally {
            setSaving(false)
        }
    }

    // Étape 3 → 4 : sauvegarder les règles de promotion
    const handlePromotionNext = async (promotedCount: number, relegatedCount: number) => {
        if (!wizardEvent) return
        setSaving(true)
        try {
            const ok = await upsertEventPromotionRules(wizardEvent.id, promotedCount, relegatedCount)
            if (!ok) { toast.error("Impossible d'enregistrer les règles de promotion"); return }
            setActiveStep(4)
        } finally {
            setSaving(false)
        }
    }

    // Étape 4 : sauvegarder le barème de points et terminer
    const handleScoringFinish = async (scorePoints: ScorePointsEntry[]) => {
        if (!wizardEvent) return
        setSaving(true)
        try {
            const ok = await upsertEventScoringRules(wizardEvent.id, scorePoints)
            if (!ok) { toast.error("Impossible d'enregistrer le barème"); return }

            toast.success(isEditing ? "Événement mis à jour" : "Événement configuré")
            onSuccess(wizardEvent)

            if (!isEditing && onCreateFirstRound) {
                onCreateFirstRound(wizardEvent)
            } else {
                onOpenChange(false)
            }
        } finally {
            setSaving(false)
        }
    }

    const handleClose = (isOpen: boolean) => {
        if (!isOpen && wizardEvent) onSuccess(wizardEvent)
        onOpenChange(isOpen)
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto bg-white">
                <DialogHeader>
                    <DialogTitle>
                        {isEditing ? "Modifier l'événement" : "Créer un événement"}
                    </DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? "Modifiez le nom, le type de calendrier, les règles de promotion et le barème de points"
                            : "Configurez votre série en 4 étapes"}
                    </DialogDescription>
                </DialogHeader>

                <Stepper
                    value={activeStep}
                    onValueChange={handleStepChange}
                    indicators={{ completed: <Tick02Icon className="h-4 w-4" /> }}
                >
                    <StepperNav className="mb-6">
                        <StepperItem step={1} completed={step1Completed}>
                            <StepperTrigger>
                                <StepperIndicator>1</StepperIndicator>
                            </StepperTrigger>
                            <StepperTitle>Nom</StepperTitle>
                            <StepperSeparator />
                        </StepperItem>

                        <StepperItem step={2} completed={step2Completed} disabled={!step1Completed}>
                            <StepperTrigger>
                                <StepperIndicator>2</StepperIndicator>
                            </StepperTrigger>
                            <StepperTitle>Calendrier</StepperTitle>
                            <StepperSeparator />
                        </StepperItem>

                        <StepperItem step={3} completed={step3Completed} disabled={!step2Completed}>
                            <StepperTrigger>
                                <StepperIndicator>3</StepperIndicator>
                            </StepperTrigger>
                            <StepperTitle>Promotion</StepperTitle>
                            <StepperSeparator />
                        </StepperItem>

                        <StepperItem step={4} completed={step4Completed} disabled={!step3Completed}>
                            <StepperTrigger>
                                <StepperIndicator>4</StepperIndicator>
                            </StepperTrigger>
                            <StepperTitle>Barème</StepperTitle>
                        </StepperItem>
                    </StepperNav>

                    <StepperContent value={1}>
                        <WizardEventStepInfo
                            event={wizardEvent}
                            initialName={eventName}
                            onNext={handleInfoNext}
                        />
                    </StepperContent>

                    <StepperContent value={2}>
                        <WizardEventStepCalendarType
                            event={wizardEvent}
                            eventName={eventName}
                            onNext={handleCalendarTypeNext}
                            onPrevious={() => setActiveStep(1)}
                            loading={saving}
                        />
                    </StepperContent>

                    <StepperContent value={3}>
                        <WizardEventStepPromotionRules
                            promotionRules={promotionRules}
                            onNext={handlePromotionNext}
                            onPrevious={() => setActiveStep(2)}
                            loading={saving}
                        />
                    </StepperContent>

                    <StepperContent value={4}>
                        <WizardEventStepScoringRules
                            scoringRules={scoringRules}
                            onFinish={handleScoringFinish}
                            onPrevious={() => setActiveStep(3)}
                            loading={saving}
                            isEditing={isEditing}
                        />
                    </StepperContent>
                </Stepper>

                {isEditing && (
                    <div className="pt-4 border-t border-gray-100 mt-2 flex justify-center">
                        <button
                            onClick={() => setDeleteDialogOpen(true)}
                            className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 transition-colors"
                        >
                            <Delete02Icon className="h-3.5 w-3.5" />
                            Supprimer l'événement
                        </button>
                    </div>
                )}
            </DialogContent>

            <DeleteEventDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                event={wizardEvent}
                onSuccess={() => {
                    setDeleteDialogOpen(false)
                    onOpenChange(false)
                    onDelete?.()
                }}
            />
        </Dialog>
    )
}
