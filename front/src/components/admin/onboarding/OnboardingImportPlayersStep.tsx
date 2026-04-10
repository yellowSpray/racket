import { useRef, useState, useCallback } from "react"
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
    type ColumnMapping,
    type RawPlayer,
} from "@/lib/excelParser"
import { usePlayers } from "@/contexts/PlayersContext"

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
    active: "Actif (active/inactive)",
    member: "Membre (yes/no)",
    status: "Statut (ancienne colonne)",
}

const REQUIRED_FIELDS: (keyof ColumnMapping)[] = ["first_name", "last_name"]

/** Génère et télécharge un fichier Excel template */
function downloadTemplate() {
    const wb = XLSX.utils.book_new()
    const headers = ["prenom", "nom", "telephone", "email", "heure", "active", "member"]
    const examples = [
        ["Alexandra", "Dupont", "0498000001", "alexandra@example.com", "20:30", "active", "no"],
        ["Jean", "Martin", "0498000002", "jean@example.com", "19:00", "active", "yes"],
        ["Marie", "Leroy", "0498000003", "marie@example.com", "19:30", "inactive", "no"],
    ]
    const ws = XLSX.utils.aoa_to_sheet([headers, ...examples])
    XLSX.utils.book_append_sheet(wb, ws, "Joueurs")
    XLSX.writeFile(wb, "template_joueurs.xlsx")
}

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
            const detectedMapping = fuzzyMatchColumns(rawHeaders)
            const dataRows = data.slice(headerRowIndex + 1) as unknown[][]

            setHeaders(rawHeaders)
            setMapping(detectedMapping)
            setRawSheetData(dataRows)
            setStage("mapping")
        }
        reader.readAsArrayBuffer(file)
    }, [])

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault()
            setIsDragging(false)
            const file = e.dataTransfer.files[0]
            if (file) parseFile(file)
        },
        [parseFile]
    )

    const handleFileChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0]
            if (file) parseFile(file)
        },
        [parseFile]
    )

    const updateMapping = useCallback((field: keyof ColumnMapping, colIndex: string) => {
        setMapping((prev) => ({ ...prev, [field]: colIndex === "_none" ? undefined : Number(colIndex) }))
    }, [])

    const handleImport = useCallback(async () => {
        // Re-parser les données brutes avec le mapping courant (potentiellement modifié par l'utilisateur)
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

    // --- Étape : upload ---
    if (stage === "upload") {
        return (
            <div className={cn("flex flex-col gap-6 max-w-xl mx-auto", className)}>
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
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
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
                        onChange={handleFileChange}
                    />
                </div>

                <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-4">
                    <Download className="size-4 mt-0.5 shrink-0 text-muted-foreground" />
                    <div className="flex flex-col gap-1">
                        <p className="text-sm font-medium">Besoin d'un modèle ?</p>
                        <p className="text-xs text-muted-foreground">
                            Téléchargez notre template Excel avec les colonnes attendues :{" "}
                            <span className="font-mono">prenom, nom, telephone, email, heure, active, member</span>.
                            Les colonnes peuvent être dans un ordre différent ou avoir des noms proches.
                            Colonne <span className="font-mono">active</span> : <span className="font-mono">active</span> ou <span className="font-mono">inactive</span>.
                            Colonne <span className="font-mono">member</span> : <span className="font-mono">yes</span> ou <span className="font-mono">no</span>.
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
                    <Button variant="ghost" onClick={onSkip}>
                        Passer cette étape
                    </Button>
                </div>
            </div>
        )
    }

    // --- Étape : mapping ---
    if (stage === "mapping") {
        // Calculé depuis les données brutes + mapping courant pour refléter les modifications UI
        const parsedPlayers = parsePlayersFromSheet(rawSheetData, mapping)
        const preview = parsedPlayers.slice(0, 5)
        const missingRequired = REQUIRED_FIELDS.filter((f) => mapping[f] === undefined)

        return (
            <div className={cn("flex flex-col gap-6 max-w-2xl mx-auto", className)}>
                <div className="flex flex-col gap-1">
                    <h2 className="text-xl font-semibold">Vérifier le mapping des colonnes</h2>
                    <p className="text-sm text-muted-foreground">
                        {parsedPlayers.length} joueur(s) détecté(s). Vérifiez que chaque champ est bien associé.
                    </p>
                </div>

                {/* Mapping */}
                <div className="rounded-lg border divide-y">
                    {(Object.keys(FIELD_LABELS) as (keyof ColumnMapping)[]).map((field) => (
                        <div key={field} className="flex items-center justify-between gap-4 px-4 py-3">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{FIELD_LABELS[field]}</span>
                                {REQUIRED_FIELDS.includes(field) && (
                                    <span className="text-xs text-destructive">*</span>
                                )}
                            </div>
                            <Select
                                value={mapping[field] !== undefined ? String(mapping[field]) : "_none"}
                                onValueChange={(v) => updateMapping(field, v)}
                            >
                                <SelectTrigger className="w-48 h-8 text-xs">
                                    <SelectValue placeholder="— ignorer —" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="_none">— ignorer —</SelectItem>
                                    {headers.map((h, i) => (
                                        <SelectItem key={i} value={String(i)}>
                                            {h || `Colonne ${i + 1}`}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    ))}
                </div>

                {/* Preview */}
                {preview.length > 0 && (
                    <div className="flex flex-col gap-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Aperçu ({Math.min(5, parsedPlayers.length)} premières lignes)
                        </p>
                        <div className="rounded-lg border overflow-x-auto text-xs">
                            <table className="w-full">
                                <thead className="bg-muted/50">
                                    <tr>
                                        <th className="text-left px-3 py-2 font-medium">Prénom</th>
                                        <th className="text-left px-3 py-2 font-medium">Nom</th>
                                        <th className="text-left px-3 py-2 font-medium">Email</th>
                                        <th className="text-left px-3 py-2 font-medium">Téléphone</th>
                                        <th className="text-left px-3 py-2 font-medium">Arrivée</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {preview.map((p, i) => (
                                        <tr key={i}>
                                            <td className="px-3 py-2">{p.first_name}</td>
                                            <td className="px-3 py-2">{p.last_name}</td>
                                            <td className="px-3 py-2 text-muted-foreground">{p.email ?? "—"}</td>
                                            <td className="px-3 py-2 text-muted-foreground">{p.phone ?? "—"}</td>
                                            <td className="px-3 py-2 text-muted-foreground">{p.arrival ?? "—"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Le niveau de chaque joueur sera défini à <span className="font-medium">5</span> par défaut — vous pourrez l'ajuster manuellement après l'import.
                        </p>
                    </div>
                )}

                {missingRequired.length > 0 && (
                    <p className="text-xs text-destructive">
                        Les champs obligatoires manquants : {missingRequired.map((f) => FIELD_LABELS[f]).join(", ")}
                    </p>
                )}

                <div className="flex justify-between">
                    <Button variant="ghost" onClick={() => setStage("upload")}>
                        Retour
                    </Button>
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={onSkip}>
                            Passer
                        </Button>
                        <Button
                            onClick={handleImport}
                            disabled={missingRequired.length > 0}
                        >
                            Importer {parsedPlayers.length} joueur(s)
                            <ArrowRight className="size-4 ml-1" />
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    // --- Étape : importing ---
    if (stage === "importing") {
        const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0
        return (
            <div className={cn("flex flex-col items-center gap-6 max-w-sm mx-auto py-8", className)}>
                <h2 className="text-xl font-semibold">Import en cours…</h2>
                <div className="w-full flex flex-col gap-2">
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div
                            className="h-full rounded-full bg-primary transition-all duration-300"
                            style={{ width: `${pct}%` }}
                        />
                    </div>
                    <p className="text-sm text-muted-foreground text-center">
                        {progress.done} / {progress.total} joueurs importés
                    </p>
                </div>
            </div>
        )
    }

    // --- Étape : done ---
    const successCount = progress.done - progress.errors
    return (
        <div className={cn("flex flex-col items-center gap-6 max-w-sm mx-auto py-8 text-center", className)}>
            {progress.errors === 0 ? (
                <CheckCircle2 className="size-12 text-green-500" />
            ) : (
                <AlertCircle className="size-12 text-amber-500" />
            )}
            <div className="flex flex-col gap-1">
                <h2 className="text-xl font-semibold">Import terminé</h2>
                <p className="text-sm text-muted-foreground">
                    {successCount} joueur(s) importé(s) avec succès.
                    {progress.errors > 0 && ` ${progress.errors} erreur(s).`}
                </p>
            </div>
            <Button onClick={onNext}>
                Créer le premier événement
                <ArrowRight className="size-4 ml-1" />
            </Button>
        </div>
    )
}
