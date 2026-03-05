import type { Group, GroupPlayer } from "@/types/draw"
import type { GroupStandings, PromotionResult } from "@/types/ranking"
import { calculateAllDistributions } from "@/lib/groupDistributionCalculator"

/**
 * Builds proposed new groups by full redistribution sorted by power_ranking.
 *
 * Algorithm:
 * 1. Collect all players from previous groups
 * 2. Filter out unregistered players
 * 3. Add new players
 * 4. Sort all by power_ranking descending
 * 5. calculateAllDistributions → pick distribution with MOST groups
 * 6. Slice sorted players into groups
 */
export function buildProposedGroups(
    previousGroups: Group[],
    _standings: GroupStandings[],
    _promotionResult: PromotionResult,
    registeredPlayerIds?: Set<string>,
    newPlayers?: GroupPlayer[],
    maxPlayersPerGroup?: number
): Group[] {
    const effectiveMaxPlayers = maxPlayersPerGroup ?? previousGroups[0]?.max_players ?? 6

    // Step 1: Collect all players from previous groups
    const previousPlayers = previousGroups.flatMap(g => g.players || [])

    // Step 2: Filter unregistered
    const registeredPrevious = registeredPlayerIds
        ? previousPlayers.filter(p => registeredPlayerIds.has(p.id))
        : previousPlayers

    // Step 3: Add new players
    const allPlayers = [...registeredPrevious, ...(newPlayers || [])]

    if (allPlayers.length === 0) return []

    // Step 4: Sort by power_ranking descending
    allPlayers.sort((a, b) => (parseFloat(b.power_ranking) || 0) - (parseFloat(a.power_ranking) || 0))

    // Step 5: Pick distribution with MOST groups
    const allDistributions = calculateAllDistributions(allPlayers.length, effectiveMaxPlayers)
    const bestDistribution = allDistributions.length > 0
        ? allDistributions[allDistributions.length - 1] // last = most groups
        : null

    if (!bestDistribution) {
        // Fallback: single group
        return [{
            id: "proposed-new-0",
            event_id: previousGroups[0]?.event_id || "",
            group_name: "Box 1",
            max_players: effectiveMaxPlayers,
            created_at: "",
            players: allPlayers,
        }]
    }

    // Step 6: Slice into groups
    const distribution = bestDistribution.distribution
    const proposedGroups: Group[] = []
    let playerIndex = 0

    for (let i = 0; i < distribution.length; i++) {
        const count = distribution[i]
        const groupPlayers = allPlayers.slice(playerIndex, playerIndex + count)
        playerIndex += count

        proposedGroups.push({
            id: `proposed-new-${i}`,
            event_id: previousGroups[0]?.event_id || "",
            group_name: `Box ${i + 1}`,
            max_players: effectiveMaxPlayers,
            created_at: "",
            players: groupPlayers,
        })
    }

    return proposedGroups
}
