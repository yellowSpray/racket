import type { UnplacedMatch } from "@/lib/matchScheduler"

export interface SchedulerContext {
    totalMatches: number
    placedMatches: number
    dates: string[]
    timeSlotsPerDay: number
    courts: number
}

export type SuggestionType = 'add_courts' | 'add_dates' | 'check_player'

export interface Suggestion {
    type: SuggestionType
    message: string
    extra: number
    playerIds?: string[]
}

export interface UnplacedDetail {
    player1Name: string
    player2Name: string
    player1Id: string
    player2Id: string
    date: string
    groupName: string
    reason: string
}

export interface SchedulerDiagnostic {
    totalCount: number
    placedCount: number
    unplacedCount: number
    unplacedDetails: UnplacedDetail[]
    unplacedByDate: Map<string, UnplacedMatch[]>
    unplacedByGroup: Map<string, UnplacedMatch[]>
    suggestions: Suggestion[]
}

export function analyzeUnplaced(
    unplaced: UnplacedMatch[],
    context: SchedulerContext
): SchedulerDiagnostic {
    const unplacedByDate = new Map<string, UnplacedMatch[]>()
    const unplacedByGroup = new Map<string, UnplacedMatch[]>()

    for (const u of unplaced) {
        // By date
        if (!unplacedByDate.has(u.date)) unplacedByDate.set(u.date, [])
        unplacedByDate.get(u.date)!.push(u)

        // By group
        const gName = u.pairing.groupName
        if (!unplacedByGroup.has(gName)) unplacedByGroup.set(gName, [])
        unplacedByGroup.get(gName)!.push(u)
    }

    const unplacedDetails: UnplacedDetail[] = unplaced.map(u => ({
        player1Name: u.pairing.player1Name,
        player2Name: u.pairing.player2Name,
        player1Id: u.pairing.player1Id,
        player2Id: u.pairing.player2Id,
        date: u.date,
        groupName: u.pairing.groupName,
        reason: u.reason,
    }))

    const suggestions = generateSuggestions(unplaced, context)

    return {
        totalCount: context.totalMatches,
        placedCount: context.placedMatches,
        unplacedCount: unplaced.length,
        unplacedDetails,
        unplacedByDate,
        unplacedByGroup,
        suggestions,
    }
}

function generateSuggestions(
    unplaced: UnplacedMatch[],
    context: SchedulerContext
): Suggestion[] {
    if (unplaced.length === 0) return []

    const suggestions: Suggestion[] = []
    const totalSlots = context.dates.length * context.timeSlotsPerDay * context.courts
    const slotsPerDay = context.timeSlotsPerDay * context.courts
    const occupancyRate = totalSlots > 0 ? context.placedMatches / totalSlots : 0

    // Suggest adding courts if capacity is nearly full (>= 80% occupancy)
    if (occupancyRate >= 0.8) {
        const extraMatchesNeeded = unplaced.length
        const extraCourts = Math.ceil(
            extraMatchesNeeded / (context.dates.length * context.timeSlotsPerDay)
        )
        if (extraCourts > 0) {
            suggestions.push({
                type: 'add_courts',
                message: `Ajoutez ${extraCourts} terrain(s) pour accueillir les ${extraMatchesNeeded} match(s) restant(s)`,
                extra: extraCourts,
            })
        }
    }

    // Suggest adding dates if all existing dates have unplaced matches
    if (occupancyRate >= 0.8 || context.dates.length === 1) {
        const extraDates = Math.ceil(unplaced.length / slotsPerDay)
        if (extraDates > 0) {
            suggestions.push({
                type: 'add_dates',
                message: `Ajoutez ${extraDates} date(s) de jeu pour liberer des creneaux`,
                extra: extraDates,
            })
        }
    }

    // Check for players appearing frequently in unplaced matches
    const playerCounts = new Map<string, number>()
    for (const u of unplaced) {
        playerCounts.set(u.pairing.player1Id, (playerCounts.get(u.pairing.player1Id) || 0) + 1)
        playerCounts.set(u.pairing.player2Id, (playerCounts.get(u.pairing.player2Id) || 0) + 1)
    }

    const threshold = Math.max(2, Math.ceil(unplaced.length * 0.3))
    const problematicPlayers = Array.from(playerCounts.entries())
        .filter(([, count]) => count >= threshold)
        .map(([id]) => id)

    if (problematicPlayers.length > 0) {
        suggestions.push({
            type: 'check_player',
            message: `Verifiez les disponibilites de ${problematicPlayers.length} joueur(s) implique(s) dans plusieurs conflits`,
            extra: problematicPlayers.length,
            playerIds: problematicPlayers,
        })
    }

    return suggestions
}
