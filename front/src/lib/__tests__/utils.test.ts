import { describe, it, expect } from "vitest"
import { cn, sortGroupsByName } from '@/lib/utils'

describe('cn utility', () => {
  it('merges class names correctly', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', 'visible')).toBe('base visible')
  })

  it('merges tailwind conflicts correctly', () => {
    expect(cn('px-4', 'px-2')).toBe('px-2')
  })
})

describe("sortGroupsByName", () => {
    it("trie correctement 10+ groupes (numérique, pas alphabétique)", () => {
        const groups = [
            { group_name: "Box 10", id: "10" },
            { group_name: "Box 2", id: "2" },
            { group_name: "Box 1", id: "1" },
            { group_name: "Box 9", id: "9" },
        ]
        const result = sortGroupsByName(groups)
        expect(result.map(g => g.group_name)).toEqual(["Box 1", "Box 2", "Box 9", "Box 10"])
    })

    it("préserve les objets complets", () => {
        const groups = [{ group_name: "Box 3", id: "3" }, { group_name: "Box 1", id: "1" }]
        const result = sortGroupsByName(groups)
        expect(result[0].id).toBe("1")
        expect(result[1].id).toBe("3")
    })

    it("ne mute pas le tableau original", () => {
        const groups = [{ group_name: "Box 2", id: "2" }, { group_name: "Box 1", id: "1" }]
        sortGroupsByName(groups)
        expect(groups[0].group_name).toBe("Box 2")
    })

    it("gère un tableau vide", () => {
        expect(sortGroupsByName([])).toEqual([])
    })

    it("préserve l'ordre si déjà correct", () => {
        const groups = [
            { group_name: "Box 1", id: "1" },
            { group_name: "Box 2", id: "2" },
            { group_name: "Box 10", id: "10" },
        ]
        const result = sortGroupsByName(groups)
        expect(result.map(g => g.group_name)).toEqual(["Box 1", "Box 2", "Box 10"])
    })
})
