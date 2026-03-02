import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { validateFormData } from "@/lib/validation"
import { scoringRulesSchema } from "@/lib/schemas/scoring.schema"
import type { ScoringRules } from "@/types/settings"
import { Save, Check } from "lucide-react"

interface ScoringRulesCardProps {
    scoringRules: ScoringRules | null
    defaultScoring: Omit<ScoringRules, 'id' | 'club_id' | 'created_at' | 'updated_at'>
    onSave: (data: Omit<ScoringRules, 'id' | 'club_id' | 'created_at' | 'updated_at'>) => Promise<boolean>
}

const FIELDS = [
    { key: 'points_win', label: 'Victoire' },
    { key: 'points_loss', label: 'Défaite' },
    { key: 'points_draw', label: 'Égalité' },
    { key: 'points_walkover_win', label: 'Forfait gagné' },
    { key: 'points_walkover_loss', label: 'Forfait perdu' },
    { key: 'points_absence', label: 'Absence' },
] as const

export function ScoringRulesCard({ scoringRules, defaultScoring, onSave }: ScoringRulesCardProps) {

    const [values, setValues] = useState(defaultScoring)
    const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    useEffect(() => {
        if (scoringRules) {
            setValues({
                points_win: scoringRules.points_win,
                points_loss: scoringRules.points_loss,
                points_draw: scoringRules.points_draw,
                points_walkover_win: scoringRules.points_walkover_win,
                points_walkover_loss: scoringRules.points_walkover_loss,
                points_absence: scoringRules.points_absence,
            })
        }
    }, [scoringRules])

    const handleChange = (key: string, value: string) => {
        setValues(prev => ({ ...prev, [key]: value === '' ? 0 : parseInt(value, 10) }))
        setSaved(false)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setFieldErrors({})

        const result = validateFormData(scoringRulesSchema, values)
        if (!result.success) {
            setFieldErrors(result.fieldErrors)
            return
        }

        setSaving(true)
        const success = await onSave(result.data)
        setSaving(false)

        if (success) {
            setSaved(true)
            setTimeout(() => setSaved(false), 2000)
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Règles de pointage</CardTitle>
                <CardDescription>Points attribués selon le résultat du match</CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {FIELDS.map(({ key, label }) => (
                            <div key={key} className="grid gap-2">
                                <Label htmlFor={key}>{label}</Label>
                                <Input
                                    id={key}
                                    type="number"
                                    min={0}
                                    value={values[key]}
                                    onChange={(e) => handleChange(key, e.target.value)}
                                />
                                {fieldErrors[key] && (
                                    <p className="text-sm text-red-600">{fieldErrors[key][0]}</p>
                                )}
                            </div>
                        ))}
                    </div>
                </CardContent>
                <CardFooter>
                    <Button type="submit" disabled={saving}>
                        {saved ? (
                            <><Check className="mr-2 h-4 w-4" /> Enregistré</>
                        ) : (
                            <><Save className="mr-2 h-4 w-4" /> Enregistrer</>
                        )}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    )
}
