import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useEvent } from "@/contexts/EventContext";

export function EventSelector() {
    const { currentEvent, events, loading, setCurrentEvent } = useEvent()

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
                <SelectValue placeholder="Sélectionner un événement" />
            </SelectTrigger>
            <SelectContent className="bg-background">
                <SelectGroup>
                    {events.map((event) => (
                        <SelectItem key={event.id} value={event.id}>
                            <div className="flex items-center gap-1.5">
                                {event.status === 'active' && (
                                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                )}
                                {event.status === 'upcoming' && (
                                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                                )}
                                {event.status === 'completed' && (
                                    <span className="w-2 h-2 rounded-full bg-gray-400" />
                                )}
                                {event.event_name}
                            </div>
                        </SelectItem>
                    ))}
                </SelectGroup>
            </SelectContent>
        </Select>
    )
}