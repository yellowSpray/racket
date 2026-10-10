import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ReactNode } from 'react'
import { AdminSettings } from '../AdminSettings'

vi.mock('@/contexts/HeaderSlotContext', () => ({
    useHeaderSlot: (content: ReactNode) => content,
    useHeaderActions: (content: ReactNode) => content,
}))

const recherche = { valeur: '' }
vi.mock('@/contexts/RechercheContext', () => ({
    useRechercheDeLaPage: () => recherche.valeur,
}))

const eventsProps = vi.fn()
vi.mock('@/components/admin/settings/EventsManager', () => ({
    EventsManager: (props: { recherche?: string }) => { eventsProps(props); return <div data-testid="events" /> },
}))
vi.mock('@/components/admin/settings/SettingsManager', () => ({ SettingsManager: () => null }))

const usersProps = vi.fn()
vi.mock('@/components/admin/settings/UsersManager', () => ({
    UsersManager: (props: { globalFilter?: string }) => { usersProps(props); return <div data-testid="users" /> },
}))

describe('AdminSettings', () => {
    beforeEach(() => {
        eventsProps.mockClear()
        usersProps.mockClear()
        recherche.valeur = ''
    })

    it('filtre les evenements avec la recherche du header', () => {
        recherche.valeur = 'mixed'
        render(<AdminSettings />)
        expect(eventsProps).toHaveBeenLastCalledWith(expect.objectContaining({ recherche: 'mixed' }))
    })

    /*
     * Les utilisateurs avaient leur propre champ, pose dans la ligne de titre :
     * deux recherches a l'ecran, dont une seule agissait. Le header s'en charge.
     */
    it('filtre les utilisateurs avec la recherche du header, sans second champ', () => {
        recherche.valeur = 'dupont'
        render(<AdminSettings />)
        fireEvent.mouseDown(screen.getByRole('tab', { name: 'Utilisateurs' }))
        expect(usersProps).toHaveBeenLastCalledWith(expect.objectContaining({ globalFilter: 'dupont' }))
        expect(screen.queryByPlaceholderText(/Rechercher par nom ou email/)).not.toBeInTheDocument()
    })
})
