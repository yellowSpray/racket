import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ActionsDesTableaux } from '../ActionsDesTableaux'

function setup(over: Partial<React.ComponentProps<typeof ActionsDesTableaux>> = {}) {
  const props = {
    displayMode: 'score' as const,
    onToggleDisplay: vi.fn(),
    onEmbed: vi.fn(),
    onExportPdf: vi.fn(),
    peutExporter: true,
    ...over,
  }
  render(<ActionsDesTableaux {...props} />)
  return props
}

function boutons() {
  return screen.getAllByRole('button')
}

describe('ActionsDesTableaux', () => {
  it('offre les trois actions', () => {
    setup()
    expect(screen.getByRole('button', { name: 'Points' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Intégrer' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'PDF' })).toBeInTheDocument()
  })

  it('nomme le bouton d\'affichage par ce qu\'il fait', () => {
    setup({ displayMode: 'points' })
    expect(screen.getByRole('button', { name: 'Scores' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Points' })).not.toBeInTheDocument()
  })

  it('bascule l\'affichage, ouvre l\'integration, exporte', () => {
    const props = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Points' }))
    fireEvent.click(screen.getByRole('button', { name: 'Intégrer' }))
    fireEvent.click(screen.getByRole('button', { name: 'PDF' }))
    expect(props.onToggleDisplay).toHaveBeenCalledOnce()
    expect(props.onEmbed).toHaveBeenCalledOnce()
    expect(props.onExportPdf).toHaveBeenCalledOnce()
  })

  it('n\'offre pas le PDF sans tableau a exporter', () => {
    setup({ peutExporter: false })
    expect(screen.queryByRole('button', { name: 'PDF' })).not.toBeInTheDocument()
  })

  /*
   * Sur telephone les libelles poussaient les boutons sur une seconde ligne,
   * sous le titre. Pictogrammes seuls, ils tiennent sur la ligne du titre. Le
   * libelle reste pour un lecteur d'ecran, et en infobulle.
   */
  describe('sur telephone', () => {
    it('ne montre que le pictogramme', () => {
      setup()
      for (const b of boutons()) {
        const libelle = b.querySelector('[data-libelle]')!
        expect(libelle.className).toContain('sr-only')
        expect(libelle.className).toContain('sm:not-sr-only')
      }
    })

    it('fait des boutons carres de 32 px, la hauteur des pastilles du header', () => {
      setup()
      for (const b of boutons()) {
        expect(b.className).toContain('size-8')
        expect(b.className).toContain('sm:w-auto')
      }
    })

    it('garde le libelle en infobulle', () => {
      setup()
      expect(screen.getByRole('button', { name: 'Points' })).toHaveAttribute('title', 'Afficher les points')
      expect(screen.getByRole('button', { name: 'Intégrer' })).toHaveAttribute('title', 'Intégrer les tableaux sur un site')
      expect(screen.getByRole('button', { name: 'PDF' })).toHaveAttribute('title', 'Télécharger les tableaux en PDF')
    })

    /*
     * Pictogramme seul, « Points » et « Scores » ne se distinguent plus que
     * par lui. Les deux etats doivent donc porter deux pictogrammes differents.
     */
    it('change de pictogramme avec l\'etat', () => {
      setup({ displayMode: 'score' })
      const avant = screen.getByRole('button', { name: 'Points' }).querySelector('svg')!.innerHTML
      render(<ActionsDesTableaux displayMode="points" onToggleDisplay={vi.fn()} onEmbed={vi.fn()} onExportPdf={vi.fn()} peutExporter />)
      const apres = screen.getByRole('button', { name: 'Scores' }).querySelector('svg')!.innerHTML
      expect(apres).not.toBe(avant)
    })
  })

  it('n\'utilise pas de tiret cadratin', () => {
    setup()
    expect(document.body.textContent).not.toContain('—')
  })
})
