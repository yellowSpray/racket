import { describe, it, expect } from "vitest"
import { sortPlayersByEarliestDates } from "@/lib/matchScheduler"
import type { Group, GroupPlayer } from "@/types/draw"
import type { Match } from "@/types/match"

/**
 * Le tri des lignes d'un tableau doit dependre des donnees, jamais de l'ordre
 * dans lequel elles arrivent.
 *
 * Le defaut constate : la page d'administration recoit ses joueurs dans
 * l'ordre de sa requete, `get_draws_by_embed_token` les rend tries par nom.
 * Le comparateur rendait 0 sur egalite et le tri de JavaScript est stable,
 * donc l'ordre d'arrivee decidait. Une box dont les six joueurs jouent sur les
 * memes dates s'affichait dans deux ordres differents selon la page.
 */

const joueur = (id: string, first_name: string, last_name: string): GroupPlayer => ({
    id,
    first_name,
    last_name,
    phone: "",
    power_ranking: 0,
})

const match = (id: string, p1: string, p2: string, date: string): Match =>
    ({
        id,
        group_id: "g1",
        player1_id: p1,
        player2_id: p2,
        match_date: date,
        match_time: "19:30",
    }) as Match

const groupe = (players: GroupPlayer[]): Group => ({
    id: "g1",
    round_id: "r1",
    group_name: "Box 1",
    max_players: 6,
    created_at: "2026-09-01",
    players,
})

const noms = (g: Group) => (g.players ?? []).map(p => p.last_name)

describe("sortPlayersByEarliestDates", () => {
    /*
     * Quatre joueurs, deux matchs le meme jour. Les quatre ont donc la meme
     * liste de dates, et aucun n'affronte personne a une date qui le
     * distinguerait : tout est a egalite, il ne reste que la departie.
     */
    const memesDates: Match[] = [
        match("m1", "p-bouchat", "p-santos", "2026-09-14"),
        match("m2", "p-eade", "p-broeckmans", "2026-09-14"),
    ]

    it("rend le meme ordre quel que soit l'ordre d'arrivee", () => {
        const ordreAdmin = groupe([
            joueur("p-eade", "Peter", "Eade"),
            joueur("p-broeckmans", "Cyrille", "Broeckmans"),
            joueur("p-santos", "Ramiro", "Santos"),
            joueur("p-bouchat", "Charles", "Bouchat"),
        ])

        const ordreEmbed = groupe([
            joueur("p-bouchat", "Charles", "Bouchat"),
            joueur("p-broeckmans", "Cyrille", "Broeckmans"),
            joueur("p-eade", "Peter", "Eade"),
            joueur("p-santos", "Ramiro", "Santos"),
        ])

        expect(noms(sortPlayersByEarliestDates(ordreAdmin, memesDates)))
            .toEqual(noms(sortPlayersByEarliestDates(ordreEmbed, memesDates)))
    })

    it("departage par nom quand les dates ne suffisent pas", () => {
        const g = groupe([
            joueur("p-eade", "Peter", "Eade"),
            joueur("p-broeckmans", "Cyrille", "Broeckmans"),
            joueur("p-santos", "Ramiro", "Santos"),
            joueur("p-bouchat", "Charles", "Bouchat"),
        ])

        // Bouchat ouvre, puis ses adversaires par date, puis les autres par nom.
        expect(noms(sortPlayersByEarliestDates(g, memesDates))[0]).toBe("Bouchat")
    })

    it("departage par prenom a nom egal", () => {
        const homonymes: Match[] = [
            match("m1", "p-a", "p-b", "2026-09-14"),
            match("m2", "p-c", "p-d", "2026-09-14"),
        ]
        const g = groupe([
            joueur("p-d", "Sacha", "Vandenplas"),
            joueur("p-c", "Renaud", "Vandenplas"),
            joueur("p-b", "Bernard", "Dupont"),
            joueur("p-a", "Alice", "Dupont"),
        ])

        const attendu = noms(sortPlayersByEarliestDates(g, homonymes))
        const inverse = noms(sortPlayersByEarliestDates(groupe([...(g.players ?? [])].reverse()), homonymes))
        expect(attendu).toEqual(inverse)

        const prenoms = (sortPlayersByEarliestDates(g, homonymes).players ?? []).map(p => p.first_name)
        expect(prenoms.indexOf("Alice")).toBeLessThan(prenoms.indexOf("Bernard"))
        expect(prenoms.indexOf("Renaud")).toBeLessThan(prenoms.indexOf("Sacha"))
    })

    it("reste deterministe quand la box n'a aucun match", () => {
        const g1 = groupe([
            joueur("p-eade", "Peter", "Eade"),
            joueur("p-bouchat", "Charles", "Bouchat"),
        ])
        const g2 = groupe([
            joueur("p-bouchat", "Charles", "Bouchat"),
            joueur("p-eade", "Peter", "Eade"),
        ])

        expect(noms(sortPlayersByEarliestDates(g1, []))).toEqual(["Bouchat", "Eade"])
        expect(noms(sortPlayersByEarliestDates(g2, []))).toEqual(["Bouchat", "Eade"])
    })

    it("laisse les dates decider quand elles different", () => {
        // Zulu joue le premier jour, Alpha le dernier : le nom ne doit pas
        // prendre le dessus sur la chronologie.
        const dates: Match[] = [
            match("m1", "p-zulu", "p-mike", "2026-09-07"),
            match("m2", "p-alpha", "p-mike", "2026-09-28"),
        ]
        const g = groupe([
            joueur("p-alpha", "Anne", "Alpha"),
            joueur("p-mike", "Marc", "Mike"),
            joueur("p-zulu", "Zoe", "Zulu"),
        ])

        expect(noms(sortPlayersByEarliestDates(g, dates))[0]).not.toBe("Alpha")
    })

    it("ne touche pas a un groupe d'un seul joueur", () => {
        const g = groupe([joueur("p-eade", "Peter", "Eade")])
        expect(noms(sortPlayersByEarliestDates(g, []))).toEqual(["Eade"])
    })
})
