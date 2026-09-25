import { describe, it, expect } from 'vitest'
import {
  LARGEUR_HEURE,
  PLANCHER_TERRAIN,
  terrainsParPage,
  pageValide,
  trancheDeTerrains,
  libelleDeLaPage,
} from '../paginationTerrains'

describe('terrainsParPage', () => {
  it('compte ce que la boite peut tenir', () => {
    /* 753 px de colonne a 1024 d'ecran : 48 d'heures, puis 3 x 205. */
    expect(terrainsParPage(753, 7)).toBe(3)
    expect(terrainsParPage(1169, 7)).toBe(5)
    expect(terrainsParPage(1649, 7)).toBe(7)
  })

  it('ne rend jamais plus de terrains qu\'il n\'y en a', () => {
    expect(terrainsParPage(1920, 3)).toBe(3)
  })

  /*
   * Un terrain au minimum : mieux vaut une colonne serree que zero colonne.
   * Le cas arrive sur une boite non encore mesuree, ou tres etroite.
   */
  it('en garde un meme quand rien ne tient', () => {
    expect(terrainsParPage(100, 7)).toBe(1)
    expect(terrainsParPage(0, 7)).toBe(1)
  })

  it('tient sa promesse de largeur', () => {
    const n = terrainsParPage(753, 7)
    expect(LARGEUR_HEURE + n * PLANCHER_TERRAIN).toBeLessThanOrEqual(753)
    expect(LARGEUR_HEURE + (n + 1) * PLANCHER_TERRAIN).toBeGreaterThan(753)
  })
})

describe('pageValide', () => {
  it('ramene dans les bornes', () => {
    expect(pageValide(5, 7, 3)).toBe(2)
    expect(pageValide(-1, 7, 3)).toBe(0)
  })

  /*
   * La page survit a un elargissement de la fenetre : 7 terrains par 3 font
   * trois pages, par 5 elles n'en font plus que deux.
   */
  it('recule quand la page courante n\'existe plus', () => {
    expect(pageValide(2, 7, 5)).toBe(1)
  })

  it('rend zero quand tout tient', () => {
    expect(pageValide(1, 3, 3)).toBe(0)
  })
})

describe('trancheDeTerrains', () => {
  const terrains = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

  it('rend la tranche de la page', () => {
    expect(trancheDeTerrains(terrains, 0, 3)).toEqual(['T1', 'T2', 'T3'])
    expect(trancheDeTerrains(terrains, 1, 3)).toEqual(['T4', 'T5', 'T6'])
  })

  /* La derniere page est plus courte, on ne complete pas en reculant. */
  it('laisse la derniere page incomplete', () => {
    expect(trancheDeTerrains(terrains, 2, 3)).toEqual(['T7'])
  })

  it('rend tout quand tout tient', () => {
    expect(trancheDeTerrains(terrains, 0, 7)).toEqual(terrains)
  })
})

/*
 * Le libelle compte des positions et non des noms : les colonnes portent deja
 * les noms, et un club peut nommer ses terrains « Central » ou « Bulle ».
 */
describe('libelleDeLaPage', () => {
  it('dit ou l\'on est dans la liste', () => {
    expect(libelleDeLaPage(0, 3, 7)).toBe('Terrains 1 à 3 sur 7')
    expect(libelleDeLaPage(2, 3, 7)).toBe('Terrain 7 sur 7')
  })

  it('parle au singulier pour un seul terrain', () => {
    expect(libelleDeLaPage(1, 1, 7)).toBe('Terrain 2 sur 7')
  })
})
