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

    /*
     * Les lignes alternent un fond très pâle. Sur une liste de noms tous de
     * longueurs différentes, sans repère horizontal, l'œil saute d'une ligne à
     * l'autre en allant chercher le badge à droite. La bande le retient.
     */
    it('alterne le fond des lignes', () => {
        mockGrouped = [1, 2, 3, 4].map(n =>
            makeGrouped({ profileId: `p${n}`, firstName: `Joueur${n}`, rounds: rounds(4), count: 1 }),
        )

        const { container } = render(<UnpaidPaymentsCard clubId="c1" />)
        const lignes = [...container.querySelectorAll('[data-ligne-impaye]')]

        expect(lignes).toHaveLength(4)
        expect(lignes[0].className).toContain('bg-muted/40')
        expect(lignes[1].className).not.toContain('bg-muted/40')
        expect(lignes[2].className).toContain('bg-muted/40')
        expect(lignes[3].className).not.toContain('bg-muted/40')
    })

    /*
     * 24 px au-dessus de l'en-tete et 24 sous la derniere ligne, ce que `Card`
     * donne deja, et 4 seulement entre l'en-tete et la premiere ligne :
     * l'en-tete appartient a la liste, la carte garde ses marges.
     */
    it('colle l\'en-tete a la liste sans coller la carte', () => {
        mockGrouped = [makeGrouped({ profileId: 'p1' })]
        const { container } = render(<UnpaidPaymentsCard clubId="c1" />)

        expect(container.querySelector('[data-slot="card-content"]')!.className)
            .toContain('pt-1')
        // Pas de retrait bas impose : la carte garde son `py-6`.
        expect(container.querySelector('[data-slot="card"]')!.className)
            .not.toMatch(/\bpb-\d/)
    })

    /*
     * Les bandes tiennent entre les deux verticales de l'en-tete, celle de
     * l'icone du titre et celle du bouton : `CardContent` porte le meme retrait
     * que l'en-tete. Elles debordaient auparavant de 18 px de chaque cote.
     *
     * Le texte, lui, respire a l'interieur de la bande. Il ne tombe donc pas
     * sur les verticales, et c'est voulu : la bande encadre au lieu de serrer.
     */
    it('tient les bandes entre les deux verticales de l\'en-tete', () => {
        mockGrouped = [makeGrouped({ profileId: 'p1' })]
        const { container } = render(<UnpaidPaymentsCard clubId="c1" />)

        expect(container.querySelector('[data-slot="card-header"]')!.className).toContain('px-6')
        expect(container.querySelector('[data-slot="card-content"]')!.className).toContain('px-6')
        expect(container.querySelector('[data-ligne-impaye]')!.className).toContain('px-4')
    })

    /*
     * Deux rouges, deux rôles. Le compte de l'en-tête est un rouge plein :
     * c'est l'alerte. Les badges de série sont un rouge pâle : ils qualifient,
     * ils n'alertent pas. Huit pastilles pleines dans une colonne feraient
     * crier la carte entière et le compte ne se verrait plus.
     */
    it('distingue le compte de l\'en-tete des badges de serie', () => {
        mockGrouped = [makeGrouped({ profileId: 'p1', rounds: rounds(4), count: 1 })]

        render(<UnpaidPaymentsCard clubId="c1" />)

        expect(screen.getByText('1').className).toContain('bg-red-500')
        expect(screen.getByText('Série 4').className).toContain('bg-red-100')
    })

    describe('relance', () => {
        it('propose de relancer quand il reste des impayes', () => {
            mockGrouped = [makeGrouped({ profileId: 'p1' })]
            render(<UnpaidPaymentsCard clubId="c1" />)
            expect(screen.getByRole('button', { name: 'Relancer' })).toBeInTheDocument()
        })

        // Rien à relancer, donc pas de bouton : il ne resterait qu'à décevoir.
        it('n\'offre rien a relancer quand tout est paye', () => {
            render(<UnpaidPaymentsCard clubId="c1" />)
            expect(screen.queryByRole('button', { name: 'Relancer' })).not.toBeInTheDocument()
        })

        /*
         * Une balise nue habillee a la main derive du reste : ni la meme
         * hauteur, ni le meme rayon, ni le meme survol que les autres boutons
         * discrets du produit. Le bouton du systeme les tient ensemble.
         */
        it('utilise le bouton du systeme, pas une balise habillee a la main', () => {
            mockGrouped = [makeGrouped({ profileId: 'p1' })]
            render(<UnpaidPaymentsCard clubId="c1" />)
            expect(screen.getByRole('button', { name: 'Relancer' }))
                .toHaveAttribute('data-slot', 'button')
        })

        /*
         * Le bouton vit sur la meme ligne que le titre, et non dans
         * `CardAction`. Cette zone couvre les deux rangees de la grille de
         * l'en-tete, et un bouton de 32 px y forcait lui-meme une hauteur de
         * 32 : il se centrait donc sur une zone qu'il venait de creer, six
         * pixels sous le titre. Une seule rangee flex regle la question.
         */
        it('pose le bouton sur la ligne du titre', () => {
            mockGrouped = [makeGrouped({ profileId: 'p1' })]
            const { container } = render(<UnpaidPaymentsCard clubId="c1" />)
            const ligne = container.querySelector('[data-slot="card-title"]')!
            expect(ligne.className).toContain('items-center')
            expect(ligne.contains(screen.getByRole('button', { name: 'Relancer' }))).toBe(true)
            expect(container.querySelector('[data-slot="card-action"]')).toBeNull()
        })

        it('remonte la relance a l\'appelant', () => {
            mockGrouped = [makeGrouped({ profileId: 'p1' })]
            const onRelancer = vi.fn()
            render(<UnpaidPaymentsCard clubId="c1" onRelancer={onRelancer} />)

            screen.getByRole('button', { name: 'Relancer' }).click()

            expect(onRelancer).toHaveBeenCalled()
        })
    })

    it('affiche +N au dela de deux series impayees', () => {
        mockGrouped = [
            makeGrouped({ profileId: 'p1', rounds: rounds(3, 4, 5), count: 3 }),
        ]

        render(<UnpaidPaymentsCard clubId="c1" />)

        expect(screen.getByText('+1')).toBeInTheDocument()
    })
})
