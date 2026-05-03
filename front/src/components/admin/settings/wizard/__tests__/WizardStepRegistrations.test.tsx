import { render, screen, waitFor, fireEvent, act } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { WizardStepRegistrations } from "../WizardStepRegistrations"
import type { Event } from "@/types/event"

const mockEvent: Event = {
    id: "event-1",
    club_id: "club-1",
    event_name: "Test Event",
    start_date: "2025-06-01",
    end_date: "2025-06-01",
    number_of_courts: 2,
}

const mockProfiles = [
    { id: "p1", first_name: "Alice", last_name: "Martin", power_ranking: 5, player_status: [{ status: "member" }] },
    { id: "p2", first_name: "Bob", last_name: "Dupont", power_ranking: 3, player_status: [{ status: "member" }] },
    { id: "p3", first_name: "Clara", last_name: "Lefèvre", power_ranking: 0, player_status: [{ status: "visitor" }] },
]

const mockFrom = vi.fn()

vi.mock("@/lib/supabaseClient", () => ({
    supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}))

function makeChain(data: unknown[], error = null) {
    const chain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        insert: vi.fn().mockResolvedValue({ error }),
        delete: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockResolvedValue({ error }),
        then: undefined as unknown,
    }
    // make the chain itself thenable so await works
    chain.then = (resolve: (v: { data: unknown; error: unknown }) => void) =>
        resolve({ data, error })
    return chain
}

// Tracks all chains created per table for assertions
const chains: Record<string, ReturnType<typeof makeChain>[]> = {}
function trackingFrom(table: string, data: unknown[], error = null) {
    const chain = makeChain(data, error)
    chains[table] = [...(chains[table] ?? []), chain]
    return chain
}

describe("WizardStepRegistrations", () => {
    const onRegistrationsChanged = vi.fn()
    const onNext = vi.fn()
    const onPrevious = vi.fn()

    beforeEach(() => {
        vi.clearAllMocks()
        mockFrom.mockImplementation((table: string) => {
            if (table === "profiles") return makeChain(mockProfiles)
            if (table === "event_players") return makeChain([{ profile_id: "p1" }])
            return makeChain([])
        })
    })

    it("affiche les joueurs disponibles et inscrits au chargement", async () => {
        render(
            <WizardStepRegistrations
                event={mockEvent}
                onRegistrationsChanged={onRegistrationsChanged}
                onNext={onNext}
                onPrevious={onPrevious}
            />
        )

        await waitFor(() => {
            // p1 est déjà inscrit → colonne droite
            expect(screen.getByText("Alice Martin")).toBeInTheDocument()
            // p2 et p3 sont disponibles → colonne gauche
            expect(screen.getByText("Bob Dupont")).toBeInTheDocument()
            expect(screen.getByText("Clara Lefèvre")).toBeInTheDocument()
        })
    })

    it("appelle onRegistrationsChanged avec les ids initiaux", async () => {
        render(
            <WizardStepRegistrations
                event={mockEvent}
                onRegistrationsChanged={onRegistrationsChanged}
                onNext={onNext}
                onPrevious={onPrevious}
            />
        )

        await waitFor(() => {
            expect(onRegistrationsChanged).toHaveBeenCalledWith(new Set(["p1"]))
        })
    })

    it("affiche le badge Visiteur pour les visiteurs", async () => {
        render(
            <WizardStepRegistrations
                event={mockEvent}
                onRegistrationsChanged={onRegistrationsChanged}
                onNext={onNext}
                onPrevious={onPrevious}
            />
        )

        await waitFor(() => {
            expect(screen.getByText("Visiteur")).toBeInTheDocument()
        })
    })

    it("désactive le bouton Suivant si aucun joueur inscrit", async () => {
        mockFrom.mockImplementation((table: string) => {
            if (table === "profiles") return makeChain(mockProfiles)
            if (table === "event_players") return makeChain([])
            return makeChain([])
        })

        render(
            <WizardStepRegistrations
                event={mockEvent}
                onRegistrationsChanged={onRegistrationsChanged}
                onNext={onNext}
                onPrevious={onPrevious}
            />
        )

        await waitFor(() => {
            expect(screen.getByRole("button", { name: /suivant/i })).toBeDisabled()
        })
    })

    it("ajouter un joueur insère dans event_players et met à jour l'état local", async () => {
        Object.keys(chains).forEach(k => delete chains[k])
        mockFrom.mockImplementation((table: string) => {
            if (table === "profiles") return makeChain(mockProfiles)
            return trackingFrom(table, [])
        })

        render(
            <WizardStepRegistrations
                event={mockEvent}
                onRegistrationsChanged={onRegistrationsChanged}
                onNext={onNext}
                onPrevious={onPrevious}
            />
        )

        await waitFor(() => screen.getByText("Alice Martin"))

        const addButtons = screen.getAllByRole("button", { hidden: true })
        const addAlice = addButtons.find(b => b.closest("li")?.textContent?.includes("Alice"))
        expect(addAlice).toBeDefined()

        await act(async () => { fireEvent.click(addAlice!) })

        // chains[0] = fetch initial, chains[1] = insert depuis addPlayer
        const epInsertChain = chains["event_players"]?.[1]
        expect(epInsertChain?.insert).toHaveBeenCalledWith({ event_id: "event-1", profile_id: "p1" })
        expect(onRegistrationsChanged).toHaveBeenLastCalledWith(new Set(["p1"]))
    })

    it("retirer un joueur supprime de event_players et met à jour l'état local", async () => {
        Object.keys(chains).forEach(k => delete chains[k])
        mockFrom.mockImplementation((table: string) => {
            if (table === "profiles") return makeChain(mockProfiles)
            if (table === "event_players") return trackingFrom(table, [{ profile_id: "p1" }])
            return trackingFrom(table, [])
        })

        render(
            <WizardStepRegistrations
                event={mockEvent}
                onRegistrationsChanged={onRegistrationsChanged}
                onNext={onNext}
                onPrevious={onPrevious}
            />
        )

        await waitFor(() => screen.getByText("Alice Martin"))

        const removeButtons = screen.getAllByRole("button", { hidden: true })
        const removeAlice = removeButtons.find(b => b.closest("li")?.textContent?.includes("Alice"))
        expect(removeAlice).toBeDefined()

        await act(async () => { fireEvent.click(removeAlice!) })

        // chains[1] = delete depuis removePlayer
        const epDeleteChain = chains["event_players"]?.[1]
        expect(epDeleteChain?.delete).toHaveBeenCalled()
        expect(onRegistrationsChanged).toHaveBeenLastCalledWith(new Set())
    })

    it("filtre les joueurs disponibles via la recherche", async () => {
        mockFrom.mockImplementation((table: string) => {
            if (table === "profiles") return makeChain(mockProfiles)
            if (table === "event_players") return makeChain([])
            return makeChain([])
        })

        render(
            <WizardStepRegistrations
                event={mockEvent}
                onRegistrationsChanged={onRegistrationsChanged}
                onNext={onNext}
                onPrevious={onPrevious}
            />
        )

        await waitFor(() => screen.getByText("Alice Martin"))

        fireEvent.change(screen.getByPlaceholderText("Rechercher..."), {
            target: { value: "bob" },
        })

        expect(screen.getByText("Bob Dupont")).toBeInTheDocument()
        expect(screen.queryByText("Alice Martin")).not.toBeInTheDocument()
        expect(screen.queryByText("Clara Lefèvre")).not.toBeInTheDocument()
    })
})
