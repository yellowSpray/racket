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
                            {event.event_name}
                        </SelectItem>
                    ))}
                </SelectGroup>
            </SelectContent>
        </Select>
    )
}