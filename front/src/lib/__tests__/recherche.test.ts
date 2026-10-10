import { describe, it, expect } from 'vitest'
import { joueurRepond, groupesAvecJoueur, texteRepond } from '../recherche'
import type { Group } from '@/types/draw'

const alice = { first_name: 'Alice', last_name: 'Lefèvre', email: 'alice@club.be', phone: '0470 12 34 56' }

describe('joueurRepond', () => {
  it('accepte tout quand la recherche est vide', () => {
    expect(joueurRepond(alice, '')).toBe(true)
    expect(joueurRepond(alice, '   ')).toBe(true)
  })

  it('trouve par prenom, par nom, et par les deux dans un sens ou dans l\'autre', () => {
    expect(joueurRepond(alice, 'ali')).toBe(true)
    expect(joueurRepond(alice, 'lefèvre')).toBe(true)
    expect(joueurRepond(alice, 'alice lef')).toBe(true)
    expect(joueurRepond(alice, 'lefevre alice')).toBe(true)
  })

  it('ignore les accents et la casse', () => {
    expect(joueurRepond(alice, 'LEFEVRE')).toBe(true)
  })

  it('trouve par email', () => {
    expect(joueurRepond(alice, 'club.be')).toBe(true)
  })

  it('trouve par telephone, espaces ou non', () => {
    expect(joueurRepond(alice, '0470123')).toBe(true)
    expect(joueurRepond(alice, '12 34')).toBe(true)
  })

  it('ne rapproche pas un chiffre isole du telephone', () => {
    expect(joueurRepond(alice, '7')).toBe(false)
  })

  it('refuse ce qui ne correspond a rien', () => {
    expect(joueurRepond(alice, 'bob')).toBe(false)
  })

  it('tolere un joueur sans email ni telephone', () => {
    expect(joueurRepond({ first_name: 'Bob', last_name: 'Dupont' }, '0470')).toBe(false)
    expect(joueurRepond({ first_name: 'Bob', last_name: 'Dupont' }, 'dup')).toBe(true)
  })
})

describe('groupesAvecJoueur', () => {
  const groupe = (id: string, noms: [string, string][]): Group => ({
    id, round_id: 'r1', group_name: id, max_players: 5, created_at: '',
    players: noms.map(([f, l], i) => ({ id: `${id}-${i}`, first_name: f, last_name: l, phone: '', power_ranking: 0 })),
  })
  const groupes = [groupe('Box 1', [['Alice', 'Martin'], ['Bob', 'Dupont']]), groupe('Box 2', [['Chloé', 'Bouchard']])]

  it('rend tous les tableaux sans recherche', () => {
    expect(groupesAvecJoueur(groupes, '')).toHaveLength(2)
  })

  it('ne garde que les tableaux ou joue le joueur cherche', () => {
    expect(groupesAvecJoueur(groupes, 'chloe').map(g => g.id)).toEqual(['Box 2'])
  })

  it('rend une liste vide si personne ne correspond', () => {
    expect(groupesAvecJoueur(groupes, 'zorro')).toEqual([])
  })
})

describe('texteRepond', () => {
  it('compare sans accents ni casse, et accepte tout a vide', () => {
    expect(texteRepond('Interclub Été', 'ete')).toBe(true)
    expect(texteRepond('Interclub', 'mixed')).toBe(false)
    expect(texteRepond('Interclub', '')).toBe(true)
  })
})
