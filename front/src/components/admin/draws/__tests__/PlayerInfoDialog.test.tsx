import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PlayerInfoDialog } from '../PlayerInfoDialog'
import type { GroupPlayer } from '@/types/draw'
import type { PlayerType } from '@/types/player'
import type { PlayerHistoryEntry } from '@/lib/playerBoxHistory'

const mockFetchHistory = vi.fn()
const mockUseBoxHistory = vi.fn()
vi.mock('@/hooks/usePlayerBoxHistory', () => ({
    usePlayerBoxHistory: () => mockUseBoxHistory(),
}))

const player = {
    id: 'p1', first_name: 'Leigh', last_name: 'Cannon',
    phone: '0470 11 22 33', power_ranking: 412,
} as GroupPlayer

const details = {
    id: 'p1', first_name: 'Leigh', last_name: 'Cannon', full_name: 'Leigh Cannon',
    email: 'leigh@example.com', phone: '0470 11 22 33',
    arrival: '18:00', departure: '22:00', unavailable: [],
    status: ['member', 'active'], payment_status: 'unpaid',
    payments: [], power_ranking: 412, box: 'Box 3',
} as PlayerType

const history: PlayerHistoryEntry[] = [
    { eventName: 'Interclub', roundNumber: 1, startDate: '2026-05-04', groupName: 'Box 5', boxNumber: 5, movement: 'first' },
    { eventName: 'Interclub', roundNumber: 2, startDate: '2026-06-15', groupName: 'Box 3', boxNumber: 3, movement: 'up' },
    { eventName: 'Interclub', roundNumber: 3, startDate: '2026-07-20', groupName: 'Box 4', boxNumber: 4, movement: 'down' },
]

function setup(overrides: Partial<Parameters<typeof PlayerInfoDialog>[0]> = {}) {
    render(
        <PlayerInfoDialog
            open
            onOpenChange={vi.fn()}
            player={player}
            details={details}
            {...overrides}
        />
    )
}

describe('PlayerInfoDialog', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockUseBoxHistory.mockReturnValue({
            history, loading: false, fetchHistory: mockFetchHistory, reset: vi.fn(),
        })
    })

    it('annonce le joueur dans son titre', () => {
        setup()
        expect(screen.getByRole('heading', { name: /Leigh Cannon/ })).toBeInTheDocument()
    })

    it('charge le parcours du joueur a l\'ouverture', () => {
        setup()
        expect(mockFetchHistory).toHaveBeenCalledWith('p1')
    })

    it('affiche le contact', () => {
        setup()
        expect(screen.getByText('leigh@example.com')).toBeInTheDocument()
        expect(screen.getByText('0470 11 22 33')).toBeInTheDocument()
    })

    it('affiche le statut et le paiement', () => {
        setup()
        expect(screen.getByText(/membre/i)).toBeInTheDocument()
        expect(screen.getByText(/non pay/i)).toBeInTheDocument()
    })

    it('affiche le classement Elo', () => {
        setup()
        expect(screen.getByText('412')).toBeInTheDocument()
    })

    it('liste les tableaux occupes du plus recent au plus ancien', () => {
        setup()
        const items = screen.getAllByTestId('history-entry')
        // Le plus recent en premier : c'est celui qu'on vient regarder
        expect(items[0]).toHaveTextContent('Box 4')
        expect(items[2]).toHaveTextContent('Box 5')
    })

    it('marque les montees et les descentes', () => {
        setup()
        expect(screen.getByTestId('history-movement-up')).toBeInTheDocument()
        expect(screen.getByTestId('history-movement-down')).toBeInTheDocument()
    })

    it('signale un parcours vide', () => {
        mockUseBoxHistory.mockReturnValue({
            history: [], loading: false, fetchHistory: mockFetchHistory, reset: vi.fn(),
        })
        setup()
        expect(screen.getByText(/Premi.re s.rie/i)).toBeInTheDocument()
    })

    it('se contente du joueur du tableau quand la fiche complete manque', () => {
        // Un joueur retire de la serie n'est plus dans le contexte des joueurs :
        // le dialog doit rester ouvrable sans email ni statut.
        setup({ details: null })
        expect(screen.getByRole('heading', { name: /Leigh Cannon/ })).toBeInTheDocument()
        expect(screen.getByText('0470 11 22 33')).toBeInTheDocument()
    })

    it('ne rend rien sans joueur', () => {
        const { container } = render(
            <PlayerInfoDialog open onOpenChange={vi.fn()} player={null} details={null} />
        )
        expect(container).toBeEmptyDOMElement()
    })

    it('n\'utilise pas de tiret cadratin', () => {
        const { baseElement } = render(
            <PlayerInfoDialog open onOpenChange={vi.fn()} player={player} details={details} />
        )
        expect(baseElement.textContent).not.toContain('—')
    })
})
