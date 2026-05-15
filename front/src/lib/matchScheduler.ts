import type { Group } from "@/types/draw"
import type { MatchPairing, MatchAssignment, Match } from "@/types/match"

// --- Types ---

export interface PlayerConstraints {
    arrival: string
    departure: string
    unavailable: string[]
}

interface RoundInfo {
    pairings: MatchPairing[]
    byePlayerId: string | null
}

export interface GroupRound {
    groupId: string
    groupName: string
    roundIndex: number
    pairings: MatchPairing[]
    byePlayerId: string | null
}

export interface DatePlan {
    date: string
    pairings: MatchPairing[]
}

export interface UnplacedMatch {
    pairing: MatchPairing
    date: string
    reason: string
}

export interface ScheduleResult {
    assignments: MatchAssignment[]
    unplaced: UnplacedMatch[]
}

// --- Schedule templates ---

// SCHEDULE_TEMPLATES[n][i][j] = date index on which players at positions i and j play.
// -1 = diagonal (player vs self, never used).
export const SCHEDULE_TEMPLATES: Record<number, number[][]> = {
    2: [
        [-1,  0],
        [ 0, -1],
    ],
    3: [
        [-1,  0,  1],
        [ 0, -1,  2],
        [ 1,  2, -1],
    ],
    4: [
        [-1,  0,  1,  2],
        [ 0, -1,  2,  1],
        [ 1,  2, -1,  0],
        [ 2,  1,  0, -1],
    ],
    5: [
        [-1,  0,  1,  2,  3],
        [ 0, -1,  4,  1,  2],
        [ 1,  4, -1,  3,  0],
        [ 2,  1,  3, -1,  4],
        [ 3,  2,  0,  4, -1],
    ],
    6: [
        [-1,  0,  1,  2,  3,  4],
        [ 0, -1,  4,  1,  2,  3],
        [ 1,  4, -1,  3,  0,  2],
        [ 2,  1,  3, -1,  4,  0],
        [ 3,  2,  0,  4, -1,  1],
        [ 4,  3,  2,  0,  1, -1],
    ],
    7: [
        [-1,  0,  1,  2,  3,  4,  5],
        [ 0, -1,  4,  1,  5,  2,  6],
        [ 1,  4, -1,  5,  2,  6,  3],
        [ 2,  1,  5, -1,  6,  3,  0],
        [ 3,  5,  2,  6, -1,  0,  4],
        [ 4,  2,  6,  3,  0, -1,  1],
        [ 5,  6,  3,  0,  4,  1, -1],
    ],
}

// --- Time utilities ---

function parseTimeToMinutes(t: string): number {
    const match = t.match(/(\d{1,2}):(\d{2})/)
    if (!match) return 0
    return parseInt(match[1], 10) * 60 + parseInt(match[2], 10)
}

// "00:00" or empty = no departure constraint = end of day
function parseDepartureMinutes(departure: string | undefined): number {
    if (!departure || departure === "00:00") return 24 * 60
    return parseTimeToMinutes(departure)
}

export function calculateTimeSlots(startTime: string, endTime: string, durationMinutes: number): string[] {
    const startMin = parseTimeToMinutes(startTime)
    const endMin = parseTimeToMinutes(endTime)
    const slots: string[] = []

    for (let m = startMin; m + durationMinutes <= endMin; m += durationMinutes) {
        const h = Math.floor(m / 60).toString().padStart(2, '0')
        const min = (m % 60).toString().padStart(2, '0')
        slots.push(`${h}:${min}`)
    }

    return slots
}

export function calculateDates(startDate: string, endDate: string, playingDates?: string[] | null): string[] {
    if (playingDates && playingDates.length > 0) {
        return [...playingDates].sort()
    }

    const dates: string[] = []
    const current = new Date(startDate)
    const end = new Date(endDate)

    while (current <= end) {
        dates.push(current.toISOString().split('T')[0])
        current.setDate(current.getDate() + 1)
    }

    return dates
}

// --- Player constraints ---

function getAvailabilityWindow(
    player1Id: string,
    player2Id: string,
    _date: string,
    constraints: Map<string, PlayerConstraints>
): { start: number; end: number } {
    const c1 = constraints.get(player1Id)
    const c2 = constraints.get(player2Id)

    return {
        start: Math.max(
            c1?.arrival ? parseTimeToMinutes(c1.arrival) : 0,
            c2?.arrival ? parseTimeToMinutes(c2.arrival) : 0,
        ),
        end: Math.min(
            parseDepartureMinutes(c1?.departure),
            parseDepartureMinutes(c2?.departure),
        ),
    }
}

