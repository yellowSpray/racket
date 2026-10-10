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

const groupe = {
    id: 'g1', round_id: 'r1', group_name: 'Box 1', max_players: 2, created_at: '2026-01-01',
    players: [{ id: 'p1', first_name: 'Alice', last_name: 'Martin', phone: '0611111111', power_ranking: 1 }],
}

vi.mock('@/hooks/useGroups', () => ({
    useGroups: () => ({ groups: [groupe], loading: false, fetchGroupsByRound: vi.fn() }),
}))

vi.mock('@/hooks/useMatches', () => ({
    useMatches: () => ({ matches: [], fetchMatchesByRound: vi.fn(), updateMatchResults: vi.fn(), error: null }),
}))

// Le tableau lui-meme est teste a part : on ne regarde ici que ce que la page lui demande.
const drawTableProps = vi.fn()
vi.mock('@/components/admin/draws/DrawTable', () => ({
    DrawTable: (props: { afficherTelephone?: boolean }) => {
        drawTableProps(props)
        return <div data-testid="draw-table" />
    },
}))

vi.mock('@/components/admin/draws/MatchScoreDialog', () => ({ MatchScoreDialog: () => null }))
vi.mock('@/components/admin/draws/PlayerInfoDialog', () => ({ PlayerInfoDialog: () => null }))
vi.mock('@/components/admin/draws/EmbedDrawsDialog', () => ({ EmbedDrawsDialog: () => null }))

describe('AdminDraws', () => {
    beforeEach(() => {
        drawTableProps.mockClear()
    })

    /*
     * Le PDF est une capture de l'ecran : afficher le numero ici suffit a
     * l'emporter dans l'export.
     */
    it('demande aux tableaux d\'afficher le numero des joueurs', () => {
        render(<AdminDraws />)
        expect(screen.getByTestId('draw-table')).toBeInTheDocument()
        expect(drawTableProps).toHaveBeenCalledWith(expect.objectContaining({ afficherTelephone: true }))
    })
})
