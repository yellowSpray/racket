import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MovementLegend } from '../MovementLegend'
import type { MovementType, PlayerMovement } from '@/lib/playerMovement'

function movement(id: string, type: MovementType): PlayerMovement {
    return {
        playerId: id,
        type,
        fromGroupName: 'Box 2',
        toGroupName: 'Box 1',
        fromTier: 1,
        toTier: 0,
        tierDelta: 1,
        rank: 1,
        points: 20,
        expectedGroupName: null,
    }
}

function build(...types: MovementType[]) {
    return new Map(types.map((type, i) => [`p${i}`, movement(`p${i}`, type)]))
}

describe('MovementLegend', () => {
    it('nomme la serie de reference', () => {
        render(<MovementLegend previousRoundNumber={2} movements={build('promotion')} />)
        expect(screen.getByText(/Évolution depuis la Série 2/)).toBeInTheDocument()
    })

    it('compte les joueurs par type de mouvement', () => {
        render(<MovementLegend previousRoundNumber={2} movements={build('promotion', 'promotion', 'relegation')} />)

        expect(screen.getByText('Monte')).toBeInTheDocument()
        expect(screen.getByText('2')).toBeInTheDocument()
        expect(screen.getByText('Descend')).toBeInTheDocument()
    })

    it('n\'affiche que les types reellement presents', () => {
        render(<MovementLegend previousRoundNumber={2} movements={build('promotion')} />)

        expect(screen.getByText('Monte')).toBeInTheDocument()
        expect(screen.queryByText('Descend')).not.toBeInTheDocument()
        expect(screen.queryByText('Nouveau')).not.toBeInTheDocument()
    })

    it('ne s\'affiche pas du tout sans mouvement', () => {
        const { container } = render(<MovementLegend previousRoundNumber={2} movements={new Map()} />)
        expect(container).toBeEmptyDOMElement()
    })

    it('indique comment obtenir le detail', () => {
        render(<MovementLegend previousRoundNumber={2} movements={build('stay')} />)
        expect(screen.getByText(/Survolez un joueur/)).toBeInTheDocument()
    })
})
