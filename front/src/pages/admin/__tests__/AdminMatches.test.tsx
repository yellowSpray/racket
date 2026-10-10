import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ReactNode } from 'react'
import { AdminMatches } from '../AdminMatches'

vi.mock('react-router', () => ({ useNavigate: () => vi.fn() }))

vi.mock('@/contexts/HeaderSlotContext', () => ({
    useHeaderSlot: (content: ReactNode) => content,
}))

vi.mock('@/contexts/EventContext', () => ({
    useEvent: () => ({
        currentEvent: { id: 'e1', event_name: 'Mixed' },
        currentRound: {
            id: 'r1', round_number: 1, start_date: '2026-10-01', end_date: '2026-10-31', playing_dates: null,
            start_time: '19:00', end_time: '23:00', estimated_match_duration: '00:30:00', number_of_courts: 2,
        },
    }),
}))

vi.mock('@/contexts/PlayersContext', () => ({ usePlayers: () => ({ players: [] }) }))

const joueurs = [
    { id: 'p1', first_name: 'Alice', last_name: 'Martin', phone: '', power_ranking: 0 },
    { id: 'p2', first_name: 'Bob', last_name: 'Dupont', phone: '', power_ranking: 0 },
]
vi.mock('@/hooks/useGroups', () => ({
    useGroups: () => ({
        groups: [{ id: 'g1', round_id: 'r1', group_name: 'Box 1', max_players: 2, created_at: '', players: joueurs }],
        fetchGroupsByRound: vi.fn(),
    }),
}))

vi.mock('@/hooks/useMatches', () => ({
    useMatches: () => ({
        matches: [{
            id: 'm1', group_id: 'g1', player1_id: 'p1', player2_id: 'p2', match_date: '2026-10-12',
            match_time: '19:00:00', court_number: '1', winner_id: null, score: null,
            player1: joueurs[0], player2: joueurs[1],
        }],
        loading: false, error: null, fetchMatchesByRound: vi.fn(), updateMatchResults: vi.fn(),
    }),
}))

vi.mock('@/hooks/useLargeur', () => ({ useLargeur: () => [{ current: null }, 0] }))
vi.mock('@/components/admin/matches/ChoixDeLaDate', () => ({ ChoixDeLaDate: () => null }))
vi.mock('@/components/admin/matches/PaginationDesTerrains', () => ({ PaginationDesTerrains: () => null }))
vi.mock('@/components/admin/matches/ActionsDesMatchs', () => ({
    ActionsDesMatchs: ({ onBasculerVue }: { onBasculerVue: () => void }) =>
        <button onClick={onBasculerVue}>basculer</button>,
}))

const recherche = { valeur: '' }
vi.mock('@/contexts/RechercheContext', () => ({
    useRechercheDeLaPage: () => recherche.valeur,
}))

const grille = vi.fn()
const liste = vi.fn()
vi.mock('@/components/admin/matches/MatchScheduleGrid', () => ({
    MatchScheduleGrid: (props: { searchQuery?: string }) => { grille(props.searchQuery); return null },
}))
vi.mock('@/components/admin/matches/MatchListView', () => ({
    MatchListView: (props: { searchQuery?: string }) => { liste(props.searchQuery); return null },
}))

/*
 * Les deux vues savaient deja chercher, par leur prop `searchQuery` : la vue
 * par terrain surligne, la vue par boxe filtre. Il manquait quelqu'un pour la
 * remplir.
 */
describe('AdminMatches', () => {
    beforeEach(() => {
        grille.mockClear()
        liste.mockClear()
        recherche.valeur = ''
    })

    it('transmet la recherche du header a la vue par terrain', () => {
        recherche.valeur = 'alice'
        render(<AdminMatches />)
        expect(grille).toHaveBeenLastCalledWith('alice')
    })

    it('et a la vue par boxe', () => {
        recherche.valeur = 'alice'
        render(<AdminMatches />)
        fireEvent.click(screen.getByText('basculer'))
        expect(liste).toHaveBeenLastCalledWith('alice')
    })
})
