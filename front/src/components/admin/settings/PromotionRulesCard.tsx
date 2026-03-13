import { useState, useEffect } from "react"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { validateFormData } from "@/lib/validation"
import { promotionRulesSchema } from "@/lib/schemas/promotion.schema"
import { Badge } from "@/components/ui/badge"
import type { PromotionRules } from "@/types/settings"
import { PencilEdit01Icon, Tick02Icon, Loading03Icon, ArrowUpDownIcon, ChartIncreaseIcon, ChartDecreaseIcon } from "hugeicons-react"

interface PromotionRulesCardProps {
    promotionRules: PromotionRules | null
    defaultPromotion: Omit<PromotionRules, 'id' | 'club_id' | 'created_at' | 'updated_at'>
    onSave: (data: Omit<PromotionRules, 'id' | 'club_id' | 'created_at' | 'updated_at'>) => Promise<boolean>
}

export function PromotionRulesCard({ promotionRules, defaultPromotion, onSave }: PromotionRulesCardProps) {

    const [promotedCount, setPromotedCount] = useState(defaultPromotion.promoted_count)
    const [relegatedCount, setRelegatedCount] = useState(defaultPromotion.relegated_count)
    const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
    const [editing, setEditing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    useEffect(() => {
        if (promotionRules) {
            setPromotedCount(promotionRules.promoted_count)
            setRelegatedCount(promotionRules.relegated_count)
        }
    }, [promotionRules])

    const handleToggle = async () => {
        if (!editing) {
            setEditing(true)
            setSaved(false)
            return
        }

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
            setEditing(false)
            setSaved(true)
            setTimeout(() => setSaved(false), 2000)
        }
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col items-start gap-3">
                    <CardTitle className="flex flex-row items-center gap-2">
                        <ArrowUpDownIcon size={16} className="text-foreground" />
                        Montées / Descentes
                    </CardTitle>
                    <CardDescription>
                        {editing
                            ? "Les modifications s'appliqueront au prochain événement"
                            : "Joueurs promus ou relégués par série"
                        }
                    </CardDescription>
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
                            <Loading03Icon className="h-4 w-4 animate-spin" />
                        ) : saved ? (
                            <Tick02Icon className="h-4 w-4 text-green-600" />
                        ) : editing ? (
                            <Tick02Icon className="h-4 w-4" />
                        ) : (
                            <PencilEdit01Icon className="h-4 w-4" />
                        )}
                    </Button>
                </CardAction>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
                <div className="flex flex-col gap-3 flex-1">
                    <div className="grid gap-2 bg-blue-50 rounded-lg p-3 flex-1">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="promoted_count">Promus</Label>
                            <Badge className="text-[10px] px-1.5 py-0 bg-blue-100 text-blue-700 border-blue-200"><ChartIncreaseIcon className="h-3 w-3 mr-0.5" />montée</Badge>
                        </div>
                        <Input
                            id="promoted_count"
                            type="number"
                            min={0}
                            max={10}
                            value={promotedCount}
                            onChange={(e) => { setPromotedCount(parseInt(e.target.value, 10) || 0); setSaved(false) }}
                            disabled={!editing}
                        />
                        {fieldErrors.promoted_count && (
                            <p className="text-sm text-red-600">{fieldErrors.promoted_count[0]}</p>
                        )}
                    </div>
                    <div className="grid gap-2 bg-orange-50 rounded-lg p-3 flex-1">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="relegated_count">Relégués</Label>
                            <Badge className="text-[10px] px-1.5 py-0 bg-orange-100 text-orange-700 border-orange-200"><ChartDecreaseIcon className="h-3 w-3 mr-0.5" />descente</Badge>
                        </div>
                        <Input
                            id="relegated_count"
                            type="number"
                            min={0}
                            max={10}
                            value={relegatedCount}
                            onChange={(e) => { setRelegatedCount(parseInt(e.target.value, 10) || 0); setSaved(false) }}
                            disabled={!editing}
                        />
                        {fieldErrors.relegated_count && (
                            <p className="text-sm text-red-600">{fieldErrors.relegated_count[0]}</p>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
