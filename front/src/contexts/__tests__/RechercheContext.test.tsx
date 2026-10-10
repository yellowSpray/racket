import { act, render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MemoryRouter, Routes, Route, useLocation, useNavigate } from 'react-router'
import { useRecherche, useRechercheDeLaPage } from '../RechercheContext'
import { RechercheProvider } from '../RechercheProvider'

/** Le champ du header, reduit a l'essentiel. */
function Champ() {
  const { recherche, setRecherche, lancer } = useRecherche()
  return (
    <input
      aria-label="recherche"
      value={recherche}
      onChange={e => setRecherche(e.target.value)}
      onKeyDown={e => { if (e.key === 'Enter') lancer() }}
    />
  )
}

function Emplacement() {
  const { pathname } = useLocation()
  return <div data-testid="chemin">{pathname}</div>
}

function PageQuiCherche() {
  const recherche = useRechercheDeLaPage()
  return <div data-testid="lu">{recherche}</div>
}

function Lien({ vers }: { vers: string }) {
  const navigate = useNavigate()
  return <button onClick={() => navigate(vers)}>aller {vers}</button>
}

function monter(depart: string) {
  return render(
    <MemoryRouter initialEntries={[depart]}>
      <RechercheProvider>
        <Champ />
        <Emplacement />
        <Lien vers="/admin/matches" />
        <Routes>
          <Route path="/admin/players" element={<PageQuiCherche />} />
          <Route path="/admin/draws" element={<PageQuiCherche />} />
          <Route path="*" element={null} />
        </Routes>
      </RechercheProvider>
    </MemoryRouter>,
  )
}

const champ = () => screen.getByLabelText('recherche') as HTMLInputElement
const taper = (v: string) => fireEvent.change(champ(), { target: { value: v } })
const entree = () => fireEvent.keyDown(champ(), { key: 'Enter' })

describe('RechercheContext', () => {
  it('donne a la page ce que l\'on tape dans le header', () => {
    monter('/admin/draws')
    taper('alice')
    expect(screen.getByTestId('lu').textContent).toBe('alice')
  })

  /*
   * Une recherche oubliee filtrerait la page suivante en silence : on la vide
   * a chaque changement de page.
   */
  it('vide la recherche quand on change de page', () => {
    monter('/admin/draws')
    taper('alice')
    fireEvent.click(screen.getByText('aller /admin/matches'))
    expect(champ().value).toBe('')
  })

  it('ne fait rien a Entree sur une page qui cherche deja', () => {
    monter('/admin/draws')
    taper('alice')
    entree()
    expect(screen.getByTestId('chemin').textContent).toBe('/admin/draws')
  })

  it('emmene vers les joueurs, recherche comprise, depuis une page admin qui ne cherche pas', () => {
    monter('/admin')
    taper('alice')
    act(() => entree())
    expect(screen.getByTestId('chemin').textContent).toBe('/admin/players')
    expect(screen.getByTestId('lu').textContent).toBe('alice')
    expect(champ().value).toBe('alice')
  })

  it('ne part pas avec une recherche vide', () => {
    monter('/admin')
    entree()
    expect(screen.getByTestId('chemin').textContent).toBe('/admin')
  })

  it('reste sur place cote joueur', () => {
    monter('/user')
    taper('alice')
    entree()
    expect(screen.getByTestId('chemin').textContent).toBe('/user')
  })

  it('fonctionne sans fournisseur, en ne faisant rien', () => {
    render(<MemoryRouter><Champ /><PageQuiCherche /></MemoryRouter>)
    taper('x')
    expect(screen.getByTestId('lu').textContent).toBe('')
  })
})
