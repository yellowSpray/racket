import type { Group, GroupPlayer } from "@/types/draw"
import type { GroupStandings, PromotionResult } from "@/types/ranking"
import { calculateAllDistributions } from "@/lib/groupDistributionCalculator"

function cascadeOverflow(
    boxes: GroupPlayer[][],
    distribution: number[],
    startIndex: number
): void {
    for (let i = startIndex; i < boxes.length; i++) {
        if (boxes[i].length <= distribution[i]) break

        // Find weakest player in this box
        let weakestIdx = 0
        let weakestPR = boxes[i][0].power_ranking || 0
        for (let j = 1; j < boxes[i].length; j++) {
            const pr = boxes[i][j].power_ranking || 0
            if (pr < weakestPR) {
                weakestPR = pr
                weakestIdx = j
            }
        }

        // If last box, nowhere to cascade — stop
        if (i === boxes.length - 1) break

        // Remove weakest and push to next box
        const [weakest] = boxes[i].splice(weakestIdx, 1)
        boxes[i + 1].push(weakest)
    }
}

/**
 * Builds proposed groups for the next event based on promotion/relegation results.
 *
 * Algorithm:
 * 1. Apply promo/relegation moves to assign existing players to their new box
 * 2. Staying players keep their current box
 * 3. Filter out unregistered players
 * 4. Calculate the required number of boxes (may change with arrivals/departures)
 * 5. If box count changes, redistribute existing players by tier order
 * 6. Insert new players into the right box based on their power_ranking
 */
export function buildProposedGroups(
    previousGroups: Group[],
    _standings: GroupStandings[],
    promotionResult: PromotionResult,
    registeredPlayerIds?: Set<string>,
    newPlayers?: GroupPlayer[],
    maxPlayersPerGroup?: number
): Group[] {
    const effectiveMaxPlayers = maxPlayersPerGroup ?? previousGroups[0]?.max_players ?? 6

    // Build a player lookup from all previous groups
    const playerMap = new Map<string, GroupPlayer>()
    for (const group of previousGroups) {
        for (const player of group.players || []) {
            playerMap.set(player.id, player)
        }
    }

    // Also index new players
    for (const p of newPlayers || []) {
        playerMap.set(p.id, p)
    }

    // Step 1-2: Assign existing players to boxes via promo/relegation
    // Map groupId (previous) → index in previousGroups
    const groupIndexMap = new Map<string, number>()
    for (let i = 0; i < previousGroups.length; i++) {
        groupIndexMap.set(previousGroups[i].id, i)
    }

    // playerBoxIndex: playerId → box index (0 = top tier)
    const playerBoxIndex = new Map<string, number>()

    // Staying players keep their box
    for (const sp of promotionResult.stayingPlayers) {
        const idx = groupIndexMap.get(sp.groupId)
        if (idx !== undefined) {
            playerBoxIndex.set(sp.playerId, idx)
        }
    }

    // Moved players go to their target box
    for (const move of promotionResult.moves) {
        const idx = groupIndexMap.get(move.toGroupId)
        if (idx !== undefined) {
            playerBoxIndex.set(move.playerId, idx)
        }
    }

    // Step 3: Filter unregistered players
    const existingPlayers: { player: GroupPlayer; boxIndex: number }[] = []
    for (const [playerId, boxIndex] of playerBoxIndex) {
        if (registeredPlayerIds && !registeredPlayerIds.has(playerId)) continue
        const player = playerMap.get(playerId)
        if (player) {
            existingPlayers.push({ player, boxIndex })
        }
    }

    // Collect filtered new players
    const filteredNewPlayers = (newPlayers || []).filter(
        p => !registeredPlayerIds || registeredPlayerIds.has(p.id)
    )

    const totalPlayers = existingPlayers.length + filteredNewPlayers.length
    if (totalPlayers === 0) return []

    // Step 4: Calculate number of boxes needed
    const allDistributions = calculateAllDistributions(totalPlayers, effectiveMaxPlayers)
    const bestDistribution = allDistributions.length > 0
        ? allDistributions[allDistributions.length - 1] // most groups
        : null

    const numberOfBoxes = bestDistribution
        ? bestDistribution.distribution.length
        : 1
    const distribution = bestDistribution
        ? bestDistribution.distribution
        : [totalPlayers]

    // Step 5: Build boxes with existing players
    // Sort existing players within each box by their standings rank (keep promo order)
    const boxes: GroupPlayer[][] = Array.from({ length: numberOfBoxes }, () => [])

    if (numberOfBoxes === previousGroups.length) {
        // Same box count: direct placement
        for (const { player, boxIndex } of existingPlayers) {
            if (boxIndex < numberOfBoxes) {
                boxes[boxIndex].push(player)
            } else {
                // Box was removed, put in last box
                boxes[numberOfBoxes - 1].push(player)
            }
        }
    } else {
        // Box count changed: redistribute by sorted order (top players in top box)
        // Sort all existing by boxIndex first, then by power_ranking descending within same box
        const sorted = [...existingPlayers].sort((a, b) => {
            if (a.boxIndex !== b.boxIndex) return a.boxIndex - b.boxIndex
            return (b.player.power_ranking || 0) - (a.player.power_ranking || 0)
        })

        // Place into new boxes according to distribution (without new players for now)
        // First, calculate how many existing slots per box
        let playerIdx = 0
        for (let i = 0; i < numberOfBoxes && playerIdx < sorted.length; i++) {
            const capacity = distribution[i]
            const toPlace = Math.min(capacity, sorted.length - playerIdx)
            for (let j = 0; j < toPlace; j++) {
                boxes[i].push(sorted[playerIdx].player)
                playerIdx++
            }
        }
        // Remaining players go to last box
        while (playerIdx < sorted.length) {
            boxes[numberOfBoxes - 1].push(sorted[playerIdx].player)
            playerIdx++
        }
    }

    // Step 6: Insert new players by power_ranking (strongest first for determinism)
    const sortedNewPlayers = [...filteredNewPlayers].sort(
        (a, b) => (b.power_ranking || 0) - (a.power_ranking || 0)
    )

    for (const newPlayer of sortedNewPlayers) {
        const pr = newPlayer.power_ranking || 0
        let bestBox = numberOfBoxes - 1 // default: last box

        // Find the box where the player's PR fits best
        for (let i = 0; i < numberOfBoxes; i++) {
            const boxPlayers = boxes[i]
            if (boxPlayers.length === 0) {
                bestBox = i
                break
            }
            const minPR = Math.min(...boxPlayers.map(p => p.power_ranking || 0))
            if (pr >= minPR) {
                bestBox = i
                break
            }
        }

        boxes[bestBox].push(newPlayer)
        cascadeOverflow(boxes, distribution, bestBox)
    }

    // Build final groups
    const eventId = previousGroups[0]?.event_id || ""
    return boxes.map((players, i) => ({
        id: `proposed-new-${i}`,
        event_id: eventId,
        group_name: `Box ${i + 1}`,
        max_players: Math.max(effectiveMaxPlayers, players.length),
        created_at: "",
        players,
    }))
}
