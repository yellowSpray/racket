import type { ColumnDef } from "@tanstack/react-table";

export type PlayerType = {
    id: string
    first_name: string
    last_name: string
    email: string
    phone: string
}

export const columns: ColumnDef<PlayerType>[] = [
    {
        accessorKey: "first_name",
        header: "First Name"
    },
    {
        accessorKey: "last_name",
        header: "Last Name"
    },
    {
        accessorKey: "email",
        header: "Email"
    },
    {
        accessorKey: "phone",
        header: "Phone"
    },
]