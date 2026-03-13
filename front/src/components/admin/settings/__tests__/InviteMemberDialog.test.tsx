import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { InviteMemberDialog } from '../InviteMemberDialog'

describe('InviteMemberDialog', () => {
    const defaultProps = {
        open: true,
        onOpenChange: vi.fn(),
        onConfirm: vi.fn(),
        loading: false,
    }

    it('renders the dialog title when open', () => {
        render(<InviteMemberDialog {...defaultProps} />)
        expect(screen.getByText('Inviter un membre')).toBeInTheDocument()
    })

    it('renders email input field', () => {
        render(<InviteMemberDialog {...defaultProps} />)
        expect(screen.getByLabelText('Email')).toBeInTheDocument()
    })

    it('renders optional first name and last name fields', () => {
        render(<InviteMemberDialog {...defaultProps} />)
        expect(screen.getByLabelText('Prénom')).toBeInTheDocument()
        expect(screen.getByLabelText('Nom')).toBeInTheDocument()
    })

    it('renders cancel and send buttons', () => {
        render(<InviteMemberDialog {...defaultProps} />)
        expect(screen.getByText('Annuler')).toBeInTheDocument()
        expect(screen.getByText('Envoyer')).toBeInTheDocument()
    })

    it('does not render content when dialog is closed', () => {
        render(<InviteMemberDialog {...defaultProps} open={false} />)
        expect(screen.queryByText('Inviter un membre')).not.toBeInTheDocument()
    })

    it('shows loading text when loading', () => {
        render(<InviteMemberDialog {...defaultProps} loading={true} />)
        expect(screen.getByText('Envoi...')).toBeInTheDocument()
    })

    it('displays description about invitation email', () => {
        render(<InviteMemberDialog {...defaultProps} />)
        expect(screen.getByText(/email d'invitation/)).toBeInTheDocument()
    })
})
