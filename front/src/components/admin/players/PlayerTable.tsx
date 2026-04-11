import { flexRender, getCoreRowModel, getFilteredRowModel, getSortedRowModel, useReactTable, type SortingState, type RowSelectionState } from "@tanstack/react-table";
import type { ColumnDef, RowData } from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowUpDownIcon, ArrowUp01Icon, ArrowDown01Icon } from "hugeicons-react";
import { useState } from "react";

declare module '@tanstack/react-table' {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface ColumnMeta<TData extends RowData, TValue> {
        className?: string;
    }
}

interface DataTableProps<TData extends { id: string }, Tvalue> {
    columns: ColumnDef<TData, Tvalue>[]
    data: TData[]
    globalFilter?: string
    onGlobalFilterChange?: (value: string) => void
    onSelectionChange?: (selectedIds: string[]) => void
    onRowClick?: (row: TData) => void
}

export function DataTable<TData extends { id: string }, TValue>({
    columns,
    data,
    globalFilter: externalFilter,
    onGlobalFilterChange: externalFilterChange,
    onSelectionChange,
    onRowClick,
}: DataTableProps<TData, TValue>) {

    const [sorting, setSorting] = useState<SortingState>([])
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
    const [internalFilter, setInternalFilter] = useState("")
    const globalFilter = externalFilter ?? internalFilter
    const setGlobalFilter = externalFilterChange ?? setInternalFilter

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        onRowSelectionChange: (updater) => {
            const next = typeof updater === "function" ? updater(rowSelection) : updater
            setRowSelection(next)
            onSelectionChange?.(Object.keys(next).filter((k) => next[k]))
        },
        getRowId: (row) => row.id,
        enableRowSelection: true,
        state: { sorting, globalFilter, rowSelection },
    })

    return (
        <ScrollArea className="rounded-md border max-h-full" type="auto">
            <Table className="w-full">
                <TableHeader className="sticky top-0 z-10 bg-background">
                    {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id}>
                            {headerGroup.headers.map((header) => {
                                return (
                                    <TableHead
                                        key={header.id}
                                        colSpan={header.colSpan}
                                        style={{ minWidth: header.column.columnDef.minSize }}
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
                                )
                            })}
                        </TableRow>
                    ))}
                </TableHeader>
                <TableBody>
                    {table.getRowModel().rows?.length ? (
                        table.getRowModel().rows.map((row) => (
                            <TableRow
                                key={row.id}
                                data-state={row.getIsSelected() && "selected"}
                                className={onRowClick ? "cursor-pointer" : ""}
                                onClick={() => onRowClick?.(row.original)}
                            >
                                {row.getVisibleCells().map((cell) => (
                                    <TableCell
                                        key={cell.id}
                                        style={{ minWidth: cell.column.columnDef.minSize }}
                                        className={cell.column.columnDef.meta?.className}
                                        onClick={cell.column.id === "select" ? (e) => e.stopPropagation() : undefined}
                                    >
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={columns.length} className="h-24 text-center">
                                No Results
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </ScrollArea>
    )
}