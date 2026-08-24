import type { Event, EventRound } from "@/types/event"
import type { Group } from "@/types/draw"
import type { Match } from "@/types/match"
import { useState, type ReactNode } from "react"
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
import { WizardRoundStepConfig, type WizardRoundConfigData } from "../wizard/round/WizardRoundStepConfig"
import { WizardRoundStepCalendar } from "../wizard/round/WizardRoundStepCalendar"
import { WizardStepRegistrations } from "../wizard/WizardStepRegistrations"
import { WizardStepGroups } from "../wizard/WizardStepGroups"
import { WizardStepMatches } from "../wizard/WizardStepMatches"

interface RoundWizardStepperProps {
    event: Event
    nextRoundNumber: number
    /** Appelé quand la série est configurée de bout en bout. */
    onFinish: () => void
    /** Contenu placé à gauche du fil d'étapes, sur la même ligne (bouton retour). */
    leading?: ReactNode
}

/**
 * Parcours guidé de création d'une série, en 5 étapes.
 *
 * Utilisé uniquement en création : les étapes se débloquent au fur et à mesure
 * (impossible de composer les tableaux avant d'avoir créé la série en base).
 * Pour modifier une série existante, voir `RoundSectionsEditor`.
 */
export function RoundWizardStepper({ event, nextRoundNumber, onFinish, leading }: RoundWizardStepperProps) {
    const [activeStep, setActiveStep] = useState(1)
    const [roundConfig, setRoundConfig] = useState<WizardRoundConfigData | null>(null)
    const [wizardRound, setWizardRound] = useState<EventRound | null>(null)
    const [registeredPlayerIds, setRegisteredPlayerIds] = useState<Set<string>>(new Set())
    const [groups, setGroups] = useState<Group[]>([])
    const [matches, setMatches] = useState<Match[]>([])

    const step1Completed = !!roundConfig
    const step2Completed = !!wizardRound
    const step3Completed = registeredPlayerIds.size > 0
    const step4Completed = groups.length > 0 && groups.some(g => (g.players || []).length > 0)
    const step5Completed = matches.length > 0

    const handleStepChange = (step: number) => {
        if (step > 1 && !step1Completed) return
        if (step > 2 && !step2Completed) return
        if (step > 3 && !step3Completed) return
        if (step > 4 && !step4Completed) return
        setActiveStep(step)
    }

    return (
        <Stepper
            value={activeStep}
            onValueChange={handleStepChange}
            indicators={{ completed: <Tick02Icon className="h-4 w-4" /> }}
            className="flex flex-col flex-1 min-h-0"
        >
            {/* Barre d'outils : le bouton retour est aligné sur le fil d'étapes */}
            <div className="flex items-center gap-3 mb-6">
                {leading}
                <StepperNav className="flex-1">
                <StepperItem step={1} completed={step1Completed}>
                    <StepperTrigger>
                        <StepperIndicator>1</StepperIndicator>
                    </StepperTrigger>
                    <StepperTitle>Configuration</StepperTitle>
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
                    <StepperTitle>Inscriptions</StepperTitle>
                    <StepperSeparator />
                </StepperItem>

                <StepperItem step={4} completed={step4Completed} disabled={!step3Completed}>
                    <StepperTrigger>
                        <StepperIndicator>4</StepperIndicator>
                    </StepperTrigger>
                    <StepperTitle>Tableaux</StepperTitle>
                    <StepperSeparator />
                </StepperItem>

                <StepperItem step={5} completed={step5Completed} disabled={!step4Completed}>
                    <StepperTrigger>
                        <StepperIndicator>5</StepperIndicator>
                    </StepperTrigger>
                    <StepperTitle>Matchs</StepperTitle>
                </StepperItem>
                </StepperNav>
            </div>

            <StepperContent value={1} className="flex flex-col flex-1 min-h-0 overflow-y-auto">
                <WizardRoundStepConfig
                    round={null}
                    configData={roundConfig}
                    onNext={(data) => {
                        setRoundConfig(data)
                        setActiveStep(2)
                    }}
                />
            </StepperContent>

            <StepperContent value={2} className="flex flex-col flex-1 min-h-0 overflow-y-auto">
                {roundConfig && (
                    <WizardRoundStepCalendar
                        event={event}
                        round={wizardRound}
                        nextRoundNumber={nextRoundNumber}
                        configData={roundConfig}
                        onSave={(savedRound) => {
                            setWizardRound(savedRound)
                            setActiveStep(3)
                        }}
                        onPrevious={() => setActiveStep(1)}
                    />
                )}
            </StepperContent>

            <StepperContent value={3} className="flex flex-col flex-1 min-h-0 overflow-y-auto">
                {wizardRound && (
                    <WizardStepRegistrations
                        event={event}
                        round={wizardRound}
                        onRegistrationsChanged={setRegisteredPlayerIds}
                        onNext={() => setActiveStep(4)}
                        onPrevious={() => setActiveStep(2)}
                    />
                )}
            </StepperContent>

            <StepperContent value={4} className="flex flex-col flex-1 min-h-0 overflow-y-auto">
                {wizardRound && (
                    <WizardStepGroups
                        event={event}
                        round={wizardRound}
                        groups={groups}
                        eventPlayerIds={registeredPlayerIds}
                        onGroupsChanged={setGroups}
                        onNext={() => setActiveStep(5)}
                        onPrevious={() => setActiveStep(3)}
                    />
                )}
            </StepperContent>

            <StepperContent value={5} className="flex flex-col flex-1 min-h-0 overflow-y-auto">
                {wizardRound && (
                    <WizardStepMatches
                        event={event}
                        round={wizardRound}
                        groups={groups}
                        matches={matches}
                        onMatchesChanged={setMatches}
                        onPrevious={() => setActiveStep(4)}
                        onFinish={onFinish}
                    />
                )}
            </StepperContent>
        </Stepper>
    )
}
