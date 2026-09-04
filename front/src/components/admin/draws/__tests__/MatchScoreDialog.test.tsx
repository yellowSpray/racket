import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MatchScoreDialog } from '../MatchScoreDialog'
import type { Match } from '@/types/match'
import type { GroupPlayer } from '@/types/draw'

const mockFetchHistory = vi.fn()
const mockUseHeadToHead = vi.fn()
vi.mock('@/hooks/useHeadToHead', () => ({
    useHeadToHead: () => mockUseHeadToHead(),
}))

const rowPlayer = { id: 'a', first_name: 'Timothy', last_name: 'Beek', phone: '', power_ranking: 700 } as GroupPlayer
const opponent = { id: 'b', first_name: 'Peter', last_name: 'Eade', phone: '', power_ranking: 598 } as GroupPlayer

const match = {
    id: 'm9', group_id: 'g1', player1_id: 'a', player2_id: 'b',
    match_date: '2026-06-15', match_time: '19:30', court_number: '2',
    winner_id: null, score: null,
} as Match

const past = [{
    id: 'm1', group_id: 'g0', player1_id: 'a', player2_id: 'b',
    match_date: '2026-03-02', match_time: '20:00', court_number: '1',
    winner_id: 'b', score: '2-3',
    group: { id: 'g0', group_name: 'Box 3', round_id: 'r1' },
}] as Match[]

function setup(overrides: Partial<Parameters<typeof MatchScoreDialog>[0]> = {}) {
    const onSave = vi.fn()
    render(
        <MatchScoreDialog
            open
            onOpenChange={vi.fn()}
            match={match}
            rowPlayer={rowPlayer}
            opponent={opponent}
            onSave={onSave}
            {...overrides}
        />
    )
    return { onSave }
}

describe('MatchScoreDialog', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockUseHeadToHead.mockReturnValue({
            matches: past,
            summary: { played: 1, wins: 0, losses: 1 },
            loading: false,
            fetchHistory: mockFetchHistory,
            reset: vi.fn(),
        })
    })

    it('annonce les deux joueurs dans l\'ordre de la ligne', () => {
        setup()
        // Le titre melange texte et balises : on interroge l'en-tete entier
        expect(screen.getByRole('heading', { name: /Timothy Beek.*contre.*Peter Eade/ })).toBeInTheDocument()
    })

    it('charge l\'historique en excluant le match en cours', () => {
        setup()
        expect(mockFetchHistory).toHaveBeenCalledWith('a', 'b', 'm9')
    })

    it('affiche le bilan des confrontations', () => {
        setup()
        // Le mock donne 0 victoire et 1 defaite pour le joueur de la ligne
        expect(screen.getByText(/0 victoire, 1 défaite/i)).toBeInTheDocument()
    })

    it('liste les rencontres passees avec leur score', () => {
        setup()
        expect(screen.getByText('Box 3')).toBeInTheDocument()
        // Score reoriente du point de vue du joueur de la ligne
        expect(screen.getByText('2-3')).toBeInTheDocument()
    })

    it('signale l\'absence d\'historique', () => {
        mockUseHeadToHead.mockReturnValue({
            matches: [], summary: { played: 0, wins: 0, losses: 0 },
            loading: false, fetchHistory: mockFetchHistory, reset: vi.fn(),
        })
        setup()
        expect(screen.getByText(/Première rencontre/i)).toBeInTheDocument()
    })

    it('enregistre le score saisi du point de vue du joueur de la ligne', async () => {
        const { onSave } = setup()

        fireEvent.change(screen.getByLabelText('Score Timothy Beek'), { target: { value: '3' } })
        fireEvent.change(screen.getByLabelText('Score Peter Eade'), { target: { value: '1' } })
        fireEvent.click(screen.getByRole('button', { name: /enregistrer/i }))

        await waitFor(() => expect(onSave).toHaveBeenCalledWith('m9', '3-1'))
    })

    it('met l\'adversaire a zero quand un joueur est absent', async () => {
        const { onSave } = setup()

        fireEvent.change(screen.getByLabelText('Score Timothy Beek'), { target: { value: 'ABS' } })
        fireEvent.click(screen.getByRole('button', { name: /enregistrer/i }))

        await waitFor(() => expect(onSave).toHaveBeenCalledWith('m9', 'ABS-0'))
    })

    it('reprend le score deja enregistre', () => {
        setup({ match: { ...match, score: '1-3', winner_id: 'b' } })
        expect(screen.getByLabelText('Score Timothy Beek')).toHaveValue('1')
        expect(screen.getByLabelText('Score Peter Eade')).toHaveValue('3')
    })

    it('refuse d\'enregistrer un score incomplet', () => {
        const { onSave } = setup()
        fireEvent.change(screen.getByLabelText('Score Timothy Beek'), { target: { value: '3' } })
        expect(screen.getByRole('button', { name: /enregistrer/i })).toBeDisabled()
        expect(onSave).not.toHaveBeenCalled()
    })

    it('ne garde pas le score d\'une case dans la suivante', async () => {
        // Le dialog est monte une seule fois et recoit successivement plusieurs matchs :
        // sans reinitialisation, le score saisi ou charge precedemment restait affiche.
        const played = { ...match, id: 'm1', score: '3-1', winner_id: 'a' }
        const { rerender } = render(
            <MatchScoreDialog
                open onOpenChange={vi.fn()}
                match={played} rowPlayer={rowPlayer} opponent={opponent} onSave={vi.fn()}
            />
        )
        expect(screen.getByLabelText('Score Timothy Beek')).toHaveValue('3')

        rerender(
            <MatchScoreDialog
                open onOpenChange={vi.fn()}
                match={{ ...match, id: 'm2', score: null, winner_id: null }}
                rowPlayer={rowPlayer} opponent={opponent} onSave={vi.fn()}
            />
        )

        expect(screen.getByLabelText('Score Timothy Beek')).toHaveValue('')
        expect(screen.getByLabelText('Score Peter Eade')).toHaveValue('')
    })

    it('repart d\'une saisie vierge a chaque ouverture', () => {
        const { rerender } = render(
            <MatchScoreDialog
                open onOpenChange={vi.fn()}
                match={match} rowPlayer={rowPlayer} opponent={opponent} onSave={vi.fn()}
            />
        )
        fireEvent.change(screen.getByLabelText('Score Timothy Beek'), { target: { value: '2' } })

        // Fermeture puis reouverture sur le meme match
        rerender(
            <MatchScoreDialog
                open={false} onOpenChange={vi.fn()}
                match={match} rowPlayer={rowPlayer} opponent={opponent} onSave={vi.fn()}
            />
        )
        rerender(
            <MatchScoreDialog
                open onOpenChange={vi.fn()}
                match={match} rowPlayer={rowPlayer} opponent={opponent} onSave={vi.fn()}
            />
        )

        expect(screen.getByLabelText('Score Timothy Beek')).toHaveValue('')
    })

    it('n\'utilise pas de tiret cadratin dans son texte', () => {
        const { container } = render(
            <MatchScoreDialog
                open onOpenChange={vi.fn()}
                match={match} rowPlayer={rowPlayer} opponent={opponent} onSave={vi.fn()}
            />
        )
        expect(container.textContent).not.toContain('\u2014')
    })
})
