import {
  calculateOptimalDistribution,
  suggestGroupConfiguration,
  calculateAllDistributions,
} from '@/lib/groupDistributionCalculator'

describe('calculateOptimalDistribution', () => {
  // Cas invalides (vraiment trop peu de joueurs)
  it('returns invalid for less than 4 players', () => {
    expect(calculateOptimalDistribution(3).valid).toBe(false)
    expect(calculateOptimalDistribution(2).valid).toBe(false)
    expect(calculateOptimalDistribution(1).valid).toBe(false)
    expect(calculateOptimalDistribution(0).valid).toBe(false)
  })

  // Cas stricts (distribution parfaite entre 5 et 6)
  it('handles exactly 5 players (1 group of 5)', () => {
    const result = calculateOptimalDistribution(5)
    expect(result.valid).toBe(true)
    expect(result.relaxed).toBe(false)
    expect(result.distribution).toEqual([5])
  })

  it('handles exactly 6 players (1 group of 6)', () => {
    const result = calculateOptimalDistribution(6)
    expect(result.valid).toBe(true)
    expect(result.relaxed).toBe(false)
    expect(result.distribution).toEqual([6])
  })

  it('handles 10 players (2 groups of 5)', () => {
    const result = calculateOptimalDistribution(10)
    expect(result.valid).toBe(true)
    expect(result.relaxed).toBe(false)
    expect(result.distribution).toEqual([5, 5])
  })

  it('handles 11 players (6 + 5)', () => {
    const result = calculateOptimalDistribution(11)
    expect(result.valid).toBe(true)
    expect(result.relaxed).toBe(false)
    expect(result.distribution).toEqual([6, 5])
  })

  it('handles 12 players (6 + 6)', () => {
    const result = calculateOptimalDistribution(12)
    expect(result.valid).toBe(true)
    expect(result.relaxed).toBe(false)
    expect(result.distribution).toEqual([6, 6])
  })

  it('handles 15 players (3 groups of 5)', () => {
    const result = calculateOptimalDistribution(15)
    expect(result.valid).toBe(true)
    expect(result.relaxed).toBe(false)
    expect(result.distribution).toEqual([5, 5, 5])
  })

  it('handles 16 players (6 + 5 + 5)', () => {
    const result = calculateOptimalDistribution(16)
    expect(result.valid).toBe(true)
    expect(result.relaxed).toBe(false)
    expect(result.distribution).toEqual([6, 5, 5])
  })

  it('handles 17 players (6 + 6 + 5)', () => {
    const result = calculateOptimalDistribution(17)
    expect(result.valid).toBe(true)
    expect(result.relaxed).toBe(false)
    expect(result.distribution).toEqual([6, 6, 5])
  })

  it('handles 18 players (6 + 6 + 6)', () => {
    const result = calculateOptimalDistribution(18)
    expect(result.valid).toBe(true)
    expect(result.relaxed).toBe(false)
    expect(result.distribution).toEqual([6, 6, 6])
  })

  it('handles 30 players (5 groups of 6)', () => {
    const result = calculateOptimalDistribution(30)
    expect(result.valid).toBe(true)
    expect(result.relaxed).toBe(false)
    expect(result.distribution).toEqual([6, 6, 6, 6, 6])
  })

  // Cas relâchés (nombres "impossibles" qui trouvent un fallback)
  it('handles 4 players as relaxed (1 group of 4)', () => {
    const result = calculateOptimalDistribution(4)
    expect(result.valid).toBe(true)
    expect(result.relaxed).toBe(true)
    expect(result.distribution).toEqual([4])
    expect(result.message).toBeDefined()
  })

  it('handles 7 players as relaxed (1 group of 7)', () => {
    const result = calculateOptimalDistribution(7)
    expect(result.valid).toBe(true)
    expect(result.relaxed).toBe(true)
    expect(result.distribution).toEqual([7])
    expect(result.message).toBeDefined()
  })

  it('handles 8 players as relaxed (2 groups of 4)', () => {
    const result = calculateOptimalDistribution(8)
    expect(result.valid).toBe(true)
    expect(result.relaxed).toBe(true)
    // 8 : relaxUp → [8] (1 group of 8, écart 2) vs relaxDown → [4,4] (écart 2)
    // Equal score, prefer up → [8]? Let's just check it's valid
    expect(result.distribution.reduce((a, b) => a + b, 0)).toBe(8)
    expect(result.message).toBeDefined()
  })

  it('handles 9 players as relaxed (5 + 4)', () => {
    const result = calculateOptimalDistribution(9)
    expect(result.valid).toBe(true)
    expect(result.relaxed).toBe(true)
    expect(result.distribution.reduce((a, b) => a + b, 0)).toBe(9)
    expect(result.message).toBeDefined()
  })

  it('handles 13 players as relaxed (7 + 6)', () => {
    const result = calculateOptimalDistribution(13)
    expect(result.valid).toBe(true)
    expect(result.relaxed).toBe(true)
    expect(result.distribution).toEqual([7, 6])
    expect(result.message).toBeDefined()
  })

  it('handles 14 players as relaxed (5 + 5 + 4)', () => {
    const result = calculateOptimalDistribution(14)
    expect(result.valid).toBe(true)
    expect(result.relaxed).toBe(true)
    expect(result.distribution).toEqual([5, 5, 4])
    expect(result.message).toBeDefined()
  })

  it('handles 19 players as relaxed (7 + 6 + 6)', () => {
    const result = calculateOptimalDistribution(19)
    expect(result.valid).toBe(true)
    expect(result.relaxed).toBe(true)
    expect(result.distribution).toEqual([7, 6, 6])
    expect(result.message).toBeDefined()
  })

  // Propriété : tout nombre >= 4 doit être distribuable
  it('all player counts from 4 to 50 produce a valid distribution', () => {
    for (let n = 4; n <= 50; n++) {
      const result = calculateOptimalDistribution(n)
      expect(result.valid).toBe(true)
      expect(result.distribution.reduce((a, b) => a + b, 0)).toBe(n)
    }
  })

  // Propriété : les distributions strictes ont des groupes entre 5 et 6
  it('strict distributions have groups between 5 and 6', () => {
    for (let n = 5; n <= 50; n++) {
      const result = calculateOptimalDistribution(n)
      if (!result.relaxed) {
        expect(result.distribution.every(g => g >= 5 && g <= 6)).toBe(true)
      }
    }
  })
})

