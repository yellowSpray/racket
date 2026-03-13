import { useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface InviteMemberDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onConfirm: (email: string, firstName?: string, lastName?: string) => void
    loading: boolean
}

export function InviteMemberDialog({ open, onOpenChange, onConfirm, loading }: InviteMemberDialogProps) {
    const [email, setEmail] = useState("")
    const [firstName, setFirstName] = useState("")
    const [lastName, setLastName] = useState("")

    const handleSubmit = () => {
        if (!email.trim()) return
        onConfirm(email.trim(), firstName.trim() || undefined, lastName.trim() || undefined)
    }

    const handleOpenChange = (isOpen: boolean) => {
        if (!isOpen) {
            setEmail("")
            setFirstName("")
            setLastName("")
        }
        onOpenChange(isOpen)
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="bg-white">
                <DialogHeader>
                    <DialogTitle>Inviter un membre</DialogTitle>
                    <DialogDescription>
                        Un email d'invitation sera envoyé à cette adresse.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="invite-email">Email</Label>
                        <Input
                            id="invite-email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="email@exemple.com"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="invite-firstname">Prénom</Label>
                            <Input
                                id="invite-firstname"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                placeholder="Optionnel"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="invite-lastname">Nom</Label>
                            <Input
                                id="invite-lastname"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                placeholder="Optionnel"
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
                        Annuler
                    </Button>
                    <Button onClick={handleSubmit} disabled={loading || !email.trim()}>
                        {loading ? "Envoi..." : "Envoyer"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
