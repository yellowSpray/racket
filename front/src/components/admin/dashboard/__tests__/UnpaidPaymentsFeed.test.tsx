import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { UnpaidPaymentsFeed } from '../UnpaidPaymentsFeed'
import type { UnpaidPayment } from '@/hooks/useUnpaidPayments'

function makePayment(overrides: Partial<UnpaidPayment> & { id: string }): UnpaidPayment {
    return {
        profileId: 'p1',
        firstName: 'Alice',
        lastName: 'Martin',
        eventName: 'Série 5',
        ...overrides,
    }
}

describe('UnpaidPaymentsFeed', () => {
    it('should show loading state', () => {
        render(<UnpaidPaymentsFeed payments={[]} loading={true} />)
        expect(screen.getByText('Chargement...')).toBeInTheDocument()
    })

    it('should show empty state when no unpaid payments', () => {
        render(<UnpaidPaymentsFeed payments={[]} loading={false} />)
        expect(screen.getByText('Tous les paiements sont à jour')).toBeInTheDocument()
    })

    it('should display player names', () => {
        const payments = [
            makePayment({ id: 'pay1', firstName: 'Alice', lastName: 'Martin' }),
            makePayment({ id: 'pay2', profileId: 'p2', firstName: 'Bob', lastName: 'Dupont', eventName: 'Série 4' }),
        ]

        render(<UnpaidPaymentsFeed payments={payments} loading={false} />)

        expect(screen.getByText('Alice Martin')).toBeInTheDocument()
        expect(screen.getByText('Bob Dupont')).toBeInTheDocument()
    })

    it('should show event name in badge for each payment', () => {
        const payments = [
            makePayment({ id: 'pay1', eventName: 'Série 4' }),
            makePayment({ id: 'pay2', profileId: 'p2', eventName: 'Série 5' }),
        ]

        render(<UnpaidPaymentsFeed payments={payments} loading={false} />)

        expect(screen.getByText('Série 4')).toBeInTheDocument()
        expect(screen.getByText('Série 5')).toBeInTheDocument()
    })
})
