import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { DrawTable } from '../DrawTable'
import type { Group, GroupPlayer } from '@/types/draw'
import type { Match } from '@/types/match'
import type { ScoringRules } from '@/types/settings'

const defaultRules: ScoringRules = {
  id: 'r1',
  club_id: 'c1',
  score_points: [
    { score: '3-0', winner_points: 5, loser_points: 0 },
    { score: '3-1', winner_points: 4, loser_points: 1 },
    { score: '3-2', winner_points: 3, loser_points: 2 },

    { score: 'ABS', winner_points: 3, loser_points: -1 },
  ],
}

const makePlayer = (overrides: Partial<GroupPlayer> = {}): GroupPlayer => ({
  id: 'p1',
  first_name: 'Alice',
  last_name: 'Martin',
  phone: '0612345678',
  power_ranking: 5,
  ...overrides,
})

const makeMatch = (overrides: Partial<Match> = {}): Match => ({
  id: 'm1',
  group_id: 'g1',
  player1_id: 'p1',
  player2_id: 'p2',
  match_date: '2026-03-05',
  match_time: '19:30:00+00',
  court_number: 'Terrain 1',
  winner_id: null,
  score: null,
  ...overrides,
})

const makeGroup = (overrides: Partial<Group> = {}): Group => ({
  id: 'g1',
  round_id: 'r1',
  group_name: 'Groupe A',
  max_players: 4,
  created_at: '2026-01-01',
  players: [],
  ...overrides,
})

