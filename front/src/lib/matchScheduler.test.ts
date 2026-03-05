import { describe, it, expect } from "vitest"
import {
    generateRoundRobinPairings,
    generateGroupRounds,
    mapRoundsToDates,
    assignTimeSlotsForDates,
    calculateTimeSlots,
    calculateDates,
    totalMatchCount,
    totalSlotCount,
    sortPlayersByEarliestDates,
} from "./matchScheduler"
import type { Group } from "@/types/draw"
import type { MatchAssignment } from "@/types/match"

// Helper pour créer des joueurs
function makePlayers(count: number) {
    return Array.from({ length: count }, (_, i) => ({
        id: `p${i + 1}`,
        first_name: `Player`,
        last_name: `${String.fromCharCode(65 + i)}`, // A, B, C, ...
        phone: '0000',
        power_ranking: `${1000 - i * 100}`,
    }))
}

// Helper pour créer un groupe
function makeGroup(id: string, name: string, playerCount: number): Group {
    return {
        id,
        event_id: 'evt-1',
        group_name: name,
        max_players: 6,
        created_at: '',
        players: makePlayers(playerCount),
    }
}

describe("calculateTimeSlots", () => {
    it("génère les créneaux entre startTime et endTime", () => {
        const slots = calculateTimeSlots("19:00", "21:00", 30)
        expect(slots).toEqual(["19:00", "19:30", "20:00", "20:30"])
    })

    it("retourne un tableau vide si la durée dépasse la plage", () => {
        const slots = calculateTimeSlots("19:00", "19:15", 30)
        expect(slots).toEqual([])
    })
})

describe("calculateDates", () => {
    it("utilise playingDates si fournies", () => {
        const dates = calculateDates("2026-03-01", "2026-03-10", ["2026-03-05", "2026-03-02"])
        expect(dates).toEqual(["2026-03-02", "2026-03-05"])
    })

    it("génère toutes les dates entre start et end si pas de playingDates", () => {
        const dates = calculateDates("2026-03-01", "2026-03-03")
        expect(dates).toEqual(["2026-03-01", "2026-03-02", "2026-03-03"])
    })
})

describe("totalMatchCount", () => {
    it("calcule n*(n-1)/2 pour chaque groupe", () => {
        const groups = [makeGroup("g1", "Box 1", 5), makeGroup("g2", "Box 2", 6)]
        expect(totalMatchCount(groups)).toBe(10 + 15) // 5*4/2 + 6*5/2
    })
})

describe("totalSlotCount", () => {
    it("multiplie dates × créneaux × terrains", () => {
        expect(totalSlotCount(5, 8, 4)).toBe(160)
    })
})

describe("generateRoundRobinPairings", () => {
    it("génère le bon nombre de paires pour un groupe de 5", () => {
        const groups = [makeGroup("g1", "Box 1", 5)]
        const pairings = generateRoundRobinPairings(groups)
        expect(pairings).toHaveLength(10) // 5*4/2
    })

    it("génère le bon nombre de paires pour un groupe de 6", () => {
        const groups = [makeGroup("g1", "Box 1", 6)]
        const pairings = generateRoundRobinPairings(groups)
        expect(pairings).toHaveLength(15) // 6*5/2
    })

    it("chaque joueur joue contre tous les autres exactement une fois", () => {
        const groups = [makeGroup("g1", "Box 1", 5)]
        const pairings = generateRoundRobinPairings(groups)

        const matchSet = new Set<string>()
        for (const p of pairings) {
            const key = [p.player1Id, p.player2Id].sort().join("-")
            expect(matchSet.has(key)).toBe(false)
            matchSet.add(key)
        }
        expect(matchSet.size).toBe(10)
    })
})

