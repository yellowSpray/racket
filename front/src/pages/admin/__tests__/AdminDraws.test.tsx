import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ReactNode } from 'react'
import { AdminDraws } from '../AdminDraws'

vi.mock('react-router', () => ({
    useNavigate: () => vi.fn(),
}))

vi.mock('@/contexts/HeaderSlotContext', () => ({
    useHeaderSlot: (content: ReactNode) => content,
}))

vi.mock('@/contexts/EventContext', () => ({
    useEvent: () => ({
        currentEvent: { id: 'e1', event_name: 'Mixed', embed_token: null },
        currentRound: { id: 'r1', round_number: 1 },
    }),
}))

vi.mock('@/contexts/AuthContext', () => ({
    useAuth: () => ({ profile: { club_id: 'c1' } }),
}))

vi.mock('@/contexts/PlayersContext', () => ({
    usePlayers: () => ({ players: [] }),
}))

vi.mock('@/hooks/useEffectiveRules', () => ({
    useEffectiveRules: () => ({ scoring: { score_points: [] } }),
}))

const groupes = [
    {
        id: 'g1', round_id: 'r1', group_name: 'Box 1', max_players: 2, created_at: '2026-01-01',
        players: [{ id: 'p1', first_name: 'Alice', last_name: 'Martin', phone: '0611111111', power_ranking: 1 }],
    },
    {
        id: 'g2', round_id: 'r1', group_name: 'Box 2', max_players: 2, created_at: '2026-01-01',
        players: [{ id: 'p2', first_name: 'Bob', last_name: 'Dupont', phone: '0622222222', power_ranking: 2 }],
    },
]

vi.mock('@/hooks/useGroups', () => ({
    useGroups: () => ({ groups: groupes, loading: false, fetchGroupsByRound: vi.fn() }),
}))

const recherche = { valeur: '' }
vi.mock('@/contexts/RechercheContext', () => ({
    useRechercheDeLaPage: () => recherche.valeur,
}))

vi.mock('@/hooks/useMatches', () => ({
    useMatches: () => ({ matches: [], fetchMatchesByRound: vi.fn(), updateMatchResults: vi.fn(), error: null }),
}))

// Le tableau lui-meme est teste a part : on ne regarde ici que ce que la page lui demande.
const drawTableProps = vi.fn()
vi.mock('@/components/admin/draws/DrawTable', () => ({
    DrawTable: (props: { afficherTelephone?: boolean; group: { group_name: string } }) => {
        drawTableProps(props)
        return <div data-testid="draw-table">{props.group.group_name}</div>
    },
}))

vi.mock('@/components/admin/draws/MatchScoreDialog', () => ({ MatchScoreDialog: () => null }))
vi.mock('@/components/admin/draws/PlayerInfoDialog', () => ({ PlayerInfoDialog: () => null }))
vi.mock('@/components/admin/draws/EmbedDrawsDialog', () => ({ EmbedDrawsDialog: () => null }))

describe('AdminDraws', () => {
    beforeEach(() => {
        drawTableProps.mockClear()
        recherche.valeur = ''
    })

    /*
     * Le PDF est une capture de l'ecran : afficher le numero ici suffit a
     * l'emporter dans l'export.
     */
    it('demande aux tableaux d\'afficher le numero des joueurs', () => {
        render(<AdminDraws />)
        expect(screen.getAllByTestId('draw-table')).toHaveLength(2)
        expect(drawTableProps).toHaveBeenCalledWith(expect.objectContaining({ afficherTelephone: true }))
    })

    it('ne montre que les tableaux du joueur cherche dans le header', () => {
        recherche.valeur = 'dupont'
        render(<AdminDraws />)
        expect(screen.getAllByTestId('draw-table').map(t => t.textContent)).toEqual(['Box 2'])
    })

    it('dit quand aucun tableau ne contient le joueur cherche', () => {
        recherche.valeur = 'zorro'
        render(<AdminDraws />)
        expect(screen.queryByTestId('draw-table')).not.toBeInTheDocument()
        expect(screen.getByText(/Aucun joueur ne correspond à « zorro »/)).toBeInTheDocument()
    })
})
