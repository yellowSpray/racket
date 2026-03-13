import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ChangeRoleDialog } from '../ChangeRoleDialog'
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

describe('ChangeRoleDialog', () => {
    const defaultProps = {
        open: true,
        onOpenChange: vi.fn(),
        member: makeMember(),
        onConfirm: vi.fn(),
        loading: false,
        callerRole: 'admin' as const,
    }

    it('renders the dialog title when open', () => {
        render(<ChangeRoleDialog {...defaultProps} />)
        expect(screen.getByText('Modifier le rôle')).toBeInTheDocument()
    })

    it('displays the member name in the description', () => {
        render(<ChangeRoleDialog {...defaultProps} />)
        expect(screen.getByText(/Alice Martin/)).toBeInTheDocument()
    })

    it('renders cancel and confirm buttons', () => {
        render(<ChangeRoleDialog {...defaultProps} />)
        expect(screen.getByText('Annuler')).toBeInTheDocument()
        expect(screen.getByText('Confirmer')).toBeInTheDocument()
    })

    it('does not render content when dialog is closed', () => {
        render(<ChangeRoleDialog {...defaultProps} open={false} />)
        expect(screen.queryByText('Modifier le rôle')).not.toBeInTheDocument()
    })

    it('shows loading text when loading', () => {
        render(<ChangeRoleDialog {...defaultProps} loading={true} />)
        expect(screen.getByText('Modification...')).toBeInTheDocument()
    })

    it('shows user and admin options for admin caller', () => {
        render(<ChangeRoleDialog {...defaultProps} callerRole="admin" />)
        expect(screen.getByText('Utilisateur')).toBeInTheDocument()
        expect(screen.getByText('Administrateur')).toBeInTheDocument()
        expect(screen.queryByText('Super Administrateur')).not.toBeInTheDocument()
    })

    it('shows all role options including superadmin for superadmin caller', () => {
        render(<ChangeRoleDialog {...defaultProps} callerRole="superadmin" />)
        expect(screen.getByText('Utilisateur')).toBeInTheDocument()
        expect(screen.getByText('Administrateur')).toBeInTheDocument()
        expect(screen.getByText('Super Administrateur')).toBeInTheDocument()
    })

    it('handles null member gracefully', () => {
        render(<ChangeRoleDialog {...defaultProps} member={null} />)
        expect(screen.getByText('Modifier le rôle')).toBeInTheDocument()
    })
})
