
export function calculateOptimalDistribution(totalPlayers: number, maxPlayersPerGroup = 6): {
  numberOfGroups: number
  distribution: number[]  // Exemple: [6, 6, 5] pour 17 joueurs avec max=6
  valid: boolean
  message?: string
} {
  const MIN_PLAYERS = maxPlayersPerGroup - 1

  if (totalPlayers < MIN_PLAYERS) {
    return {
      numberOfGroups: 0,
      distribution: [],
      valid: false,
      message: `Il faut au moins ${MIN_PLAYERS} joueurs pour créer un groupe`
    }
  }

  // Nombre de groupes : on divise par le max, arrondi au supérieur
  const numberOfGroups = Math.ceil(totalPlayers / maxPlayersPerGroup)

  // Distribuer : remplir au max, le dernier prend le reste
  const distribution: number[] = []
  let remaining = totalPlayers
  for (let i = 0; i < numberOfGroups; i++) {
    const size = Math.min(maxPlayersPerGroup, remaining)
    distribution.push(size)
    remaining -= size
  }

  const allValid = distribution.every(n => n >= MIN_PLAYERS && n <= maxPlayersPerGroup)

  return {
    numberOfGroups,
    distribution,
    valid: allValid && remaining === 0,
    message: allValid ? undefined : "Distribution impossible avec ces contraintes"
  }
}

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
