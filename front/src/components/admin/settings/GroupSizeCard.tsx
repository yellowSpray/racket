import { useState, useEffect } from "react"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Pencil, Check, Loader2, Users } from "lucide-react"

interface GroupSizeCardProps {
    defaultMaxPlayers: number
    onSave: (data: { default_max_players_per_group: number }) => Promise<boolean>
}

export function GroupSizeCard({ defaultMaxPlayers, onSave }: GroupSizeCardProps) {

    const [maxPlayers, setMaxPlayers] = useState(defaultMaxPlayers)
    const [error, setError] = useState<string | null>(null)
    const [editing, setEditing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    useEffect(() => {
        setMaxPlayers(defaultMaxPlayers)
    }, [defaultMaxPlayers])

    const handleToggle = async () => {
        if (!editing) {
            setEditing(true)
            setSaved(false)
            return
        }

        setError(null)
        if (maxPlayers < 2 || maxPlayers > 10) {
            setError("Le nombre doit être entre 2 et 10")
            return
        }

        setSaving(true)
        const success = await onSave({ default_max_players_per_group: maxPlayers })
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
                        <Users className="h-5 w-5" />
                    </div>
                    <div className="grid gap-1">
                        <CardTitle>Taille des groupes</CardTitle>
                        <CardDescription>
                            {editing
                                ? "Les modifications s'appliqueront au prochain événement"
                                : "Joueurs par groupe par défaut"
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
            <CardContent className="flex-1 flex flex-col">
                <div className="flex flex-col gap-6 flex-1 bg-muted/50 rounded-lg p-5 justify-center">
                    <div className="text-center">
                        <span className="text-4xl font-bold">{maxPlayers}</span>
                        <p className="text-sm text-muted-foreground mt-1">joueurs par groupe</p>
                    </div>
                    <div className="flex items-center gap-3 w-3/4 mx-auto">
                        <span className="text-xs text-muted-foreground">2</span>
                        <Slider
                            id="max_players"
                            min={2}
                            max={10}
                            step={1}
                            value={[maxPlayers]}
                            onValueChange={(value) => { setMaxPlayers(value[0]); setSaved(false) }}
                            disabled={!editing}
                            aria-label="Joueurs par groupe"
                        />
                        <span className="text-xs text-muted-foreground">10</span>
                    </div>
                    {error && <p className="text-sm text-red-600">{error}</p>}
                </div>
            </CardContent>
        </Card>
    )
}