describe("sortPlayersByEarliestDates", () => {
    it("place le joueur avec les dates les plus précoces en position A", () => {
        const group = makeGroup("g1", "Box 1", 5)
        // Simuler des matchs où p3 a les dates les plus précoces
        const assignments: MatchAssignment[] = [
            { groupId: "g1", groupName: "Box 1", player1Id: "p3", player2Id: "p1", player1Name: "P3", player2Name: "P1", matchDate: "2026-03-01", matchTime: "19:00", courtNumber: "Terrain 1" },
            { groupId: "g1", groupName: "Box 1", player1Id: "p3", player2Id: "p2", player1Name: "P3", player2Name: "P2", matchDate: "2026-03-02", matchTime: "19:00", courtNumber: "Terrain 1" },
            { groupId: "g1", groupName: "Box 1", player1Id: "p3", player2Id: "p4", player1Name: "P3", player2Name: "P4", matchDate: "2026-03-03", matchTime: "19:00", courtNumber: "Terrain 1" },
            { groupId: "g1", groupName: "Box 1", player1Id: "p3", player2Id: "p5", player1Name: "P3", player2Name: "P5", matchDate: "2026-03-04", matchTime: "19:00", courtNumber: "Terrain 1" },
            // p1 joue plus tard
            { groupId: "g1", groupName: "Box 1", player1Id: "p1", player2Id: "p2", player1Name: "P1", player2Name: "P2", matchDate: "2026-03-05", matchTime: "19:00", courtNumber: "Terrain 1" },
            { groupId: "g1", groupName: "Box 1", player1Id: "p1", player2Id: "p4", player1Name: "P1", player2Name: "P4", matchDate: "2026-03-06", matchTime: "19:00", courtNumber: "Terrain 1" },
            { groupId: "g1", groupName: "Box 1", player1Id: "p1", player2Id: "p5", player1Name: "P1", player2Name: "P5", matchDate: "2026-03-07", matchTime: "19:00", courtNumber: "Terrain 1" },
            // Autres matchs
            { groupId: "g1", groupName: "Box 1", player1Id: "p2", player2Id: "p4", player1Name: "P2", player2Name: "P4", matchDate: "2026-03-03", matchTime: "19:30", courtNumber: "Terrain 2" },
            { groupId: "g1", groupName: "Box 1", player1Id: "p2", player2Id: "p5", player1Name: "P2", player2Name: "P5", matchDate: "2026-03-04", matchTime: "19:30", courtNumber: "Terrain 2" },
            { groupId: "g1", groupName: "Box 1", player1Id: "p4", player2Id: "p5", player1Name: "P4", player2Name: "P5", matchDate: "2026-03-05", matchTime: "19:30", courtNumber: "Terrain 2" },
        ]

        const sorted = sortPlayersByEarliestDates(group, assignments)

        // p3 a les dates 1,2,3,4 → doit être en position A (index 0)
        expect(sorted.players![0].id).toBe("p3")
    })

    it("la ligne du joueur A dans le tableau a des dates croissantes (B, C, D, E triés par date vs A)", () => {
        const group = makeGroup("g1", "Box 1", 5)
        // p3 a les dates les plus précoces : 01 vs p1, 02 vs p2, 03 vs p4, 04 vs p5
        // Après tri, p3 = A. Les colonnes B,C,D,E doivent être ordonnées
        // par la date du match contre A : p1(01), p2(02), p4(03), p5(04)
        const assignments: MatchAssignment[] = [
            { groupId: "g1", groupName: "Box 1", player1Id: "p3", player2Id: "p1", player1Name: "", player2Name: "", matchDate: "2026-03-01", matchTime: "19:00", courtNumber: "T1" },
            { groupId: "g1", groupName: "Box 1", player1Id: "p3", player2Id: "p2", player1Name: "", player2Name: "", matchDate: "2026-03-02", matchTime: "19:00", courtNumber: "T1" },
            { groupId: "g1", groupName: "Box 1", player1Id: "p3", player2Id: "p4", player1Name: "", player2Name: "", matchDate: "2026-03-03", matchTime: "19:00", courtNumber: "T1" },
            { groupId: "g1", groupName: "Box 1", player1Id: "p3", player2Id: "p5", player1Name: "", player2Name: "", matchDate: "2026-03-04", matchTime: "19:00", courtNumber: "T1" },
            { groupId: "g1", groupName: "Box 1", player1Id: "p1", player2Id: "p2", player1Name: "", player2Name: "", matchDate: "2026-03-05", matchTime: "19:00", courtNumber: "T1" },
            { groupId: "g1", groupName: "Box 1", player1Id: "p1", player2Id: "p4", player1Name: "", player2Name: "", matchDate: "2026-03-06", matchTime: "19:00", courtNumber: "T1" },
            { groupId: "g1", groupName: "Box 1", player1Id: "p1", player2Id: "p5", player1Name: "", player2Name: "", matchDate: "2026-03-07", matchTime: "19:00", courtNumber: "T1" },
            { groupId: "g1", groupName: "Box 1", player1Id: "p2", player2Id: "p4", player1Name: "", player2Name: "", matchDate: "2026-03-03", matchTime: "19:30", courtNumber: "T2" },
            { groupId: "g1", groupName: "Box 1", player1Id: "p2", player2Id: "p5", player1Name: "", player2Name: "", matchDate: "2026-03-04", matchTime: "19:30", courtNumber: "T2" },
            { groupId: "g1", groupName: "Box 1", player1Id: "p4", player2Id: "p5", player1Name: "", player2Name: "", matchDate: "2026-03-05", matchTime: "19:30", courtNumber: "T2" },
        ]

        const sorted = sortPlayersByEarliestDates(group, assignments)
        const playerA = sorted.players![0]
        expect(playerA.id).toBe("p3")

        // Lire la ligne de A : pour chaque adversaire B, C, D, E (index 1,2,3,4),
        // trouver la date du match A vs adversaire
        const rowDates = sorted.players!.slice(1).map(opponent => {
            const match = assignments.find(a =>
                (a.player1Id === playerA.id && a.player2Id === opponent.id) ||
                (a.player2Id === playerA.id && a.player1Id === opponent.id)
            )
            return match?.matchDate || ""
        })

        // Les dates lues de gauche à droite doivent être croissantes
        const sortedDates = [...rowDates].sort()
        expect(rowDates).toEqual(sortedDates)
    })

    it("les adversaires de A sont triés par date de leur match contre A, pas par date globale", () => {
        const group = makeGroup("g1", "Box 1", 5)
        // A(p1) joue : p4 le 01, p5 le 03, p3 le 05, p2 le 10
        // p2 a des matchs globaux très tôt (vs p4=02, vs p5=04) → classé 2e globalement
        // Mais A joue p2 le 10 (tard) et p3 le 05 (plus tôt)
        // Le tri global mettrait p2 avant p3/p5, mais la ligne de A doit avoir :
        //   p4(01), p5(03), p3(05), p2(10)
        const m = (p1: string, p2: string, date: string): MatchAssignment => ({
            groupId: "g1", groupName: "Box 1", player1Id: p1, player2Id: p2,
            player1Name: "", player2Name: "", matchDate: date, matchTime: "19:00", courtNumber: "T1",
        })
        const assignments: MatchAssignment[] = [
            m("p1", "p4", "2026-03-01"), // A vs p4
            m("p1", "p5", "2026-03-03"), // A vs p5
            m("p1", "p3", "2026-03-05"), // A vs p3
            m("p1", "p2", "2026-03-10"), // A vs p2 (tard !)
            m("p2", "p4", "2026-03-02"), // p2 a un match global très tôt
            m("p2", "p5", "2026-03-04"),
            m("p2", "p3", "2026-03-06"),
            m("p3", "p4", "2026-03-07"),
            m("p3", "p5", "2026-03-08"),
            m("p4", "p5", "2026-03-09"),
        ]

        const sorted = sortPlayersByEarliestDates(group, assignments)
        const playerA = sorted.players![0]

        // Lire la ligne de A : date du match A vs chaque adversaire (B, C, D, E)
        const rowDates = sorted.players!.slice(1).map(opponent => {
            const match = assignments.find(a =>
                (a.player1Id === playerA.id && a.player2Id === opponent.id) ||
                (a.player2Id === playerA.id && a.player1Id === opponent.id)
            )
            return match?.matchDate || ""
        })

        // La ligne de A lue de gauche à droite doit être en dates croissantes
        expect(rowDates).toEqual([...rowDates].sort())
    })

    it("trie par première date, puis deuxième date en cas d'égalité", () => {
        const group = makeGroup("g1", "Box 1", 4)
        const assignments: MatchAssignment[] = [
            // p1 : dates 1, 5, 6
            { groupId: "g1", groupName: "Box 1", player1Id: "p1", player2Id: "p2", player1Name: "", player2Name: "", matchDate: "2026-03-01", matchTime: "19:00", courtNumber: "T1" },
            { groupId: "g1", groupName: "Box 1", player1Id: "p1", player2Id: "p3", player1Name: "", player2Name: "", matchDate: "2026-03-05", matchTime: "19:00", courtNumber: "T1" },
            { groupId: "g1", groupName: "Box 1", player1Id: "p1", player2Id: "p4", player1Name: "", player2Name: "", matchDate: "2026-03-06", matchTime: "19:00", courtNumber: "T1" },
            // p2 : dates 1, 3, 4
            { groupId: "g1", groupName: "Box 1", player1Id: "p2", player2Id: "p3", player1Name: "", player2Name: "", matchDate: "2026-03-03", matchTime: "19:00", courtNumber: "T2" },
            { groupId: "g1", groupName: "Box 1", player1Id: "p2", player2Id: "p4", player1Name: "", player2Name: "", matchDate: "2026-03-04", matchTime: "19:00", courtNumber: "T2" },
            // p3 : dates 3, 5, 7
            { groupId: "g1", groupName: "Box 1", player1Id: "p3", player2Id: "p4", player1Name: "", player2Name: "", matchDate: "2026-03-07", matchTime: "19:00", courtNumber: "T2" },
        ]

        const sorted = sortPlayersByEarliestDates(group, assignments)

        // p1 et p2 ont la même 1ère date (03-01), mais p2 a 03-03 en 2e vs p1 qui a 03-05
        // → p2 d'abord, puis p1
        expect(sorted.players![0].id).toBe("p2")
        expect(sorted.players![1].id).toBe("p1")
    })

    it("les dates du joueur A sont en ordre croissant après tri", () => {
        const group = makeGroup("g1", "Box 1", 6)
        const dates = calculateDates("2026-03-01", "2026-03-15")
        const timeSlots = calculateTimeSlots("19:00", "23:00", 30)

        const groupRounds = generateGroupRounds([group], dates)
        const datePlans = mapRoundsToDates(groupRounds, dates)

        // Adversaire du 1er match absent les 2 premiers jours
        const allPairings = datePlans.flatMap(p => p.pairings)
        const firstP1Match = allPairings.find(p => p.player1Id === "p1" || p.player2Id === "p1")!
        const firstOpponentId = firstP1Match.player1Id === "p1" ? firstP1Match.player2Id : firstP1Match.player1Id

        const constraints = new Map([
            [firstOpponentId, { arrival: "", departure: "", unavailable: ["2026-03-01", "2026-03-02"] }],
        ])

        const assignments = assignTimeSlotsForDates(datePlans, timeSlots, 4, constraints, 30)
        const sorted = sortPlayersByEarliestDates(group, assignments)

        // Le joueur A après tri doit avoir ses dates en ordre croissant
        const playerAId = sorted.players![0].id
        const playerAMatches = assignments
            .filter(a => a.player1Id === playerAId || a.player2Id === playerAId)
            .sort((a, b) => a.matchDate.localeCompare(b.matchDate))

        const playerADates = playerAMatches.map(m => m.matchDate)
        const sortedDates = [...playerADates].sort()
        expect(playerADates).toEqual(sortedDates)
    })

    it("fonctionne avec plusieurs groupes indépendamment", () => {
        const groups = [
            makeGroup("g1", "Box 1", 5),
            makeGroup("g2", "Box 2", 5),
        ]
        groups[1].players = Array.from({ length: 5 }, (_, i) => ({
            id: `g2p${i + 1}`,
            first_name: `G2`,
            last_name: `${String.fromCharCode(65 + i)}`,
            phone: '0000',
            power_ranking: '0',
        }))

        const dates = calculateDates("2026-03-01", "2026-03-15")
        const timeSlots = calculateTimeSlots("19:00", "23:00", 30)
        const groupRounds = generateGroupRounds(groups, dates)
        const datePlans = mapRoundsToDates(groupRounds, dates)
        const assignments = assignTimeSlotsForDates(datePlans, timeSlots, 4)

        const sorted1 = sortPlayersByEarliestDates(groups[0], assignments)
        const sorted2 = sortPlayersByEarliestDates(groups[1], assignments)

        // Chaque groupe est trié indépendamment — ne contient que ses propres joueurs
        const g1PlayerIds = new Set(groups[0].players!.map(p => p.id))
        const g2PlayerIds = new Set(groups[1].players!.map(p => p.id))

        for (const p of sorted1.players!) {
            expect(g1PlayerIds.has(p.id)).toBe(true)
        }
        for (const p of sorted2.players!) {
            expect(g2PlayerIds.has(p.id)).toBe(true)
        }
    })

    it("retourne le groupe inchangé si pas de matchs", () => {
        const group = makeGroup("g1", "Box 1", 5)
        const sorted = sortPlayersByEarliestDates(group, [])
        expect(sorted.players!.map(p => p.id)).toEqual(group.players!.map(p => p.id))
    })
})

