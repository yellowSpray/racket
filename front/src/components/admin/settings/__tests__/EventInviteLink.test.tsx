import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { EventInviteLink } from '../EventInviteLink'

const writeText = vi.fn(() => Promise.resolve())

describe('EventInviteLink', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        Object.assign(navigator, { clipboard: { writeText } })
    })

    it('ne s affiche pas sans lien', () => {
        // Un club ferme aux visiteurs n'a pas de lien a partager.
        const { container } = render(<EventInviteLink inviteUrl="" eventName="Mixed" />)

        expect(container).toBeEmptyDOMElement()
    })

    it('nomme l evenement auquel le lien appartient', () => {
        render(<EventInviteLink inviteUrl="https://ef.test/i/abc" eventName="Mixed" />)

        expect(screen.getByRole('button', { name: /Mixed/ })).toBeInTheDocument()
    })

    it('copie le lien et le confirme', async () => {
        render(<EventInviteLink inviteUrl="https://ef.test/i/abc" eventName="Mixed" />)

        fireEvent.click(screen.getByRole('button'))

        expect(writeText).toHaveBeenCalledWith('https://ef.test/i/abc')
        await waitFor(() => expect(screen.getByText('Copié')).toBeInTheDocument())
    })
})
