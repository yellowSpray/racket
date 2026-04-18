import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MatchesCard } from '../MatchesCard'
import type { MatchDay, DayMatch } from '@/hooks/useMatchesByDay'

vi.mock('@/hooks/useMatchesByDay', () => ({
    useMatchesByDay: vi.fn(),
}))

import { useMatchesByDay } from '@/hooks/useMatchesByDay'

const mockUseMatchesByDay = useMatchesByDay as ReturnType<typeof vi.fn>
const mockResolveScore = vi.fn()

function makeMatch(overrides: Partial<DayMatch> = {}): DayMatch {
    return {
        id: 'm1',
        group_id: 'g1',
        player1_id: 'p1',
        player2_id: 'p2',
        match_date: '2026-04-18',
        match_time: '10:00:00',
        court_number: '1',
        winner_id: null,
        score: null,
        pending_score_p1: null,
        pending_score_p2: null,
        status: 'no_score',
        player1: { id: 'p1', first_name: 'Alice', last_name: 'Martin' },
        player2: { id: 'p2', first_name: 'Bob', last_name: 'Dupont' },
        group: { id: 'g1', group_name: 'Box A', event_id: 'ev1' },
        ...overrides,
    }
}

function makeDay(overrides: Partial<MatchDay> = {}): MatchDay {
    return {
        date: '2026-04-18',
        label: 'vendredi 18 avril',
        isToday: true,
        matches: [makeMatch()],
        ...overrides,
    }
}

const defaultReturn = {
    days: [],
    loading: false,
    initialDayIndex: 0,
    resolveScore: mockResolveScore,
    refetch: vi.fn(),
}

beforeEach(() => {
    vi.clearAllMocks()
    mockUseMatchesByDay.mockReturnValue(defaultReturn)
})

