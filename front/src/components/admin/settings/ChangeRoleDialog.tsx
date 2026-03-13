import type { ClubMember } from "@/types/member"
import { useState, useEffect } from "react"
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

interface ChangeRoleDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    member: ClubMember | null
    onConfirm: (newRole: 'user' | 'admin' | 'superadmin') => void
    loading: boolean
    callerRole: 'admin' | 'superadmin'
}

const roleOptions = [
    { value: 'user' as const, label: 'Utilisateur' },
    { value: 'admin' as const, label: 'Administrateur' },
    { value: 'superadmin' as const, label: 'Super Administrateur' },
]

export function ChangeRoleDialog({ open, onOpenChange, member, onConfirm, loading, callerRole }: ChangeRoleDialogProps) {
    const [selectedRole, setSelectedRole] = useState<'user' | 'admin' | 'superadmin'>('user')

    useEffect(() => {
        if (member) {
            setSelectedRole(member.role)
        }
    }, [member])

    const availableRoles = callerRole === 'superadmin'
        ? roleOptions
        : roleOptions.filter(r => r.value !== 'superadmin')

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-white">
                <DialogHeader>
                    <DialogTitle>Modifier le rôle</DialogTitle>
                    <DialogDescription>
                        Changer le rôle de {member?.first_name} {member?.last_name}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 py-4">
                    <Label>Rôle</Label>
                    <div className="flex flex-col gap-2">
                        {availableRoles.map((role) => (
                            <label
                                key={role.value}
                                className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                                    selectedRole === role.value
                                        ? 'border-primary bg-primary/5'
                                        : 'border-gray-200 hover:bg-gray-50'
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="role"
                                    value={role.value}
                                    checked={selectedRole === role.value}
                                    onChange={() => setSelectedRole(role.value)}
                                    className="accent-primary"
                                />
                                <span className="text-sm font-medium">{role.label}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                        Annuler
                    </Button>
                    <Button onClick={() => onConfirm(selectedRole)} disabled={loading}>
                        {loading ? "Modification..." : "Confirmer"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
