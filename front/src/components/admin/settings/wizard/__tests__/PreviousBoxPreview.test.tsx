import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PreviousBoxPreview } from '../PreviousBoxPreview'
import type { GroupStandings } from '@/types/ranking'
import type { PromotionResult } from '@/types/ranking'

function makeStandings(): GroupStandings[] {
    return [
        {
            groupId: 'g1',
            groupName: 'Box 1',
            standings: [
                { playerId: 'p1', playerName: 'Alice A', rank: 1, played: 3, wins: 3, losses: 0, walkoversWon: 0, walkoversLost: 0, points: 15 },
                { playerId: 'p2', playerName: 'Bob B', rank: 2, played: 3, wins: 2, losses: 1, walkoversWon: 0, walkoversLost: 0, points: 12 },
                { playerId: 'p3', playerName: 'Charlie C', rank: 3, played: 3, wins: 1, losses: 2, walkoversWon: 0, walkoversLost: 0, points: 8 },
                { playerId: 'p4', playerName: 'Diana D', rank: 4, played: 3, wins: 0, losses: 3, walkoversWon: 0, walkoversLost: 0, points: 3 },
            ],
        },
        {
            groupId: 'g2',
            groupName: 'Box 2',
            standings: [
                { playerId: 'p5', playerName: 'Eve E', rank: 1, played: 3, wins: 3, losses: 0, walkoversWon: 0, walkoversLost: 0, points: 14 },
                { playerId: 'p6', playerName: 'Frank F', rank: 2, played: 3, wins: 2, losses: 1, walkoversWon: 0, walkoversLost: 0, points: 11 },
                { playerId: 'p7', playerName: 'Grace G', rank: 3, played: 3, wins: 1, losses: 2, walkoversWon: 0, walkoversLost: 0, points: 7 },
                { playerId: 'p8', playerName: 'Hank H', rank: 4, played: 3, wins: 0, losses: 3, walkoversWon: 0, walkoversLost: 0, points: 2 },
            ],
        },
    ]
}

function makePromotionResult(): PromotionResult {
    return {
        moves: [
            { playerId: 'p4', playerName: 'Diana D', fromGroupId: 'g1', fromGroupName: 'Box 1', toGroupId: 'g2', toGroupName: 'Box 2', type: 'relegation' },
            { playerId: 'p5', playerName: 'Eve E', fromGroupId: 'g2', fromGroupName: 'Box 2', toGroupId: 'g1', toGroupName: 'Box 1', type: 'promotion' },
        ],
        stayingPlayers: [
            { playerId: 'p1', groupId: 'g1' },
            { playerId: 'p2', groupId: 'g1' },
            { playerId: 'p3', groupId: 'g1' },
            { playerId: 'p6', groupId: 'g2' },
            { playerId: 'p7', groupId: 'g2' },
            { playerId: 'p8', groupId: 'g2' },
        ],
    }
}

