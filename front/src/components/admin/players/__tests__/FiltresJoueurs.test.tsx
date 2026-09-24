import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { FiltresJoueurs } from '../FiltresJoueurs'
import type { PlayerType } from '@/types/player'

function joueur(p: Partial<PlayerType>): PlayerType {
    return {
        id: 'j', first_name: 'Jean', last_name: 'Dupont', full_name: 'Jean Dupont',
        email: '', phone: '', arrival: '', departure: '', unavailable: [],
        status: [], payments: [], power_ranking: 0, box: '', ...p,
    } as PlayerType
}

const joueurs = [
    joueur({ id: 'a', status: ['active', 'member'] }),
    joueur({ id: 'b', status: ['inactive', 'member'], payment_status: 'unpaid' }),
    joueur({ id: 'c', status: ['active', 'visitor'] }),
]

function poser(valeur: Parameters<typeof FiltresJoueurs>[0]['valeur'] = 'all') {
    const onChange = vi.fn()
    const rendu = render(<FiltresJoueurs joueurs={joueurs} valeur={valeur} onChange={onChange} />)
    return { ...rendu, onChange }
}

const pastilles = () => [...document.querySelectorAll('[data-filtres-joueurs] button')]

/*
 * Une liste deroulante cache ses options et ne dit pas combien de joueurs
 * chacune rendrait : il fallait l'ouvrir, choisir, lire le compte, et
 * recommencer pour comparer. Six pastilles portent leur compte, donc la
 * repartition du club se lit d'un coup d'oeil sans rien toucher.
 */
describe('FiltresJoueurs', () => {
    it('pose une pastille par filtre, chacune avec son compte', () => {
        poser()
        expect(pastilles().map(b => b.textContent)).toEqual([
            'Tous3', 'Actifs2', 'Inactifs1', 'Membres2', 'Visiteurs1', 'Impayés1',
        ])
    })

    it('marque le filtre courant et lui seul', () => {
        poser('active')
        const presses = pastilles().filter(b => b.getAttribute('aria-pressed') === 'true')
        expect(presses).toHaveLength(1)
        expect(presses[0].textContent).toBe('Actifs2')
    })

    /*
     * Le vert de la marque est la couleur des actions, pas celle de l'etat. Le
     * noir plein a ete essaye et ecarte : il consommait un contraste maximal
     * pour une information qui n'est ni une alerte ni une action. Reste le gris
     * de l'entree courante du menu, avec le demi-gras en second indice.
     */
    it('dit le filtre courant par le gris du menu, ni marque ni noir plein', () => {
        poser('active')
        const courante = pastilles().find(b => b.getAttribute('aria-pressed') === 'true')!
        expect(courante.className).toContain('bg-muted')
        expect(courante.className).toContain('font-semibold')
        expect(courante.className).not.toContain('bg-primary')
        expect(courante.className).not.toContain('bg-foreground')
    })

    // Les six gardent la meme silhouette : seul le fond change d'une a l'autre.
    it('garde le contour sur les six, courante comprise', () => {
        poser('active')
        for (const pastille of pastilles()) {
            expect(pastille.className).toContain('border-border')
        }
    })

    it('annonce le filtre choisi', () => {
        const { onChange } = poser()
        fireEvent.click(screen.getByRole('button', { name: /Impayés/ }))
        expect(onChange).toHaveBeenCalledWith('unpaid')
    })

    /*
     * JUSQU'A 1024 PX INCLUS, LA LISTE DEROULANTE REVIENT. Six pastilles font
     * 500 px a elles seules : elles passent sur une seconde rangee et
     * repoussent les actions d'autant. A 1024 la barre laterale se deploie et
     * ne laisse que 753 px de colonne, d'ou ce seuil et non le `lg` de
     * Tailwind, qui se declenche a 1024 pile.
     *
     * Les deux sont rendus, le CSS choisit lequel s'affiche.
     */
    it('offre un selecteur a la place des pastilles jusqu a 1024', () => {
        const { container } = poser()
        const liste = container.querySelector('[data-filtre-joueurs-liste]') as HTMLSelectElement

        expect(liste.className).toContain('min-[1025px]:hidden')
        expect(container.querySelector('[data-filtres-joueurs]')!.className).toContain('hidden')
        expect(container.querySelector('[data-filtres-joueurs]')!.className).toContain('min-[1025px]:flex')

        /*
         * `leading-8` : un `select` natif d'une hauteur imposee colle son texte
         * en haut de sa boite au lieu de le centrer. Une hauteur de ligne egale
         * a la hauteur du controle le recentre, et c'est la seule facon de le
         * faire sans renoncer au controle natif.
         */
        expect(liste.className).toContain('leading-8')

        // Il garde les comptes, le seul avantage des pastilles qu'on pouvait sauver.
        expect([...within(liste).getAllByRole('option')].map(o => o.textContent)).toEqual([
            'Tous (3)', 'Actifs (2)', 'Inactifs (1)', 'Membres (2)', 'Visiteurs (1)', 'Impayés (1)',
        ])
    })

    it('annonce aussi le filtre choisi depuis le selecteur', () => {
        const { container, onChange } = poser()
        const liste = container.querySelector('[data-filtre-joueurs-liste]') as HTMLSelectElement
        fireEvent.change(liste, { target: { value: 'visitor' } })
        expect(onChange).toHaveBeenCalledWith('visitor')
    })
})
