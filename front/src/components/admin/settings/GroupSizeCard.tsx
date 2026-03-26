import { useState, useEffect } from "react"
import { useErrorHandler } from "@/hooks/useErrorHandler"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { PencilEdit01Icon, Tick02Icon, Loading03Icon, UserGroupIcon } from "hugeicons-react"

interface GroupSizeCardProps {
    defaultMinPlayers: number
    defaultMaxPlayers: number
    onSave: (data: { default_min_players_per_group: number; default_max_players_per_group: number }) => Promise<boolean>
}

export function GroupSizeCard({ defaultMinPlayers, defaultMaxPlayers, onSave }: GroupSizeCardProps) {

    const [minPlayers, setMinPlayers] = useState(defaultMinPlayers)
    const [maxPlayers, setMaxPlayers] = useState(defaultMaxPlayers)
    const { errorMessage, handleError, clearError } = useErrorHandler()
    const [editing, setEditing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    useEffect(() => {
        setMinPlayers(defaultMinPlayers)
    }, [defaultMinPlayers])

    useEffect(() => {
        setMaxPlayers(defaultMaxPlayers)
    }, [defaultMaxPlayers])

    const handleToggle = async () => {
        if (!editing) {
            setEditing(true)
            setSaved(false)
            return
        }

        clearError()
        if (minPlayers < 2 || maxPlayers > 10 || minPlayers > maxPlayers) {
            handleError(new Error("Le minimum doit être entre 2 et 10, et inférieur ou égal au maximum"))
            return
        }

        setSaving(true)
        const success = await onSave({
            default_min_players_per_group: minPlayers,
            default_max_players_per_group: maxPlayers,
        })
        setSaving(false)

        if (success) {
            setEditing(false)
            setSaved(true)
            setTimeout(() => setSaved(false), 2000)
        }
    }

    const handleSliderChange = (values: number[]) => {
        setMinPlayers(values[0])
        setMaxPlayers(values[1])
        setSaved(false)
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col items-start gap-3">
                    <CardTitle className="flex flex-row items-center gap-2">
                        <UserGroupIcon size={16} className="text-foreground" />
                        Taille des groupes
                    </CardTitle>
                    <CardDescription>
                        {editing
                            ? "Les modifications s'appliqueront au prochain événement"
                            : "Joueurs par groupe par défaut"
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
                <div className="flex flex-col gap-6 flex-1 bg-muted/50 rounded-lg p-5 justify-center">
                    <div className="flex items-center justify-center gap-6">
                        <div className="text-center">
                            <span className="text-xs text-muted-foreground font-medium">Min</span>
                            <p className="text-4xl font-bold">{minPlayers}</p>
                        </div>
                        <span className="text-muted-foreground text-lg mt-4">–</span>
                        <div className="text-center">
                            <span className="text-xs text-muted-foreground font-medium">Max</span>
                            <p className="text-4xl font-bold">{maxPlayers}</p>
                        </div>
                    </div>
                    <p className="text-sm text-muted-foreground text-center -mt-2">joueurs par groupe</p>
                    <div className="flex items-center gap-3 w-3/4 mx-auto">
                        <span className="text-xs text-muted-foreground">2</span>
                        <Slider
                            min={2}
                            max={10}
                            step={1}
                            value={[minPlayers, maxPlayers]}
                            onValueChange={handleSliderChange}
                            disabled={!editing}
                            aria-label="Joueurs par groupe"
                        />
                        <span className="text-xs text-muted-foreground">10</span>
                    </div>
                    {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
                </div>
            </CardContent>
        </Card>
    )
}
