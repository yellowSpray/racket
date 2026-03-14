import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { UnpaidPayment } from '@/hooks/useUnpaidPayments'

let mockPayments: UnpaidPayment[] = []
let mockLoading = false

vi.mock('@/hooks/useUnpaidPayments', () => ({
    useUnpaidPayments: () => ({
        payments: mockPayments,
        loading: mockLoading,
        error: null,
    }),
}))

import { UnpaidPaymentsCard } from '../UnpaidPaymentsCard'

function makePayment(overrides: Partial<UnpaidPayment> & { id: string }): UnpaidPayment {
    return {
        profileId: 'p1',
        firstName: 'Alice',
        lastName: 'Martin',
        eventName: 'Série 5',
        ...overrides,
    }
}

describe('UnpaidPaymentsCard', () => {
    beforeEach(() => {
        mockPayments = []
        mockLoading = false
    })

    it('should show loading state', () => {
        mockLoading = true
        render(<UnpaidPaymentsCard clubId="c1" />)
        expect(screen.getByText('Chargement...')).toBeInTheDocument()
    })

    it('should show empty state when no unpaid payments', () => {
        render(<UnpaidPaymentsCard clubId="c1" />)
        expect(screen.getByText('Tous les paiements sont à jour')).toBeInTheDocument()
    })

    it('should display player names', () => {
        mockPayments = [
            makePayment({ id: 'pay1', firstName: 'Alice', lastName: 'Martin' }),
            makePayment({ id: 'pay2', profileId: 'p2', firstName: 'Bob', lastName: 'Dupont', eventName: 'Série 4' }),
        ]

        render(<UnpaidPaymentsCard clubId="c1" />)

        expect(screen.getByText('Alice Martin')).toBeInTheDocument()
        expect(screen.getByText('Bob Dupont')).toBeInTheDocument()
    })

    it('should show event name in badge for each payment', () => {
        mockPayments = [
            makePayment({ id: 'pay1', eventName: 'Série 4' }),
            makePayment({ id: 'pay2', profileId: 'p2', eventName: 'Série 5' }),
        ]

        render(<UnpaidPaymentsCard clubId="c1" />)

        expect(screen.getByText('Série 4')).toBeInTheDocument()
        expect(screen.getByText('Série 5')).toBeInTheDocument()
    })

    it('should show count badge when there are unpaid payments', () => {
        mockPayments = [
            makePayment({ id: 'pay1' }),
            makePayment({ id: 'pay2', profileId: 'p2' }),
        ]

        render(<UnpaidPaymentsCard clubId="c1" />)

        expect(screen.getByText('2')).toBeInTheDocument()
    })

    it('should show title "Paiements"', () => {
        render(<UnpaidPaymentsCard clubId="c1" />)
        expect(screen.getByText('Paiements')).toBeInTheDocument()
    })
})
