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
        expect(aside!.className).toContain('lg:w-[207px]')
        expect(aside!.className).toContain('shrink-0')
        expect(container.querySelector('.grid-cols-24')).toBeNull()
    })

    /*
     * Deployee, la barre respire a gauche comme le contenu : 32 px, le meme `8`
     * de Tailwind que le `px-8` de la colonne de droite. Ses pastilles collaient
     * au bord de la fenetre a 10 px quand tout le reste etait a 32.
     *
     * A droite elle garde ses 10 px : c'est un retrait interieur, contre son
     * propre filet, pas une gouttiere entre deux blocs.
     */
    it('pose le meme retrait a gauche que la colonne de contenu', () => {
        const { container } = render(
            <DashboardLayout sidebar={<nav>menu</nav>}>contenu</DashboardLayout>,
        )
        const aside = container.querySelector('aside')!
        expect(aside.className).toContain('lg:pl-8')
        expect(aside.className).toContain('lg:pr-2.5')
    })

    /*
     * LA BARRE SE REPLIE SUR SES PICTOGRAMMES sous 1024. Elle fait 207 px fixes,
     * soit 55 % d'un telephone de 375 : a cette largeur elle ne peut pas rester
     * une colonne. Repliee elle fait 54, la pastille carree de 34 px d'une
     * entree plus ses deux retraits de 10.
     *
     * Ce que ca rend au contenu se mesure : un tableau de box demande 519 px
     * plus les deux gouttieres de 32, soit 583. Avec la barre deployee il faut
     * 791 px de fenetre pour qu'il tienne, avec le rail 638.
     *
     * Trois choses sont calees sur cette largeur et doivent bouger ensemble : la
     * barre, le bloc de marque du header qui occupe exactement sa colonne, et le
     * fil d'Ariane qui demarre juste apres. D'ou la source unique, `layout/rail`.
     */
    it('replie la barre laterale sur ses pictogrammes', () => {
        const { container } = render(
            <DashboardLayout sidebar={<nav>menu</nav>}>contenu</DashboardLayout>,
        )
        const aside = container.querySelector('aside')!
        expect(aside.className).toContain('w-[54px]')
        expect(aside.className).toContain('lg:w-[207px]')
        // Repliee, le retrait de 32 px n'a plus lieu d'etre : symetrique a 10.
        expect(aside.className).toContain('px-2.5')
    })

    /*
     * Les deux colonnes s'arretent sur la meme horizontale : `Quitter`, pousse
     * en bas de la barre par son `mt-auto`, tombe donc sur le bas des cartes.
     * La barre finissait 16 px plus bas, et ce decalage se voyait d'autant plus
     * que les deux colonnes portent un fond different.
     */
    it('arrete la barre laterale sur le bas du contenu', () => {
        const { container } = render(
            <DashboardLayout sidebar={<nav>menu</nav>}>contenu</DashboardLayout>,
        )
        const aside = container.querySelector('aside')!
        const contenu = container.querySelector('section')!

        expect(aside.className).toContain('pb-6')
        // A partir de 640 la barre d'onglets n'est plus la : les deux colonnes
        // s'arretent alors sur la meme horizontale. En dessous, le contenu
        // reserve en plus la hauteur des onglets, qui sont `fixed`.
        expect(contenu.className).toContain('sm:pb-6')
        expect(contenu.className).toContain('env(safe-area-inset-bottom)')
    })

    /*
     * Le contenu a une largeur definie et se centre, les marges absorbent le
     * reste. 2200 px, soit quatre tableaux de box de 532 avec leurs gouttieres :
     * un tableau mesure 519 au minimum, somme de ses planchers de colonnes, et
     * ne se negocie pas. C'est donc lui qui fixe le pas de l'application.
     */
    it('borne et centre la colonne de contenu', () => {
        const { container } = render(
            <DashboardLayout sidebar={<nav>menu</nav>}>contenu</DashboardLayout>,
        )
        const borne = container.querySelector('[data-contenu-borne]')!
        expect(borne.className).toContain('max-w-[2200px]')
        expect(borne.className).toContain('mx-auto')
        // Le titre de page vit dedans, sinon il ne suivrait pas le centrage.
        expect(borne.querySelector('[data-page-heading]')).not.toBeNull()
    })

    /*
     * SOUS 640 PX LA BARRE QUITTE L'ECRAN. Meme repliee a 54 elle vole de la
     * largeur, qui est la dimension rare sur un telephone alors que la hauteur
     * ne l'est pas. La navigation descend en onglets au bas de l'ecran, ou le
     * pouce l'atteint.
     */
    it('range la barre laterale et sort les onglets sur telephone', () => {
        const { container } = render(
            <DashboardLayout sidebar={<nav>menu</nav>} onglets={<nav>onglets</nav>}>
                contenu
            </DashboardLayout>,
        )
        const aside = container.querySelector('aside')!
        expect(aside.className).toContain('hidden')
        expect(aside.className).toContain('sm:flex')
        expect(screen.getByText('onglets')).toBeInTheDocument()
        // Hors de l'`aside` : un element `fixed` dans un parent masque ne
        // s'affiche pas.
        expect(aside.contains(screen.getByText('onglets'))).toBe(false)
    })

    /*
     * Les gouttieres descendent a 16 px sur telephone. A 32 elles coutaient 64
     * des 375 disponibles, et le fil d'Ariane a besoin de ses 336. La barre
     * laterale ayant quitte l'ecran, la colonne de gauche ne reclame plus rien.
     */
    it('resserre les gouttieres sur telephone', () => {
        const { container } = render(<DashboardLayout>contenu</DashboardLayout>)
        const contenu = container.querySelector('section')!
        expect(contenu.className).toContain('px-4')
        expect(contenu.className).toContain('sm:px-8')
    })

    /*
     * La bande du titre laisse passer ses actions a la ligne quand elles ne
     * tiennent plus : les trois boutons des tableaux font 235 px compactes,
     * plus que la colonne d'un ecran de 320 une fois le titre servi.
     *
     * `shrink-0` va avec : cette bande est un element d'une colonne flex bornee
     * en hauteur, donc sans lui elle reste ecrasee a ses 34 px pendant que sa
     * seconde ligne s'affiche par-dessus le contenu. C'est exactement ce qui
     * s'est passe, et seule la mesure l'a montre.
     */
    it('laisse les actions de page passer a la ligne sans se faire ecraser', () => {
        const { container } = render(<DashboardLayout>contenu</DashboardLayout>)
        const titre = container.querySelector('[data-page-heading]')!
        expect(titre.className).toContain('flex-wrap')
        expect(titre.className).toContain('shrink-0')
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
        expect(container.querySelector('section')!.className).toContain('pt-6')
        expect(container.querySelector('[data-page-heading]')!.className).toContain('min-h-[34px]')
    })

    it('reserve la tete de la colonne de contenu au titre de page', () => {
        const { container } = render(
            <DashboardLayout sidebar={<nav>menu</nav>}>contenu</DashboardLayout>,
        )
        // En tete de la colonne bornee, et non de la `section` : le titre doit
        // suivre le centrage du contenu, pas rester colle au bord.
        const borne = container.querySelector('[data-contenu-borne]')
        const titre = container.querySelector('[data-page-heading]')
        expect(titre).not.toBeNull()
        expect(borne!.firstElementChild).toBe(titre)
    })
})
