import type { DrawType } from "@/types/draw";
import type { ColumnDef } from "@tanstack/react-table";

export const columns = (): ColumnDef<DrawType>[] => [
    {
        accessorKey: "numberBox",
        header: "Boxes 1",
    },
    {
        accessorKey: "a",
        header: "A",
    },
    {
        accessorKey: "b",
        header: "B",
    },
    {
        accessorKey: "c",
        header: "C",
    },
    {
        accessorKey: "d",
        header: "D",
    },
    {
        accessorKey: "e",
        header: "E",
    },
    {
        accessorKey: "f",
        header: "F",
    },
    {
        accessorKey: "total",
        header: "Total",
    }
]