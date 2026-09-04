import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { WizardEventStepScoringRules } from '../WizardEventStepScoringRules'
import { WizardEventStepPromotionRules } from '../WizardEventStepPromotionRules'
import type { ScorePointsEntry } from '@/types/settings'
import type { EventScoringRules, EventPromotionRules } from '@/types/event'

/**
 * Le club sert de modele a la creation d'un evenement : tant que l'evenement
 * ne porte pas ses propres regles, les etapes doivent partir des valeurs du
 * club et non de constantes en dur.
 */

const CLUB_POINTS: ScorePointsEntry[] = [
    { score: '3-0', winner_points: 10, loser_points: 0 },
    { score: '3-1', winner_points: 8, loser_points: 2 },
]

const EVENT_SCORING: EventScoringRules = {
    id: 'es-1',
    event_id: 'e-1',
    score_points: [{ score: '3-0', winner_points: 7, loser_points: 1 }],
}

const EVENT_PROMOTION: EventPromotionRules = {
    id: 'ep-1',
    event_id: 'e-1',
    promoted_count: 3,
    relegated_count: 3,
}

/** Valeurs des champs Score, dans l'ordre des lignes du tableau. */
function scoreInputs(): string[] {
    return screen
        .getAllByPlaceholderText('3-0')
        .map(input => (input as HTMLInputElement).value)
}

describe('WizardEventStepScoringRules', () => {
    beforeEach(() => vi.clearAllMocks())

    it('part du bareme du club quand l evenement n en a pas', () => {
        render(
            <WizardEventStepScoringRules
                scoringRules={null}
                defaultScorePoints={CLUB_POINTS}
                onFinish={vi.fn()}
                onPrevious={vi.fn()}
            />,
        )

        expect(scoreInputs()).toEqual(['3-0', '3-1'])
        expect(screen.getByDisplayValue('10')).toBeInTheDocument()
    })

    it('prefere le bareme de l evenement au modele du club', () => {
        render(
            <WizardEventStepScoringRules
                scoringRules={EVENT_SCORING}
                defaultScorePoints={CLUB_POINTS}
                onFinish={vi.fn()}
                onPrevious={vi.fn()}
            />,
        )

        expect(scoreInputs()).toEqual(['3-0'])
        expect(screen.getByDisplayValue('7')).toBeInTheDocument()
    })

    it('adopte le modele du club arrive apres le premier rendu', () => {
        // Les regles du club sont chargees en asynchrone : elles arrivent
        // souvent apres que l'etape est montee.
        const { rerender } = render(
            <WizardEventStepScoringRules
                scoringRules={null}
                defaultScorePoints={[]}
                onFinish={vi.fn()}
                onPrevious={vi.fn()}
            />,
        )

        rerender(
            <WizardEventStepScoringRules
                scoringRules={null}
                defaultScorePoints={CLUB_POINTS}
                onFinish={vi.fn()}
                onPrevious={vi.fn()}
            />,
        )

        expect(scoreInputs()).toEqual(['3-0', '3-1'])
    })

    it('ne perd pas une saisie en cours', () => {
        // Une fois que l'utilisateur a touche au tableau, un rerender ne doit
        // pas ecraser son travail.
        const { rerender } = render(
            <WizardEventStepScoringRules
                scoringRules={null}
                defaultScorePoints={CLUB_POINTS}
                onFinish={vi.fn()}
                onPrevious={vi.fn()}
            />,
        )

        fireEvent.change(screen.getAllByPlaceholderText('3-0')[0], {
            target: { value: '4-0' },
        })

        rerender(
            <WizardEventStepScoringRules
                scoringRules={null}
                defaultScorePoints={CLUB_POINTS}
                onFinish={vi.fn()}
                onPrevious={vi.fn()}
            />,
        )

        expect(scoreInputs()[0]).toBe('4-0')
    })
})

describe('WizardEventStepPromotionRules', () => {
    beforeEach(() => vi.clearAllMocks())

    it('part des montees du club quand l evenement n en a pas', () => {
        render(
            <WizardEventStepPromotionRules
                promotionRules={null}
                defaultPromotedCount={2}
                defaultRelegatedCount={2}
                onNext={vi.fn()}
                onPrevious={vi.fn()}
            />,
        )

        expect(screen.getAllByDisplayValue('2')).toHaveLength(2)
    })

    it('prefere les montees de l evenement au modele du club', () => {
        render(
            <WizardEventStepPromotionRules
                promotionRules={EVENT_PROMOTION}
                defaultPromotedCount={2}
                defaultRelegatedCount={2}
                onNext={vi.fn()}
                onPrevious={vi.fn()}
            />,
        )

        expect(screen.getAllByDisplayValue('3')).toHaveLength(2)
    })

    it('adopte le modele du club arrive apres le premier rendu', () => {
        const { rerender } = render(
            <WizardEventStepPromotionRules
                promotionRules={null}
                defaultPromotedCount={1}
                defaultRelegatedCount={1}
                onNext={vi.fn()}
                onPrevious={vi.fn()}
            />,
        )

        rerender(
            <WizardEventStepPromotionRules
                promotionRules={null}
                defaultPromotedCount={2}
                defaultRelegatedCount={2}
                onNext={vi.fn()}
                onPrevious={vi.fn()}
            />,
        )

        expect(screen.getAllByDisplayValue('2')).toHaveLength(2)
    })
})
