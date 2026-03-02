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

        // Click next month button (ChevronRight)
        const buttons = screen.getAllByRole('button')
        // The next month button is the second navigation button in the header
        const nextButton = buttons.find(btn => btn.querySelector('.lucide-chevron-right'))!
        fireEvent.click(nextButton)

        expect(screen.getByText('Février 2025')).toBeInTheDocument()
    })

    it('navigating to previous month updates the header', () => {
        const onChange = vi.fn()
        render(<MultiDateCalendar selectedDates={[]} onChange={onChange} />)

        // Click prev month button (ChevronLeft)
        const buttons = screen.getAllByRole('button')
        const prevButton = buttons.find(btn => btn.querySelector('.lucide-chevron-left'))!
        fireEvent.click(prevButton)

        expect(screen.getByText('Décembre 2024')).toBeInTheDocument()
    })

    it('navigating forward from December wraps to January of next year', () => {
        const onChange = vi.fn()
        // Set system time to December 2025
        vi.setSystemTime(new Date(2025, 11, 15))
        render(<MultiDateCalendar selectedDates={[]} onChange={onChange} />)

        expect(screen.getByText('Décembre 2025')).toBeInTheDocument()

        const buttons = screen.getAllByRole('button')
        const nextButton = buttons.find(btn => btn.querySelector('.lucide-chevron-right'))!
        fireEvent.click(nextButton)

        expect(screen.getByText('Janvier 2026')).toBeInTheDocument()
    })

})