describe('DrawTable', () => {
  it('renders without crashing with an empty group', () => {
    render(<DrawTable group={makeGroup()} />)
  })

  it('laisse le tableau defiler plutot que de le rogner', () => {
    // Une box de six joueurs fait environ 430 pixels de large : elle deborde
    // sur telephone et sur un petit ecran. Avec overflow-hidden, les
    // dernieres colonnes etaient coupees sans que rien ne l'indique.
    const { container } = render(<DrawTable group={makeGroup({ max_players: 6 })} />)

    const cadre = container.querySelector('[data-draw-table]')!
    expect(cadre.className).toContain('overflow-x-auto')
    expect(cadre.className).not.toContain('overflow-hidden')
  })

  /*
   * Une box de six joueurs fait huit colonnes. Sur telephone, la largeur
   * incompressible depassait celle de l'ecran et chaque box defilait
   * horizontalement. On recupere les pixels sur les marges, les planchers de
   * largeur et la longueur du libelle de date, sans toucher a la grille.
   */
  describe('sur petit ecran', () => {
    const deuxJoueurs = [
      makePlayer({ id: 'p1', first_name: 'Alice', last_name: 'A' }),
      makePlayer({ id: 'p2', first_name: 'Bob', last_name: 'B' }),
    ]

    it('propose une date courte a cote de la date longue', () => {
      const matches = [makeMatch({ player1_id: 'p1', player2_id: 'p2', match_date: '2026-03-05' })]
      render(<DrawTable group={makeGroup({ players: deuxJoueurs, max_players: 2 })} matches={matches} />)

      const courte = screen.getAllByText('05/03')[0]
      const longue = screen.getAllByText('05-mars')[0]

      expect(courte.className).toContain('sm:hidden')
      expect(longue.className).toContain('hidden')
      expect(longue.className).toContain('sm:inline')
    })

    it('reduit les marges interieures des cellules', () => {
      const matches = [makeMatch({ player1_id: 'p1', player2_id: 'p2', match_date: '2026-03-05' })]
      render(<DrawTable group={makeGroup({ players: deuxJoueurs, max_players: 2 })} matches={matches} />)

      const cellule = screen.getAllByText('05-mars')[0].closest('td')!

      expect(cellule.className).toContain('p-1')
      expect(cellule.className).toContain('sm:p-2')
    })

    it('abaisse le plancher de largeur des colonnes', () => {
      const { container } = render(<DrawTable group={makeGroup({ group_name: 'Box 1', max_players: 6 })} />)

      const entetes = Array.from(container.querySelectorAll('th'))
      const nom = entetes[0]
      const lettre = entetes[1]
      const total = entetes[entetes.length - 1]

      expect(nom.className).toContain('min-w-20')
      expect(nom.className).toContain('sm:min-w-24')
      expect(lettre.className).toContain('min-w-9')
      expect(lettre.className).toContain('sm:min-w-12')
      expect(total.className).toContain('min-w-9')
      expect(total.className).toContain('sm:min-w-12')
    })

    it('borne la colonne des noms au lieu de la laisser s etaler', () => {
      /*
       * `truncate` pose white-space: nowrap : dans un tableau en disposition
       * automatique, la colonne prend alors la largeur du nom le plus long et
       * ne tronque jamais. Le plancher min-w ne sert a rien tant que le
       * contenu n'est pas borne. Mesure a l'appui : la colonne faisait 155
       * pixels sur un ecran de 320.
       */
      render(<DrawTable group={makeGroup({ players: deuxJoueurs, max_players: 2 })} />)

      const cellule = screen.getByText('Alice A').closest('td')!
      const contenu = cellule.querySelector('div')!

      expect(contenu.className).toContain('w-[5.5rem]')
      expect(contenu.className).toContain('sm:w-auto')
    })

    it('abrege le prenom et garde le nom entier', () => {
      /*
       * Tronquer « Renaud Vandenplas » coupait le nom, la seule partie qui
       * distingue deux joueurs. L'initiale du prenom suffit dans une box de
       * six, et rend une quarantaine de pixels a la grille.
       */
      const players = [makePlayer({ id: 'p1', first_name: 'Renaud', last_name: 'Vandenplas' })]
      render(<DrawTable group={makeGroup({ players, max_players: 2 })} />)

      const court = screen.getByText('R. Vandenplas')
      const long = screen.getByText('Renaud Vandenplas')

      expect(court.className).toContain('sm:hidden')
      expect(long.className).toContain('hidden')
      expect(long.className).toContain('sm:inline')
    })

    it('garde le prenom entier quand le joueur n a pas de nom', () => {
      // Abreger donnerait « R. », qui ne designe plus personne.
      const players = [makePlayer({ id: 'p1', first_name: 'Renaud', last_name: '' })]
      render(<DrawTable group={makeGroup({ players, max_players: 2 })} />)

      expect(screen.getAllByText('Renaud').length).toBeGreaterThanOrEqual(2)
      expect(screen.queryByText('R.')).toBeNull()
    })

    it('reduit le tableau plutot que de le faire defiler', () => {
      /*
       * Passe une certaine etroitesse, les colonnes ne retrecissent plus. Les
       * anciens tableaux du club etaient des images, qui se redimensionnent :
       * on reproduit ce comportement avec zoom, pilote par useFitToWidth.
       */
      const { container } = render(<DrawTable group={makeGroup({ max_players: 6 })} />)

      const cadre = container.querySelector('[data-draw-table]') as HTMLElement

      // jsdom ne mesure rien, le facteur vaut donc 1 : ce qui compte ici est
      // que le cadre soit bien pilote.
      expect(cadre.style.zoom).toBe('1')
    })

    it('raccourcit le libelle de la colonne des points', () => {
      const { container } = render(<DrawTable group={makeGroup({ max_players: 6 })} />)

      const total = Array.from(container.querySelectorAll('th')).pop()!
      const court = total.querySelector('.sm\\:hidden')!
      const long = total.querySelector('.hidden')!

      expect(court.textContent).toBe('Pts')
      expect(long.textContent).toBe('Total')
    })
  })

  it('displays the group name in the header', () => {
    render(<DrawTable group={makeGroup({ group_name: 'Groupe B' })} />)
    expect(screen.getByText('Groupe B')).toBeInTheDocument()
  })

  it('displays column letters for max_players slots', () => {
    render(<DrawTable group={makeGroup({ max_players: 4 })} />)
    const letterAs = screen.getAllByText('A')
    expect(letterAs.length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('B').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('C').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('D').length).toBeGreaterThanOrEqual(1)
  })

  it('displays Total column header', () => {
    render(<DrawTable group={makeGroup()} />)
    expect(screen.getByText('Total')).toBeInTheDocument()
  })

  it('displays player name and phone when players exist', () => {
    const players = [
      makePlayer({ id: 'p1', first_name: 'Alice', last_name: 'Martin', phone: '0611111111' }),
      makePlayer({ id: 'p2', first_name: 'Bob', last_name: 'Dupont', phone: '0622222222' }),
    ]
    render(<DrawTable group={makeGroup({ players, max_players: 2 })} />)
    expect(screen.getByText('Alice Martin')).toBeInTheDocument()
    expect(screen.getByText('0611111111')).toBeInTheDocument()
    expect(screen.getByText('Bob Dupont')).toBeInTheDocument()
    expect(screen.getByText('0622222222')).toBeInTheDocument()
  })

  it('shows 0 in Total column for existing players', () => {
    const players = [makePlayer()]
    render(<DrawTable group={makeGroup({ players, max_players: 1 })} />)
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('shows "-" in Total column for empty slots', () => {
    render(<DrawTable group={makeGroup({ players: [], max_players: 2 })} />)
    const dashes = screen.getAllByText('-')
    expect(dashes.length).toBeGreaterThanOrEqual(2)
  })

  it('respects max_players for number of slots', () => {
    render(<DrawTable group={makeGroup({ players: [], max_players: 3 })} />)
    expect(screen.getAllByText('A').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('B').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('C').length).toBeGreaterThanOrEqual(1)
  })

  it('uses group max_players for slot count', () => {
    render(<DrawTable group={makeGroup({ players: [], max_players: 6 })} />)
    expect(screen.getAllByText('F').length).toBeGreaterThanOrEqual(1)
  })

  it('expands slots when players exceed max_players', () => {
    const players = [
      makePlayer({ id: 'p1', first_name: 'A', last_name: 'A' }),
      makePlayer({ id: 'p2', first_name: 'B', last_name: 'B' }),
      makePlayer({ id: 'p3', first_name: 'C', last_name: 'C' }),
    ]
    render(<DrawTable group={makeGroup({ players, max_players: 2 })} />)
    expect(screen.getAllByText('C').length).toBeGreaterThanOrEqual(1)
  })

  it('renders match cells with placeholder content when no matches provided', () => {
    const players = [
      makePlayer({ id: 'p1', first_name: 'Alice', last_name: 'A' }),
      makePlayer({ id: 'p2', first_name: 'Bob', last_name: 'B' }),
    ]
    render(<DrawTable group={makeGroup({ players, max_players: 2 })} />)
    expect(screen.getAllByText('--:--').length).toBeGreaterThanOrEqual(1)
  })

  it('displays formatted date and time when match data is provided', () => {
    const players = [
      makePlayer({ id: 'p1', first_name: 'Alice', last_name: 'A' }),
      makePlayer({ id: 'p2', first_name: 'Bob', last_name: 'B' }),
    ]
    const matches = [makeMatch({ player1_id: 'p1', player2_id: 'p2', match_date: '2026-03-05', match_time: '19:30:00+00' })]
    render(<DrawTable group={makeGroup({ players, max_players: 2 })} matches={matches} />)
    expect(screen.getAllByText('05-mars').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('19:30').length).toBeGreaterThanOrEqual(1)
  })

  it('displays score when match has been played', () => {
    const players = [
      makePlayer({ id: 'p1', first_name: 'Alice', last_name: 'A' }),
      makePlayer({ id: 'p2', first_name: 'Bob', last_name: 'B' }),
    ]
    const matches = [makeMatch({ player1_id: 'p1', player2_id: 'p2', score: '3 - 1' })]
    render(<DrawTable group={makeGroup({ players, max_players: 2 })} matches={matches} />)
    expect(screen.getAllByText('3 - 1').length).toBeGreaterThanOrEqual(1)
  })

  it('finds match regardless of player1/player2 order', () => {
    const players = [
      makePlayer({ id: 'p1', first_name: 'Alice', last_name: 'A' }),
      makePlayer({ id: 'p2', first_name: 'Bob', last_name: 'B' }),
    ]
    // Match stored with reversed player order
    const matches = [makeMatch({ player1_id: 'p2', player2_id: 'p1', match_date: '2026-04-10', match_time: '20:00:00+00' })]
    render(<DrawTable group={makeGroup({ players, max_players: 2 })} matches={matches} />)
    expect(screen.getAllByText('10-avr.').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('20:00').length).toBeGreaterThanOrEqual(1)
  })

  it('shows placeholder when match has no score yet', () => {
    const players = [
      makePlayer({ id: 'p1', first_name: 'Alice', last_name: 'A' }),
      makePlayer({ id: 'p2', first_name: 'Bob', last_name: 'B' }),
    ]
    const matches = [makeMatch({ player1_id: 'p1', player2_id: 'p2', score: null })]
    render(<DrawTable group={makeGroup({ players, max_players: 2 })} matches={matches} />)
    expect(screen.queryByText('3 - 1')).not.toBeInTheDocument()
  })

  // --- Scoring / Total column ---

  it('displays calculated points in Total column when scoringRules provided', () => {
    const players = [
      makePlayer({ id: 'p1', first_name: 'Alice', last_name: 'Martin' }),
      makePlayer({ id: 'p2', first_name: 'Bob', last_name: 'Dupont' }),
    ]
    const matches = [
      makeMatch({ player1_id: 'p1', player2_id: 'p2', winner_id: 'p1', score: '3-1' }),
    ]
    render(<DrawTable group={makeGroup({ players, max_players: 2 })} matches={matches} scoringRules={defaultRules} />)
    // Alice: 4 pts (3-1 win), Bob: 1 pt (3-1 loss)
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('highlights winner score in match cell', () => {
    const players = [
      makePlayer({ id: 'p1', first_name: 'Alice', last_name: 'Martin' }),
      makePlayer({ id: 'p2', first_name: 'Bob', last_name: 'Dupont' }),
    ]
    const matches = [
      makeMatch({ player1_id: 'p1', player2_id: 'p2', winner_id: 'p1', score: '3-1' }),
    ]
    render(<DrawTable group={makeGroup({ players, max_players: 2 })} matches={matches} scoringRules={defaultRules} />)
    // Score should be displayed in the cells
    expect(screen.getAllByText('3-1').length).toBeGreaterThanOrEqual(1)
  })

  // --- Ouverture de la fiche joueur ---

  describe('onSelectPlayer', () => {
    const players = [makePlayer({ id: 'p1', first_name: 'Alice', last_name: 'Martin' })]

    it('ouvre la fiche au clic sur le nom', () => {
      const onSelectPlayer = vi.fn()
      render(
        <DrawTable group={makeGroup({ players, max_players: 1 })} onSelectPlayer={onSelectPlayer} />
      )

      fireEvent.click(screen.getByRole('button', { name: /Alice Martin/ }))

      expect(onSelectPlayer).toHaveBeenCalledWith(players[0])
    })

    it('ouvre la fiche au clavier', () => {
      const onSelectPlayer = vi.fn()
      render(
        <DrawTable group={makeGroup({ players, max_players: 1 })} onSelectPlayer={onSelectPlayer} />
      )

      fireEvent.keyDown(screen.getByRole('button', { name: /Alice Martin/ }), { key: 'Enter' })

      expect(onSelectPlayer).toHaveBeenCalledTimes(1)
    })

    it('laisse le nom inerte sans callback', () => {
      // Les pages joueur reutilisent cette table en lecture seule : pas de
      // curseur main ni de role bouton trompeur.
      render(<DrawTable group={makeGroup({ players, max_players: 1 })} />)

      expect(screen.queryByRole('button', { name: /Alice Martin/ })).not.toBeInTheDocument()
    })

    it('ne rend pas cliquable une place vide', () => {
      const onSelectPlayer = vi.fn()
      render(
        <DrawTable group={makeGroup({ players, max_players: 3 })} onSelectPlayer={onSelectPlayer} />
      )

      // Une seule place occupee, donc un seul nom actionnable
      expect(screen.getAllByRole('button', { name: /Martin/ })).toHaveLength(1)
    })
  })
})
