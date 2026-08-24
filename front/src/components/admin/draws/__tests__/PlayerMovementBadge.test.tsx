import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { PlayerMovementBadge } from '../PlayerMovementBadge'
import type { PlayerMovement } from '@/lib/playerMovement'

function movement(overrides: Partial<PlayerMovement> = {}): PlayerMovement {
    return {
        playerId: 'p1',
        type: 'promotion',
        fromGroupName: 'Box 3',
        toGroupName: 'Box 2',
        fromTier: 2,
        toTier: 1,
        tierDelta: 1,
        rank: 1,
        points: 24,
        expectedGroupName: null,
        ...overrides,
    }
}

describe('PlayerMovementBadge', () => {
    it('expose l\'explication complete comme nom accessible', () => {
        render(<PlayerMovementBadge movement={movement()} />)
        expect(screen.getByLabelText('1er du Box 3 avec 24 pts → promu au Box 2')).toBeInTheDocument()
    })

    it('distingue visuellement une montee d\'une descente', () => {
        const { rerender } = render(<PlayerMovementBadge movement={movement({ type: 'promotion' })} />)
        expect(screen.getByTestId('movement-promotion')).toBeInTheDocument()

        rerender(<PlayerMovementBadge movement={movement({ type: 'relegation', tierDelta: -1 })} />)
        expect(screen.getByTestId('movement-relegation')).toBeInTheDocument()
    })

    it('marque un maintien sans crier au changement', () => {
        render(<PlayerMovementBadge movement={movement({ type: 'stay', tierDelta: 0 })} />)
        expect(screen.getByTestId('movement-stay')).toBeInTheDocument()
    })

    it('signale un nouveau joueur', () => {
        render(<PlayerMovementBadge movement={movement({ type: 'new', fromGroupName: null, rank: null, points: null })} />)
        expect(screen.getByTestId('movement-new')).toBeInTheDocument()
    })

    it('signale un placement qui devie des regles', () => {
        render(<PlayerMovementBadge movement={movement({ type: 'adjusted', expectedGroupName: 'Box 1' })} />)
        expect(screen.getByTestId('movement-adjusted')).toBeInTheDocument()
        expect(screen.getByLabelText(/attendu au Box 1/)).toBeInTheDocument()
    })

    it('indique le nombre de tableaux franchis au-dela d\'un cran', () => {
        render(<PlayerMovementBadge movement={movement({ type: 'promotion', tierDelta: 2 })} />)
        expect(screen.getByText('2')).toBeInTheDocument()
    })

    it('n\'affiche pas de compteur pour un seul cran', () => {
        render(<PlayerMovementBadge movement={movement({ type: 'promotion', tierDelta: 1 })} />)
        expect(screen.queryByText('1')).not.toBeInTheDocument()
    })
})
