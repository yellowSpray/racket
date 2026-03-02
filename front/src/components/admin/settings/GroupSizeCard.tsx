import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Save, Check } from "lucide-react"

interface GroupSizeCardProps {
    defaultMaxPlayers: number
    onSave: (data: { default_max_players_per_group: number }) => Promise<boolean>
}

export function GroupSizeCard({ defaultMaxPlayers, onSave }: GroupSizeCardProps) {

    const [maxPlayers, setMaxPlayers] = useState(defaultMaxPlayers)
    const [error, setError] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    useEffect(() => {
        setMaxPlayers(defaultMaxPlayers)
    }, [defaultMaxPlayers])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (maxPlayers < 2 || maxPlayers > 10) {
            setError("Le nombre doit être entre 2 et 10")
            return
        }

        setSaving(true)
        const success = await onSave({ default_max_players_per_group: maxPlayers })
        setSaving(false)

        if (success) {
            setSaved(true)
            setTimeout(() => setSaved(false), 2000)
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Taille des groupes</CardTitle>
                <CardDescription>
                    Nombre de joueurs par défaut lors de la création des tableaux
                </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
                <CardContent>
                    <div className="grid gap-2 max-w-xs">
                        <Label htmlFor="max_players">Joueurs par groupe</Label>
                        <Input
                            id="max_players"
                            type="number"
                            min={2}
                            max={10}
                            value={maxPlayers}
                            onChange={(e) => { setMaxPlayers(parseInt(e.target.value, 10) || 2); setSaved(false) }}
                        />
                        {error && <p className="text-sm text-red-600">{error}</p>}
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
