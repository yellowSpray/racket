import type { Event } from "@/types/event"
import { useState } from "react"
import { useErrorHandler } from "@/hooks/useErrorHandler"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { supabase } from "@/lib/supabaseClient"

interface DeleteEventDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    event: Event | null
    onSuccess: () => void
}

export function DeleteEventDialog({open,onOpenChange,event,onSuccess}: DeleteEventDialogProps) {
    
    const [loading, setLoading] = useState<boolean>(false)
    const { handleError, clearError } = useErrorHandler()

    const handleDelete = async () => {

        if(!event) return
        setLoading(true)
        clearError()

        try {
            const { error } = await supabase
                .from('events')
                .delete()
                .eq('id', event.id)

            if (error) {
                handleError(error)
                return
            }

            toast.success("Événement supprimé")
            onSuccess()
        } catch (err) {
            handleError(err)
        } finally {
            setLoading(false)
        }

    }

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="bg-white">
                <AlertDialogHeader>
                    <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Cette action est irréversible. L'événement{" "}
                        <span className="font-semibold">{event?.event_name}</span> sera
                        définitivement supprimé, ainsi que tous les tableaux, matchs et
                        inscriptions associés.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={loading}>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleDelete}
                        disabled={loading}
                        className="bg-red-600 hover:bg-red-700"
                    >
                        {loading ? "Suppression..." : "Supprimer"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}