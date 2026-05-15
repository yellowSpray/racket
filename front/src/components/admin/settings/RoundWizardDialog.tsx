import type { Event, EventRound } from "@/types/event"
import type { Group } from "@/types/draw"
import type { Match } from "@/types/match"
import { useCallback, useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { sortGroupsByName } from "@/lib/utils"
import { transformGroups } from "@/types/draw"
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
import { Tick02Icon } from "hugeicons-react"
import { WizardRoundStepCalendar } from "./wizard/round/WizardRoundStepCalendar"
import { WizardStepRegistrations } from "./wizard/WizardStepRegistrations"
import { WizardStepGroups } from "./wizard/WizardStepGroups"
import { WizardStepMatches } from "./wizard/WizardStepMatches"

interface RoundWizardDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    event: Event
    round: EventRound | null
    onSuccess: () => void
}

export function RoundWizardDialog({
    open,
    onOpenChange,
    event,
    round,
    onSuccess,
}: RoundWizardDialogProps) {
    const isEditing = !!round

    const [activeStep, setActiveStep] = useState(1)
    const [wizardRound, setWizardRound] = useState<EventRound | null>(null)
    const [registeredPlayerIds, setRegisteredPlayerIds] = useState<Set<string>>(new Set())
    const [groups, setGroups] = useState<Group[]>([])
    const [matches, setMatches] = useState<Match[]>([])

    const step1Completed = !!wizardRound
    const step2Completed = registeredPlayerIds.size > 0
    const step3Completed = groups.length > 0 && groups.some(g => (g.players || []).length > 0)
    const step4Completed = matches.length > 0

    const nextRoundNumber = (() => {
        const rounds = event.event_rounds ?? []
        if (rounds.length === 0) return 1
        return Math.max(...rounds.map(r => r.round_number)) + 1
    })()

    const loadRoundData = useCallback(async (eventId: string, roundId: string) => {
        const [registrationsRes, groupsRes] = await Promise.all([
            supabase.from("event_players").select("profile_id").eq("event_id", eventId),
            supabase
                .from("groups")
                .select("*, group_players(profile_id, profiles(id, first_name, last_name, phone, power_ranking))")
                .eq("round_id", roundId)
                .order("group_name"),
        ])

        if (registrationsRes.data) {
            setRegisteredPlayerIds(new Set(registrationsRes.data.map(r => r.profile_id as string)))
        }

        if (groupsRes.data) {
            const transformed = sortGroupsByName(transformGroups(groupsRes.data))
            setGroups(transformed)

            if (groupsRes.data.length > 0) {
                const groupIds = groupsRes.data.map(g => g.id)
                const { data: matchesData } = await supabase
                    .from("matches")
                    .select(`
                        *,
                        player1:profiles!matches_player1_id_fkey(id, first_name, last_name),
                        player2:profiles!matches_player2_id_fkey(id, first_name, last_name),
                        group:groups(id, group_name, round_id)
                    `)
                    .in("group_id", groupIds)
                    .order("match_date")
                    .order("match_time")

                if (matchesData) setMatches(matchesData)
            }
        }
    }, [])

    useEffect(() => {
        if (!open) return

        if (round) {
            setWizardRound(round)
            setActiveStep(1)
            loadRoundData(event.id, round.id)
        } else {
            setWizardRound(null)
            setRegisteredPlayerIds(new Set())
            setGroups([])
            setMatches([])
            setActiveStep(1)
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, round])

    const handleStepChange = (step: number) => {
        if (step > 1 && !step1Completed) return
        if (step > 2 && !step2Completed) return
        if (step > 3 && !step3Completed) return
        setActiveStep(step)
    }

    const handleClose = (isOpen: boolean) => {
        if (!isOpen && wizardRound) onSuccess()
        onOpenChange(isOpen)
    }

    const handleFinish = () => {
        onSuccess()
        onOpenChange(false)
    }

    const dialogWidth = activeStep >= 3
        ? "sm:max-w-[95vw] lg:max-w-[1200px]"
        : activeStep === 2
        ? "sm:max-w-[760px]"
        : "sm:max-w-[680px]"

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className={`max-h-[90vh] overflow-y-auto bg-white transition-[max-width] ${dialogWidth}`}>
                <DialogHeader>
                    <DialogTitle>
                        {isEditing
                            ? `Modifier la Série ${round.round_number}`
                            : `Créer la Série ${nextRoundNumber} - ${event.event_name}`}
                    </DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? "Modifiez le calendrier, les inscriptions, les tableaux ou les matchs"
                            : "Configurez cette série en 4 étapes"}
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
                            <StepperTitle>Calendrier</StepperTitle>
                            <StepperSeparator />
                        </StepperItem>

                        <StepperItem step={2} completed={step2Completed} disabled={!step1Completed}>
                            <StepperTrigger>
                                <StepperIndicator>2</StepperIndicator>
                            </StepperTrigger>
                            <StepperTitle>Inscriptions</StepperTitle>
                            <StepperSeparator />
                        </StepperItem>

                        <StepperItem step={3} completed={step3Completed} disabled={!step2Completed}>
                            <StepperTrigger>
                                <StepperIndicator>3</StepperIndicator>
                            </StepperTrigger>
                            <StepperTitle>Tableaux</StepperTitle>
                            <StepperSeparator />
                        </StepperItem>

                        <StepperItem step={4} completed={step4Completed} disabled={!step3Completed}>
                            <StepperTrigger>
                                <StepperIndicator>4</StepperIndicator>
                            </StepperTrigger>
                            <StepperTitle>Matchs</StepperTitle>
                        </StepperItem>
                    </StepperNav>

                    <StepperContent value={1}>
                        <WizardRoundStepCalendar
                            event={event}
                            round={wizardRound}
                            nextRoundNumber={nextRoundNumber}
                            onSave={(savedRound) => {
                                setWizardRound(savedRound)
                                setActiveStep(2)
                            }}
                        />
                    </StepperContent>

                    <StepperContent value={2}>
                        {wizardRound && (
                            <WizardStepRegistrations
                                event={event}
                                onRegistrationsChanged={setRegisteredPlayerIds}
                                onNext={() => setActiveStep(3)}
                                onPrevious={() => setActiveStep(1)}
                            />
                        )}
                    </StepperContent>

                    <StepperContent value={3}>
                        {wizardRound && (
                            <WizardStepGroups
                                event={event}
                                round={wizardRound}
                                groups={groups}
                                eventPlayerIds={registeredPlayerIds}
                                onGroupsChanged={setGroups}
                                onNext={() => setActiveStep(4)}
                                onPrevious={() => setActiveStep(2)}
                            />
                        )}
                    </StepperContent>

                    <StepperContent value={4}>
                        {wizardRound && (
                            <WizardStepMatches
                                event={event}
                                round={wizardRound}
                                groups={groups}
                                matches={matches}
                                onMatchesChanged={setMatches}
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