function getAbsentPlayers(
    player1Id: string,
    player2Id: string,
    date: string,
    constraints: Map<string, PlayerConstraints>
): string[] {
    const absent: string[] = []
    if (constraints.get(player1Id)?.unavailable.includes(date)) absent.push(player1Id)
    if (constraints.get(player2Id)?.unavailable.includes(date)) absent.push(player2Id)
    return absent
}

export function validateMatchSlot(
    player1Id: string,
    player2Id: string,
    date: string,
    time: string,
    constraints: Map<string, PlayerConstraints>,
    durationMinutes: number,
    playerNames?: { player1Name: string; player2Name: string }
): { valid: boolean; warnings: string[] } {
    const warnings: string[] = []
    const slotStart = parseTimeToMinutes(time)
    const slotEnd = slotStart + durationMinutes

    const name1 = playerNames?.player1Name ?? player1Id
    const name2 = playerNames?.player2Name ?? player2Id

    const c1 = constraints.get(player1Id)
    const c2 = constraints.get(player2Id)

    const arrival1 = c1?.arrival ? parseTimeToMinutes(c1.arrival) : 0
    const arrival2 = c2?.arrival ? parseTimeToMinutes(c2.arrival) : 0
    const departure1 = parseDepartureMinutes(c1?.departure)
    const departure2 = parseDepartureMinutes(c2?.departure)

    let valid = true

    if (slotStart < arrival1) { warnings.push(`${name1} n'arrive qu'à ${c1!.arrival}`); valid = false }
    if (slotStart < arrival2) { warnings.push(`${name2} n'arrive qu'à ${c2!.arrival}`); valid = false }
    if (slotEnd > departure1) { warnings.push(`${name1} part à ${c1!.departure}`); valid = false }
    if (slotEnd > departure2) { warnings.push(`${name2} part à ${c2!.departure}`); valid = false }

    // Absences are soft constraints (warning only, valid stays true)
    if (c1?.unavailable.includes(date)) warnings.push(`${name1} est absent le ${date}`)
    if (c2?.unavailable.includes(date)) warnings.push(`${name2} est absent le ${date}`)

    return { valid, warnings }
}

// --- Round generation ---

function generateCircleRounds(
    players: { id: string; first_name: string; last_name: string }[],
    groupId: string,
    groupName: string
): RoundInfo[] {
    const n = players.length
    const isOdd = n % 2 !== 0
    const totalPositions = isOdd ? n + 1 : n
    const numRounds = totalPositions - 1
    const matchesPerRound = totalPositions / 2
    const rounds: RoundInfo[] = []

    // Player at index 0 is fixed; others rotate in reverse order so A plays B in R1, C in R2, etc.
    const rest = players.slice(1).map((_, i) => i + 1).reverse()
    const rotating = isOdd ? [-1, ...rest] : [...rest]

    for (let round = 0; round < numRounds; round++) {
        const roundPairings: MatchPairing[] = []
        let byePlayerId: string | null = null
        const current = [0, ...rotating]

        for (let m = 0; m < matchesPerRound; m++) {
            const i = current[m]
            const j = current[totalPositions - 1 - m]

            if (i === -1) { byePlayerId = players[j].id; continue }
            if (j === -1) { byePlayerId = players[i].id; continue }

            const p1 = players[i]
            const p2 = players[j]
            roundPairings.push({
                groupId,
                groupName,
                player1Id: p1.id,
                player2Id: p2.id,
                player1Name: `${p1.first_name} ${p1.last_name}`,
                player2Name: `${p2.first_name} ${p2.last_name}`,
            })
        }

        rounds.push({ pairings: roundPairings, byePlayerId })
        rotating.unshift(rotating.pop()!)
    }

    return rounds
}

