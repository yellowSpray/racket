import type { Event } from "@/types/event"
import type { Group, SupabaseGroup } from "@/types/draw"
import type { Match } from "@/types/match"
import { useEffect, useState, useCallback } from "react"
import { supabase } from "@/lib/supabaseClient"
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
import { WizardStepConfig } from "./wizard/WizardStepConfig"
import { WizardStepGroups } from "./wizard/WizardStepGroups"
import { WizardStepMatches } from "./wizard/WizardStepMatches"
import { Check } from "lucide-react"

interface EventWizardDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    event: Event | null
    onSuccess: () => void
}

export function EventWizardDialog({ open, onOpenChange, event, onSuccess }: EventWizardDialogProps) {
    const [activeStep, setActiveStep] = useState(1)
    const [wizardEvent, setWizardEvent] = useState<Event | null>(null)
    const [groups, setGroups] = useState<Group[]>([])
    const [matches, setMatches] = useState<Match[]>([])

    const isEditing = !!event

    // Determiner la completion des etapes
    const step1Completed = !!wizardEvent
    const step2Completed = groups.length > 0 && groups.some(g => (g.players || []).length > 0)
    const step3Completed = matches.length > 0

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

    // Reset a l'ouverture
    useEffect(() => {
        if (open) {
            if (event) {
                setWizardEvent(event)
                setActiveStep(1)
                // Charger groupes et matchs existants
                loadEventData(event.id)
            } else {
                setWizardEvent(null)
                setGroups([])
                setMatches([])
                setActiveStep(1)
            }
        }
    }, [open, event, loadEventData])

    const handleStepChange = (step: number) => {
        // En mode creation, empecher de sauter des etapes non completees
        if (!isEditing && !step1Completed && step > 1) return
        if (!isEditing && !step2Completed && step > 2) return

        // En mode edition, permettre la navigation libre vers les etapes completees
        if (isEditing) {
            if (step === 2 && !step1Completed) return
            if (step === 3 && !step2Completed) return
        }

        setActiveStep(step)
    }

    const handleConfigSave = (savedEvent: Event) => {
        setWizardEvent(savedEvent)
        setActiveStep(2)
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
            // Un evenement a ete cree/modifie, rafraichir la liste
            onSuccess()
        }
        onOpenChange(isOpen)
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-white">
                <DialogHeader>
                    <DialogTitle>
                        {isEditing ? "Modifier l'événement" : "Créer un événement"}
                    </DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? "Modifiez la configuration, les groupes ou les matchs"
                            : "Configurez votre événement en 3 étapes"
                        }
                    </DialogDescription>
                </DialogHeader>

                <Stepper
                    value={activeStep}
                    onValueChange={handleStepChange}
                    indicators={{ completed: <Check className="h-4 w-4" /> }}
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
                            <StepperTitle>Tableaux</StepperTitle>
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
                            <StepperTitle>Matchs</StepperTitle>
                        </StepperItem>
                    </StepperNav>

                    <StepperContent value={1}>
                        <WizardStepConfig
                            event={wizardEvent}
                            onSave={handleConfigSave}
                        />
                    </StepperContent>

                    <StepperContent value={2}>
                        {wizardEvent && (
                            <WizardStepGroups
                                event={wizardEvent}
                                groups={groups}
                                onGroupsChanged={handleGroupsChanged}
                                onNext={() => setActiveStep(3)}
                                onPrevious={() => setActiveStep(1)}
                            />
                        )}
                    </StepperContent>

                    <StepperContent value={3}>
                        {wizardEvent && (
                            <WizardStepMatches
                                event={wizardEvent}
                                groups={groups}
                                matches={matches}
                                onMatchesChanged={handleMatchesChanged}
                                onPrevious={() => setActiveStep(2)}
                                onFinish={handleFinish}
                            />
                        )}
                    </StepperContent>
                </Stepper>
            </DialogContent>
        </Dialog>
    )
}

function transformGroups(data: SupabaseGroup[]): Group[] {
    return data.map(g => ({
        id: g.id,
        event_id: g.event_id,
        group_name: g.group_name,
        max_players: g.max_players,
        created_at: g.created_at,
        players: (g.group_players || [])
            .filter(gp => gp.profiles)
            .map(gp => ({
                id: gp.profiles.id,
                first_name: gp.profiles.first_name,
                last_name: gp.profiles.last_name,
                phone: gp.profiles.phone,
                power_ranking: gp.profiles.power_ranking ?? 0,
            })),
    }))
}
