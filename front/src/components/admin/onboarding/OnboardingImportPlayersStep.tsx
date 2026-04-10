import { useRef, useState, useCallback, useMemo } from "react"
import * as XLSX from "xlsx"
import { Upload, Download, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
    findHeaderRow,
    fuzzyMatchColumns,
    parsePlayersFromSheet,
    excelTimeToHHMM,
    type ColumnMapping,
} from "@/lib/excelParser"
import { usePlayers } from "@/contexts/PlayersContext"

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

interface OnboardingImportPlayersStepProps {
    onNext: () => void
    onSkip: () => void
    className?: string
}

type Stage = "upload" | "mapping" | "importing" | "done"

const FIELD_LABELS: Record<keyof ColumnMapping, string> = {
    first_name: "Prénom",
    last_name: "Nom",
    phone: "Téléphone",
    email: "Email",
    arrival: "Heure d'arrivée",
    departure: "Heure de départ",
    active: "Actif (active/inactive…)",
    member: "Membre (yes/no…)",
}

const REQUIRED_FIELDS: (keyof ColumnMapping)[] = ["first_name", "last_name"]

function downloadTemplate() {
    const wb = XLSX.utils.book_new()
    const headers = ["prenom", "nom", "telephone", "email", "arrivee", "depart", "active", "member"]
    const examples = [
        ["Alexandra", "Dupont", "0498000001", "alexandra@example.com", "20:30", "23:00", "active", "no"],
        ["Jean", "Martin", "0498000002", "jean@example.com", "19:00", "", "active", "yes"],
        ["Marie", "Leroy", "0498000003", "marie@example.com", "19:30", "22:00", "inactive", "no"],
    ]
    const ws = XLSX.utils.aoa_to_sheet([headers, ...examples])
    XLSX.utils.book_append_sheet(wb, ws, "Joueurs")
    XLSX.writeFile(wb, "template_joueurs.xlsx")
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface UploadStageProps {
    isDragging: boolean
    onDragOver: (e: React.DragEvent) => void
    onDragLeave: () => void
    onDrop: (e: React.DragEvent) => void
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    onSkip: () => void
    inputRef: React.RefObject<HTMLInputElement | null>
}

function UploadStage({ isDragging, onDragOver, onDragLeave, onDrop, onFileChange, onSkip, inputRef }: UploadStageProps) {
    return (
        <div className="flex flex-col gap-6 max-w-xl mx-auto">
            <div className="flex flex-col gap-1">
                <h2 className="text-xl font-semibold">Importer vos joueurs</h2>
                <p className="text-sm text-muted-foreground">
                    Chargez votre liste depuis un fichier Excel ou CSV.
                </p>
            </div>

            <div
                className={cn(
                    "flex flex-col items-center gap-4 rounded-xl border-2 border-dashed p-10 transition-colors cursor-pointer",
                    isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-primary/50"
                )}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => inputRef.current?.click()}
            >
                <Upload className="size-10 text-muted-foreground" />
                <div className="text-center">
                    <p className="font-medium text-sm">Glissez votre fichier ici</p>
                    <p className="text-xs text-muted-foreground mt-1">ou cliquez pour parcourir (.xlsx, .csv)</p>
                </div>
                <input
                    ref={inputRef}
                    type="file"
                    accept=".xlsx,.csv,.xls"
                    className="hidden"
                    onChange={onFileChange}
                />
            </div>

            <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-4">
                <Download className="size-4 mt-0.5 shrink-0 text-muted-foreground" />
                <div className="flex flex-col gap-1">
                    <p className="text-sm font-medium">Besoin d'un modèle ?</p>
                    <p className="text-xs text-muted-foreground">
                        Colonnes attendues :{" "}
                        <span className="font-mono">prenom, nom, telephone, email, arrivee, depart, active, member</span>.
                        Les noms et l'ordre peuvent varier.
                    </p>
                    <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-xs w-fit"
                        onClick={(e) => { e.stopPropagation(); downloadTemplate() }}
                    >
                        Télécharger le template
                    </Button>
                </div>
            </div>

            <div className="flex justify-end">
                <Button variant="outline" size="lg" onClick={onSkip}>Passer cette étape</Button>
            </div>
        </div>
    )
}

interface MappingStageProps {
    playerCount: number
    visibleCols: { index: number; header: string }[]
    colToField: Partial<Record<number, keyof ColumnMapping>>
    previewRows: unknown[][]
    missingRequired: (keyof ColumnMapping)[]
    onAssignField: (colIndex: number, field: keyof ColumnMapping | "_none") => void
    onBack: () => void
    onSkip: () => void
    onImport: () => void
}