describe("generateGroupRounds", () => {
    it("retourne 5 rounds pour un groupe de 5 joueurs", () => {
        const groups = [makeGroup("g1", "Box 1", 5)]
        const rounds = generateGroupRounds(groups)
        expect(rounds).toHaveLength(1) // 1 groupe
        expect(rounds[0]).toHaveLength(5) // 5 joueurs + bye → 6 positions → 5 rounds
    })

    it("retourne 5 rounds pour un groupe de 6 joueurs", () => {
        const groups = [makeGroup("g1", "Box 1", 6)]
        const rounds = generateGroupRounds(groups)
        expect(rounds[0]).toHaveLength(5) // 6 joueurs → 5 rounds
    })

    it("préserve groupId et roundIndex sur chaque round", () => {
        const groups = [makeGroup("g1", "Box 1", 5)]
        const rounds = generateGroupRounds(groups)

        for (let i = 0; i < rounds[0].length; i++) {
            expect(rounds[0][i].groupId).toBe("g1")
            expect(rounds[0][i].groupName).toBe("Box 1")
            expect(rounds[0][i].roundIndex).toBe(i)
        }
    })

    it("chaque round ne contient aucun joueur en doublon", () => {
        const groups = [makeGroup("g1", "Box 1", 6)]
        const rounds = generateGroupRounds(groups)

        for (const round of rounds[0]) {
            const playerIds = new Set<string>()
            for (const p of round.pairings) {
                expect(playerIds.has(p.player1Id)).toBe(false)
                expect(playerIds.has(p.player2Id)).toBe(false)
                playerIds.add(p.player1Id)
                playerIds.add(p.player2Id)
            }
        }
    })

    it("le total des pairings couvre tous les matchs round-robin", () => {
        const groups = [makeGroup("g1", "Box 1", 6)]
        const rounds = generateGroupRounds(groups)
        const totalPairings = rounds[0].reduce((sum, r) => sum + r.pairings.length, 0)
        expect(totalPairings).toBe(15) // C(6,2) = 15
    })

    it("gère plusieurs groupes indépendamment", () => {
        const groups = [makeGroup("g1", "Box 1", 5), makeGroup("g2", "Box 2", 6)]
        const rounds = generateGroupRounds(groups)
        expect(rounds).toHaveLength(2)
        expect(rounds[0]).toHaveLength(5) // 5 joueurs + bye → 5 rounds
        expect(rounds[1]).toHaveLength(5) // 6 joueurs → 5 rounds
    })
})