// For odd-sized groups, aligns the bye slot to a date where that player is absent.
function optimizeRoundOrder(
    rounds: RoundInfo[],
    dates: string[],
    absences: Map<string, string[]>
): RoundInfo[] {
    if (rounds.every(r => r.byePlayerId === null)) return rounds

    const result = new Array<RoundInfo | null>(rounds.length).fill(null)
    const usedRounds = new Set<number>()

    for (let dateIdx = 0; dateIdx < dates.length && dateIdx < rounds.length; dateIdx++) {
        const date = dates[dateIdx]
        for (let roundIdx = 0; roundIdx < rounds.length; roundIdx++) {
            if (usedRounds.has(roundIdx)) continue
            const round = rounds[roundIdx]
            if (!round.byePlayerId) continue
            if (absences.get(round.byePlayerId)?.includes(date)) {
                result[dateIdx] = round
                usedRounds.add(roundIdx)
                break
            }
        }
    }

    let nextFreePos = 0
    for (let roundIdx = 0; roundIdx < rounds.length; roundIdx++) {
        if (usedRounds.has(roundIdx)) continue
        while (nextFreePos < result.length && result[nextFreePos] !== null) nextFreePos++
        if (nextFreePos < result.length) result[nextFreePos] = rounds[roundIdx]
    }

    return result.filter((r): r is RoundInfo => r !== null)
}

export function generateGroupRounds(
    groups: Group[],
    dates?: string[],
    absences?: Map<string, string[]>
): GroupRound[][] {
    return groups.map(group => {
        const players = group.players || []
        if (players.length < 2) return []

        let rounds = generateCircleRounds(players, group.id, group.group_name)
        if (dates && absences && absences.size > 0) {
            rounds = optimizeRoundOrder(rounds, dates, absences)
        }

        return rounds.map((r, i) => ({
            groupId: group.id,
            groupName: group.group_name,
            roundIndex: i,
            pairings: r.pairings,
            byePlayerId: r.byePlayerId,
        }))
    })
}

export function generateRoundRobinPairings(
    groups: Group[],
    dates?: string[],
    absences?: Map<string, string[]>
): MatchPairing[] {
    const groupRounds = generateGroupRounds(groups, dates, absences)
    const result: MatchPairing[] = []
    const maxRounds = Math.max(0, ...groupRounds.map(r => r.length))

    for (let round = 0; round < maxRounds; round++) {
        for (const rounds of groupRounds) {
            if (round < rounds.length) result.push(...rounds[round].pairings)
        }
    }

    return result
}

// Greedy assignment placing players with absence constraints at positions that have a bye on their absent date.
export function optimizePlayerOrderForAbsences<T extends { id: string }>(
    players: T[],
    template: number[][],
    dates: string[],
    absences: Map<string, string[]>
): T[] {
    const n = players.length
    if (n < 2 || absences.size === 0) return players

    const hasMatchOnDate = (pos: number, dateIdx: number): boolean =>
        Array.from({ length: n }, (_, j) => j).some(j => j !== pos && template[pos][j] === dateIdx)

    const costMatrix: number[][] = players.map(player => {
        const playerAbsences = (absences.get(player.id) || []).filter(d => dates.includes(d))
        return Array.from({ length: n }, (_, pos) =>
            playerAbsences.reduce((cost, absDate) => {
                const dateIdx = dates.indexOf(absDate)
                return dateIdx === -1 ? cost : cost + (hasMatchOnDate(pos, dateIdx) ? 1 : 0)
            }, 0)
        )
    })

    const assignedPlayers = new Set<number>()
    const assignedPositions = new Set<number>()
    const result = new Array<T>(n)

    const triples = players
        .flatMap((_, pi) => Array.from({ length: n }, (__, pos) => ({ playerIdx: pi, pos, cost: costMatrix[pi][pos] })))
        .sort((a, b) => a.cost - b.cost || a.playerIdx - b.playerIdx)

    for (const { playerIdx, pos } of triples) {
        if (assignedPlayers.has(playerIdx) || assignedPositions.has(pos)) continue
        result[pos] = players[playerIdx]
        assignedPlayers.add(playerIdx)
        assignedPositions.add(pos)
    }

    return result
}

// --- Date mapping ---

export function mapRoundsToDates(
    groupRounds: GroupRound[][],
    dates: string[]
): DatePlan[] {
    const plans: DatePlan[] = dates.map(date => ({ date, pairings: [] }))

    for (const rounds of groupRounds) {
        for (let i = 0; i < rounds.length; i++) {
            if (i < dates.length) {
                plans[i].pairings.push(...rounds[i].pairings)
            } else {
                const leastLoaded = plans.reduce((min, p) => p.pairings.length < min.pairings.length ? p : min)
                leastLoaded.pairings.push(...rounds[i].pairings)
            }
        }
    }

    return plans
}

