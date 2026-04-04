import type { Event } from "@/types/event"
import type { ClubDefaults } from "./EventDialog"
import { transformGroups, type Group } from "@/types/draw"
import type { Match } from "@/types/match"
import { useEffect, useState, useCallback } from "react"
import { supabase } from "@/lib/supabaseClient"
import { intervalToMinutes } from "@/lib/utils"
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
import { WizardStepConfig, type WizardConfigData } from "./wizard/WizardStepConfig"
import { WizardStepCalendar } from "./wizard/WizardStepCalendar"
import { WizardStepGroups } from "./wizard/WizardStepGroups"
import { WizardStepMatches } from "./wizard/WizardStepMatches"
import { Tick02Icon } from "hugeicons-react"

/** Strips timezone offset from Supabase time values (e.g. "18:30:00+00" → "18:30") */
function formatTimeForInput(time: string | null | undefined): string | null {
    if (!time) return null
    return time.replace(/([+-]\d{2})$/, "").slice(0, 5)
}

interface EventWizardDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    event: Event | null
    onSuccess: () => void
    clubDefaults?: ClubDefaults
}

export function EventWizardDialog({ open, onOpenChange, event, onSuccess, clubDefaults }: EventWizardDialogProps) {
    const [activeStep, setActiveStep] = useState(1)
    const [configData, setConfigData] = useState<WizardConfigData | null>(null)
    const [wizardEvent, setWizardEvent] = useState<Event | null>(null)
    const [groups, setGroups] = useState<Group[]>([])
    const [matches, setMatches] = useState<Match[]>([])

    const isEditing = !!event

    // Determiner la completion des etapes
    const step1Completed = !!configData
    const step2Completed = !!wizardEvent
    const step3Completed = groups.length > 0 && groups.some(g => (g.players || []).length > 0)
    const step4Completed = matches.length > 0

    const loadEventData = useCallback(async (eventId: string) => {
        // Charger les groupes
        const { data: groupsData } = await supabase
            .from("groups")
            .select("*, group_players(profile_id, profiles(id, first_name, last_name, phone, power_ranking))")
            .eq("event_id", eventId)
            .order("group_name")

        if (groupsData) {
            const transformedGroups = transformGroups(groupsData)
            setGroups(transformedGroups)

            // Charger les matchs si des groupes existent
            if (groupsData.length > 0) {
                const groupIds = groupsData.map(g => g.id)
                const { data: matchesData } = await supabase
                    .from("matches")
                    .select(`
                        *,
                        player1:profiles!matches_player1_id_fkey(id, first_name, last_name),
                        player2:profiles!matches_player2_id_fkey(id, first_name, last_name),
                        group:groups(id, group_name, event_id)
                    `)
                    .in("group_id", groupIds)
                    .order("match_date")
                    .order("match_time")

                if (matchesData) {
                    setMatches(matchesData)
                }
            }
        }
    }, [])

    // Reset uniquement quand le dialog s'ouvre (pas a chaque re-render)
    useEffect(() => {
        if (!open) return

        if (event) {
            setWizardEvent(event)
            setConfigData({
                eventName: event.event_name,
                startTime: formatTimeForInput(event.start_time) || "19:00",
                endTime: formatTimeForInput(event.end_time) || "23:00",
                numberOfCourts: event.number_of_courts,
                matchDuration: intervalToMinutes(event.estimated_match_duration),
            })
            setActiveStep(1)
            loadEventData(event.id)
        } else {
            setConfigData(null)
            setWizardEvent(null)
            setGroups([])
            setMatches([])
            setActiveStep(1)
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only on open/event change
    }, [open, event])

    const handleStepChange = (step: number) => {
        if (!isEditing) {
            if (step > 1 && !step1Completed) return
            if (step > 2 && !step2Completed) return
            if (step > 3 && !step3Completed) return
        } else {
            if (step === 2 && !step1Completed) return
            if (step === 3 && !step2Completed) return
            if (step === 4 && !step3Completed) return
        }

        setActiveStep(step)
    }

    const handleConfigNext = (data: WizardConfigData) => {
        setConfigData(data)
        setActiveStep(2)
    }

    const handleCalendarSave = (savedEvent: Event) => {
        setWizardEvent(savedEvent)
        setActiveStep(3)
    }

    const handleGroupsChanged = (updatedGroups: Group[]) => {
        setGroups(updatedGroups)
    }

    const handleMatchesChanged = (updatedMatches: Match[]) => {
        setMatches(updatedMatches)
    }

    const handleFinish = () => {
        onSuccess()
        onOpenChange(false)
    }

    const handleClose = (isOpen: boolean) => {
        if (!isOpen && wizardEvent) {
            onSuccess()
        }
        onOpenChange(isOpen)
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className={`max-h-[90vh] overflow-y-auto bg-white transition-[max-width] ${activeStep >= 3 ? 'sm:max-w-[95vw] lg:max-w-[1200px]' : 'sm:max-w-[700px]'}`}>
                <DialogHeader>
                    <DialogTitle>
                        {isEditing ? "Modifier l'événement" : "Créer un événement"}
                    </DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? "Modifiez la configuration, le calendrier, les groupes ou les matchs"
                            : "Configurez votre événement en 4 étapes"
                        }
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
                            <StepperTitle>Configuration</StepperTitle>
                            <StepperSeparator />
                        </StepperItem>

                        <StepperItem
                            step={2}
                            completed={step2Completed}
                            disabled={!step1Completed}
                        >
                            <StepperTrigger>
                                <StepperIndicator>2</StepperIndicator>
                            </StepperTrigger>
                            <StepperTitle>Calendrier</StepperTitle>
                            <StepperSeparator />
                        </StepperItem>

                        <StepperItem
                            step={3}
                            completed={step3Completed}
                            disabled={!step2Completed}
                        >
                            <StepperTrigger>
                                <StepperIndicator>3</StepperIndicator>
                            </StepperTrigger>
                            <StepperTitle>Tableaux</StepperTitle>
                            <StepperSeparator />
                        </StepperItem>

                        <StepperItem
                            step={4}
                            completed={step4Completed}
                            disabled={!step3Completed}
                        >
                            <StepperTrigger>
                                <StepperIndicator>4</StepperIndicator>
                            </StepperTrigger>
                            <StepperTitle>Matchs</StepperTitle>
                        </StepperItem>
                    </StepperNav>

                    <StepperContent value={1}>
                        <WizardStepConfig
                            event={wizardEvent}
                            configData={configData}
                            onNext={handleConfigNext}
                            clubDefaults={clubDefaults}
                        />
                    </StepperContent>

                    <StepperContent value={2}>
                        {configData && (
                            <WizardStepCalendar
                                event={wizardEvent}
                                configData={configData}
                                onSave={handleCalendarSave}
                                onPrevious={() => setActiveStep(1)}
                            />
                        )}
                    </StepperContent>

                    <StepperContent value={3}>
                        {wizardEvent && (
                            <WizardStepGroups
                                event={wizardEvent}
                                groups={groups}
                                onGroupsChanged={handleGroupsChanged}
                                onNext={() => setActiveStep(4)}
                                onPrevious={() => setActiveStep(2)}
                            />
                        )}
                    </StepperContent>

                    <StepperContent value={4}>
                        {wizardEvent && (
                            <WizardStepMatches
                                event={wizardEvent}
                                groups={groups}
                                matches={matches}
                                onMatchesChanged={handleMatchesChanged}
                                onPrevious={() => setActiveStep(3)}
                                onFinish={handleFinish}
                            />
                        )}
                    </StepperContent>
                </Stepper>
            </DialogContent>
        </Dialog>
    )
}