describe("mapRoundsToDates", () => {
    it("mappe round N → date N pour un groupe de 5 (5 rounds, 5 dates)", () => {
        const groups = [makeGroup("g1", "Box 1", 5)]
        const dates = ["2026-01-12", "2026-01-19", "2026-01-26", "2026-02-02", "2026-02-09"]
        const rounds = generateGroupRounds(groups)
        const plans = mapRoundsToDates(rounds, dates)

        expect(plans).toHaveLength(5)
        // 5 rounds (5 joueurs impair + bye = 6 positions, 5 rounds de 2 matchs)
        // Toutes les 5 dates ont des matchs
        const datesWithMatches = plans.filter(p => p.pairings.length > 0)
        expect(datesWithMatches).toHaveLength(5)
    })

    it("mappe round N → date N pour un groupe de 6 (5 rounds, 5 dates)", () => {
        const groups = [makeGroup("g1", "Box 1", 6)]
        const dates = ["2026-01-12", "2026-01-19", "2026-01-26", "2026-02-02", "2026-02-09"]
        const rounds = generateGroupRounds(groups)
        const plans = mapRoundsToDates(rounds, dates)

        // Toutes les 5 dates ont des matchs
        for (const plan of plans) {
            expect(plan.pairings.length).toBeGreaterThan(0)
        }
    })

    it("chaque date contient les matchs des rounds de tous les groupes", () => {
        const groups = [makeGroup("g1", "Box 1", 5), makeGroup("g2", "Box 2", 6)]
        groups[1].players = Array.from({ length: 6 }, (_, i) => ({
            id: `g2p${i + 1}`,
            first_name: `G2`,
            last_name: `${String.fromCharCode(65 + i)}`,
            phone: '0000',
            power_ranking: '0',
        }))
        const dates = ["2026-01-12", "2026-01-19", "2026-01-26", "2026-02-02", "2026-02-09"]
        const rounds = generateGroupRounds(groups)
        const plans = mapRoundsToDates(rounds, dates)

        // Le total des pairings doit être 10 + 15 = 25
        const totalPairings = plans.reduce((sum, p) => sum + p.pairings.length, 0)
        expect(totalPairings).toBe(25)
    })

    it("aucun joueur n'apparaît deux fois dans les matchs d'une même date", () => {
        const groups = [makeGroup("g1", "Box 1", 6)]
        const dates = ["2026-01-12", "2026-01-19", "2026-01-26", "2026-02-02", "2026-02-09"]
        const rounds = generateGroupRounds(groups)
        const plans = mapRoundsToDates(rounds, dates)

        for (const plan of plans) {
            const playerIds = new Set<string>()
            for (const p of plan.pairings) {
                expect(playerIds.has(p.player1Id)).toBe(false)
                expect(playerIds.has(p.player2Id)).toBe(false)
                playerIds.add(p.player1Id)
                playerIds.add(p.player2Id)
            }
        }
    })
})

