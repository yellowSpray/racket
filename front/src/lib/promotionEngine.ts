import type { GroupStandings, PromotionMove, PromotionResult } from "@/types/ranking"
import type { PromotionRules } from "@/types/settings"

/**
 * Calcule les promotions et relegations entre groupes sur base des classements.
 *
 * @param standings - Classements de chaque groupe (depuis rankingEngine)
 * @param promotionRules - Config : nombre de promus / relegues par groupe
 * @param groupOrder - IDs des groupes tries du plus haut tier (index 0) au plus bas
 * @returns Liste des mouvements + joueurs restants dans leur groupe
 */
export function calculatePromotions(
  standings: GroupStandings[],
  promotionRules: PromotionRules,
  groupOrder: string[]
): PromotionResult {
  const { promoted_count, relegated_count } = promotionRules

  if (groupOrder.length <= 1 || (promoted_count === 0 && relegated_count === 0)) {
    const stayingPlayers = getAllStayingPlayers(standings, groupOrder)
    return { moves: [], stayingPlayers }
  }

  // Index standings by groupId for O(1) lookup
  const standingsMap = new Map<string, GroupStandings>()
  for (const gs of standings) {
    standingsMap.set(gs.groupId, gs)
  }

  // Only process groups present in groupOrder
  const orderedStandings = groupOrder
    .map((gId) => standingsMap.get(gId))
    .filter((gs): gs is GroupStandings => gs !== undefined)

  if (orderedStandings.length <= 1) {
    const stayingPlayers = getAllStayingPlayers(orderedStandings, groupOrder)
    return { moves: [], stayingPlayers }
  }

  const moves: PromotionMove[] = []
  const movedPlayerIds = new Set<string>()

  for (let i = 0; i < orderedStandings.length; i++) {
    const group = orderedStandings[i]
    const playersSorted = group.standings

    const isTopTier = i === 0
    const isBottomTier = i === orderedStandings.length - 1

    // Promotions: top N players move to higher tier (only if not top tier)
    if (!isTopTier && promoted_count > 0) {
      const higherGroup = orderedStandings[i - 1]
      const toPromote = playersSorted.slice(0, promoted_count)
      for (const player of toPromote) {
        movedPlayerIds.add(player.playerId)
        moves.push({
          playerId: player.playerId,
          playerName: player.playerName,
          fromGroupId: group.groupId,
          fromGroupName: group.groupName,
          toGroupId: higherGroup.groupId,
          toGroupName: higherGroup.groupName,
          type: "promotion",
        })
      }
    }

    // Relegations: bottom M players move to lower tier (only if not bottom tier)
    if (!isBottomTier && relegated_count > 0) {
      const lowerGroup = orderedStandings[i + 1]
      const toRelegate = playersSorted
        .slice(-relegated_count)
        .filter((p) => !movedPlayerIds.has(p.playerId))
      for (const player of toRelegate) {
        movedPlayerIds.add(player.playerId)
        moves.push({
          playerId: player.playerId,
          playerName: player.playerName,
          fromGroupId: group.groupId,
          fromGroupName: group.groupName,
          toGroupId: lowerGroup.groupId,
          toGroupName: lowerGroup.groupName,
          type: "relegation",
        })
      }
    }
  }

  // Staying players: everyone not moved
  const stayingPlayers: PromotionResult["stayingPlayers"] = []
  for (const group of orderedStandings) {
    for (const player of group.standings) {
      if (!movedPlayerIds.has(player.playerId)) {
        stayingPlayers.push({ playerId: player.playerId, groupId: group.groupId })
      }
    }
  }

  return { moves, stayingPlayers }
}

function getAllStayingPlayers(
  standings: GroupStandings[],
  groupOrder: string[]
): PromotionResult["stayingPlayers"] {
  const orderSet = new Set(groupOrder)
  return standings
    .filter((gs) => orderSet.has(gs.groupId))
    .flatMap((gs) =>
      gs.standings.map((p) => ({ playerId: p.playerId, groupId: gs.groupId }))
    )
}
