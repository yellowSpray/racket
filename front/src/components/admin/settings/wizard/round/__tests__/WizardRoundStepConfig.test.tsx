import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { WizardRoundStepConfig } from "../WizardRoundStepConfig"
import type { EventRound } from "@/types/event"

const mockRound = {
    id: "round-1",
    event_id: "event-1",
    round_number: 1,
    start_date: "2025-01-01",
    end_date: "2025-01-31",
    start_time: "20:00:00",
    end_time: "22:00:00",
    number_of_courts: 3,
    estimated_match_duration: "00:45:00",
    status: "upcoming",
} as EventRound

describe("WizardRoundStepConfig", () => {
    const onNext = vi.fn()

    it("affiche les champs avec les valeurs par défaut", () => {
        render(<WizardRoundStepConfig round={null} configData={null} onNext={onNext} />)
        expect(screen.getByLabelText(/heure de début/i)).toHaveValue("19:00")
        expect(screen.getByLabelText(/heure de fin/i)).toHaveValue("23:00")
        expect(screen.getByLabelText(/terrains/i)).toHaveValue(1)
        expect(screen.getByLabelText(/durée match/i)).toHaveValue(30)
    })

    it("pré-remplit depuis configData si fourni", () => {
        render(
            <WizardRoundStepConfig
                round={null}
                configData={{ startTime: "20:00", endTime: "22:00", courts: 2, matchDuration: 45 }}
                onNext={onNext}
            />
        )
        expect(screen.getByLabelText(/heure de début/i)).toHaveValue("20:00")
        expect(screen.getByLabelText(/heure de fin/i)).toHaveValue("22:00")
        expect(screen.getByLabelText(/terrains/i)).toHaveValue(2)
        expect(screen.getByLabelText(/durée match/i)).toHaveValue(45)
    })

    it("pré-remplit le nombre de terrains depuis round si configData est null", () => {
        render(<WizardRoundStepConfig round={mockRound} configData={null} onNext={onNext} />)
        expect(screen.getByLabelText(/terrains/i)).toHaveValue(3)
    })

    it("appelle onNext avec les données du formulaire au submit", () => {
        render(<WizardRoundStepConfig round={null} configData={null} onNext={onNext} />)
        fireEvent.click(screen.getByRole("button", { name: /suivant/i }))
        expect(onNext).toHaveBeenCalledWith({
            startTime: "19:00",
            endTime: "23:00",
            courts: 1,
            matchDuration: 30,
        })
    })

    it("transmet les valeurs modifiées à onNext", () => {
        render(<WizardRoundStepConfig round={null} configData={null} onNext={onNext} />)
        fireEvent.change(screen.getByLabelText(/terrains/i), { target: { value: "4" } })
        fireEvent.change(screen.getByLabelText(/durée match/i), { target: { value: "45" } })
        fireEvent.click(screen.getByRole("button", { name: /suivant/i }))
        expect(onNext).toHaveBeenCalledWith(expect.objectContaining({ courts: 4, matchDuration: 45 }))
    })
})
