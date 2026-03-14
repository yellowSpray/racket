import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Calendar03Icon } from "hugeicons-react"
import type { DiscoverableEvent } from "@/types/visitor"

interface VisitorRequestDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  event: DiscoverableEvent | null
  onSubmit: (eventId: string, message?: string) => Promise<{ success: boolean; error?: string }>
  loading?: boolean
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

export function VisitorRequestDialog({
  open,
  onOpenChange,
  event,
  onSubmit,
  loading,
}: VisitorRequestDialogProps) {
  const [message, setMessage] = useState("")
  const [error, setError] = useState<string | null>(null)

  if (!event) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="sr-only">Demander à rejoindre</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    )
  }

  const handleSubmit = async () => {
    setError(null)
    const result = await onSubmit(event.id, message || undefined)
    if (result.success) {
      setMessage("")
      onOpenChange(false)
    } else if (result.error) {
      setError(result.error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Demander à rejoindre</DialogTitle>
          <DialogDescription>
            {event.event_name} — {event.clubs.club_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar03Icon className="h-4 w-4" />
            <span>
              {formatDate(event.start_date)} — {formatDate(event.end_date)}
            </span>
          </div>

          {event.clubs.visitor_fee > 0 && (
            <p className="text-sm text-muted-foreground">
              Frais visiteur : {event.clubs.visitor_fee} €
            </p>
          )}

          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Message pour l'organisateur (optionnel)"
          />

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            Envoyer la demande
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