function MappingStage({
    playerCount,
    visibleCols,
    colToField,
    previewRows,
    missingRequired,
    onAssignField,
    onBack,
    onSkip,
    onImport,
}: MappingStageProps) {
    return (
        <div className="flex flex-col gap-6 max-w-4xl mx-auto">
            <div className="flex flex-col gap-1">
                <h2 className="text-xl font-semibold">Vérifier le mapping des colonnes</h2>
                <p className="text-sm text-muted-foreground">
                    {playerCount} joueur(s) détecté(s). Associez chaque colonne au bon champ.
                </p>
            </div>

            <div className="rounded-lg border overflow-x-auto text-xs">
                <table className="w-full">
                    <thead className="bg-muted/50">
                        <tr>
                            {visibleCols.map(({ index, header }) => (
                                <th key={index} className="px-3 pt-2 pb-1 text-left font-normal min-w-[150px]">
                                    <div className="flex flex-col gap-1.5">
                                        <span className="text-[11px] text-muted-foreground font-mono">
                                            {header || `Col. ${index + 1}`}
                                        </span>
                                        <Select
                                            value={colToField[index] ?? "_none"}
                                            onValueChange={(v) => onAssignField(index, v as keyof ColumnMapping | "_none")}
                                        >
                                            <SelectTrigger className="h-7 text-xs">
                                                <SelectValue placeholder="— ignorer —" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="_none">— ignorer —</SelectItem>
                                                {(Object.keys(FIELD_LABELS) as (keyof ColumnMapping)[]).map((field) => (
                                                    <SelectItem key={field} value={field}>
                                                        {FIELD_LABELS[field]}{REQUIRED_FIELDS.includes(field) ? " *" : ""}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {previewRows.map((row, i) => (
                            <tr key={i} className="hover:bg-muted/30">
                                {visibleCols.map(({ index }) => {
                                    const raw = (row as unknown[])[index]
                                    const field = colToField[index]
                                    const isTime = field === "arrival" || field === "departure"
                                    const display = isTime && typeof raw === "number" && raw > 0 && raw < 1
                                        ? excelTimeToHHMM(raw)
                                        : String(raw ?? "")
                                    return (
                                        <td key={index} className="px-3 py-2 text-muted-foreground">
                                            {display || "—"}
                                        </td>
                                    )
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <p className="text-xs text-muted-foreground -mt-2">
                Le niveau sera défini à <span className="font-medium">5</span> par défaut.
            </p>

            {missingRequired.length > 0 && (
                <p className="text-xs text-destructive">
                    Champs obligatoires non assignés : {missingRequired.map((f) => FIELD_LABELS[f]).join(", ")}
                </p>
            )}

            <div className="flex justify-between">
                <Button variant="outline" size="lg" onClick={onBack}>Retour</Button>
                <div className="flex gap-3">
                    <Button variant="outline" size="lg" onClick={onSkip}>Passer</Button>
                    <Button size="lg" onClick={onImport} disabled={missingRequired.length > 0}>
                        Importer {playerCount} joueur(s)
                        <ArrowRight className="size-4 ml-1" />
                    </Button>
                </div>
            </div>
        </div>
    )
}

function ImportingStage({ done, total }: { done: number; total: number }) {
    const pct = total > 0 ? Math.round((done / total) * 100) : 0
    return (
        <div className="flex flex-col items-center gap-6 max-w-sm mx-auto py-8">
            <h2 className="text-xl font-semibold">Import en cours…</h2>
            <div className="w-full flex flex-col gap-2">
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                        className="h-full rounded-full bg-primary transition-all duration-300"
                        style={{ width: `${pct}%` }}
                    />
                </div>
                <p className="text-sm text-muted-foreground text-center">{done} / {total} joueurs importés</p>
            </div>
        </div>
    )
}

function DoneStage({ successCount, errors, onNext }: { successCount: number; errors: number; onNext: () => void }) {
    return (
        <div className="flex flex-col items-center gap-6 max-w-sm mx-auto py-8 text-center">
            {errors === 0
                ? <CheckCircle2 className="size-12 text-green-500" />
                : <AlertCircle className="size-12 text-amber-500" />
            }
            <div className="flex flex-col gap-1">
                <h2 className="text-xl font-semibold">Import terminé</h2>
                <p className="text-sm text-muted-foreground">
                    {successCount} joueur(s) importé(s) avec succès.
                    {errors > 0 && ` ${errors} erreur(s).`}
                </p>
            </div>
            <Button onClick={onNext} size="lg">
                Créer le premier événement
                <ArrowRight className="size-4 ml-1" />
            </Button>
        </div>
    )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function OnboardingImportPlayersStep({
    onNext,
    onSkip,
    className,
}: OnboardingImportPlayersStepProps) {
    const { addPlayer } = usePlayers()
    const inputRef = useRef<HTMLInputElement>(null)

    const [stage, setStage] = useState<Stage>("upload")
    const [isDragging, setIsDragging] = useState(false)
    const [headers, setHeaders] = useState<string[]>([])
    const [mapping, setMapping] = useState<ColumnMapping>({})
    const [rawSheetData, setRawSheetData] = useState<unknown[][]>([])
    const [progress, setProgress] = useState({ done: 0, total: 0, errors: 0 })

    // --- Derived state ---

    const visibleCols = useMemo(() =>
        headers
            .map((h, i) => ({ index: i, header: h }))
            .filter(({ index }) =>
                rawSheetData.some(row => row[index] !== "" && row[index] !== null && row[index] !== undefined)
            ),
        [headers, rawSheetData]
    )

    const colToField = useMemo(() => {
        const result: Partial<Record<number, keyof ColumnMapping>> = {}
        for (const [field, idx] of Object.entries(mapping) as [keyof ColumnMapping, number | undefined][]) {
            if (idx !== undefined) result[idx] = field
        }
        return result
    }, [mapping])

    const parsedPlayers = useMemo(
        () => parsePlayersFromSheet(rawSheetData, mapping),
        [rawSheetData, mapping]
    )

    const missingRequired = useMemo(
        () => REQUIRED_FIELDS.filter((f) => mapping[f] === undefined),
        [mapping]
    )

    const previewRows = useMemo(() => rawSheetData.slice(0, 5), [rawSheetData])

    // --- Handlers ---

    const parseFile = useCallback((file: File) => {
        const reader = new FileReader()
        reader.onload = (e) => {
            const buffer = e.target?.result
            if (!buffer) return
            const wb = XLSX.read(buffer, { type: "array" })
            const ws = wb.Sheets[wb.SheetNames[0]]
            const data = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" })
            const headerRowIndex = findHeaderRow(data)
            if (headerRowIndex === -1) return
            const rawHeaders = (data[headerRowIndex] as string[]).map(String)
            setHeaders(rawHeaders)
            setMapping(fuzzyMatchColumns(rawHeaders))
            setRawSheetData(data.slice(headerRowIndex + 1) as unknown[][])
            setStage("mapping")
        }
        reader.readAsArrayBuffer(file)
    }, [])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        const file = e.dataTransfer.files[0]
        if (file) parseFile(file)
    }, [parseFile])

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) parseFile(file)
    }, [parseFile])

    const assignField = useCallback((colIndex: number, field: keyof ColumnMapping | "_none") => {
        setMapping((prev) => {
            const next = { ...prev }
            for (const [f, idx] of Object.entries(next) as [keyof ColumnMapping, number | undefined][]) {
                if (idx === colIndex) delete next[f as keyof ColumnMapping]
            }
            if (field !== "_none") next[field] = colIndex
            return next
        })
    }, [])

    const handleImport = useCallback(async () => {
        const toImport = parsePlayersFromSheet(rawSheetData, mapping)
        setProgress({ done: 0, total: toImport.length, errors: 0 })
        setStage("importing")

        let errors = 0
        for (let i = 0; i < toImport.length; i++) {
            const p = toImport[i]
            try {
                await addPlayer({
                    first_name: p.first_name,
                    last_name: p.last_name,
                    phone: p.phone,
                    email: p.email,
                    arrival: p.arrival,
                    departure: p.departure,
                    power_ranking: p.power_ranking,
                    status: p.status,
                })
            } catch {
                errors++
            }
            setProgress({ done: i + 1, total: toImport.length, errors })
        }

        setStage("done")
    }, [rawSheetData, mapping, addPlayer])

    // --- Render ---

    return (
        <div className={cn(className)}>
            {stage === "upload" && (
                <UploadStage
                    isDragging={isDragging}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onFileChange={handleFileChange}
                    onSkip={onSkip}
                    inputRef={inputRef}
                />
            )}
            {stage === "mapping" && (
                <MappingStage
                    playerCount={parsedPlayers.length}
                    visibleCols={visibleCols}
                    colToField={colToField}
                    previewRows={previewRows}
                    missingRequired={missingRequired}
                    onAssignField={assignField}
                    onBack={() => setStage("upload")}
                    onSkip={onSkip}
                    onImport={handleImport}
                />
            )}
            {stage === "importing" && (
                <ImportingStage done={progress.done} total={progress.total} />
            )}
            {stage === "done" && (
                <DoneStage
                    successCount={progress.done - progress.errors}
                    errors={progress.errors}
                    onNext={onNext}
                />
            )}
        </div>
    )
}