export function mapRoundsToDatesByTemplate(
    groupRounds: GroupRound[][],
    groups: Group[],
    dates: string[]
): DatePlan[] {
    const plans: DatePlan[] = dates.map(date => ({ date, pairings: [] }))

    for (let gi = 0; gi < groupRounds.length; gi++) {
        const rounds = groupRounds[gi]
        const players = groups[gi]?.players ?? []
        const template = SCHEDULE_TEMPLATES[players.length]

        for (let ri = 0; ri < rounds.length; ri++) {
            for (const pairing of rounds[ri].pairings) {
                let dateIdx: number
                if (template) {
                    const pos1 = players.findIndex(p => p.id === pairing.player1Id)
                    const pos2 = players.findIndex(p => p.id === pairing.player2Id)
                    dateIdx = pos1 >= 0 && pos2 >= 0 ? template[pos1][pos2] : ri
                } else {
                    dateIdx = ri
                }
                const safeDateIdx = dateIdx % dates.length
                if (safeDateIdx >= 0 && safeDateIdx < plans.length) {
                    plans[safeDateIdx].pairings.push(pairing)
                }
            }
        }
    }

    return plans
}

// --- Slot assignment ---

function sortByAvailabilityTightness(
    pairings: MatchPairing[],
    date: string,
    constraints: Map<string, PlayerConstraints>,
): MatchPairing[] {
    return [...pairings].sort((a, b) => {
        const wa = getAvailabilityWindow(a.player1Id, a.player2Id, date, constraints)
        const wb = getAvailabilityWindow(b.player1Id, b.player2Id, date, constraints)
        return Math.max(0, wa.end - wa.start) - Math.max(0, wb.end - wb.start)
    })
}

function distanceToWindowForDate(
    slot: { time: string },
    pairing: MatchPairing,
    date: string,
    constraints: Map<string, PlayerConstraints>,
    durationMinutes: number
): number {
    const window = getAvailabilityWindow(pairing.player1Id, pairing.player2Id, date, constraints)
    const slotStart = parseTimeToMinutes(slot.time)
    const slotEnd = slotStart + durationMinutes

    if (window.start > window.end) return Math.abs(slotStart - window.start)
    if (slotStart >= window.start && slotEnd <= window.end) return 0

    return Math.max(
        window.start > slotStart ? window.start - slotStart : 0,
        slotEnd > window.end ? slotEnd - window.end : 0,
    )
}

function pickBestTimeSlot(
    candidates: { time: string; court: string }[],
    pairing: MatchPairing,
    date: string,
    constraints: Map<string, PlayerConstraints>,
    matchDuration: number
): { time: string; court: string } | null {
    if (candidates.length === 0) return null

    const inWindow: typeof candidates = []
    const outWindow: typeof candidates = []

    for (const slot of candidates) {
        const window = getAvailabilityWindow(pairing.player1Id, pairing.player2Id, date, constraints)
        const slotStart = parseTimeToMinutes(slot.time)
        if (slotStart >= window.start && slotStart + matchDuration <= window.end) {
            inWindow.push(slot)
        } else {
            outWindow.push(slot)
        }
    }

    if (inWindow.length > 0) return inWindow[0]
    if (outWindow.length === 0) return null

    return outWindow.reduce((best, slot) => {
        const bestDist = distanceToWindowForDate(best, pairing, date, constraints, matchDuration)
        const slotDist = distanceToWindowForDate(slot, pairing, date, constraints, matchDuration)
        return slotDist < bestDist ? slot : best
    })
}

function findBestTimeSlot(
    pairing: MatchPairing,
    date: string,
    timeSlots: string[],
    numberOfCourts: number,
    occupied: Map<string, Set<string>>,
    courtUsed: Map<string, Set<string>>,
    constraints: Map<string, PlayerConstraints>,
    matchDuration: number
): { time: string; court: string } | null {
    const candidates: { time: string; court: string }[] = []

    for (const time of timeSlots) {
        const occ = occupied.get(time)
        if (occ && (occ.has(pairing.player1Id) || occ.has(pairing.player2Id))) continue

        const used = courtUsed.get(time) || new Set()
        for (let c = 1; c <= numberOfCourts; c++) {
            const court = `Terrain ${c}`
            if (!used.has(court)) {
                candidates.push({ time, court })
                break
            }
        }
    }

    return candidates.length === 0 ? null : pickBestTimeSlot(candidates, pairing, date, constraints, matchDuration)
}

