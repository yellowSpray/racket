import { useState, useEffect } from "react"
import { useErrorHandler } from "@/hooks/useErrorHandler"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { PencilEdit01Icon, Tick02Icon, Loading03Icon, MoneyReceiveSquareIcon } from "hugeicons-react"

interface VisitorFeeCardProps {
    visitorFee: number
    onSave: (data: { visitor_fee: number }) => Promise<boolean>
}

export function VisitorFeeCard({ visitorFee, onSave }: VisitorFeeCardProps) {

    const [fee, setFee] = useState(visitorFee)
    const { handleError, clearError } = useErrorHandler()
    const [editing, setEditing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    useEffect(() => {
        setFee(visitorFee)
    }, [visitorFee])

    const handleToggle = async () => {
        if (!editing) {
            setEditing(true)
            setSaved(false)
            return
        }

        clearError()
        if (fee < 0) {
            handleError(new Error("Le tarif ne peut pas être négatif"))
            return
        }

        setSaving(true)
        const success = await onSave({ visitor_fee: fee })
        setSaving(false)

        if (success) {
            setEditing(false)
            setSaved(true)
            setTimeout(() => setSaved(false), 2000)
        }
    }

    const formattedFee = new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
    }).format(fee)

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col items-start gap-3">
                    <CardTitle className="flex flex-row items-center gap-2">
                        <MoneyReceiveSquareIcon size={16} className="text-foreground" />
                        Tarif visiteur
                    </CardTitle>
                    <CardDescription>
                        {editing
                            ? "Les modifications s'appliqueront au prochain événement"
                            : "Montant facturé aux visiteurs"
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
                <div className="flex flex-col gap-4 flex-1 bg-muted/50 rounded-lg p-5 justify-center">
                    <div className="text-center">
                        <span className="text-4xl font-bold">{formattedFee}</span>
                        <p className="text-sm text-muted-foreground mt-1">par session</p>
                    </div>
                    <div className="w-1/2 mx-auto">
                        <Input
                            type="number"
                            min={0}
                            step={0.5}
                            value={fee}
                            onChange={(e) => { setFee(parseFloat(e.target.value) || 0); setSaved(false) }}
                            disabled={!editing}
                            aria-label="Tarif visiteur"
                            className="text-center"
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
