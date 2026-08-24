import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { GroupPlayerRow } from '../GroupPlayerRow'
import type { GroupPlayer } from '@/types/draw'

const player = { id: 'p1', first_name: 'Geoffroy', last_name: 'Marchal', phone: '', power_ranking: 300 } as GroupPlayer

describe('GroupPlayerRow', () => {
    it('affiche le nom et la valeur passee en fin de ligne', () => {
        render(<GroupPlayerRow player={player} trailing="9 pts" />)
        expect(screen.getByText('Geoffroy Marchal')).toBeInTheDocument()
        expect(screen.getByText('9 pts')).toBeInTheDocument()
    })

    it('marque une promotion', () => {
        render(<GroupPlayerRow player={player} moveType="promotion" />)
        expect(screen.getByTestId('player-row')).toHaveClass('bg-emerald-50')
    })

    it('marque une relegation', () => {
        render(<GroupPlayerRow player={player} moveType="relegation" />)
        expect(screen.getByTestId('player-row')).toHaveClass('bg-red-50')
    })

    it('laisse un maintien sans couleur', () => {
        render(<GroupPlayerRow player={player} />)
        const row = screen.getByTestId('player-row')
        expect(row).not.toHaveClass('bg-emerald-50')
        expect(row).not.toHaveClass('bg-red-50')
    })

    it('barre et estompe un joueur sur le depart', () => {
        render(<GroupPlayerRow player={player} departed />)
        expect(screen.getByTestId('player-row')).toHaveClass('bg-gray-50', 'opacity-50')
        expect(screen.getByText('Geoffroy Marchal')).toHaveClass('line-through')
    })

    it('le depart prime sur la couleur du mouvement', () => {
        // Un relegue qui ne se reinscrit pas se lit d'abord comme un partant
        render(<GroupPlayerRow player={player} moveType="relegation" departed />)
        const row = screen.getByTestId('player-row')
        expect(row).toHaveClass('bg-gray-50')
        expect(row).not.toHaveClass('bg-red-50')
    })

    it('annonce le depart aux lecteurs d\'ecran', () => {
        render(<GroupPlayerRow player={player} departed />)
        expect(screen.getByLabelText(/ne se réinscrit pas/i)).toBeInTheDocument()
    })
})
