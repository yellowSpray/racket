import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { useErrorHandler } from "@/hooks/useErrorHandler"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { PencilEdit01Icon, Tick02Icon, Loading03Icon, Calendar03Icon, Link04Icon } from "hugeicons-react"

interface EventDefaultsCardProps {
    defaultStartTime: string
    defaultEndTime: string
    defaultMatchDuration: number
    defaultMinPlayers: number
    defaultMaxPlayers: number
    visitorFee: number
    openToVisitors: boolean
    autoRenewPlayers: boolean
    inviteUrl: string
    eventName: string
    className?: string
    onSave: (data: {
        default_start_time: string
        default_end_time: string
        default_match_duration: number
        default_min_players_per_group: number
        default_max_players_per_group: number
        visitor_fee: number
    }) => Promise<boolean>
    onToggleVisitors: (checked: boolean) => Promise<void>
    onToggleAutoRenew: (checked: boolean) => Promise<void>
}

export function EventDefaultsCard({
    defaultStartTime,
    defaultEndTime,
    defaultMatchDuration,
    defaultMinPlayers,
    defaultMaxPlayers,
    visitorFee,
    openToVisitors,
    autoRenewPlayers,
    inviteUrl,
    eventName,
    className,
    onSave,
    onToggleVisitors,
    onToggleAutoRenew,
}: EventDefaultsCardProps) {

    const [startTime, setStartTime] = useState(defaultStartTime)
    const [endTime, setEndTime] = useState(defaultEndTime)
    const [duration, setDuration] = useState(defaultMatchDuration)
    const [minPlayers, setMinPlayers] = useState(defaultMinPlayers)
    const [maxPlayers, setMaxPlayers] = useState(defaultMaxPlayers)
    const [fee, setFee] = useState(visitorFee)
    const [calendarMode, setCalendarMode] = useState<'days' | 'period'>('days')
    const [copied, setCopied] = useState(false)
    const { handleError, clearError } = useErrorHandler()
    const [editing, setEditing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    useEffect(() => { setStartTime(defaultStartTime) }, [defaultStartTime])
    useEffect(() => { setEndTime(defaultEndTime) }, [defaultEndTime])
    useEffect(() => { setDuration(defaultMatchDuration) }, [defaultMatchDuration])
    useEffect(() => { setMinPlayers(defaultMinPlayers) }, [defaultMinPlayers])
    useEffect(() => { setMaxPlayers(defaultMaxPlayers) }, [defaultMaxPlayers])
    useEffect(() => { setFee(visitorFee) }, [visitorFee])

    const handleToggle = async () => {
        if (!editing) {
            setEditing(true)
            setSaved(false)
            return
        }

        clearError()
        if (startTime >= endTime) {
            handleError(new Error("L'heure de début doit être avant l'heure de fin"))
            return
        }
        if (duration < 5 || duration > 180) {
            handleError(new Error("La durée doit être entre 5 et 180 minutes"))
            return
        }
        if (minPlayers < 2 || maxPlayers > 10 || minPlayers > maxPlayers) {
            handleError(new Error("Le minimum doit être entre 2 et 10, et inférieur ou égal au maximum"))
            return
        }
        if (fee < 0) {
            handleError(new Error("Le tarif ne peut pas être négatif"))
            return
        }

        setSaving(true)
        const success = await onSave({
            default_start_time: startTime,
            default_end_time: endTime,
            default_match_duration: duration,
            default_min_players_per_group: minPlayers,
            default_max_players_per_group: maxPlayers,
            visitor_fee: fee,
        })
        setSaving(false)

        if (success) {
            setEditing(false)
            setSaved(true)
            setTimeout(() => setSaved(false), 2000)
        }
    }

    return (
        <Card className={cn(className)}>
            <CardHeader>
                <div className="flex flex-col items-start gap-3">
                    <CardTitle className="flex flex-row items-center gap-2">
                        <Calendar03Icon size={16} className="text-foreground" />
                        Événement par défaut
                    </CardTitle>
                    <CardDescription>
                        {editing
                            ? "Les modifications s'appliqueront au prochain événement"
                            : "Valeurs par défaut à la création d'événement"
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
                <div className="flex flex-col bg-muted/50 rounded-lg p-5 divide-y divide-border [&>*]:py-4 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">
                    <div className="grid grid-cols-3 gap-3">
                        <div className="grid gap-1.5">
                            <Label htmlFor="default_start_time" className="text-xs text-muted-foreground">Heure de début</Label>
                            <Input
                                id="default_start_time"
                                type="time"
                                value={startTime}
                                onChange={(e) => { setStartTime(e.target.value); setSaved(false) }}
                                disabled={!editing}
                                aria-label="Heure de début"
                            />
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="default_end_time" className="text-xs text-muted-foreground">Heure de fin</Label>
                            <Input
                                id="default_end_time"
                                type="time"
                                value={endTime}
                                onChange={(e) => { setEndTime(e.target.value); setSaved(false) }}
                                disabled={!editing}
                                aria-label="Heure de fin"
                            />
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="default_duration" className="text-xs text-muted-foreground">Durée de match</Label>
                            <div className="relative">
                                <Input
                                    id="default_duration"
                                    type="number"
                                    min={5}
                                    max={180}
                                    value={duration}
                                    onChange={(e) => { setDuration(parseInt(e.target.value) || 5); setSaved(false) }}
                                    disabled={!editing}
                                    aria-label="Durée de match"
                                    className="pr-10"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">min</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Label className="text-xs text-muted-foreground shrink-0">Joueurs par groupe par défaut</Label>
                        <span className="text-xs font-semibold w-4 text-center">{minPlayers}</span>
                        <Slider
                            min={2}
                            max={10}
                            step={1}
                            value={[minPlayers, maxPlayers]}
                            onValueChange={(values) => { setMinPlayers(values[0]); setMaxPlayers(values[1]); setSaved(false) }}
                            disabled={!editing}
                            className="flex-1"
                            aria-label="Joueurs par groupe"
                        />
                        <span className="text-xs font-semibold w-4 text-center">{maxPlayers}</span>
                    </div>
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-3">
                            <Label htmlFor="default_member_fee" className="text-xs text-muted-foreground w-52 shrink-0">Montant facturé aux membres</Label>
                            <div className="relative flex-1">
                                <Input
                                    id="default_member_fee"
                                    type="number"
                                    min={0}
                                    step={0.5}
                                    value={0}
                                    disabled={!editing}
                                    aria-label="Tarif membre"
                                    className="pr-8"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">€</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Label htmlFor="default_visitor_fee" className="text-xs text-muted-foreground w-52 shrink-0">Montant facturé aux visiteurs</Label>
                            <div className="relative flex-1">
                                <Input
                                    id="default_visitor_fee"
                                    type="number"
                                    min={0}
                                    step={0.5}
                                    value={fee}
                                    onChange={(e) => { setFee(parseFloat(e.target.value) || 0); setSaved(false) }}
                                    disabled={!editing}
                                    aria-label="Tarif visiteur"
                                    className="pr-8"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">€</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="calendar_by_days" className="text-xs text-muted-foreground">Calendrier par jour sélectionné <span className="text-muted-foreground/60">(l'admin choisit les dates une par une)</span></Label>
                            <Switch
                                id="calendar_by_days"
                                checked={calendarMode === 'days'}
                                onCheckedChange={(checked) => { if (checked) setCalendarMode('days') }}
                                disabled={!editing}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <Label htmlFor="calendar_by_period" className="text-xs text-muted-foreground">Calendrier par période <span className="text-muted-foreground/60">(l'admin définit une date de début et de fin)</span></Label>
                            <Switch
                                id="calendar_by_period"
                                checked={calendarMode === 'period'}
                                onCheckedChange={(checked) => { if (checked) setCalendarMode('period') }}
                                disabled={!editing}
                            />
                        </div>
                    </div>
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <Label htmlFor="open-to-visitors" className="text-xs text-muted-foreground">Ouvert aux visiteurs</Label>
                                <p className="text-xs text-muted-foreground/60 mt-0.5">Permet aux joueurs externes de découvrir vos événements</p>
                            </div>
                            <Switch
                                id="open-to-visitors"
                                checked={openToVisitors}
                                onCheckedChange={onToggleVisitors}
                                aria-label="Ouvert aux visiteurs"
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <Label htmlFor="auto-renew-players" className="text-xs text-muted-foreground">Renouvellement automatique des joueurs</Label>
                                <p className="text-xs text-muted-foreground/60 mt-0.5">Les joueurs sont automatiquement inscrits au prochain événement</p>
                            </div>
                            <Switch
                                id="auto-renew-players"
                                checked={autoRenewPlayers}
                                onCheckedChange={onToggleAutoRenew}
                                aria-label="Renouvellement automatique"
                            />
                        </div>
                    </div>
                    {openToVisitors && inviteUrl && (
                        <div className="flex flex-col gap-3">
                            <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Link04Icon size={14} />
                                Lien d'invitation — {eventName}
                            </Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    readOnly
                                    value={inviteUrl}
                                    className="text-sm text-muted-foreground bg-background"
                                />
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={async () => {
                                        await navigator.clipboard.writeText(inviteUrl)
                                        setCopied(true)
                                        setTimeout(() => setCopied(false), 2000)
                                    }}
                                    aria-label="Copier le lien"
                                >
                                    {copied ? (
                                        <><Tick02Icon size={14} className="text-green-600" /> Copié</>
                                    ) : (
                                        "Copier"
                                    )}
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground/60">
                                Partagez ce lien pour inviter des joueurs d'autres clubs.
                            </p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
