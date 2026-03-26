/**
 * Calcule la distribution optimale de joueurs en groupes.
 * Essaie d'abord une répartition stricte (min-max), puis une relâchée si nécessaire.
 */
export function calculateOptimalDistribution(totalPlayers: number, maxPlayersPerGroup = 6): {
  numberOfGroups: number
  distribution: number[]
  valid: boolean
  relaxed: boolean
  message?: string
} {
  const MIN_PLAYERS = maxPlayersPerGroup - 1

  if (totalPlayers < MIN_PLAYERS - 1 || totalPlayers <= 0) {
    return {
      numberOfGroups: 0,
      distribution: [],
      valid: false,
      relaxed: false,
      message: `Il faut au moins ${MIN_PLAYERS - 1} joueurs pour créer un groupe`
    }
  }

  // 1. Essayer une distribution stricte (tous les groupes entre MIN et MAX)
  const strict = findDistribution(totalPlayers, MIN_PLAYERS, maxPlayersPerGroup)
  if (strict) {
    return { ...strict, valid: true, relaxed: false }
  }

  // 2. Fallback : distribution relâchée
  // Préférer un groupe légèrement au-dessus du max plutôt qu'en-dessous du min
  // car un groupe de 7 est plus jouable qu'un groupe de 4
  const relaxedUp = findDistribution(totalPlayers, MIN_PLAYERS, maxPlayersPerGroup + 1)
  const relaxedDown = findDistribution(totalPlayers, MIN_PLAYERS - 1, maxPlayersPerGroup)

  // Choisir la meilleure option relâchée
  const best = pickBestRelaxed(relaxedUp, relaxedDown, MIN_PLAYERS, maxPlayersPerGroup)

  if (best) {
    const outOfRange = best.distribution.filter(n => n < MIN_PLAYERS || n > maxPlayersPerGroup)
    const details = outOfRange.map(n =>
      n > maxPlayersPerGroup
        ? `un groupe de ${n} (max recommandé: ${maxPlayersPerGroup})`
        : `un groupe de ${n} (min recommandé: ${MIN_PLAYERS})`
    ).join(", ")

    return {
      ...best,
      valid: true,
      relaxed: true,
      message: `Distribution ajustée : ${details}`
    }
  }

  return {
    numberOfGroups: 0,
    distribution: [],
    valid: false,
    relaxed: false,
    message: `Impossible de répartir ${totalPlayers} joueurs. Ajoutez ou retirez des joueurs.`
  }
}

function findDistribution(total: number, min: number, max: number): {
  numberOfGroups: number
  distribution: number[]
} | null {
  if (min <= 0 || total <= 0) return null

  const minGroups = Math.ceil(total / max)
  const maxGroups = Math.floor(total / min)

  for (let numGroups = minGroups; numGroups <= maxGroups; numGroups++) {
    const base = Math.floor(total / numGroups)
    const extra = total % numGroups
    const largest = extra > 0 ? base + 1 : base

    if (base >= min && largest <= max) {
      const distribution: number[] = []
      for (let i = 0; i < numGroups; i++) {
        distribution.push(i < extra ? base + 1 : base)
      }
      return { numberOfGroups: numGroups, distribution }
    }
  }

  return null
}

function pickBestRelaxed(
  relaxedUp: { numberOfGroups: number; distribution: number[] } | null,
  relaxedDown: { numberOfGroups: number; distribution: number[] } | null,
  min: number,
  max: number
): { numberOfGroups: number; distribution: number[] } | null {
  if (!relaxedUp && !relaxedDown) return null
  if (!relaxedUp) return relaxedDown
  if (!relaxedDown) return relaxedUp

  // Calculer l'écart par rapport à la plage idéale pour chaque option
  const scoreUp = relaxedUp.distribution.reduce((sum, n) => sum + Math.max(0, n - max) + Math.max(0, min - n), 0)
  const scoreDown = relaxedDown.distribution.reduce((sum, n) => sum + Math.max(0, n - max) + Math.max(0, min - n), 0)

  // Préférer le moins d'écart, en cas d'égalité préférer relaxer vers le haut
  return scoreUp <= scoreDown ? relaxedUp : relaxedDown
}

