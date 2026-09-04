import { render, screen, waitFor, fireEvent, act } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { WizardStepRegistrations } from "../WizardStepRegistrations"
import type { Event } from "@/types/event"

const mockEvent: Event = {
    id: "event-1",
    club_id: "club-1",
    event_name: "Test Event",
    event_rounds: [
        {
            id: "round-0", event_id: "event-1", round_number: 1,
            start_date: "2026-01-01", end_date: "2026-01-28",
            number_of_courts: 2, status: "completed",
        },
        {
            id: "round-1", event_id: "event-1", round_number: 2,
            start_date: "2026-02-01", end_date: "2026-02-28",
            number_of_courts: 2, status: "upcoming",
        },
    ],
}

const mockRound = mockEvent.event_rounds![1]

const mockProfiles = [
    { id: "p1", first_name: "Alice", last_name: "Martin", power_ranking: 5, player_status: [{ status: "member" }] },
    { id: "p2", first_name: "Bob", last_name: "Dupont", power_ranking: 3, player_status: [{ status: "member" }] },
    { id: "p3", first_name: "Clara", last_name: "Lefèvre", power_ranking: 0, player_status: [{ status: "visitor" }] },
]

// Seule la liste des profils du club passe encore par Supabase ici : les
// inscrits sont resolus par useRoundRegistrations, moque plus bas.
const mockFrom = vi.fn()
vi.mock("@/lib/supabaseClient", () => ({
    supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}))

const mockAddPlayers = vi.fn()
const mockRemovePlayers = vi.fn()
const mockUseRoundRegistrations = vi.fn()
vi.mock("@/hooks/useRoundRegistrations", () => ({
    useRoundRegistrations: (...args: unknown[]) => mockUseRoundRegistrations(...args),
}))

function makeChain(data: unknown[], error = null) {
    const chain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        insert: vi.fn().mockResolvedValue({ error }),
        delete: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockResolvedValue({ error }),
        then: undefined as unknown,
    }
    chain.then = (resolve: (v: { data: unknown; error: unknown }) => void) =>
        resolve({ data, error })
    return chain
}

function setRegistered(ids: string[]) {
    mockUseRoundRegistrations.mockReturnValue({
        registeredIds: new Set(ids),
        source: "round",
        loading: false,
        addPlayers: mockAddPlayers,
        removePlayers: mockRemovePlayers,
        reload: vi.fn(),
    })
}

describe("WizardStepRegistrations", () => {
    const onRegistrationsChanged = vi.fn()
    const onNext = vi.fn()
    const onPrevious = vi.fn()

    function renderStep() {
        return render(
            <WizardStepRegistrations
                event={mockEvent}
                round={mockRound}
                onRegistrationsChanged={onRegistrationsChanged}
                onNext={onNext}
                onPrevious={onPrevious}
            />
        )
    }

    beforeEach(() => {
        vi.clearAllMocks()
        mockFrom.mockImplementation(() => makeChain(mockProfiles))
        setRegistered(["p1"])
    })

    it("resout les inscrits sur la serie, avec la serie precedente du meme evenement", async () => {
        // C'est ce cloisonnement qui empeche deux evenements d'un meme club
        // de se melanger au moment des inscriptions.
        renderStep()
        await waitFor(() => screen.getByText("Alice Martin"))
        expect(mockUseRoundRegistrations).toHaveBeenCalledWith("event-1", "round-1", "round-0")
    })

    it("n'annonce aucune serie precedente sur la premiere serie", async () => {
        const firstRound = mockEvent.event_rounds![0]
        render(
            <WizardStepRegistrations
                event={mockEvent}
                round={firstRound}
                onRegistrationsChanged={onRegistrationsChanged}
            />
        )
        await waitFor(() => screen.getByText("Alice Martin"))
        expect(mockUseRoundRegistrations).toHaveBeenCalledWith("event-1", "round-0", null)
    })

    it("affiche les joueurs disponibles et inscrits au chargement", async () => {
        renderStep()

        await waitFor(() => {
            // p1 est inscrit, colonne droite
            expect(screen.getByText("Alice Martin")).toBeInTheDocument()
            // p2 et p3 sont disponibles, colonne gauche
            expect(screen.getByText("Bob Dupont")).toBeInTheDocument()
            expect(screen.getByText("Clara Lefèvre")).toBeInTheDocument()
        })
    })

    it("liste tout le club a gauche, quel que soit l'evenement du joueur", async () => {
        // Exigence explicite : pouvoir inscrire n'importe qui.
        setRegistered([])
        renderStep()
        await waitFor(() => screen.getByText("Alice Martin"))
        expect(mockFrom).toHaveBeenCalledWith("profiles")
    })

    it("appelle onRegistrationsChanged avec les ids initiaux", async () => {
        renderStep()
        await waitFor(() => {
            expect(onRegistrationsChanged).toHaveBeenCalledWith(new Set(["p1"]))
        })
    })

    it("affiche le badge Visiteur pour les visiteurs", async () => {
        renderStep()
        await waitFor(() => {
            expect(screen.getByText("Visiteur")).toBeInTheDocument()
        })
    })

    it("désactive le bouton Suivant si aucun joueur inscrit", async () => {
        setRegistered([])
        renderStep()
        await waitFor(() => {
            expect(screen.getByRole("button", { name: /suivant/i })).toBeDisabled()
        })
    })

    it("ajoute les joueurs selectionnes a la serie", async () => {
        setRegistered([])
        renderStep()
        await waitFor(() => screen.getByText("Alice Martin"))

        fireEvent.click(screen.getByText("Alice Martin"))
        const transfer = screen.getAllByRole("button").find(b => !b.textContent?.trim())
        await act(async () => { fireEvent.click(transfer!) })

        expect(mockAddPlayers).toHaveBeenCalledWith(["p1"])
    })

    it("retire les joueurs selectionnes de la serie", async () => {
        renderStep()
        await waitFor(() => screen.getByText("Alice Martin"))

        fireEvent.click(screen.getByText("Alice Martin"))
        const transfer = screen.getAllByRole("button").find(b => !b.textContent?.trim())
        await act(async () => { fireEvent.click(transfer!) })

        expect(mockRemovePlayers).toHaveBeenCalledWith(["p1"])
    })

    it("filtre les joueurs disponibles via la recherche", async () => {
        setRegistered([])
        renderStep()
        await waitFor(() => screen.getByText("Alice Martin"))

        fireEvent.change(screen.getAllByPlaceholderText("Rechercher...")[0], {
            target: { value: "bob" },
        })

        expect(screen.getByText("Bob Dupont")).toBeInTheDocument()
        expect(screen.queryByText("Alice Martin")).not.toBeInTheDocument()
        expect(screen.queryByText("Clara Lefèvre")).not.toBeInTheDocument()
    })

    describe("hauteur", () => {
        it("occupe la hauteur restante au lieu de s'arreter a son contenu", () => {
            const { container } = renderStep()
            expect(container.firstElementChild).toHaveClass("flex", "flex-col", "flex-1", "min-h-0")
        })

        it("etire la zone des deux colonnes", () => {
            renderStep()
            expect(screen.getByTestId("registration-columns")).toHaveClass("flex-1", "min-h-0")
        })

        it("ne fige plus la hauteur des listes de joueurs", () => {
            renderStep()
            const lists = screen.getAllByTestId("player-list")
            expect(lists).toHaveLength(2)
            for (const list of lists) {
                expect(list).toHaveClass("flex-1", "min-h-0")
                expect(list).not.toHaveClass("h-[300px]")
            }
        })
    })
})
