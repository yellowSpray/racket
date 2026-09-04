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

/** Raccourci : une liste de numeros de serie devient des lignes d'impaye. */
function rounds(...numbers: number[]) {
    return numbers.map(n => ({ paymentId: `pay-${n}`, roundNumber: n, eventName: 'Mixed' }))
}

function makeGrouped(overrides: Partial<GroupedUnpaidPayment> & { profileId: string }): GroupedUnpaidPayment {
    return {
        firstName: 'Alice',
        lastName: 'Martin',
        rounds: rounds(5),
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
            makeGrouped({ profileId: 'p2', firstName: 'Bob', lastName: 'Dupont', rounds: rounds(4), count: 1 }),
        ]

        render(<UnpaidPaymentsCard clubId="c1" />)

        expect(screen.getByText('Alice Martin')).toBeInTheDocument()
        expect(screen.getByText('Bob Dupont')).toBeInTheDocument()
    })

    it('nomme la serie dans le badge, pas l\'evenement', () => {
        mockGrouped = [
            makeGrouped({ profileId: 'p1', rounds: rounds(4), count: 1 }),
            makeGrouped({ profileId: 'p2', firstName: 'Bob', lastName: 'Dupont', rounds: rounds(5), count: 1 }),
        ]

        render(<UnpaidPaymentsCard clubId="c1" />)

        expect(screen.getByText('Série 4')).toBeInTheDocument()
        expect(screen.getByText('Série 5')).toBeInTheDocument()
        expect(screen.queryByText('Mixed')).not.toBeInTheDocument()
        // L'evenement reste accessible au survol, pour distinguer deux series 4
        expect(screen.getByTitle('Mixed, série 4')).toBeInTheDocument()
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

    it('affiche +N au dela de deux series impayees', () => {
        mockGrouped = [
            makeGrouped({ profileId: 'p1', rounds: rounds(3, 4, 5), count: 3 }),
        ]

        render(<UnpaidPaymentsCard clubId="c1" />)

        expect(screen.getByText('+1')).toBeInTheDocument()
    })
})
