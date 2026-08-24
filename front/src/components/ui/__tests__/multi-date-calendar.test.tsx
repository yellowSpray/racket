import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MultiDateCalendar } from '../multi-date-calendar'

// Helper: build an ISO date string for a given year/month/day
function iso(year: number, month: number, day: number): string {
    const m = String(month).padStart(2, '0')
    const d = String(day).padStart(2, '0')
    return `${year}-${m}-${d}`
}

// We need to control the initial month shown by the component.
// The component uses `new Date()` to determine the initial view.
// We mock Date to always start in January 2025 for predictable tests.
const FIXED_NOW = new Date(2025, 0, 15) // January 15, 2025

beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(FIXED_NOW)
})

afterEach(() => {
    vi.useRealTimers()
})

describe('MultiDateCalendar', () => {
    it('renders with no selected dates', () => {
        const onChange = vi.fn()
        render(<MultiDateCalendar selectedDates={[]} onChange={onChange} />)

        // Should show day labels
        expect(screen.getByText('Lun')).toBeInTheDocument()
        expect(screen.getByText('Dim')).toBeInTheDocument()
    })

    it('shows the correct month/year header', () => {
        const onChange = vi.fn()
        render(<MultiDateCalendar selectedDates={[]} onChange={onChange} />)

        // Fixed date is January 2025
        expect(screen.getByText('Janvier 2025')).toBeInTheDocument()
    })

    it('clicking a date adds it to selection', () => {
        const onChange = vi.fn()
        render(<MultiDateCalendar selectedDates={[]} onChange={onChange} />)

        // Click on day 10
        fireEvent.click(screen.getByText('10'))

        expect(onChange).toHaveBeenCalledTimes(1)
        expect(onChange).toHaveBeenCalledWith([iso(2025, 1, 10)])
    })

    it('clicking a selected date removes it', () => {
        const onChange = vi.fn()
        const selected = [iso(2025, 1, 10), iso(2025, 1, 20)]
        render(<MultiDateCalendar selectedDates={selected} onChange={onChange} />)

        // Click on already-selected day 10
        fireEvent.click(screen.getByText('10'))

        expect(onChange).toHaveBeenCalledTimes(1)
        expect(onChange).toHaveBeenCalledWith([iso(2025, 1, 20)])
    })

    it('clicking an unselected date when others are selected adds it sorted', () => {
        const onChange = vi.fn()
        const selected = [iso(2025, 1, 5), iso(2025, 1, 20)]
        render(<MultiDateCalendar selectedDates={selected} onChange={onChange} />)

        // Click on day 10 (between 5 and 20)
        fireEvent.click(screen.getByText('10'))

        expect(onChange).toHaveBeenCalledWith([
            iso(2025, 1, 5),
            iso(2025, 1, 10),
            iso(2025, 1, 20),
        ])
    })

    it('navigating to next month updates the header', () => {
        const onChange = vi.fn()
        render(<MultiDateCalendar selectedDates={[]} onChange={onChange} />)

        expect(screen.getByText('Janvier 2025')).toBeInTheDocument()

        // Click next month button (second nav button in header)
        const buttons = screen.getAllByRole('button')
        fireEvent.click(buttons[1])

        expect(screen.getByText('Février 2025')).toBeInTheDocument()
    })

    it('navigating to previous month updates the header', () => {
        const onChange = vi.fn()
        render(<MultiDateCalendar selectedDates={[]} onChange={onChange} />)

        // Click prev month button (first nav button in header)
        const buttons = screen.getAllByRole('button')
        fireEvent.click(buttons[0])

        expect(screen.getByText('Décembre 2024')).toBeInTheDocument()
    })

    it('navigating forward from December wraps to January of next year', () => {
        const onChange = vi.fn()
        // Set system time to December 2025
        vi.setSystemTime(new Date(2025, 11, 15))
        render(<MultiDateCalendar selectedDates={[]} onChange={onChange} />)

        expect(screen.getByText('Décembre 2025')).toBeInTheDocument()

        const buttons = screen.getAllByRole('button')
        fireEvent.click(buttons[1])

        expect(screen.getByText('Janvier 2026')).toBeInTheDocument()
    })

    describe('espacement et survol', () => {
        /** Renvoie le bouton du jour demandé dans le mois affiché. */
        function dayButton(label: string) {
            return screen.getAllByRole('button').find(b => b.textContent === label)!
        }

        it('espace les semaines verticalement autant que les jours horizontalement', () => {
            // Sans gap vertical, deux jours selectionnes dans la meme colonne
            // sur deux semaines consecutives se collent en un seul bloc.
            const { container } = render(<MultiDateCalendar selectedDates={[]} onChange={vi.fn()} />)
            const grid = container.querySelector('[data-slot="calendar-grid"]')
            expect(grid).toHaveClass('gap-2')
        })

        it('ne comprime plus les semaines avec justify-between', () => {
            const { container } = render(<MultiDateCalendar selectedDates={[]} onChange={vi.fn()} />)
            const grid = container.querySelector('[data-slot="calendar-grid"]')
            expect(grid).not.toHaveClass('justify-between')
        })

        it('garde chaque jour selectionne dans sa propre pastille arrondie', () => {
            render(
                <MultiDateCalendar
                    selectedDates={[iso(2025, 1, 6), iso(2025, 1, 13)]}
                    onChange={vi.fn()}
                />
            )
            for (const label of ['6', '13']) {
                expect(dayButton(label)).toHaveClass('rounded-md')
            }
        })

        it('donne au survol une couleur visible plutot que bg-accent', () => {
            render(<MultiDateCalendar selectedDates={[]} onChange={vi.fn()} />)
            const day = dayButton('8')
            // --accent vaut oklch(100%) : un survol blanc sur fond blanc est invisible
            expect(day).not.toHaveClass('hover:bg-accent')
            expect(day).toHaveClass('hover:bg-primary/20')
        })

        it('donne aussi un survol aux jours deja selectionnes', () => {
            render(<MultiDateCalendar selectedDates={[iso(2025, 1, 8)]} onChange={vi.fn()} />)
            expect(dayButton('8')).toHaveClass('hover:bg-primary-hover')
        })

        it('ne propose aucun survol quand le calendrier est desactive', () => {
            render(<MultiDateCalendar selectedDates={[]} onChange={vi.fn()} disabled />)
            const day = dayButton('8')
            expect(day).not.toHaveClass('hover:bg-primary/20')
            expect(day).not.toHaveClass('hover:bg-primary-hover')
        })
    })

})
