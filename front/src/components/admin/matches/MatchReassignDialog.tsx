import { useEffect, useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import type { Match } from "@/types/match"

interface MatchReassignDialogProps {
    match: Match | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onSave: (matchId: string, updates: { match_date: string; match_time: string; court_number: string }) => void
    dates: string[]
    timeSlots: string[]
    courts: string[]
    saving: boolean
}

function formatPlayerName(player: { first_name: string; last_name: string } | undefined): string {
    if (!player) return "?"
    return `${player.first_name} ${player.last_name}`
}

function formatDateLabel(dateStr: string): string {
    const date = new Date(dateStr + "T12:00:00")
    return date.toLocaleDateString("fr-FR", {
        weekday: "short",
        day: "numeric",
        month: "short",
    })
}

export function MatchReassignDialog({
    match,
    open,
    onOpenChange,
    onSave,
    dates,
    timeSlots,
    courts,
    saving,
}: MatchReassignDialogProps) {
    const [selectedDate, setSelectedDate] = useState("")
    const [selectedTime, setSelectedTime] = useState("")
    const [selectedCourt, setSelectedCourt] = useState("")

    useEffect(() => {
        if (match) {
            setSelectedDate(match.match_date || "")
            const time = match.match_time?.match(/(\d{2}:\d{2})/)?.[1] || match.match_time || ""
            setSelectedTime(time)
            setSelectedCourt(match.court_number || "")
        }
    }, [match])

    const handleSave = () => {
        if (!match) return
        onSave(match.id, {
            match_date: selectedDate,
            match_time: selectedTime,
            court_number: selectedCourt,
        })
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Deplacer le match</DialogTitle>
                    <DialogDescription>
                        Modifiez la date, l'heure ou le terrain de ce match.
                    </DialogDescription>
                </DialogHeader>

                {match && (
                    <div className="space-y-4">
                        {/* Match info */}
                        <div className="flex items-center gap-2 text-sm bg-gray-50 rounded-lg p-3">
                            {match.group?.group_name && (
                                <Badge variant="default" className="text-[10px] shrink-0">
                                    {match.group.group_name}
                                </Badge>
                            )}
                            <span className="font-medium">{formatPlayerName(match.player1)}</span>
                            <span className="text-gray-400">vs</span>
                            <span className="font-medium">{formatPlayerName(match.player2)}</span>
                        </div>

                        {/* Date select */}
                        <div className="space-y-1.5">
                            <Label htmlFor="reassign-date">Date</Label>
                            <select
                                id="reassign-date"
                                aria-label="Date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                            >
                                {dates.map(d => (
                                    <option key={d} value={d}>{formatDateLabel(d)}</option>
                                ))}
                            </select>
                        </div>

                        {/* Time select */}
                        <div className="space-y-1.5">
                            <Label htmlFor="reassign-time">Heure</Label>
                            <select
                                id="reassign-time"
                                aria-label="Heure"
                                value={selectedTime}
                                onChange={(e) => setSelectedTime(e.target.value)}
                                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                            >
                                {timeSlots.map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>

                        {/* Court select */}
                        <div className="space-y-1.5">
                            <Label htmlFor="reassign-court">Terrain</Label>
                            <select
                                id="reassign-court"
                                aria-label="Terrain"
                                value={selectedCourt}
                                onChange={(e) => setSelectedCourt(e.target.value)}
                                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                            >
                                {courts.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Annuler
                    </Button>
                    <Button onClick={handleSave} disabled={saving || !match}>
                        {saving ? "Enregistrement..." : "Enregistrer"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