export interface DistributionOption {
  numberOfGroups: number
  distribution: number[]
  label: string
  relaxed: boolean
  message?: string
}

function buildLabel(distribution: number[]): string {
  const allSame = distribution.every(n => n === distribution[0])
  const numGroups = distribution.length

  if (numGroups === 1) {
    return `1 groupe de ${distribution[0]} joueurs`
  }

  if (allSame) {
    return `${numGroups} groupes de ${distribution[0]} joueurs`
  }

  return `${numGroups} groupes : ${distribution.join(', ')} joueurs`
}

/** Retourne toutes les distributions possibles (strictes puis relâchées) pour un nombre de joueurs. */
export function calculateAllDistributions(
  totalPlayers: number,
  maxPlayersPerGroup = 6
): DistributionOption[] {
  const MIN_PLAYERS = maxPlayersPerGroup - 1

  if (totalPlayers < MIN_PLAYERS - 1 || totalPlayers <= 0) {
    return []
  }

  // 1. Collecter toutes les distributions strictes
  const strictOptions = findAllDistributions(totalPlayers, MIN_PLAYERS, maxPlayersPerGroup)

  if (strictOptions.length > 0) {
    return strictOptions.map(opt => ({
      ...opt,
      label: buildLabel(opt.distribution),
      relaxed: false,
    }))
  }

  // 2. Fallback : distributions relâchées
  const relaxedUp = findAllDistributions(totalPlayers, MIN_PLAYERS, maxPlayersPerGroup + 1)
  const relaxedDown = findAllDistributions(totalPlayers, MIN_PLAYERS - 1, maxPlayersPerGroup)
  const allRelaxed = [...relaxedUp, ...relaxedDown]

  // Dédupliquer par distribution
  const seen = new Set<string>()
  const unique: DistributionOption[] = []

  for (const opt of allRelaxed) {
    const key = opt.distribution.join(',')
    if (seen.has(key)) continue
    seen.add(key)

    const outOfRange = opt.distribution.filter(n => n < MIN_PLAYERS || n > maxPlayersPerGroup)
    const details = outOfRange.map(n =>
      n > maxPlayersPerGroup
        ? `un groupe de ${n} (max recommandé: ${maxPlayersPerGroup})`
        : `un groupe de ${n} (min recommandé: ${MIN_PLAYERS})`
    ).join(", ")

    unique.push({
      ...opt,
      label: buildLabel(opt.distribution),
      relaxed: true,
      message: `Distribution ajustée : ${details}`,
    })
  }

  return unique
}

function findAllDistributions(total: number, min: number, max: number): {
  numberOfGroups: number
  distribution: number[]
}[] {
  if (min <= 0 || total <= 0) return []

  const minGroups = Math.ceil(total / max)
  const maxGroups = Math.floor(total / min)
  const results: { numberOfGroups: number; distribution: number[] }[] = []

  for (let numGroups = minGroups; numGroups <= maxGroups; numGroups++) {
    const base = Math.floor(total / numGroups)
    const extra = total % numGroups
    const largest = extra > 0 ? base + 1 : base

    if (base >= min && largest <= max) {
      const distribution: number[] = []
      for (let i = 0; i < numGroups; i++) {
        distribution.push(i < extra ? base + 1 : base)
      }
      results.push({ numberOfGroups: numGroups, distribution })
    }
  }

  return results
}

/** Raccourci : retourne la config recommandée avec une description textuelle. */
export function suggestGroupConfiguration(totalPlayers: number, maxPlayersPerGroup = 6): {
  config: { numberOfGroups: number; playersPerGroup: number[] }
  description: string
} | null {
  const result = calculateOptimalDistribution(totalPlayers, maxPlayersPerGroup)

  if (!result.valid) {
    return null
  }

  return {
    config: {
      numberOfGroups: result.numberOfGroups,
      playersPerGroup: result.distribution
    },
    description: `${result.numberOfGroups} groupe${result.numberOfGroups > 1 ? 's' : ''} : ${result.distribution.join(', ')} joueurs`
  }
}
