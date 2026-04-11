import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useClubMembers } from "@/hooks/useClubMembers"
import type { ClubMember } from "@/types/member"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { UserGroupIcon, PlusSignIcon, PencilEdit01Icon, Delete02Icon, SentIcon, ArrowUpDownIcon, ArrowUp01Icon, ArrowDown01Icon } from "hugeicons-react"
import { toast } from "sonner"
import { InviteMemberDialog } from "./InviteMemberDialog"
import { ChangeRoleDialog } from "./ChangeRoleDialog"
import { RemoveMemberDialog } from "./RemoveMemberDialog"
import {
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getSortedRowModel,
    useReactTable,
    type ColumnDef,
    type SortingState,
} from "@tanstack/react-table"

const roleBadgeConfig = {
    user: { label: "Utilisateur", variant: "default" as const },
    admin: { label: "Admin", variant: "member" as const },
    superadmin: { label: "Super Admin", variant: "visitor" as const },
}

interface UsersManagerProps {
    globalFilter?: string
    onGlobalFilterChange?: (value: string) => void
    inviteOpen?: boolean
    onInviteOpenChange?: (open: boolean) => void
}

export function UsersManager({
    globalFilter: externalFilter,
    onGlobalFilterChange: externalFilterChange,
    inviteOpen: externalInviteOpen,
    onInviteOpenChange: externalInviteOpenChange,
}: UsersManagerProps = {}) {
    const { profile } = useAuth()
    const { members, loading, fetchMembers, inviteMember, updateRole, removeMember } = useClubMembers()

    const [internalInviteOpen, setInternalInviteOpen] = useState(false)
    const inviteOpen = externalInviteOpen ?? internalInviteOpen
    const setInviteOpen = externalInviteOpenChange ?? setInternalInviteOpen

    const [roleOpen, setRoleOpen] = useState(false)
    const [removeOpen, setRemoveOpen] = useState(false)
    const [selectedMember, setSelectedMember] = useState<ClubMember | null>(null)
    const [actionLoading, setActionLoading] = useState(false)
    const [sorting, setSorting] = useState<SortingState>([])

    const [internalFilter, setInternalFilter] = useState("")
    const globalFilter = externalFilter ?? internalFilter
    const setGlobalFilter = externalFilterChange ?? setInternalFilter

    useEffect(() => {
        if (profile?.club_id) {
            fetchMembers(profile.club_id)
        }
    }, [profile?.club_id, fetchMembers])

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('fr-FR', {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        })
    }

    const canManageMember = (member: ClubMember) => {
        if (!profile) return false
        if (member.id === profile.id) return false
        if (profile.role === 'superadmin') return true
        if (profile.role === 'admin' && member.role !== 'superadmin') return true
        return false
    }

    const handleInvite = async (email: string, firstName?: string, lastName?: string) => {
        setActionLoading(true)
        try {
            await inviteMember(email, firstName, lastName)
            setInviteOpen(false)
            if (profile?.club_id) await fetchMembers(profile.club_id)
        } catch {
            // Error handled by caller
        } finally {
            setActionLoading(false)
        }
    }

    const handleRoleChange = async (newRole: 'user' | 'admin' | 'superadmin') => {
        if (!selectedMember) return
        setActionLoading(true)
        try {
            await updateRole(selectedMember.id, newRole)
            setRoleOpen(false)
            setSelectedMember(null)
            if (profile?.club_id) await fetchMembers(profile.club_id)
        } catch {
            // Error handled by caller
        } finally {
            setActionLoading(false)
        }
    }

    const handleRemove = async () => {
        if (!selectedMember) return
        setActionLoading(true)
        try {
            await removeMember(selectedMember.id)
            setRemoveOpen(false)
            setSelectedMember(null)
            if (profile?.club_id) await fetchMembers(profile.club_id)
        } catch {
            // Error handled by caller
        } finally {
            setActionLoading(false)
        }
    }

    const handleResendInvite = async (member: ClubMember) => {
        setActionLoading(true)
        try {
            // Passer l'id du profil existant pour éviter la création d'un doublon
            await inviteMember(member.email, member.first_name, member.last_name, member.id)
            toast.success(`Invitation envoyée à ${member.email}`)
            if (profile?.club_id) await fetchMembers(profile.club_id)
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Erreur lors de l'envoi")
        } finally {
            setActionLoading(false)
        }
    }

    const columns: ColumnDef<ClubMember>[] = [
        {
            accessorFn: (row) => `${row.first_name} ${row.last_name}`,
            id: "full_name",
            header: "Nom",
            meta: { className: "text-center" },
            cell: ({ row }) => (
                <span className="font-medium">
                    {row.original.first_name} {row.original.last_name}
                </span>
            ),
        },
        {
            accessorKey: "email",
            header: "Email",
            meta: { className: "text-center" },
        },
        {
            accessorKey: "role",
            header: "Rôle",
            enableGlobalFilter: false,
            meta: { className: "text-center" },
            cell: ({ row }) => {
                const roleConfig = roleBadgeConfig[row.original.role]
                return (
                    <Badge variant={roleConfig.variant}>
                        {roleConfig.label}
                    </Badge>
                )
            },
        },
        {
            accessorKey: "is_linked",
            header: "Compte",
            enableGlobalFilter: false,
            meta: { className: "text-center" },
            cell: ({ row }) => {
                const isLinked = row.original.is_linked === true
                return (
                    <Badge variant={isLinked ? "linked" : "pending"}>
                        {isLinked ? "Lié" : "En attente"}
                    </Badge>
                )
            },
        },
        {
            accessorKey: "created_at",
            header: "Membre depuis",
            enableGlobalFilter: false,
            meta: { className: "text-center" },
            cell: ({ row }) => formatDate(row.original.created_at),
        },
        {
            id: "actions",
            header: "Actions",
            enableSorting: false,
            meta: { className: "text-center" },
            cell: ({ row }) => {
                const member = row.original
                const isLinked = member.is_linked === true
                return (
                    <div className="flex items-center justify-center gap-1">
                        {!isLinked && (
                            <Button
                                variant="icon"
                                size="icon"
                                className="border-0"
                                title="Renvoyer l'invitation"
                                onClick={() => handleResendInvite(member)}
                            >
                                <SentIcon className="h-4 w-4 text-blue-500" />
                            </Button>
                        )}
                        {canManageMember(member) && (
                            <>
                                <Button
                                    variant="icon"
                                    size="icon"
                                    className="border-0"
                                    title="Modifier le rôle"
                                    onClick={() => {
                                        setSelectedMember(member)
                                        setRoleOpen(true)
                                    }}
                                >
                                    <PencilEdit01Icon className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="icon"
                                    size="icon"
                                    className="border-0"
                                    title="Retirer du club"
                                    onClick={() => {
                                        setSelectedMember(member)
                                        setRemoveOpen(true)
                                    }}
                                >
                                    <Delete02Icon className="h-4 w-4 text-red-500" />
                                </Button>
                            </>
                        )}
                    </div>
                )
            },
        },
    ]

    const table = useReactTable({
        data: members,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        state: { sorting, globalFilter },
    })

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-muted-foreground">Chargement...</div>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full min-h-0">
            {members.length === 0 ? (
                <div className="flex-1 flex items-center justify-center border-2 border-dashed rounded-lg">
                    <div className="text-center">
                        <UserGroupIcon className="mx-auto h-12 w-12 text-gray-300" />
                        <h3 className="mt-4 text-lg font-semibold">Aucun membre</h3>
                        <p className="text-muted-foreground mt-2">
                            Invitez des membres à rejoindre votre club
                        </p>
                        <Button onClick={() => setInviteOpen(true)} className="mt-4">
                            <PlusSignIcon className="mr-2 h-4 w-4" />
                            Inviter un membre
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col h-full min-h-0">
                    <ScrollArea className="rounded-md border max-h-full" type="auto">
                        <Table className="w-full">
                            <TableHeader className="sticky top-0 z-10 bg-background">
                                {table.getHeaderGroups().map((headerGroup) => (
                                    <TableRow key={headerGroup.id}>
                                        {headerGroup.headers.map((header) => (
                                            <TableHead
                                                key={header.id}
                                                className={`${header.column.columnDef.meta?.className || ''} ${header.column.getCanSort() ? 'cursor-pointer select-none hover:bg-muted/50' : ''}`}
                                                onClick={header.column.getToggleSortingHandler()}
                                            >
                                                <div className={`flex items-center gap-1 ${header.column.columnDef.meta?.className?.includes('text-center') ? 'justify-center' : ''}`}>
                                                    {header.isPlaceholder
                                                        ? null
                                                        : flexRender(
                                                            header.column.columnDef.header,
                                                            header.getContext()
                                                        )}
                                                    {header.column.getCanSort() && (
                                                        header.column.getIsSorted() === 'asc'
                                                            ? <ArrowUp01Icon className="h-3 w-3" />
                                                            : header.column.getIsSorted() === 'desc'
                                                                ? <ArrowDown01Icon className="h-3 w-3" />
                                                                : <ArrowUpDownIcon className="h-3 w-3 text-muted-foreground" />
                                                    )}
                                                </div>
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableHeader>
                            <TableBody>
                                {table.getRowModel().rows.map((row) => (
                                    <TableRow key={row.id}>
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell
                                                key={cell.id}
                                                className={cell.column.columnDef.meta?.className}
                                            >
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </div>
            )}

            <InviteMemberDialog
                open={inviteOpen}
                onOpenChange={setInviteOpen}
                onConfirm={handleInvite}
                loading={actionLoading}
            />

            <ChangeRoleDialog
                open={roleOpen}
                onOpenChange={setRoleOpen}
                member={selectedMember}
                onConfirm={handleRoleChange}
                loading={actionLoading}
                callerRole={(profile?.role as 'admin' | 'superadmin') ?? 'admin'}
            />

            <RemoveMemberDialog
                open={removeOpen}
                onOpenChange={setRemoveOpen}
                member={selectedMember}
                onConfirm={handleRemove}
                loading={actionLoading}
            />
        </div>
    )
}