describe('MatchesCard', () => {
    it('shows loading state', () => {
        mockUseMatchesByDay.mockReturnValue({ ...defaultReturn, loading: true })
        render(<MatchesCard eventId="ev1" />)
        expect(screen.getByText('Chargement...')).toBeInTheDocument()
    })

    it('shows empty state when no days', () => {
        render(<MatchesCard eventId="ev1" />)
        expect(screen.getByText(/aucun match programmé/i)).toBeInTheDocument()
    })

    it('shows player names for a match', () => {
        mockUseMatchesByDay.mockReturnValue({
            ...defaultReturn,
            days: [makeDay()],
        })
        render(<MatchesCard eventId="ev1" />)
        // Both desktop table and mobile cards are in the DOM (CSS hides one at runtime)
        expect(screen.getAllByText('Alice Martin').length).toBeGreaterThanOrEqual(1)
        expect(screen.getAllByText('Bob Dupont').length).toBeGreaterThanOrEqual(1)
    })

    it('shows the day label', () => {
        mockUseMatchesByDay.mockReturnValue({
            ...defaultReturn,
            days: [makeDay({ label: 'vendredi 18 avril' })],
        })
        render(<MatchesCard eventId="ev1" />)
        expect(screen.getByText('vendredi 18 avril')).toBeInTheDocument()
    })

    it('shows "aujourd\'hui" badge when day isToday', () => {
        mockUseMatchesByDay.mockReturnValue({
            ...defaultReturn,
            days: [makeDay({ isToday: true })],
        })
        render(<MatchesCard eventId="ev1" />)
        expect(screen.getByText("aujourd'hui")).toBeInTheDocument()
    })

    it('shows the group badge', () => {
        mockUseMatchesByDay.mockReturnValue({
            ...defaultReturn,
            days: [makeDay()],
        })
        render(<MatchesCard eventId="ev1" />)
        expect(screen.getAllByText('Box A').length).toBeGreaterThanOrEqual(1)
    })

    it('shows court number', () => {
        mockUseMatchesByDay.mockReturnValue({
            ...defaultReturn,
            days: [makeDay({ matches: [makeMatch({ court_number: '3' })] })],
        })
        render(<MatchesCard eventId="ev1" />)
        expect(screen.getByText('3')).toBeInTheDocument()
    })

    it('shows score for a done match', () => {
        mockUseMatchesByDay.mockReturnValue({
            ...defaultReturn,
            days: [makeDay({
                matches: [makeMatch({ status: 'done', winner_id: 'p1', score: '3-1' })],
            })],
        })
        render(<MatchesCard eventId="ev1" />)
        expect(screen.getAllByText('3-1').length).toBeGreaterThanOrEqual(1)
    })

    it('shows score input for a no_score match', () => {
        mockUseMatchesByDay.mockReturnValue({
            ...defaultReturn,
            days: [makeDay({ matches: [makeMatch({ status: 'no_score' })] })],
        })
        render(<MatchesCard eventId="ev1" />)
        // One combobox per layout (desktop + mobile)
        expect(screen.getAllByRole('combobox').length).toBeGreaterThanOrEqual(1)
        expect(screen.getAllByRole('button', { name: /valider/i }).length).toBeGreaterThanOrEqual(1)
    })

    it('validate button is disabled when no score selected', () => {
        mockUseMatchesByDay.mockReturnValue({
            ...defaultReturn,
            days: [makeDay({ matches: [makeMatch({ status: 'no_score' })] })],
        })
        render(<MatchesCard eventId="ev1" />)
        const validateButtons = screen.getAllByRole('button', { name: /valider/i })
        expect(validateButtons.every(btn => btn.hasAttribute('disabled'))).toBe(true)
    })

    it('calls resolveScore when validate button is clicked', async () => {
        mockResolveScore.mockResolvedValue(true)
        mockUseMatchesByDay.mockReturnValue({
            ...defaultReturn,
            days: [makeDay({ matches: [makeMatch({ status: 'no_score' })] })],
        })
        render(<MatchesCard eventId="ev1" />)

        const comboboxes = screen.getAllByRole('combobox')
        fireEvent.change(comboboxes[0], { target: { value: '3-1' } })
        const validateButtons = screen.getAllByRole('button', { name: /valider/i })
        fireEvent.click(validateButtons[0])

        await waitFor(() => {
            expect(mockResolveScore).toHaveBeenCalledWith('m1', '3-1', 'p1', 'p2')
        })
    })

    it('shows conflict status with two validate buttons per layout', () => {
        mockUseMatchesByDay.mockReturnValue({
            ...defaultReturn,
            days: [makeDay({
                matches: [makeMatch({
                    status: 'conflict',
                    pending_score_p1: '3-1',
                    pending_score_p2: '2-3',
                })],
            })],
        })
        render(<MatchesCard eventId="ev1" />)
        expect(screen.getAllByText('3-1').length).toBeGreaterThanOrEqual(1)
        expect(screen.getAllByText('2-3').length).toBeGreaterThanOrEqual(1)
        // 2 conflict buttons per layout (desktop + mobile) = 4 total
        const validateButtons = screen.getAllByRole('button', { name: /valider/i })
        expect(validateButtons.length).toBeGreaterThanOrEqual(2)
    })

    it('disables prev button on first day', () => {
        mockUseMatchesByDay.mockReturnValue({
            ...defaultReturn,
            days: [makeDay(), makeDay({ date: '2026-04-19', isToday: false })],
        })
        render(<MatchesCard eventId="ev1" />)
        expect(screen.getByRole('button', { name: /jour précédent/i })).toBeDisabled()
    })

    it('disables next button on last day', () => {
        mockUseMatchesByDay.mockReturnValue({
            ...defaultReturn,
            days: [makeDay()],
        })
        render(<MatchesCard eventId="ev1" />)
        expect(screen.getByRole('button', { name: /jour suivant/i })).toBeDisabled()
    })

    it('navigates to next day on next button click', () => {
        const day1 = makeDay({ label: 'vendredi 18 avril' })
        const day2 = makeDay({ date: '2026-04-19', label: 'samedi 19 avril', isToday: false })
        mockUseMatchesByDay.mockReturnValue({
            ...defaultReturn,
            days: [day1, day2],
        })
        render(<MatchesCard eventId="ev1" />)
        expect(screen.getByText('vendredi 18 avril')).toBeInTheDocument()

        fireEvent.click(screen.getByRole('button', { name: /jour suivant/i }))
        expect(screen.getByText('samedi 19 avril')).toBeInTheDocument()
    })

    it('shows progress badge with played/total count', () => {
        const done = makeMatch({ id: 'm1', status: 'done', winner_id: 'p1', score: '3-1' })
        const pending = makeMatch({ id: 'm2', status: 'no_score' })
        mockUseMatchesByDay.mockReturnValue({
            ...defaultReturn,
            days: [makeDay({ matches: [done, pending] })],
        })
        render(<MatchesCard eventId="ev1" />)
        expect(screen.getByText('1/2 joués')).toBeInTheDocument()
    })
})
