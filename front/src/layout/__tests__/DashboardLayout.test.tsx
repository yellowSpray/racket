import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import DashboardLayout from '../DashboardLayout'

describe('DashboardLayout', () => {
    /*
     * La coque tenait dans une grille de 24 colonnes partagee avec le header.
     * A 375 px, les vingt-trois gouttieres de 16 px faisaient a elles seules
     * 368 px pour 311 px utiles : toutes les colonnes tombaient a zero et la
     * barre laterale disparaissait sous son propre contenu. Une largeur en
     * pixels ne peut pas se faire ecraser de cette facon.
     */
    it('donne a la barre laterale une largeur fixe, pas une fraction de grille', () => {
        const { container } = render(
            <DashboardLayout sidebar={<nav>menu</nav>}>contenu</DashboardLayout>,
        )
        const aside = container.querySelector('aside')
        expect(aside).not.toBeNull()
        expect(aside!.className).toContain('w-[207px]')
        expect(aside!.className).toContain('shrink-0')
        expect(container.querySelector('.grid-cols-24')).toBeNull()
    })

    it('rend la barre laterale et le contenu', () => {
        render(<DashboardLayout sidebar={<nav>menu</nav>}>contenu</DashboardLayout>)
        expect(screen.getByText('menu')).toBeInTheDocument()
        expect(screen.getByText('contenu')).toBeInTheDocument()
    })

    it('se passe de barre laterale', () => {
        const { container } = render(<DashboardLayout>contenu</DashboardLayout>)
        expect(container.querySelector('aside')).toBeNull()
        expect(screen.getByText('contenu')).toBeInTheDocument()
    })

    /*
     * Le slot gauche du header accueillait bien plus qu'un titre : la recherche
     * des matchs, le filtre de statut des joueurs. Le nouveau header n'a plus
     * de place pour lui, il descend donc en tete de la colonne de contenu, la
     * ou la maquette pose « Dashboard ». Les pages n'ont rien a changer.
     */
    /*
     * La premiere entree du menu et le titre de la page doivent se lire sur la
     * meme ligne. Deux conditions : les deux colonnes demarrent au meme retrait
     * sous le header, et la bande du titre fait la meme hauteur qu'une entree
     * de menu, 34 px, pour que les deux textes se centrent au meme endroit.
     * `min-h` et non `h` : plusieurs pages posent aussi une recherche ou un
     * filtre dans cette bande, plus hauts qu'un titre seul.
     */
    it('pose la premiere entree du menu et le titre de page sur la meme ligne', () => {
        const { container } = render(
            <DashboardLayout sidebar={<nav>menu</nav>}>contenu</DashboardLayout>,
        )
        expect(container.querySelector('aside')!.className).toContain('pt-6')
        expect(container.querySelector('section')!.className).toContain('py-6')
        expect(container.querySelector('[data-page-heading]')!.className).toContain('min-h-[34px]')
    })

    it('reserve la tete de la colonne de contenu au titre de page', () => {
        const { container } = render(
            <DashboardLayout sidebar={<nav>menu</nav>}>contenu</DashboardLayout>,
        )
        const section = container.querySelector('section')
        const titre = container.querySelector('[data-page-heading]')
        expect(titre).not.toBeNull()
        expect(section!.firstElementChild).toBe(titre)
    })
})