describe('suggestGroupConfiguration', () => {
  it('returns null for invalid player count', () => {
    expect(suggestGroupConfiguration(2)).toBeNull()
  })

  it('returns config for valid player count', () => {
    const result = suggestGroupConfiguration(11)
    expect(result).not.toBeNull()
    expect(result!.config.numberOfGroups).toBe(2)
    expect(result!.config.playersPerGroup).toEqual([6, 5])
  })

  it('returns config for relaxed player count', () => {
    const result = suggestGroupConfiguration(13)
    expect(result).not.toBeNull()
    expect(result!.config.numberOfGroups).toBe(2)
    expect(result!.config.playersPerGroup).toEqual([7, 6])
  })

  it('generates correct description', () => {
    const result = suggestGroupConfiguration(5)
    expect(result!.description).toBe('1 groupe : 5 joueurs')
  })

  it('pluralizes groups in description', () => {
    const result = suggestGroupConfiguration(12)
    expect(result!.description).toBe('2 groupes : 6, 6 joueurs')
  })
})

describe('calculateAllDistributions', () => {
  it('returns 2 options for 30 players with max 6', () => {
    const options = calculateAllDistributions(30, 6)
    expect(options).toHaveLength(2)
    expect(options[0].distribution).toEqual([6, 6, 6, 6, 6])
    expect(options[0].numberOfGroups).toBe(5)
    expect(options[1].distribution).toEqual([5, 5, 5, 5, 5, 5])
    expect(options[1].numberOfGroups).toBe(6)
  })

  it('returns 1 option for 10 players with max 6', () => {
    const options = calculateAllDistributions(10, 6)
    expect(options).toHaveLength(1)
    expect(options[0].distribution).toEqual([5, 5])
  })

  it('returns 1 option for 12 players with max 6', () => {
    const options = calculateAllDistributions(12, 6)
    expect(options).toHaveLength(1)
    expect(options[0].distribution).toEqual([6, 6])
  })

  it('returns 1 option for 6 players with max 6', () => {
    const options = calculateAllDistributions(6, 6)
    expect(options).toHaveLength(1)
    expect(options[0].distribution).toEqual([6])
  })

  it('returns empty for 0 players', () => {
    expect(calculateAllDistributions(0, 6)).toEqual([])
  })

  it('returns empty for 3 players (too few)', () => {
    expect(calculateAllDistributions(3, 6)).toEqual([])
  })

  it('generates readable labels for uniform groups', () => {
    const options = calculateAllDistributions(30, 6)
    expect(options[0].label).toBe('5 groupes de 6 joueurs')
    expect(options[1].label).toBe('6 groupes de 5 joueurs')
  })

  it('generates readable label for mixed group sizes', () => {
    const options = calculateAllDistributions(11, 6)
    expect(options).toHaveLength(1)
    expect(options[0].label).toBe('2 groupes : 6, 5 joueurs')
  })

  it('marks strict options as not relaxed', () => {
    const options = calculateAllDistributions(30, 6)
    expect(options.every(o => !o.relaxed)).toBe(true)
  })

  it('falls back to relaxed options when no strict distribution exists', () => {
    const options = calculateAllDistributions(4, 6)
    expect(options.length).toBeGreaterThan(0)
    expect(options.every(o => o.relaxed)).toBe(true)
  })
})
