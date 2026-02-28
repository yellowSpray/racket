import {
  calculateOptimalDistribution,
  suggestGroupConfiguration,
} from '@/lib/groupDistributionCalculator'

describe('calculateOptimalDistribution', () => {
  it('returns invalid for less than 5 players', () => {
    const result = calculateOptimalDistribution(4)
    expect(result.valid).toBe(false)
    expect(result.numberOfGroups).toBe(0)
    expect(result.distribution).toEqual([])
  })

  it('returns invalid for 0 players', () => {
    expect(calculateOptimalDistribution(0).valid).toBe(false)
  })

  it('handles exactly 5 players (1 group of 5)', () => {
    const result = calculateOptimalDistribution(5)
    expect(result.valid).toBe(true)
    expect(result.numberOfGroups).toBe(1)
    expect(result.distribution).toEqual([5])
  })

  it('handles exactly 6 players (1 group of 6)', () => {
    const result = calculateOptimalDistribution(6)
    expect(result.valid).toBe(true)
    expect(result.numberOfGroups).toBe(1)
    expect(result.distribution).toEqual([6])
  })

  it('handles 10 players (2 groups of 5)', () => {
    const result = calculateOptimalDistribution(10)
    expect(result.valid).toBe(true)
    expect(result.numberOfGroups).toBe(2)
    expect(result.distribution).toEqual([5, 5])
  })

  it('handles 11 players (6 + 5)', () => {
    const result = calculateOptimalDistribution(11)
    expect(result.valid).toBe(true)
    expect(result.numberOfGroups).toBe(2)
    expect(result.distribution).toEqual([6, 5])
  })

  it('handles 12 players (6 + 6)', () => {
    const result = calculateOptimalDistribution(12)
    expect(result.valid).toBe(true)
    expect(result.numberOfGroups).toBe(2)
    expect(result.distribution).toEqual([6, 6])
  })

  it('handles 17 players (6 + 6 + 5)', () => {
    const result = calculateOptimalDistribution(17)
    expect(result.valid).toBe(true)
    expect(result.numberOfGroups).toBe(3)
    expect(result.distribution).toEqual([6, 6, 5])
  })

  it('handles 18 players (6 + 6 + 6)', () => {
    const result = calculateOptimalDistribution(18)
    expect(result.valid).toBe(true)
    expect(result.numberOfGroups).toBe(3)
    expect(result.distribution).toEqual([6, 6, 6])
  })

  it('handles 30 players (5 groups of 6)', () => {
    const result = calculateOptimalDistribution(30)
    expect(result.valid).toBe(true)
    expect(result.numberOfGroups).toBe(5)
    expect(result.distribution).toEqual([6, 6, 6, 6, 6])
  })

  it('all groups have between 5 and 6 players for valid distributions', () => {
    for (let n = 5; n <= 50; n++) {
      const result = calculateOptimalDistribution(n)
      if (result.valid) {
        expect(result.distribution.every((g) => g >= 5 && g <= 6)).toBe(true)
        expect(result.distribution.reduce((a, b) => a + b, 0)).toBe(n)
      }
    }
  })
})

describe('suggestGroupConfiguration', () => {
  it('returns null for invalid player count', () => {
    expect(suggestGroupConfiguration(3)).toBeNull()
  })

  it('returns config for valid player count', () => {
    const result = suggestGroupConfiguration(11)
    expect(result).not.toBeNull()
    expect(result!.config.numberOfGroups).toBe(2)
    expect(result!.config.playersPerGroup).toEqual([6, 5])
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
