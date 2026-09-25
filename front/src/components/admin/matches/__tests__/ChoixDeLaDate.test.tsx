import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ChoixDeLaDate } from '../ChoixDeLaDate'

const DATES = ['2026-09-21', '2026-09-22', '2026-09-28']

function setup(over: Partial<React.ComponentProps<typeof ChoixDeLaDate>> = {}) {
  const props = { dates: DATES, valeur: '2026-09-22', onChange: vi.fn(), ...over }
  render(<ChoixDeLaDate {...props} />)
  return props
}

function liste() {
  return screen.getByRole('combobox', { name: 'Choisir la journee' }) as HTMLSelectElement
}

describe('ChoixDeLaDate', () => {
  /*
   * La date parait deux fois, sur la pastille fermee et dans la liste : c'est
   * le propre du montage en transparence. On verifie celle qu'on voit.
   */
  it('ecrit la journee courante', () => {
    setup()
    expect(document.querySelector('[data-choix-date] > span')).toHaveTextContent('mar. 22 sept.')
  })

  it('liste toutes les journees de jeu', () => {
    setup()
    const options = [...liste().options].map(o => o.value)
    expect(options).toEqual(DATES)
  })

  it('change de journee par la liste', () => {
    const props = setup()
    fireEvent.change(liste(), { target: { value: '2026-09-28' } })
    expect(props.onChange).toHaveBeenCalledWith('2026-09-28')
  })

  it('avance et recule d\'une journee', () => {
    const props = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Journee suivante' }))
    fireEvent.click(screen.getByRole('button', { name: 'Journee precedente' }))
    expect(props.onChange).toHaveBeenNthCalledWith(1, '2026-09-28')
    expect(props.onChange).toHaveBeenNthCalledWith(2, '2026-09-21')
  })

  /*
   * Une fleche qui boucle sur la premiere date ferait croire qu'il reste une
   * journee la ou il n'y en a plus.
   */
  it('desactive la fleche au bout', () => {
    setup({ valeur: '2026-09-21' })
    expect(screen.getByRole('button', { name: 'Journee precedente' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Journee suivante' })).not.toBeDisabled()
  })

  it('desactive les deux fleches sur une serie d\'une seule journee', () => {
    setup({ dates: ['2026-09-21'], valeur: '2026-09-21' })
    expect(screen.getByRole('button', { name: 'Journee precedente' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Journee suivante' })).toBeDisabled()
    expect(document.querySelector('[data-choix-date] > span')).toHaveTextContent('lun. 21 sept.')
  })

  it('n\'affiche rien sans journee de jeu', () => {
    const { container } = render(<ChoixDeLaDate dates={[]} valeur={null} onChange={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  /*
   * Un `select` natif pose en transparence sur la pastille, le montage du fil
   * d'Ariane : le systeme ouvre sa propre roulette sur telephone et le clavier
   * marche sans une ligne de code.
   */
  it('pose la liste en transparence sur la pastille', () => {
    setup()
    expect(liste().className).toContain('opacity-0')
    expect(liste().className).toContain('absolute')
  })

  it('n\'utilise pas de tiret cadratin', () => {
    setup()
    expect(document.body.textContent).not.toContain('—')
  })
})
