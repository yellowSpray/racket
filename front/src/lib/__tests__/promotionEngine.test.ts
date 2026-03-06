import { describe, it, expect } from "vitest"
import { calculatePromotions } from "../promotionEngine"
import type { GroupStandings, PlayerStanding } from "@/types/ranking"
import type { PromotionRules } from "@/types/settings"

// --- Helpers ---

function makeStanding(
  playerId: string,
  playerName: string,
  rank: number,
  points = 0
): PlayerStanding {
  return {
    playerId,
    playerName,
    rank,
    played: 0,
    wins: 0,
    losses: 0,
    walkoversWon: 0,
    walkoversLost: 0,
    points,
  }
}

function makeGroupStandings(
  groupId: string,
  groupName: string,
  players: { id: string; name: string; rank: number; points?: number }[]
): GroupStandings {
  return {
    groupId,
    groupName,
    standings: players.map((p) =>
      makeStanding(p.id, p.name, p.rank, p.points ?? 0)
    ),
  }
}

function makeRules(
  promoted: number,
  relegated: number
): PromotionRules {
  return {
    id: "rules-1",
    club_id: "club-1",
    promoted_count: promoted,
    relegated_count: relegated,
  }
}

// --- Test data ---

const groupA = makeGroupStandings("gA", "Tableau A", [
  { id: "a1", name: "Alice", rank: 1, points: 15 },
  { id: "a2", name: "Bob", rank: 2, points: 12 },
  { id: "a3", name: "Charlie", rank: 3, points: 8 },
  { id: "a4", name: "Diana", rank: 4, points: 5 },
])

const groupB = makeGroupStandings("gB", "Tableau B", [
  { id: "b1", name: "Eve", rank: 1, points: 14 },
  { id: "b2", name: "Frank", rank: 2, points: 11 },
  { id: "b3", name: "Grace", rank: 3, points: 7 },
  { id: "b4", name: "Hank", rank: 4, points: 3 },
])

const groupC = makeGroupStandings("gC", "Tableau C", [
  { id: "c1", name: "Ivy", rank: 1, points: 13 },
  { id: "c2", name: "Jack", rank: 2, points: 10 },
  { id: "c3", name: "Kate", rank: 3, points: 6 },
  { id: "c4", name: "Leo", rank: 4, points: 2 },
])

// --- Tests ---

