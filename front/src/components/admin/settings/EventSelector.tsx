import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useEvent } from "@/contexts/EventContext";
import type { EventRound } from "@/types/event";

function RoundStatusDot({ round }: { round: EventRound | undefined }) {
    if (!round) return null
    if (round.status === 'active')    return <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
    if (round.status === 'upcoming')  return <span className="w-2 h-2 rounded-full bg-amber-400" />
    return <span className="w-2 h-2 rounded-full bg-gray-400" />
}

export function EventSelector() {
    const { currentEvent, currentRound, events, loading, setCurrentEvent } = useEvent()

    if(loading) {
        return (
            <Select disabled>
                <SelectTrigger className="w-100px">
                    <SelectValue placeholder="Chargement" />
                </SelectTrigger>
            </Select>
        )
    }

    if(events.length === 0){
        return (
            <Select disabled>
                <SelectTrigger className="w-100px">
                    <SelectValue placeholder="Aucun événement" />
                </SelectTrigger>
            </Select>
        )
    }

    return (
        <Select
            value={currentEvent?.id || ""}
            onValueChange={(value) => setCurrentEvent(value)}
        >
            <SelectTrigger className="w-100px">
                <SelectValue placeholder="Sélectionner un événement">
                    {currentEvent && (
                        <div className="flex items-center gap-1.5">
                            <RoundStatusDot round={currentRound ?? undefined} />
                            {currentEvent.event_name}
                            {currentRound && (
                                <span className="text-muted-foreground text-xs">
                                    R{currentRound.round_number}
                                </span>
                            )}
                        </div>
                    )}
                </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-background">
                <SelectGroup>
                    {events.map((event) => {
                        const rounds = event.event_rounds || []
                        const activeRound =
                            rounds.find(r => r.status === 'active') ??
                            [...rounds].sort((a, b) => b.round_number - a.round_number)[0]
                        return (
                            <SelectItem key={event.id} value={event.id}>
                                <div className="flex items-center gap-1.5">
                                    <RoundStatusDot round={activeRound} />
                                    {event.event_name}
                                    {activeRound && (
                                        <span className="text-muted-foreground text-xs">
                                            R{activeRound.round_number}
                                        </span>
                                    )}
                                </div>
                            </SelectItem>
                        )
                    })}
                </SelectGroup>
            </SelectContent>
        </Select>
    )
}
