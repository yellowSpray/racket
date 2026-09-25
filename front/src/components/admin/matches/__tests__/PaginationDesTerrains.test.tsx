import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { PaginationDesTerrains } from '../PaginationDesTerrains'

function setup(over: Partial<React.ComponentProps<typeof PaginationDesTerrains>> = {}) {
  const props = { page: 0, parPage: 3, total: 7, onChange: vi.fn(), ...over }
  render(<PaginationDesTerrains {...props} />)
  return props
}

describe('PaginationDesTerrains', () => {
  it('dit ou l\'on est dans la liste des terrains', () => {
    setup()
    expect(screen.getByText('Terrains 1 à 3 sur 7')).toBeInTheDocument()
  })

  it('avance et recule d\'une page', () => {
    const props = setup({ page: 1 })
    fireEvent.click(screen.getByRole('button', { name: 'Terrains suivants' }))
    fireEvent.click(screen.getByRole('button', { name: 'Terrains precedents' }))
    expect(props.onChange).toHaveBeenNthCalledWith(1, 2)
    expect(props.onChange).toHaveBeenNthCalledWith(2, 0)
  })

  it('desactive la fleche au bout', () => {
    setup({ page: 0 })
    expect(screen.getByRole('button', { name: 'Terrains precedents' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Terrains suivants' })).not.toBeDisabled()
  })

  it('desactive la fleche sur la derniere page, meme incomplete', () => {
    /* Sept terrains par trois : la page 2 ne porte que le septieme. */
    setup({ page: 2 })
    expect(screen.getByRole('button', { name: 'Terrains suivants' })).toBeDisabled()
  })

  /*
   * Elle n'existe que lorsqu'un terrain ne tient pas : un club a trois
   * terrains sur un ecran de bureau ne doit pas voir deux fleches mortes.
   */
  it('n\'affiche rien quand tous les terrains tiennent', () => {
    const { container } = render(
      <PaginationDesTerrains page={0} parPage={3} total={3} onChange={vi.fn()} />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('n\'utilise pas de tiret cadratin', () => {
    setup()
    expect(document.body.textContent).not.toContain('—')
  })
})