describe("calculatePromotions", () => {
  describe("cas vides / triviaux", () => {
    it("retourne vide si aucun standing", () => {
      const result = calculatePromotions([], makeRules(2, 2), [])
      expect(result.moves).toEqual([])
      expect(result.stayingPlayers).toEqual([])
    })

    it("retourne vide si un seul groupe", () => {
      const result = calculatePromotions(
        [groupA],
        makeRules(2, 2),
        ["gA"]
      )
      expect(result.moves).toEqual([])
      expect(result.stayingPlayers).toHaveLength(4)
      expect(result.stayingPlayers.every((p) => p.groupId === "gA")).toBe(true)
    })

    it("retourne vide si promoted=0 et relegated=0", () => {
      const result = calculatePromotions(
        [groupA, groupB],
        makeRules(0, 0),
        ["gA", "gB"]
      )
      expect(result.moves).toEqual([])
      expect(result.stayingPlayers).toHaveLength(8)
    })
  })

  describe("promotion simple (2 groupes)", () => {
    it("les top promoted_count du groupe B montent au groupe A", () => {
      const result = calculatePromotions(
        [groupA, groupB],
        makeRules(2, 0),
        ["gA", "gB"]
      )

      const promos = result.moves.filter((m) => m.type === "promotion")
      expect(promos).toHaveLength(2)

      expect(promos[0]).toMatchObject({
        playerId: "b1",
        playerName: "Eve",
        fromGroupId: "gB",
        toGroupId: "gA",
        type: "promotion",
      })
      expect(promos[1]).toMatchObject({
        playerId: "b2",
        playerName: "Frank",
        fromGroupId: "gB",
        toGroupId: "gA",
        type: "promotion",
      })
    })

    it("pas de promotion pour le groupe le plus haut", () => {
      const result = calculatePromotions(
        [groupA, groupB],
        makeRules(2, 0),
        ["gA", "gB"]
      )
      const promosFromA = result.moves.filter(
        (m) => m.fromGroupId === "gA" && m.type === "promotion"
      )
      expect(promosFromA).toHaveLength(0)
    })
  })

  describe("relegation simple (2 groupes)", () => {
    it("les bottom relegated_count du groupe A descendent au groupe B", () => {
      const result = calculatePromotions(
        [groupA, groupB],
        makeRules(0, 2),
        ["gA", "gB"]
      )

      const relegs = result.moves.filter((m) => m.type === "relegation")
      expect(relegs).toHaveLength(2)

      expect(relegs[0]).toMatchObject({
        playerId: "a3",
        playerName: "Charlie",
        fromGroupId: "gA",
        toGroupId: "gB",
        type: "relegation",
      })
      expect(relegs[1]).toMatchObject({
        playerId: "a4",
        playerName: "Diana",
        fromGroupId: "gA",
        toGroupId: "gB",
        type: "relegation",
      })
    })

    it("pas de relegation pour le groupe le plus bas", () => {
      const result = calculatePromotions(
        [groupA, groupB],
        makeRules(0, 2),
        ["gA", "gB"]
      )
      const relegsFromB = result.moves.filter(
        (m) => m.fromGroupId === "gB" && m.type === "relegation"
      )
      expect(relegsFromB).toHaveLength(0)
    })
  })

  describe("promotion + relegation combinees (3 groupes)", () => {
    it("applique promo et releg sur 3 groupes", () => {
      const result = calculatePromotions(
        [groupA, groupB, groupC],
        makeRules(1, 1),
        ["gA", "gB", "gC"]
      )

      // Groupe A : pas de promo (tier le plus haut), 1 relegation (a4 -> gB)
      // Groupe B : 1 promo (b1 -> gA), 1 relegation (b4 -> gC)
      // Groupe C : 1 promo (c1 -> gB), pas de relegation (tier le plus bas)

      const moves = result.moves

      // Promotions
      const promos = moves.filter((m) => m.type === "promotion")
      expect(promos).toHaveLength(2)
      expect(promos).toContainEqual(
        expect.objectContaining({
          playerId: "b1",
          fromGroupId: "gB",
          toGroupId: "gA",
          type: "promotion",
        })
      )
      expect(promos).toContainEqual(
        expect.objectContaining({
          playerId: "c1",
          fromGroupId: "gC",
          toGroupId: "gB",
          type: "promotion",
        })
      )

      // Relegations
      const relegs = moves.filter((m) => m.type === "relegation")
      expect(relegs).toHaveLength(2)
      expect(relegs).toContainEqual(
        expect.objectContaining({
          playerId: "a4",
          fromGroupId: "gA",
          toGroupId: "gB",
          type: "relegation",
        })
      )
      expect(relegs).toContainEqual(
        expect.objectContaining({
          playerId: "b4",
          fromGroupId: "gB",
          toGroupId: "gC",
          type: "relegation",
        })
      )
    })

    it("les joueurs restants sont correctement identifies", () => {
      const result = calculatePromotions(
        [groupA, groupB, groupC],
        makeRules(1, 1),
        ["gA", "gB", "gC"]
      )

      // 12 joueurs total, 4 moves => 8 staying
      expect(result.stayingPlayers).toHaveLength(8)

      // Verifier quelques joueurs restants
      expect(result.stayingPlayers).toContainEqual({ playerId: "a1", groupId: "gA" })
      expect(result.stayingPlayers).toContainEqual({ playerId: "a2", groupId: "gA" })
      expect(result.stayingPlayers).toContainEqual({ playerId: "a3", groupId: "gA" })
      expect(result.stayingPlayers).toContainEqual({ playerId: "b2", groupId: "gB" })
      expect(result.stayingPlayers).toContainEqual({ playerId: "b3", groupId: "gB" })
      expect(result.stayingPlayers).toContainEqual({ playerId: "c2", groupId: "gC" })
      expect(result.stayingPlayers).toContainEqual({ playerId: "c3", groupId: "gC" })
      expect(result.stayingPlayers).toContainEqual({ playerId: "c4", groupId: "gC" })
    })
  })

  describe("cas limites", () => {
    it("groupe avec moins de joueurs que promoted + relegated", () => {
      const smallGroup = makeGroupStandings("gSmall", "Petit Tableau", [
        { id: "s1", name: "Solo1", rank: 1 },
        { id: "s2", name: "Solo2", rank: 2 },
      ])
      const result = calculatePromotions(
        [groupA, smallGroup],
        makeRules(2, 2),
        ["gA", "gSmall"]
      )

      // smallGroup a 2 joueurs, promoted=2 mais c'est le dernier groupe (pas de releg)
      // Donc les 2 montent, 0 reste
      const promosFromSmall = result.moves.filter(
        (m) => m.fromGroupId === "gSmall" && m.type === "promotion"
      )
      expect(promosFromSmall).toHaveLength(2)

      // Pas de doublon : un joueur ne peut pas etre a la fois promu et relegue
      const movedPlayerIds = result.moves.map((m) => m.playerId)
      const uniqueIds = new Set(movedPlayerIds)
      expect(uniqueIds.size).toBe(movedPlayerIds.length)
    })

    it("un joueur ne peut pas etre a la fois promu et relegue", () => {
      // Groupe de 3 joueurs avec promoted=2 et relegated=2
      const tinyGroup = makeGroupStandings("gTiny", "Tiny", [
        { id: "t1", name: "T1", rank: 1 },
        { id: "t2", name: "T2", rank: 2 },
        { id: "t3", name: "T3", rank: 3 },
      ])
      const result = calculatePromotions(
        [groupA, tinyGroup, groupC],
        makeRules(2, 2),
        ["gA", "gTiny", "gC"]
      )

      // tinyGroup : promo top 2 (t1, t2) + releg bottom 2 (t2, t3)
      // Conflit sur t2 : promo a priorite => t2 promu, t3 relegue
      const movesFromTiny = result.moves.filter((m) => m.fromGroupId === "gTiny")
      const promos = movesFromTiny.filter((m) => m.type === "promotion")
      const relegs = movesFromTiny.filter((m) => m.type === "relegation")

      // t2 ne doit apparaitre qu'une seule fois
      const t2Moves = movesFromTiny.filter((m) => m.playerId === "t2")
      expect(t2Moves).toHaveLength(1)
      expect(t2Moves[0].type).toBe("promotion")

      // t1 promu, t2 promu, t3 relegue
      expect(promos.map((m) => m.playerId)).toContain("t1")
      expect(promos.map((m) => m.playerId)).toContain("t2")
      expect(relegs.map((m) => m.playerId)).toContain("t3")
    })

    it("standings dont le groupId ne figure pas dans groupOrder sont ignores", () => {
      const result = calculatePromotions(
        [groupA, groupB],
        makeRules(1, 1),
        ["gA"] // groupB absent de groupOrder
      )
      // Seul gA dans l'ordre => un seul groupe => pas de mouvements
      expect(result.moves).toEqual([])
    })
  })

  describe("determinisme", () => {
    it("meme input produit toujours le meme output", () => {
      const result1 = calculatePromotions(
        [groupA, groupB, groupC],
        makeRules(1, 1),
        ["gA", "gB", "gC"]
      )
      const result2 = calculatePromotions(
        [groupA, groupB, groupC],
        makeRules(1, 1),
        ["gA", "gB", "gC"]
      )
      expect(result1).toEqual(result2)
    })

    it("l'ordre des standings en entree n'affecte pas le resultat", () => {
      const result1 = calculatePromotions(
        [groupA, groupB, groupC],
        makeRules(1, 1),
        ["gA", "gB", "gC"]
      )
      const result2 = calculatePromotions(
        [groupC, groupA, groupB], // ordre different
        makeRules(1, 1),
        ["gA", "gB", "gC"]
      )
      expect(result1).toEqual(result2)
    })
  })
})
