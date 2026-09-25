import { render, screen, within } from '@testing-library/react'
import { describe, it, expect, beforeAll } from 'vitest'
import { MatchListView } from '../MatchListView'
import type { Match } from '@/types/match'

beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
})

const alice = { id: 'p1', first_name: 'Alice', last_name: 'Martin' }
const bob = { id: 'p2', first_name: 'Bob', last_name: 'Dupont' }
const chloe = { id: 'p3', first_name: 'Chloe', last_name: 'Lefevre' }
const david = { id: 'p4', first_name: 'David', last_name: 'Petit' }

function makeMatch(over: Partial<Match> = {}): Match {
  return {
    id: 'm1', group_id: 'g1',
    player1_id: 'p1', player2_id: 'p2',
    match_date: '2026-03-01', match_time: '19:00:00', court_number: 'Terrain 1',
    winner_id: null, score: null,
    player1: alice, player2: bob,
    group: { id: 'g1', group_name: 'Box A', round_id: 'r1' },
    ...over,
  }
}

const matches = [
  makeMatch(),
  makeMatch({
    id: 'm2', match_date: '2026-03-02',
    player1_id: 'p3', player2_id: 'p4', player1: chloe, player2: david,
    group: { id: 'g2', group_name: 'Box B', round_id: 'r1' },
  }),
]

/*
 * La vue rend deux fois le meme contenu : la table a partir de 1024 px et la
 * liste par boxe en dessous. jsdom n'applique aucune media query, donc chaque
 * nom parait deux fois et les assertions se portent sur l'une des deux.
 */
function dansLaTable() {
  return within(document.querySelector('table')!)
}

describe('MatchListView', () => {
  it('groupe par boxe', () => {
    render(<MatchListView matches={matches} players={[]} />)
    expect(screen.getByText('Box A')).toBeInTheDocument()
    expect(screen.getByText('Box B')).toBeInTheDocument()
  })

  /*
   * La page ne montre qu'une journee a la fois, celle de sa barre de dates.
   * Les deux vues suivent la meme journee : changer de vue ne doit pas
   * renvoyer au premier jour de la serie.
   */
  it('n\'affiche que la journee demandee', () => {
    render(<MatchListView matches={matches} players={[]} date="2026-03-02" />)
    expect(dansLaTable().getByText('Chloe Lefevre')).toBeInTheDocument()
    expect(screen.queryByText('Alice Martin')).not.toBeInTheDocument()
  })

  it('empile toutes les journees quand aucune n\'est demandee', () => {
    render(<MatchListView matches={matches} players={[]} />)
    expect(screen.getAllByText('Alice Martin').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Chloe Lefevre').length).toBeGreaterThan(0)
  })
})
