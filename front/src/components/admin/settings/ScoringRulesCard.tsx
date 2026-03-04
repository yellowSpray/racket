import { useState, useEffect } from "react"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { validateFormData } from "@/lib/validation"
import { scoringRulesSchema } from "@/lib/schemas/scoring.schema"
import type { ScorePointsEntry } from "@/types/settings"
import { Pencil, Check, Loader2, Trophy } from "lucide-react"

interface ScoringRulesCardProps {
    scoringRules: { score_points: ScorePointsEntry[] } | null
    defaultScoring: { score_points: ScorePointsEntry[] }
    onSave: (data: { score_points: ScorePointsEntry[] }) => Promise<boolean>
}

const SCORE_LABELS: Record<string, string> = {
    "3-0": "3 - 0",
    "3-1": "3 - 1",
    "3-2": "3 - 2",
    "ABS": "ABS",
}

export function ScoringRulesCard({ scoringRules, defaultScoring, onSave }: ScoringRulesCardProps) {

    const [scorePoints, setScorePoints] = useState<ScorePointsEntry[]>(defaultScoring.score_points)
    const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
    const [editing, setEditing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    useEffect(() => {
        if (scoringRules) {
            setScorePoints(scoringRules.score_points)
        }
    }, [scoringRules])

    const handleChange = (index: number, field: "winner_points" | "loser_points", value: string) => {
        setScorePoints(prev => {
            const updated = [...prev]
            updated[index] = { ...updated[index], [field]: value === '' ? 0 : parseInt(value, 10) }
            return updated
        })
        setSaved(false)
    }

    const handleToggle = async () => {
        if (!editing) {
            setEditing(true)
            setSaved(false)
            return
        }

        // En mode édition → enregistrer
        setFieldErrors({})
        const data = { score_points: scorePoints }
        const result = validateFormData(scoringRulesSchema, data)
        if (!result.success) {
            setFieldErrors(result.fieldErrors)
            return
        }

        setSaving(true)
        const success = await onSave(result.data)
        setSaving(false)

        if (success) {
            setEditing(false)
            setSaved(true)
            setTimeout(() => setSaved(false), 2000)
        }
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center h-9 w-9 shrink-0 rounded-lg bg-muted text-muted-foreground">
                        <Trophy className="h-5 w-5" />
                    </div>
                    <div className="grid gap-1">
                        <CardTitle>Règles de pointage</CardTitle>
                        <CardDescription>
                            {editing
                                ? "Les modifications s'appliqueront au prochain événement"
                                : "Points attribués selon le résultat du match"
                            }
                        </CardDescription>
                    </div>
                </div>
                <CardAction>
                    <Button
                        variant="outline"
                        size="icon"
                        className="shadow-none"
                        onClick={handleToggle}
                        disabled={saving}
                        aria-label={editing ? "Enregistrer" : "Modifier"}
                    >
                        {saving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : saved ? (
                            <Check className="h-4 w-4 text-green-600" />
                        ) : editing ? (
                            <Check className="h-4 w-4" />
                        ) : (
                            <Pencil className="h-4 w-4" />
                        )}
                    </Button>
                </CardAction>
            </CardHeader>
            <CardContent>
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b">
                            <th className="text-left py-2 font-medium">Score</th>
                            <th className="text-center py-2 font-medium">Gagnant</th>
                            <th className="text-center py-2 font-medium">Perdant</th>
                        </tr>
                    </thead>
                    <tbody>
                        {scorePoints.map((entry, index) => (
                            <tr key={entry.score} className="border-b last:border-b-0">
                                <td className="py-2 font-medium">{SCORE_LABELS[entry.score] ?? entry.score}</td>
                                <td className="py-2 text-center">
                                    <Input
                                        type="number"
                                        className="w-16 mx-auto text-center"
                                        value={entry.winner_points}
                                        onChange={(e) => handleChange(index, "winner_points", e.target.value)}
                                        disabled={!editing}
                                        aria-label={`Gagnant ${entry.score}`}
                                    />
                                </td>
                                <td className="py-2 text-center">
                                    <Input
                                        type="number"
                                        className="w-16 mx-auto text-center"
                                        value={entry.loser_points}
                                        onChange={(e) => handleChange(index, "loser_points", e.target.value)}
                                        disabled={!editing}
                                        aria-label={`Perdant ${entry.score}`}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {fieldErrors.score_points && (
                    <p className="text-sm text-red-600 mt-2">{fieldErrors.score_points[0]}</p>
                )}
            </CardContent>
        </Card>
    )
}
