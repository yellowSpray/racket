import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

const { mockSignUp } = vi.hoisted(() => ({ mockSignUp: vi.fn() }))

vi.mock('@/lib/supabaseClient', () => ({
    supabase: { auth: { signUp: mockSignUp } },
}))

vi.mock('@/hooks/useClub', () => ({
    useClubs: () => ({ clubs: [{ id: 'c1', club_name: 'Le Parc 1348' }], loadingClubs: false }),
}))

vi.mock('@/hooks/useErrorHandler', () => ({
    useErrorHandler: () => ({ handleError: vi.fn(), clearError: vi.fn(), getFieldError: () => null }),
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import Register from '../Register'

/* La seconde etape n'est dans le document qu'une fois ouverte. */
function allerALaSecondeEtape() {
    fireEvent.click(screen.getByText('Compte'))
}

describe('Register', () => {
    const toggle = vi.fn()
    beforeEach(() => vi.clearAllMocks())

    it('titre la page par un h1', () => {
        render(<Register toggle={toggle} />)
        expect(screen.getByRole('heading', { level: 1, name: 'Créer un compte' })).toBeInTheDocument()
    })

    it('bascule vers la connexion sans rien envoyer', () => {
        render(<Register toggle={toggle} />)
        const lien = screen.getByRole('button', { name: 'Se connecter' })
        expect(lien).toHaveAttribute('type', 'button')
        fireEvent.click(lien)
        expect(toggle).toHaveBeenCalledOnce()
        expect(mockSignUp).not.toHaveBeenCalled()
    })

    it('borne le formulaire a 400 px', () => {
        const { container } = render(<Register toggle={toggle} />)
        const carte = container.querySelector('[data-slot="card"]')!
        expect(carte.className).toContain('max-w-[400px]')
        expect(carte.className).not.toContain('w-1/2')
    })

    /*
     * Chaque champ dit ce qu'il attend : le telephone propose alors le prenom,
     * le nom et le numero de sa fiche de contact, et le gestionnaire de mots de
     * passe propose d'en generer un. `off` desactivait tout ca.
     */
    describe('le remplissage automatique', () => {
        it('reconnait l\'identite de la premiere etape', () => {
            render(<Register toggle={toggle} />)
            expect(screen.getByLabelText('Prénom')).toHaveAttribute('autocomplete', 'given-name')
            expect(screen.getByLabelText('Nom')).toHaveAttribute('autocomplete', 'family-name')
            expect(screen.getByLabelText('Téléphone')).toHaveAttribute('autocomplete', 'tel')
        })

        it('reconnait un compte neuf a la seconde etape', () => {
            render(<Register toggle={toggle} />)
            allerALaSecondeEtape()
            expect(screen.getByLabelText('Email')).toHaveAttribute('autocomplete', 'email')
            expect(screen.getByLabelText('Mot de passe')).toHaveAttribute('autocomplete', 'new-password')
            expect(screen.getByLabelText('Confirmer le mot de passe')).toHaveAttribute('autocomplete', 'new-password')
        })
    })

    describe('sous 1024 px', () => {
        it('donne aux champs une hauteur de doigt', () => {
            render(<Register toggle={toggle} />)
            for (const nom of ['Prénom', 'Nom', 'Téléphone']) {
                expect(screen.getByLabelText(nom).className).toContain('h-11')
                expect(screen.getByLabelText(nom).className).toContain('lg:h-9')
            }
            allerALaSecondeEtape()
            for (const nom of ['Email', 'Mot de passe', 'Confirmer le mot de passe']) {
                expect(screen.getByLabelText(nom).className).toContain('h-11')
            }
        })

        // Le menu des clubs faisait la largeur de son texte, pas celle des champs.
        it('etire le choix du club sur toute la colonne, a la meme hauteur', () => {
            const { container } = render(<Register toggle={toggle} />)
            const club = container.querySelector('#club-select')!
            expect(club.className).toContain('w-full')
            expect(club.className).toContain('data-[size=default]:h-11')
        })

        it('donne aux boutons une hauteur de doigt', () => {
            render(<Register toggle={toggle} />)
            expect(screen.getByRole('button', { name: 'Suivant' }).className).toContain('h-11')
            allerALaSecondeEtape()
            expect(screen.getByRole('button', { name: 'Retour' }).className).toContain('h-11')
            expect(screen.getByRole('button', { name: "S'inscrire" }).className).toContain('h-11')
        })
    })

    it('donne au lien de connexion une zone de toucher de 44 px sous 1024 px', () => {
        render(<Register toggle={toggle} />)
        expect(screen.getByRole('button', { name: 'Se connecter' }).className).toContain('max-lg:h-11')
    })
})