describe('PreviousBoxPreview', () => {
    it('renders group names', () => {
        render(
            <PreviousBoxPreview
                standings={makeStandings()}
                promotionResult={makePromotionResult()}
                previousEventName="Box Janvier"
                registeredPlayerIds={new Set(['p1','p2','p3','p4','p5','p6','p7','p8'])}
            />
        )
        expect(screen.getByText('Box 1')).toBeInTheDocument()
        expect(screen.getByText('Box 2')).toBeInTheDocument()
    })

    it('renders player names in order', () => {
        render(
            <PreviousBoxPreview
                standings={makeStandings()}
                promotionResult={makePromotionResult()}
                previousEventName="Box Janvier"
                registeredPlayerIds={new Set(['p1','p2','p3','p4','p5','p6','p7','p8'])}
            />
        )
        expect(screen.getByText('Alice A')).toBeInTheDocument()
        expect(screen.getByText('Bob B')).toBeInTheDocument()
        expect(screen.getByText('Hank H')).toBeInTheDocument()
    })

    it('shows promotion badge for promoted players', () => {
        render(
            <PreviousBoxPreview
                standings={makeStandings()}
                promotionResult={makePromotionResult()}
                previousEventName="Box Janvier"
                registeredPlayerIds={new Set(['p1','p2','p3','p4','p5','p6','p7','p8'])}
            />
        )
        // Eve (p5) is promoted from Box 2 to Box 1
        const eveRow = screen.getByText('Eve E').closest('[data-testid]')
        expect(eveRow).toHaveAttribute('data-testid', 'player-p5')
        // Check promotion indicator exists
        const promoIndicator = eveRow?.querySelector('[data-move="promotion"]')
        expect(promoIndicator).toBeInTheDocument()
    })

    it('shows relegation badge for relegated players', () => {
        render(
            <PreviousBoxPreview
                standings={makeStandings()}
                promotionResult={makePromotionResult()}
                previousEventName="Box Janvier"
                registeredPlayerIds={new Set(['p1','p2','p3','p4','p5','p6','p7','p8'])}
            />
        )
        // Diana (p4) is relegated from Box 1 to Box 2
        const dianaRow = screen.getByText('Diana D').closest('[data-testid]')
        expect(dianaRow).toHaveAttribute('data-testid', 'player-p4')
        const relegIndicator = dianaRow?.querySelector('[data-move="relegation"]')
        expect(relegIndicator).toBeInTheDocument()
    })

    it('shows points for each player', () => {
        render(
            <PreviousBoxPreview
                standings={makeStandings()}
                promotionResult={makePromotionResult()}
                previousEventName="Box Janvier"
                registeredPlayerIds={new Set(['p1','p2','p3','p4','p5','p6','p7','p8'])}
            />
        )
        expect(screen.getByText('15 pts')).toBeInTheDocument()
        expect(screen.getByText('12 pts')).toBeInTheDocument()
    })

    it('shows previous event name in header', () => {
        render(
            <PreviousBoxPreview
                standings={makeStandings()}
                promotionResult={makePromotionResult()}
                previousEventName="Box Janvier"
                registeredPlayerIds={new Set(['p1','p2','p3','p4','p5','p6','p7','p8'])}
            />
        )
        expect(screen.getByText(/Box Janvier/)).toBeInTheDocument()
    })

    it('renders empty state when no standings', () => {
        render(
            <PreviousBoxPreview
                standings={[]}
                promotionResult={{ moves: [], stayingPlayers: [] }}
                previousEventName="Box Janvier"
                registeredPlayerIds={new Set()}
            />
        )
        expect(screen.getByText(/Aucun classement/)).toBeInTheDocument()
    })

    it('shows unregistered indicator for players not in registeredPlayerIds', () => {
        render(
            <PreviousBoxPreview
                standings={makeStandings()}
                promotionResult={makePromotionResult()}
                previousEventName="Box Janvier"
                registeredPlayerIds={new Set(['p1','p2','p4','p5','p6','p7','p8'])}
            />
        )
        const charlieRow = screen.getByTestId('player-p3')
        const unregIndicator = charlieRow.querySelector('[data-move="unregistered"]')
        expect(unregIndicator).toBeInTheDocument()
    })

    it('applies line-through style to unregistered player name', () => {
        render(
            <PreviousBoxPreview
                standings={makeStandings()}
                promotionResult={makePromotionResult()}
                previousEventName="Box Janvier"
                registeredPlayerIds={new Set(['p1','p2','p4','p5','p6','p7','p8'])}
            />
        )
        const charlieText = screen.getByText('Charlie C')
        expect(charlieText).toHaveClass('line-through')
    })

    it('does not show promotion/relegation icons for unregistered players', () => {
        render(
            <PreviousBoxPreview
                standings={makeStandings()}
                promotionResult={makePromotionResult()}
                previousEventName="Box Janvier"
                registeredPlayerIds={new Set(['p1','p2','p3','p5','p6','p7','p8'])}
            />
        )
        const dianaRow = screen.getByTestId('player-p4')
        const relegIndicator = dianaRow.querySelector('[data-move="relegation"]')
        expect(relegIndicator).not.toBeInTheDocument()
        const unregIndicator = dianaRow.querySelector('[data-move="unregistered"]')
        expect(unregIndicator).toBeInTheDocument()
    })
})