export function assignTimeSlotsForDates(
    datePlans: DatePlan[],
    timeSlots: string[],
    numberOfCourts: number,
    constraints?: Map<string, PlayerConstraints>,
    durationMinutes?: number
): ScheduleResult {
    const allAssignments: MatchAssignment[] = []
    const unplaced: UnplacedMatch[] = []
    const playerConstraints = constraints || new Map<string, PlayerConstraints>()
    const matchDuration = durationMinutes || 30

    for (const plan of datePlans) {
        const occupied = new Map<string, Set<string>>()
        const courtUsed = new Map<string, Set<string>>()
        const sorted = sortByAvailabilityTightness(plan.pairings, plan.date, playerConstraints)

        for (const pairing of sorted) {
            const absentPlayerIds = getAbsentPlayers(pairing.player1Id, pairing.player2Id, plan.date, playerConstraints)
            const slot = findBestTimeSlot(pairing, plan.date, timeSlots, numberOfCourts, occupied, courtUsed, playerConstraints, matchDuration)

            if (!slot) {
                unplaced.push({ pairing, date: plan.date, reason: `Aucun créneau disponible le ${plan.date}` })
                continue
            }

            allAssignments.push({
                ...pairing,
                matchDate: plan.date,
                matchTime: slot.time,
                courtNumber: slot.court,
                ...(absentPlayerIds.length > 0 ? { absentPlayerIds } : {}),
            })

            if (!occupied.has(slot.time)) occupied.set(slot.time, new Set())
            occupied.get(slot.time)!.add(pairing.player1Id)
            occupied.get(slot.time)!.add(pairing.player2Id)

            if (!courtUsed.has(slot.time)) courtUsed.set(slot.time, new Set())
            courtUsed.get(slot.time)!.add(slot.court)
        }
    }

    return { assignments: allAssignments, unplaced }
}

// --- Utilities ---

export function totalMatchCount(groups: Group[]): number {
    return groups.reduce((total, group) => {
        const n = (group.players || []).length
        return total + (n * (n - 1)) / 2
    }, 0)
}

export function totalSlotCount(datesCount: number, timeSlotsCount: number, numberOfCourts: number): number {
    return datesCount * timeSlotsCount * numberOfCourts
}

export function sortPlayersByEarliestDates(
    group: Group,
    assignments: MatchAssignment[] | Match[]
): Group {
    const players = group.players || []
    if (players.length < 2) return { ...group }

    const groupPlayerIds = new Set(players.map(p => p.id))
    const normalized = assignments.map(a => ({
        p1: "player1Id" in a ? a.player1Id : a.player1_id,
        p2: "player2Id" in a ? a.player2Id : a.player2_id,
        date: "matchDate" in a ? a.matchDate : a.match_date,
    })).filter(a => groupPlayerIds.has(a.p1) && groupPlayerIds.has(a.p2))

    if (normalized.length === 0) return { ...group, players: [...players] }

    const playerDatesMap = new Map<string, string[]>()
    for (const player of players) {
        playerDatesMap.set(
            player.id,
            normalized.filter(a => a.p1 === player.id || a.p2 === player.id).map(a => a.date).sort()
        )
    }

    const sortedByGlobalDates = [...players].sort((a, b) => {
        const datesA = playerDatesMap.get(a.id) || []
        const datesB = playerDatesMap.get(b.id) || []
        const maxLen = Math.max(datesA.length, datesB.length)
        for (let i = 0; i < maxLen; i++) {
            const cmp = (datesA[i] || "").localeCompare(datesB[i] || "")
            if (cmp !== 0) return cmp
        }
        return 0
    })

    const playerA = sortedByGlobalDates[0]

    const dateVsA = new Map<string, string>()
    for (const match of normalized) {
        if (match.p1 === playerA.id) dateVsA.set(match.p2, match.date)
        else if (match.p2 === playerA.id) dateVsA.set(match.p1, match.date)
    }

    const others = sortedByGlobalDates.slice(1).sort((a, b) =>
        (dateVsA.get(a.id) || "").localeCompare(dateVsA.get(b.id) || "")
    )

    return { ...group, players: [playerA, ...others] }
}