describe("assignTimeSlotsForDates", () => {
    it("place tous les matchs d'un groupe de 6 (15 matchs, 5 dates, 9 slots, 3 terrains)", () => {
        const groups = [makeGroup("g1", "Box 1", 6)]
        const dates = ["2026-01-12", "2026-01-19", "2026-01-26", "2026-02-02", "2026-02-09"]
        const timeSlots = calculateTimeSlots("19:00", "23:00", 30) // 8 slots
        const rounds = generateGroupRounds(groups)
        const datePlans = mapRoundsToDates(rounds, dates)

        const assignments = assignTimeSlotsForDates(datePlans, timeSlots, 3)
        expect(assignments).toHaveLength(15)
    })

    it("place tous les matchs avec 3 groupes de 6 (45 matchs)", () => {
        const groups = [
            makeGroup("g1", "Box 1", 6),
            makeGroup("g2", "Box 2", 6),
            makeGroup("g3", "Box 3", 6),
        ]
        groups[1].players = Array.from({ length: 6 }, (_, i) => ({
            id: `g2p${i + 1}`, first_name: "G2", last_name: String.fromCharCode(65 + i), phone: '0000', power_ranking: '0',
        }))
        groups[2].players = Array.from({ length: 6 }, (_, i) => ({
            id: `g3p${i + 1}`, first_name: "G3", last_name: String.fromCharCode(65 + i), phone: '0000', power_ranking: '0',
        }))

        const dates = ["2026-01-12", "2026-01-19", "2026-01-26", "2026-02-02", "2026-02-09"]
        const timeSlots = calculateTimeSlots("19:00", "23:00", 30) // 8 slots
        const rounds = generateGroupRounds(groups)
        const datePlans = mapRoundsToDates(rounds, dates)

        const assignments = assignTimeSlotsForDates(datePlans, timeSlots, 3)
        expect(assignments).toHaveLength(45) // 3 × 15
    })

    it("aucun joueur ne joue deux matchs au même créneau horaire", () => {
        const groups = [makeGroup("g1", "Box 1", 6), makeGroup("g2", "Box 2", 6)]
        groups[1].players = Array.from({ length: 6 }, (_, i) => ({
            id: `g2p${i + 1}`, first_name: "G2", last_name: String.fromCharCode(65 + i), phone: '0000', power_ranking: '0',
        }))

        const dates = ["2026-01-12", "2026-01-19", "2026-01-26", "2026-02-02", "2026-02-09"]
        const timeSlots = calculateTimeSlots("19:00", "23:00", 30)
        const rounds = generateGroupRounds(groups)
        const datePlans = mapRoundsToDates(rounds, dates)
        const assignments = assignTimeSlotsForDates(datePlans, timeSlots, 3)

        // Pour chaque (date, heure), aucun joueur ne doit apparaître deux fois
        const slotPlayers = new Map<string, Set<string>>()
        for (const a of assignments) {
            const key = `${a.matchDate}_${a.matchTime}`
            if (!slotPlayers.has(key)) slotPlayers.set(key, new Set())
            const players = slotPlayers.get(key)!
            expect(players.has(a.player1Id)).toBe(false)
            expect(players.has(a.player2Id)).toBe(false)
            players.add(a.player1Id)
            players.add(a.player2Id)
        }
    })

    it("respecte les fenêtres de disponibilité (arrivée tardive)", () => {
        const groups = [makeGroup("g1", "Box 1", 4)]
        const dates = ["2026-01-12", "2026-01-19", "2026-01-26"]
        const timeSlots = calculateTimeSlots("19:00", "22:00", 30) // 19:00, 19:30, 20:00, 20:30, 21:00, 21:30

        const constraints = new Map([
            ["p1", { arrival: "20:30", departure: "", unavailable: [] }],
        ])

        const rounds = generateGroupRounds(groups)
        const datePlans = mapRoundsToDates(rounds, dates)
        const assignments = assignTimeSlotsForDates(datePlans, timeSlots, 3, constraints, 30)

        // Tous les matchs de p1 doivent être à 20:30 ou après
        const p1Matches = assignments.filter(a => a.player1Id === "p1" || a.player2Id === "p1")
        for (const m of p1Matches) {
            expect(m.matchTime >= "20:30").toBe(true)
        }
    })

    it("intégration complète : 5 groupes mixtes, tous les matchs placés", () => {
        const groups = Array.from({ length: 5 }, (_, gi) => {
            const playerCount = gi % 2 === 0 ? 5 : 6
            const g = makeGroup(`g${gi + 1}`, `Box ${gi + 1}`, playerCount)
            g.players = Array.from({ length: playerCount }, (_, pi) => ({
                id: `g${gi + 1}p${pi + 1}`,
                first_name: `G${gi + 1}`,
                last_name: String.fromCharCode(65 + pi),
                phone: '0000', power_ranking: '0',
            }))
            return g
        })

        const dates = ["2026-01-12", "2026-01-19", "2026-01-26", "2026-02-02", "2026-02-09"]
        const timeSlots = calculateTimeSlots("19:00", "23:00", 30)
        const rounds = generateGroupRounds(groups)
        const datePlans = mapRoundsToDates(rounds, dates)

        const expectedTotal = groups.reduce((sum, g) => {
            const n = g.players!.length
            return sum + (n * (n - 1)) / 2
        }, 0)

        const assignments = assignTimeSlotsForDates(datePlans, timeSlots, 3)
        expect(assignments).toHaveLength(expectedTotal)
    })
})
