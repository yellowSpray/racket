import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ActionsDesMatchs } from '../ActionsDesMatchs'

function setup(over: Partial<React.ComponentProps<typeof ActionsDesMatchs>> = {}) {
  const props = {
    vue: 'grid' as const,
    onBasculerVue: vi.fn(),
    modeEdition: false,
    onModifier: vi.fn(),
    onAnnuler: vi.fn(),
    onEnregistrer: vi.fn(),
    peutModifier: true,
    ...over,
  }
  render(<ActionsDesMatchs {...props} />)
  return props
}

function boutons() {
  return screen.getAllByRole('button')
}

describe('ActionsDesMatchs', () => {
  it('offre la bascule de vue et la modification', () => {
    setup()
    expect(screen.getByRole('button', { name: 'Liste' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Modifier' })).toBeInTheDocument()
    expect(boutons()).toHaveLength(2)
  })

  it('nomme la bascule de vue par ce qu\'elle fait', () => {
    setup({ vue: 'list' })
    expect(screen.getByRole('button', { name: 'Grille' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Liste' })).not.toBeInTheDocument()
  })

  it('bascule la vue et entre en modification', () => {
    const props = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Liste' }))
    fireEvent.click(screen.getByRole('button', { name: 'Modifier' }))
    expect(props.onBasculerVue).toHaveBeenCalledOnce()
    expect(props.onModifier).toHaveBeenCalledOnce()
  })

  /*
   * Sans un seul match, il n'y a ni vue a basculer ni score a saisir. La ligne
   * de titre ne garde alors que le titre, et non deux boutons qui ne feraient
   * rien.
   */
  it('n\'offre rien sans match', () => {
    setup({ peutModifier: false })
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })

  describe('en mode edition', () => {
    it('remplace Modifier par Annuler et Enregistrer', () => {
      setup({ modeEdition: true })
      expect(screen.queryByRole('button', { name: 'Modifier' })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Annuler' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeInTheDocument()
    })

    /*
     * La bascule de vue reste : la grille et la liste se saisissent toutes les
     * deux, et changer d'avis en cours de saisie ne doit pas obliger a sortir
     * du mode.
     */
    it('garde la bascule de vue', () => {
      setup({ modeEdition: true })
      expect(screen.getByRole('button', { name: 'Liste' })).toBeInTheDocument()
    })

    it('annule et enregistre', () => {
      const props = setup({ modeEdition: true })
      fireEvent.click(screen.getByRole('button', { name: 'Annuler' }))
      fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
      expect(props.onAnnuler).toHaveBeenCalledOnce()
      expect(props.onEnregistrer).toHaveBeenCalledOnce()
    })

    /*
     * Enregistrer est la seule action de la page qui ecrit. Elle porte donc le
     * vert de la marque, au survol comme les autres, jamais en fond plein au
     * repos.
     */
    it('reserve le vert a Enregistrer', () => {
      setup({ modeEdition: true })
      const enregistrer = screen.getByRole('button', { name: 'Enregistrer' })
      expect(enregistrer.className).toContain('hover:bg-primary')
      /* Le fond vert au repos serait une classe `bg-primary` a elle seule. */
      expect(enregistrer.className.split(/\s+/)).not.toContain('bg-primary')
      expect(screen.getByRole('button', { name: 'Annuler' }).className).not.toContain('hover:bg-primary')
    })
  })

  describe('sur telephone', () => {
    it('ne montre que le pictogramme', () => {
      setup({ modeEdition: true })
      for (const b of boutons()) {
        const libelle = b.querySelector('[data-libelle]')!
        expect(libelle.className).toContain('sr-only')
        expect(libelle.className).toContain('sm:not-sr-only')
      }
    })

    it('fait des boutons carres de 32 px, la hauteur des pastilles du header', () => {
      setup({ modeEdition: true })
      for (const b of boutons()) {
        expect(b.className).toContain('size-8')
        expect(b.className).toContain('sm:w-auto')
      }
    })

    it('garde le libelle en infobulle', () => {
      setup()
      expect(screen.getByRole('button', { name: 'Liste' })).toHaveAttribute('title', 'Afficher la liste')
      expect(screen.getByRole('button', { name: 'Modifier' })).toHaveAttribute('title', 'Saisir les scores')
    })

    /*
     * Pictogramme seul, les deux etats de la bascule ne se distinguent plus que
     * par lui.
     */
    it('change de pictogramme avec l\'etat de la vue', () => {
      setup({ vue: 'grid' })
      const avant = screen.getByRole('button', { name: 'Liste' }).querySelector('svg')!.innerHTML
      render(
        <ActionsDesMatchs
          vue="list"
          onBasculerVue={vi.fn()}
          modeEdition={false}
          onModifier={vi.fn()}
          onAnnuler={vi.fn()}
          onEnregistrer={vi.fn()}
          peutModifier
        />,
      )
      const apres = screen.getByRole('button', { name: 'Grille' }).querySelector('svg')!.innerHTML
      expect(apres).not.toBe(avant)
    })
  })

  it('n\'utilise pas de tiret cadratin', () => {
    setup({ modeEdition: true })
    expect(document.body.textContent).not.toContain('—')
  })
})
