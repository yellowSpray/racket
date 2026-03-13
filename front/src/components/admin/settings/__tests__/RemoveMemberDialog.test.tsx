import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { RemoveMemberDialog } from '../RemoveMemberDialog'
import type { ClubMember } from '@/types/member'

const makeMember = (overrides: Partial<ClubMember> = {}): ClubMember => ({
    id: 'u1',
    first_name: 'Alice',
    last_name: 'Martin',
    email: 'alice@test.com',
    phone: '0612345678',
    role: 'user',
    is_linked: true,
    created_at: '2025-01-15T10:00:00Z',
    ...overrides,
})

describe('RemoveMemberDialog', () => {
    const defaultProps = {
        open: true,
        onOpenChange: vi.fn(),
        member: makeMember(),
        onConfirm: vi.fn(),
        loading: false,
    }

    it('renders the confirmation title when open', () => {
        render(<RemoveMemberDialog {...defaultProps} />)
        expect(screen.getByText('Retirer le membre ?')).toBeInTheDocument()
    })

    it('displays the member name in the description', () => {
        render(<RemoveMemberDialog {...defaultProps} />)
        expect(screen.getByText('Alice Martin')).toBeInTheDocument()
    })

    it('renders cancel and confirm buttons', () => {
        render(<RemoveMemberDialog {...defaultProps} />)
        expect(screen.getByText('Annuler')).toBeInTheDocument()
        expect(screen.getByText('Retirer')).toBeInTheDocument()
    })

    it('does not render content when dialog is closed', () => {
        render(<RemoveMemberDialog {...defaultProps} open={false} />)
        expect(screen.queryByText('Retirer le membre ?')).not.toBeInTheDocument()
    })

    it('shows loading text when loading', () => {
        render(<RemoveMemberDialog {...defaultProps} loading={true} />)
        expect(screen.getByText('Retrait...')).toBeInTheDocument()
    })

    it('handles null member gracefully', () => {
        render(<RemoveMemberDialog {...defaultProps} member={null} />)
        expect(screen.getByText('Retirer le membre ?')).toBeInTheDocument()
    })

    it('displays a message about not deleting the account', () => {
        render(<RemoveMemberDialog {...defaultProps} />)
        expect(screen.getByText(/ne supprime pas son compte/)).toBeInTheDocument()
    })
})
