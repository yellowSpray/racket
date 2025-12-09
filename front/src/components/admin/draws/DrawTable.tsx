import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function DrawTable() {

    return (
        <div className="overflow-hidden w-[500px]">
            <Table className="border">
                <TableHeader>
                    <TableRow>
                        <TableHead className="border">Box 1</TableHead>
                        <TableHead className="border">A</TableHead>
                        <TableHead className="border">B</TableHead>
                        <TableHead className="border">C</TableHead>
                        <TableHead className="border">D</TableHead>
                        <TableHead className="border">E</TableHead>
                        <TableHead className="border">F</TableHead>
                        <TableHead className="border">Total</TableHead>
                    </TableRow>
                </TableHeader>

                <TableBody>
                    <TableRow>
                        <TableCell>
                            <TableCell className="border-r">A</TableCell>
                            <TableCell>Nom Prenom <br /> numero</TableCell>
                        </TableCell>
                        <TableCell className="border">bye</TableCell>
                        <TableCell className="border">
                            <TableCell>date 1 <br /> heure</TableCell>
                            <TableCell>1</TableCell>
                        </TableCell>
                        <TableCell className="border">
                            <TableCell>date 2 <br /> heure</TableCell>
                            <TableCell>1</TableCell>
                        </TableCell>
                        <TableCell className="border">
                            <TableCell>date 3 <br /> heure</TableCell>
                            <TableCell>1</TableCell>
                        </TableCell>
                        <TableCell className="border">
                            <TableCell>date 4 <br /> heure</TableCell>
                            <TableCell>1</TableCell>
                        </TableCell>
                        <TableCell className="border">
                            <TableCell>date 5 <br /> heure</TableCell>
                            <TableCell>1</TableCell>
                        </TableCell>
                        <TableCell>Total Points</TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </div>
    )
}