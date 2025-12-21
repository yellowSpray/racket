
export function calculateOptimalDistribution(totalPlayers: number): {
  numberOfGroups: number
  distribution: number[]  // Exemple: [6, 6, 5] pour 17 joueurs
  valid: boolean
  message?: string
} {
  const MIN_PLAYERS = 5
  const MAX_PLAYERS = 6

  // Cas impossible : moins de 5 joueurs
  if (totalPlayers < MIN_PLAYERS) {
    return {
      numberOfGroups: 0,
      distribution: [],
      valid: false,
      message: `Il faut au moins ${MIN_PLAYERS} joueurs pour créer un groupe`
    }
  }

  // Distribution optimale
  const distribution: number[] = []
  let remaining = totalPlayers
  let groups = 0
  
  while (remaining > 0) {
    if (remaining >= MIN_PLAYERS && remaining <= MAX_PLAYERS) {
      // Dernier groupe : prendre tout ce qui reste
      distribution.push(remaining)
      remaining = 0
    } else if (remaining > MAX_PLAYERS) {
      // Vérifier si mettre 6 dans ce groupe laisse au moins 5 pour le prochain
      const afterMax = remaining - MAX_PLAYERS
      
      if (afterMax >= MIN_PLAYERS || afterMax === 0) {
        // On peut mettre 6
        distribution.push(MAX_PLAYERS)
        remaining -= MAX_PLAYERS
      } else {
        // On doit mettre 5 pour équilibrer
        distribution.push(MIN_PLAYERS)
        remaining -= MIN_PLAYERS
      }
    } else {
      // Cas d'erreur (ne devrait pas arriver)
      break
    }
    
    groups++
    
    // Sécurité : éviter boucle infinie
    if (groups > 20) break
  }

  // Vérifier que tous les groupes sont valides
  const allValid = distribution.every(n => n >= MIN_PLAYERS && n <= MAX_PLAYERS)

  return {
    numberOfGroups: distribution.length,
    distribution,
    valid: allValid && remaining === 0,
    message: allValid ? undefined : "Distribution impossible avec ces contraintes"
  }
}

export function suggestGroupConfiguration(totalPlayers: number): {
  config: { numberOfGroups: number; playersPerGroup: number[] }
  description: string
} | null {
  const result = calculateOptimalDistribution(totalPlayers)
  
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