import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { WizardStepMatches } from '../WizardStepMatches'
import type { Event, EventRound } from '@/types/event'
import type { Group } from '@/types/draw'
import type { Match } from '@/types/match'

// Le client Supabase est instancie a l'import : on le neutralise.
vi.mock('@/lib/supabaseClient', () => ({
    supabase: { from: vi.fn(() => ({ select: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn(), eq: vi.fn() })) },
}))

vi.mock('@/hooks/useMatches', () => ({
    useMatches: () => ({
        generateMatches: vi.fn(),
        deleteMatchesByRound: vi.fn(),
        updateMatchSchedule: vi.fn(),
        unplacedMatches: [],
        playerConstraints: new Map(),
    }),
}))

vi.mock('@/hooks/useErrorHandler', () => ({
    useErrorHandler: () => ({ handleError: vi.fn(), clearError: vi.fn() }),
}))

vi.mock('@/components/admin/matches/MatchScheduleGrid', () => ({
    MatchScheduleGrid: () => <div data-testid="schedule-grid" />,
}))

vi.mock('@/components/admin/matches/UnplacedMatchesPanel', () => ({
    UnplacedMatchesPanel: () => <div data-testid="unplaced-panel" />,
}))

const event = { id: 'e1', club_id: 'c1', event_name: 'Interclub' } as Event

const round = {
    id: 'r1', event_id: 'e1', round_number: 2,
    start_date: '2026-06-15', end_date: '2026-07-13',
    start_time: '18:30:00', end_time: '23:00:00',
    estimated_match_duration: '00:30:00',
    number_of_courts: 3, status: 'upcoming',
    playing_dates: ['2026-06-15', '2026-06-22', '2026-06-29'],
} as EventRound

const groups: Group[] = [{
    id: 'g1', round_id: 'r1', group_name: 'Box 1', max_players: 6, created_at: '',
    players: Array.from({ length: 6 }, (_, i) => ({
        id: `p${i}`, first_name: `J${i}`, last_name: '', phone: '', power_ranking: 300,
    })),
} as Group]

const matches: Match[] = [{
    id: 'm1', group_id: 'g1', player1_id: 'p0', player2_id: 'p1',
    match_date: '2026-06-15', match_time: '18:30', court_number: '1',
    winner_id: null, score: null,
} as Match]

function renderStep(withMatches = true) {
    const { container } = render(
        <WizardStepMatches
            event={event}
            round={round}
            groups={groups}
            matches={withMatches ? matches : []}
            onMatchesChanged={vi.fn()}
        />
    )
    return container.firstElementChild!
}

describe('WizardStepMatches — hauteur', () => {
    it('occupe la hauteur restante au lieu de s\'arreter a son contenu', () => {
        expect(renderStep()).toHaveClass('flex', 'flex-col', 'flex-1', 'min-h-0')
    })

    it('ne bride plus le planning a la moitie de l\'ecran', () => {
        renderStep()
        const wrapper = screen.getByTestId('schedule-grid').parentElement
        expect(wrapper).toHaveClass('flex-1', 'min-h-0', 'overflow-y-auto')
        expect(wrapper).not.toHaveClass('max-h-[50vh]')
    })

    it('etire aussi le bloc qui contient le planning', () => {
        renderStep()
        const section = screen.getByTestId('schedule-grid').parentElement?.parentElement
        expect(section).toHaveClass('flex', 'flex-col', 'flex-1', 'min-h-0')
    })

    it('garde la hauteur pleine meme sans match genere', () => {
        expect(renderStep(false)).toHaveClass('flex-1', 'min-h-0')
    })
})
