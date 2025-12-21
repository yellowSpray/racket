import type { GroupPlayer, Group } from "@/types/draw"

export function distributePlayersByRanking(
    players: GroupPlayer[], 
    numberOfGroups: number
): GroupPlayer[][] {
    
    // trier les joueurs par power_ranking
    const sortedPlayers = [...players].sort((a, b) => {
        const rankA = parseInt(a.power_ranking) || 0
        const rankB = parseInt(b.power_ranking) || 0
        return rankB - rankA
    })

    // creation de groupe vide
    const groups: GroupPlayer[][] = Array.from({ length: numberOfGroups }, () => [])

    // divise les joueurs par tranche
    const playersPerGroup = Math.ceil(sortedPlayers.length / numberOfGroups)

    sortedPlayers.forEach((player, index) => {
        const groupIndex = Math.floor(index / playersPerGroup)
        // s'assure que cela ne depasse pas le nombre de groupes
        const targetGroup = Math.min(groupIndex, numberOfGroups - 1)
        groups[targetGroup].push(player)
    })

    return groups
} 

// calcule la moyenne du power_ranking d'un groupe
export function calculateGroupAverage(players: GroupPlayer[]): number {
    if (players.length === 0) return 0

    const sum = players.reduce((total, player) => {
        return total + (parseInt(player.power_ranking) || 0)
    }, 0)

    return Math.round(sum / players.length)
}    

// suggestion de groupe pour nouveau joueur
export function suggestGroupForPlayer(
  playerRanking: number,
  groups: Group[]
): { groupId: string; groupName: string; averageRanking: number; difference: number } | null {
  
  if (groups.length === 0) return null

  // calculer la moyenne de chaque groupe et trouver le plus proche
  const groupsWithAverage = groups
    .map(group => {
      const players = group.players || []
      const average = calculateGroupAverage(players)
      const difference = Math.abs(playerRanking - average)
      
      return {
        groupId: group.id,
        groupName: group.group_name,
        averageRanking: average,
        difference,
        currentSize: players.length,
        maxSize: group.max_players
      }
    })
    // filtrer les groupes pleins
    .filter(g => g.currentSize < g.maxSize)
    // Trier par différence la plus faible
    .sort((a, b) => a.difference - b.difference)

  // retourner le groupe le plus proche
  if (groupsWithAverage.length > 0) {
    return groupsWithAverage[0]
  }

  return null
}
    
