import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { validateFormData } from "@/lib/validation"
import { promotionRulesSchema } from "@/lib/schemas/promotion.schema"
import type { PromotionRules } from "@/types/settings"
import { Save, Check } from "lucide-react"

interface PromotionRulesCardProps {
    promotionRules: PromotionRules | null
    defaultPromotion: Omit<PromotionRules, 'id' | 'club_id' | 'created_at' | 'updated_at'>
    onSave: (data: Omit<PromotionRules, 'id' | 'club_id' | 'created_at' | 'updated_at'>) => Promise<boolean>
}

export function PromotionRulesCard({ promotionRules, defaultPromotion, onSave }: PromotionRulesCardProps) {

    const [promotedCount, setPromotedCount] = useState(defaultPromotion.promoted_count)
    const [relegatedCount, setRelegatedCount] = useState(defaultPromotion.relegated_count)
    const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    useEffect(() => {
        if (promotionRules) {
            setPromotedCount(promotionRules.promoted_count)
            setRelegatedCount(promotionRules.relegated_count)
        }
    }, [promotionRules])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setFieldErrors({})

        const data = { promoted_count: promotedCount, relegated_count: relegatedCount }
        const result = validateFormData(promotionRulesSchema, data)
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
                <CardTitle>Montées / Descentes</CardTitle>
                <CardDescription>Nombre de joueurs qui changent de groupe à chaque série</CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
                <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="promoted_count">Joueurs promus</Label>
                            <Input
                                id="promoted_count"
                                type="number"
                                min={0}
                                max={10}
                                value={promotedCount}
                                onChange={(e) => { setPromotedCount(parseInt(e.target.value, 10) || 0); setSaved(false) }}
                            />
                            {fieldErrors.promoted_count && (
                                <p className="text-sm text-red-600">{fieldErrors.promoted_count[0]}</p>
                            )}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="relegated_count">Joueurs relégués</Label>
                            <Input
                                id="relegated_count"
                                type="number"
                                min={0}
                                max={10}
                                value={relegatedCount}
                                onChange={(e) => { setRelegatedCount(parseInt(e.target.value, 10) || 0); setSaved(false) }}
                            />
                            {fieldErrors.relegated_count && (
                                <p className="text-sm text-red-600">{fieldErrors.relegated_count[0]}</p>
                            )}
                        </div>
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
