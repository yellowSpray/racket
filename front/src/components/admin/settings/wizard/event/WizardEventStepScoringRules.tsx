import type { EventScoringRules } from "@/types/event"
import type { ScorePointsEntry } from "@/types/settings"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft01Icon, PlusSignIcon, Delete02Icon, Tick02Icon } from "hugeicons-react"

const DEFAULT_SCORE_POINTS: ScorePointsEntry[] = [
    { score: "3-0", winner_points: 5, loser_points: 0 },
    { score: "3-1", winner_points: 4, loser_points: 1 },
    { score: "3-2", winner_points: 3, loser_points: 2 },
    { score: "ABS", winner_points: 3, loser_points: -1 },
]

interface WizardEventStepScoringRulesProps {
    scoringRules: EventScoringRules | null
    defaultScorePoints?: ScorePointsEntry[]
    onFinish: (scorePoints: ScorePointsEntry[]) => Promise<void>
    onPrevious: () => void
    loading?: boolean
    isEditing?: boolean
}

export function WizardEventStepScoringRules({
    scoringRules,
    defaultScorePoints = DEFAULT_SCORE_POINTS,
    onFinish,
    onPrevious,
    loading,
    isEditing,
}: WizardEventStepScoringRulesProps) {
    const [entries, setEntries] = useState<ScorePointsEntry[]>(
        scoringRules?.score_points ?? defaultScorePoints
    )

    useEffect(() => {
        if (scoringRules) setEntries(scoringRules.score_points)
    }, [scoringRules])

    const updateEntry = (index: number, field: keyof ScorePointsEntry, value: string | number) => {
        setEntries(prev => prev.map((entry, i) =>
            i === index ? { ...entry, [field]: value } : entry
        ))
    }

    const addEntry = () => {
        setEntries(prev => [...prev, { score: "", winner_points: 0, loser_points: 0 }])
    }

    const removeEntry = (index: number) => {
        setEntries(prev => prev.filter((_, i) => i !== index))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        await onFinish(entries)
    }

    return (
        <form onSubmit={handleSubmit}>
            <div className="grid gap-6 pt-2 pb-4">
                <p className="text-sm text-muted-foreground">
                    Configurez le barème de points attribués selon le résultat d'un match.
                    Ces règles s'appliquent à cet événement uniquement.
                </p>

                <div className="rounded-xl border border-gray-200 overflow-hidden">
                    {/* En-têtes */}
                    <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-0 bg-gray-50 border-b border-gray-200 px-4 py-2">
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Score</span>
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Pts gagnant</span>
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Pts perdant</span>
                        <span className="w-8" />
                    </div>

                    {/* Lignes */}
                    {entries.map((entry, index) => (
                        <div
                            key={index}
                            className="grid grid-cols-[1fr_1fr_1fr_auto] gap-0 items-center px-4 py-2 border-b border-gray-100 last:border-b-0"
                        >
                            <div className="pr-3">
                                <Input
                                    value={entry.score}
                                    onChange={(e) => updateEntry(index, "score", e.target.value)}
                                    placeholder="3-0"
                                    className="h-8 text-sm"
                                />
                            </div>
                            <div className="pr-3">
                                <Input
                                    type="number"
                                    value={entry.winner_points}
                                    onChange={(e) => updateEntry(index, "winner_points", parseInt(e.target.value) || 0)}
                                    className="h-8 text-sm"
                                />
                            </div>
                            <div className="pr-3">
                                <Input
                                    type="number"
                                    value={entry.loser_points}
                                    onChange={(e) => updateEntry(index, "loser_points", parseInt(e.target.value) || 0)}
                                    className="h-8 text-sm"
                                />
                            </div>
                            <Button
                                type="button"
                                variant="icon"
                                size="icon"
                                className="h-8 w-8 border-0 text-gray-400 hover:text-red-500"
                                onClick={() => removeEntry(index)}
                                disabled={entries.length <= 1}
                            >
                                <Delete02Icon className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    ))}

                    {/* Ajouter une ligne */}
                    <button
                        type="button"
                        onClick={addEntry}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                        <PlusSignIcon className="h-3.5 w-3.5" />
                        Ajouter un résultat
                    </button>
                </div>
            </div>

            <div className="flex justify-between pt-4">
                <Button type="button" size="lg" variant="outline" onClick={onPrevious}>
                    <ArrowLeft01Icon className="h-4 w-4" />
                    Précédent
                </Button>
                <Button type="submit" size="lg" disabled={loading}>
                    {loading ? "Enregistrement…" : (
                        <>
                            <Tick02Icon className="mr-2 h-4 w-4" />
                            {isEditing ? "Enregistrer" : "Terminer"}
                        </>
                    )}
                </Button>
            </div>
        </form>
    )
}
