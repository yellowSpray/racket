import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { GroupedUnpaidPayment } from '@/hooks/useUnpaidPayments'

let mockGrouped: GroupedUnpaidPayment[] = []
let mockLoading = false

vi.mock('@/hooks/useUnpaidPayments', () => ({
    useUnpaidPayments: () => ({
        payments: [],
        grouped: mockGrouped,
        loading: mockLoading,
    }),
}))

import { UnpaidPaymentsCard } from '../UnpaidPaymentsCard'

function makeGrouped(overrides: Partial<GroupedUnpaidPayment> & { profileId: string }): GroupedUnpaidPayment {
    return {
        firstName: 'Alice',
        lastName: 'Martin',
        events: ['Série 5'],
        count: 1,
        ...overrides,
    }
}

describe('UnpaidPaymentsCard', () => {
    beforeEach(() => {
        mockGrouped = []
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
        mockGrouped = [
            makeGrouped({ profileId: 'p1', firstName: 'Alice', lastName: 'Martin' }),
            makeGrouped({ profileId: 'p2', firstName: 'Bob', lastName: 'Dupont', events: ['Série 4'], count: 1 }),
        ]

        render(<UnpaidPaymentsCard clubId="c1" />)

        expect(screen.getByText('Alice Martin')).toBeInTheDocument()
        expect(screen.getByText('Bob Dupont')).toBeInTheDocument()
    })

    it('should show event name in badge for each player', () => {
        mockGrouped = [
            makeGrouped({ profileId: 'p1', events: ['Série 4'], count: 1 }),
            makeGrouped({ profileId: 'p2', firstName: 'Bob', lastName: 'Dupont', events: ['Série 5'], count: 1 }),
        ]

        render(<UnpaidPaymentsCard clubId="c1" />)

        expect(screen.getByText('Série 4')).toBeInTheDocument()
        expect(screen.getByText('Série 5')).toBeInTheDocument()
    })

    it('should show count badge when there are unpaid players', () => {
        mockGrouped = [
            makeGrouped({ profileId: 'p1' }),
            makeGrouped({ profileId: 'p2', firstName: 'Bob', lastName: 'Dupont' }),
        ]

        render(<UnpaidPaymentsCard clubId="c1" />)

        expect(screen.getByText('2')).toBeInTheDocument()
    })

    it('should show title "Paiements"', () => {
        render(<UnpaidPaymentsCard clubId="c1" />)
        expect(screen.getByText('Paiements')).toBeInTheDocument()
    })

    it('should show +N badge when player has more than 2 unpaid events', () => {
        mockGrouped = [
            makeGrouped({ profileId: 'p1', events: ['Série 3', 'Série 4', 'Série 5'], count: 3 }),
        ]

        render(<UnpaidPaymentsCard clubId="c1" />)

        expect(screen.getByText('+1')).toBeInTheDocument()
    })
})
