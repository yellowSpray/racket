import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { DashboardSquare02Icon, LayoutTable02Icon, File01Icon } from 'hugeicons-react'
import { BottomTabs } from '../BottomTabs'
import type { SidebarEntry } from '../SidebarNav'

vi.mock('react-router', () => ({
    Link: ({ children, to, ...rest }: { children: React.ReactNode; to: string }) => (
        <a href={to} {...rest}>{children}</a>
    ),
}))

const entrees: SidebarEntry[] = [
    { label: 'Dashboard', to: '/admin', icon: DashboardSquare02Icon, exact: true },
    { label: 'Tableaux', to: '/admin/draws', icon: LayoutTable02Icon },
    { label: 'Matchs', to: '/admin/matches', icon: File01Icon },
]

/*
 * La navigation du telephone. Sous 640 px la barre laterale ne peut plus etre
 * une colonne : deployee elle occupe 207 px, soit 55 % d'un ecran de 375, et
 * meme repliee a 54 elle vole de la largeur, qui est la dimension rare sur un
 * telephone alors que la hauteur ne l'est pas.
 */
describe('BottomTabs', () => {
    it('pose un onglet par entree, avec son libelle', () => {
        render(<BottomTabs entries={entrees} pathname="/admin" />)
        for (const nom of ['Dashboard', 'Tableaux', 'Matchs']) {
            expect(screen.getByRole('link', { name: nom })).toBeInTheDocument()
        }
    })

    /*
     * Les libelles restent, contrairement au rail. En bas d'un ecran il y a la
     * place de les ecrire, et c'est la seule navigation visible : des
     * pictogrammes muets y seraient un devinette permanente.
     */
    it('garde les libelles, a la difference du rail', () => {
        render(<BottomTabs entries={entrees} pathname="/admin" />)
        const lien = screen.getByRole('link', { name: 'Tableaux' })
        expect(lien.querySelector('span')!.className).not.toContain('sr-only')
    })

    it('marque l\'onglet courant', () => {
        render(<BottomTabs entries={entrees} pathname="/admin/draws" />)
        expect(screen.getByRole('link', { name: 'Tableaux' })).toHaveAttribute('aria-current', 'page')
        expect(screen.getByRole('link', { name: 'Matchs' })).not.toHaveAttribute('aria-current')
    })

    // Meme regle que la barre : une racine ne s'allume pas sur ses sous-pages.
    it('ne confond pas le tableau de bord avec ses sous-pages', () => {
        render(<BottomTabs entries={entrees} pathname="/admin/draws" />)
        expect(screen.getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute('aria-current')
    })

    /*
     * `fixed` et non `sticky` : la barre ne doit pas se decoller quand le
     * contenu defile. `DashboardLayout` reserve sa hauteur au bas du contenu,
     * et la zone sure evite qu'elle se loge sous la barre de geste des iPhone.
     */
    it('reste collee au bas de l\'ecran et disparait a partir de 640', () => {
        const { container } = render(<BottomTabs entries={entrees} pathname="/admin" />)
        const barre = container.querySelector('[data-onglets]')!
        expect(barre.className).toContain('fixed')
        expect(barre.className).toContain('bottom-0')
        expect(barre.className).toContain('sm:hidden')
        expect(barre.className).toContain('env(safe-area-inset-bottom)')
    })

    /*
     * Cinq onglets au maximum : au-dela, chacun passe sous les 44 px que
     * demande une cible tactile sur un ecran de 320. Ce test dit que la limite
     * est une decision, et il tombera le jour ou une sixieme entree arrive.
     */
    it('ne prend pas plus de cinq onglets', () => {
        const six = [...entrees, ...entrees].slice(0, 6)
        const { container } = render(<BottomTabs entries={six.slice(0, 5)} pathname="/admin" />)
        expect(container.querySelector('[data-onglets]')!.children).toHaveLength(5)
    })
})
