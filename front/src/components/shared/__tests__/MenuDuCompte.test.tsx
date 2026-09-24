import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MenuDuCompte } from '../MenuDuCompte'

vi.mock('react-router', () => ({
  Link: ({ children, to, ...rest }: { children: React.ReactNode; to: string }) => (
    <a href={to} {...rest}>{children}</a>
  ),
}))

const signOut = vi.fn()

function profil(role: 'admin' | 'user' = 'admin') {
  return { id: '1', role, first_name: 'Jean', last_name: 'Dupont', avatar_url: null }
}

/*
 * Radix ouvre son menu au `pointerdown`, que jsdom ne sait pas simuler avec le
 * bon bouton. Le clavier, lui, passe : Entree sur le declencheur ouvre le menu,
 * exactement comme au doigt.
 */
function ouvrir() {
  const declencheur = screen.getByRole('button', { name: /menu du compte/i })
  fireEvent.keyDown(declencheur, { key: 'Enter' })
  return declencheur
}

describe('MenuDuCompte', () => {
  beforeEach(() => signOut.mockReset())

  it('est un bouton de 32 px, comme les autres pastilles du header', () => {
    render(<MenuDuCompte profile={profil()} onSignOut={signOut} />)
    const declencheur = screen.getByRole('button', { name: /menu du compte/i })
    expect(declencheur.className).toContain('size-8')
  })

  it('reste ferme tant qu\'on ne le touche pas', () => {
    render(<MenuDuCompte profile={profil()} onSignOut={signOut} />)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('offre le profil, les reglages et la deconnexion a un admin', () => {
    render(<MenuDuCompte profile={profil('admin')} onSignOut={signOut} />)
    ouvrir()
    expect(screen.getByRole('menuitem', { name: /mon profil/i })).toHaveAttribute('href', '/admin/profile')
    expect(screen.getByRole('menuitem', { name: /réglages/i })).toHaveAttribute('href', '/admin/settings')
    expect(screen.getByRole('menuitem', { name: /quitter/i })).toBeInTheDocument()
  })

  /*
   * La barre laterale du joueur n'a pas de reglages, le menu non plus : sur
   * telephone il remplace la barre, il n'en dit pas davantage qu'elle.
   */
  it('n\'offre pas de reglages a un joueur', () => {
    render(<MenuDuCompte profile={profil('user')} onSignOut={signOut} />)
    ouvrir()
    expect(screen.getByRole('menuitem', { name: /mon profil/i })).toHaveAttribute('href', '/user/profile')
    expect(screen.queryByRole('menuitem', { name: /réglages/i })).not.toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /quitter/i })).toBeInTheDocument()
  })

  it('rappelle qui est connecte en tete du menu', () => {
    render(<MenuDuCompte profile={profil()} onSignOut={signOut} />)
    ouvrir()
    expect(screen.getByRole('menu')).toHaveTextContent('Jean Dupont')
  })

  it('deconnecte au choix de Quitter', () => {
    render(<MenuDuCompte profile={profil()} onSignOut={signOut} />)
    ouvrir()
    fireEvent.click(screen.getByRole('menuitem', { name: /quitter/i }))
    expect(signOut).toHaveBeenCalledOnce()
  })

  // Le rouge de la barre laterale au survol de Quitter : un geste qui sort.
  it('dit la sortie avec le rouge de la barre laterale', () => {
    render(<MenuDuCompte profile={profil()} onSignOut={signOut} />)
    ouvrir()
    expect(screen.getByRole('menuitem', { name: /quitter/i })).toHaveAttribute('data-variant', 'destructive')
  })

  // Le `bg-accent` du menu par defaut est un blanc pose sur un blanc.
  it('dit le foyer avec le gris de survol de la barre laterale', () => {
    render(<MenuDuCompte profile={profil()} onSignOut={signOut} />)
    ouvrir()
    expect(screen.getByRole('menuitem', { name: /mon profil/i }).className).toContain('focus:bg-muted')
  })

  it('donne a chaque entree une hauteur de doigt', () => {
    render(<MenuDuCompte profile={profil()} onSignOut={signOut} />)
    ouvrir()
    for (const item of screen.getAllByRole('menuitem')) expect(item.className).toContain('h-10')
  })

  /*
   * Sans hauteur de ligne propre, les initiales heritaient de celle de leur
   * parent : 16.5 px dans le bouton du menu, 15.7 dans le lien. Leur encre
   * tombait un pixel trop haut dans le premier et pile au centre dans le
   * second. Une ligne de la hauteur du texte se centre partout pareil.
   */
  it('centre les initiales quelle que soit la ligne du parent', () => {
    render(<MenuDuCompte profile={profil()} onSignOut={signOut} />)
    expect(screen.getByText('JD').className).toContain('leading-none')
  })

  it('montre les initiales quand il n\'y a pas de photo', () => {
    render(<MenuDuCompte profile={profil()} onSignOut={signOut} />)
    expect(screen.getByText('JD')).toBeInTheDocument()
  })

  it('n\'utilise pas de tiret cadratin', () => {
    const { container } = render(<MenuDuCompte profile={profil()} onSignOut={signOut} />)
    ouvrir()
    expect(container.ownerDocument.body.textContent).not.toContain('—')
  })
})
