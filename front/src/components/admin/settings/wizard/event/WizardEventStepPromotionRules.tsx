import type { EventPromotionRules } from "@/types/event"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft01Icon, ArrowRight01Icon, ArrowUp01Icon, ArrowDown01Icon } from "hugeicons-react"

interface WizardEventStepPromotionRulesProps {
    promotionRules: EventPromotionRules | null
    defaultPromotedCount?: number
    defaultRelegatedCount?: number
    onNext: (promotedCount: number, relegatedCount: number) => Promise<void>
    onPrevious: () => void
    loading?: boolean
}

export function WizardEventStepPromotionRules({
    promotionRules,
    defaultPromotedCount = 1,
    defaultRelegatedCount = 1,
    onNext,
    onPrevious,
    loading,
}: WizardEventStepPromotionRulesProps) {
    const [promotedCount, setPromotedCount] = useState(
        promotionRules?.promoted_count ?? defaultPromotedCount
    )
    const [relegatedCount, setRelegatedCount] = useState(
        promotionRules?.relegated_count ?? defaultRelegatedCount
    )

    useEffect(() => {
        if (promotionRules) {
            setPromotedCount(promotionRules.promoted_count)
            setRelegatedCount(promotionRules.relegated_count)
        }
    }, [promotionRules])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        await onNext(promotedCount, relegatedCount)
    }

    return (
        <form onSubmit={handleSubmit}>
            <div className="grid gap-6 pt-2 pb-4">
                <p className="text-sm text-muted-foreground">
                    Définissez combien de joueurs montent et descendent entre les groupes d'un round à l'autre.
                    Ces règles s'appliquent à cet événement uniquement.
                </p>

                <div className="grid grid-cols-2 gap-6">
                    <div className="rounded-xl border border-gray-200 p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100">
                                <ArrowUp01Icon className="h-4 w-4 text-green-600" />
                            </div>
                            <span className="font-semibold text-sm">Promotions</span>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="promoted_count">
                                Joueurs promus par groupe
                            </Label>
                            <Input
                                id="promoted_count"
                                type="number"
                                min={0}
                                max={10}
                                value={promotedCount}
                                onChange={(e) => setPromotedCount(Math.max(0, parseInt(e.target.value) || 0))}
                            />
                            <p className="text-xs text-muted-foreground">
                                Les <strong>{promotedCount}</strong> premier{promotedCount > 1 ? "s" : ""} de chaque groupe montent au groupe supérieur.
                            </p>
                        </div>
                    </div>

                    <div className="rounded-xl border border-gray-200 p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100">
                                <ArrowDown01Icon className="h-4 w-4 text-red-600" />
                            </div>
                            <span className="font-semibold text-sm">Relégations</span>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="relegated_count">
                                Joueurs relégués par groupe
                            </Label>
                            <Input
                                id="relegated_count"
                                type="number"
                                min={0}
                                max={10}
                                value={relegatedCount}
                                onChange={(e) => setRelegatedCount(Math.max(0, parseInt(e.target.value) || 0))}
                            />
                            <p className="text-xs text-muted-foreground">
                                Les <strong>{relegatedCount}</strong> dernier{relegatedCount > 1 ? "s" : ""} de chaque groupe descendent au groupe inférieur.
                            </p>
                        </div>
                    </div>
                </div>

                {promotedCount === 0 && relegatedCount === 0 && (
                    <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
                        Aucun mouvement de joueurs entre les rounds. Les tableaux seront recréés manuellement.
                    </p>
                )}
            </div>

            <div className="flex justify-between pt-4">
                <Button type="button" size="lg" variant="outline" onClick={onPrevious}>
                    <ArrowLeft01Icon className="h-4 w-4" />
                    Précédent
                </Button>
                <Button type="submit" size="lg" disabled={loading}>
                    {loading ? "Enregistrement…" : "Suivant"}
                    <ArrowRight01Icon className="h-4 w-4" />
                </Button>
            </div>
        </form>
    )
}
