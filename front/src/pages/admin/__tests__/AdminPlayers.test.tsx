import { render } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ReactNode } from 'react'
import { AdminPlayers } from '../AdminPlayers'

vi.mock('@/contexts/HeaderSlotContext', () => ({
    useHeaderSlot: (content: ReactNode) => content,
}))

vi.mock('@/contexts/EventContext', () => ({
    useEvent: () => ({ currentRound: { id: 'r1' } }),
}))

const joueur = (id: string, first_name: string, last_name: string, phone = '', email = '') => ({
    id, first_name, last_name, full_name: `${first_name} ${last_name}`, phone, email,
    status: ['member', 'active'], unavailable: [], payments: [], arrival: '', departure: '', power_ranking: 0,
})

vi.mock('@/contexts/PlayersContext', () => ({
    usePlayers: () => ({
        players: [
            joueur('p1', 'Alice', 'Martin', '0470 11 11 11'),
            joueur('p2', 'Patrice', 'Ngalle', '', 'patrice@club.be'),
        ],
        addPlayer: vi.fn(), updatePlayer: vi.fn(), deletePlayer: vi.fn(),
        updatePaymentStatus: vi.fn(), updateAbsences: vi.fn(),
        loading: false, fetchPlayer: vi.fn(),
    }),
}))

const recherche = { valeur: '' }
vi.mock('@/contexts/RechercheContext', () => ({
    useRechercheDeLaPage: () => recherche.valeur,
}))

// La table est testee a part : on regarde seulement les lignes que la page lui confie.
const lignes = vi.fn()
vi.mock('@/components/admin/players/PlayerTable', () => ({
    DataTable: ({ data }: { data: { id: string }[] }) => {
        lignes(data.map(d => d.id))
        return null
    },
}))

vi.mock('@/components/admin/players/FiltresJoueurs', () => ({ FiltresJoueurs: () => null }))
vi.mock('@/components/admin/players/EditPlayers', () => ({ EditPlayers: () => null }))

describe('AdminPlayers', () => {
    beforeEach(() => {
        lignes.mockClear()
        recherche.valeur = ''
    })

    it('liste tout le monde sans recherche', () => {
        render(<AdminPlayers />)
        expect(lignes).toHaveBeenLastCalledWith(['p1', 'p2'])
    })

    it('filtre sur la recherche du header, par nom', () => {
        recherche.valeur = 'ngalle'
        render(<AdminPlayers />)
        expect(lignes).toHaveBeenLastCalledWith(['p2'])
    })

    it('filtre aussi par telephone et par email', () => {
        recherche.valeur = '0470'
        render(<AdminPlayers />)
        expect(lignes).toHaveBeenLastCalledWith(['p1'])

        recherche.valeur = 'patrice@'
        render(<AdminPlayers />)
        expect(lignes).toHaveBeenLastCalledWith(['p2'])
    })
})
