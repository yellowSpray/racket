import { useMemo, useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tick02Icon, Copy01Icon } from "hugeicons-react"
import { buildEmbedSnippet, buildEmbedUrl } from "@/lib/embedSnippet"

interface EmbedDrawsDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    /** Jeton d'integration de l'evenement, `null` tant qu'il n'est pas charge. */
    embedToken: string | null
    eventName: string
    /** Serie affichee, proposee a l'epinglage. */
    roundNumber: number | null
}

/**
 * Code d'integration des tableaux sur un site exterieur.
 *
 * Par defaut le cadre suit la serie active : le club colle le code une fois
 * et n'y revient plus. L'epinglage sert a archiver une serie passee.
 */
export function EmbedDrawsDialog({
    open,
    onOpenChange,
    embedToken,
    eventName,
    roundNumber,
}: EmbedDrawsDialogProps) {
    const [pinned, setPinned] = useState(false)
    const [height, setHeight] = useState(800)
    const [copied, setCopied] = useState<"lien" | "code" | null>(null)

    const pinnedRound = pinned && roundNumber ? roundNumber : undefined

    const url = useMemo(
        () => buildEmbedUrl(window.location.origin, embedToken ?? "", pinnedRound),
        [embedToken, pinnedRound],
    )

    const snippet = useMemo(
        () => buildEmbedSnippet(window.location.origin, embedToken ?? "", {
            roundNumber: pinnedRound,
            height,
            title: `Tableaux ${eventName}`,
        }),
        [embedToken, pinnedRound, height, eventName],
    )

    const copy = async (value: string, which: "lien" | "code") => {
        await navigator.clipboard.writeText(value)
        setCopied(which)
        setTimeout(() => setCopied(null), 2000)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[640px] bg-white">
                <DialogHeader>
                    <DialogTitle>Intégrer les tableaux</DialogTitle>
                    <DialogDescription>
                        Collez ce code sur le site de votre club. La page affichée est
                        publique et en lecture seule : toute personne disposant du lien
                        peut voir les tableaux et le nom des joueurs.
                    </DialogDescription>
                </DialogHeader>

                {!embedToken ? (
                    <p className="text-sm text-muted-foreground py-4">
                        Lien d'intégration indisponible pour cet événement.
                    </p>
                ) : (
                    <div className="flex flex-col gap-5 pt-1">
                        <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
                            <div className="flex flex-col gap-0.5">
                                <Label htmlFor="embed-pin" className="text-sm">
                                    Figer sur la série {roundNumber ?? ""}
                                </Label>
                                <span className="text-xs text-muted-foreground">
                                    {pinned
                                        ? "Le cadre affichera toujours cette série."
                                        : "Le cadre suivra la série en cours, sans rien changer."}
                                </span>
                            </div>
                            <Switch
                                id="embed-pin"
                                checked={pinned}
                                onCheckedChange={setPinned}
                                disabled={!roundNumber}
                                aria-label="Figer sur la série affichée"
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label htmlFor="embed-height" className="text-xs text-muted-foreground">
                                Hauteur du cadre, en pixels
                            </Label>
                            <Input
                                id="embed-height"
                                type="number"
                                min={200}
                                step={50}
                                value={height}
                                onChange={(e) => setHeight(Math.max(200, Number(e.target.value) || 800))}
                                className="w-40"
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label className="text-xs text-muted-foreground">Code à intégrer</Label>
                            <pre className="rounded-lg border border-border bg-muted/40 p-3 text-xs overflow-x-auto whitespace-pre">
                                {snippet}
                            </pre>
                            <div className="flex items-center gap-2">
                                <Button variant="default" size="sm" onClick={() => copy(snippet, "code")}>
                                    {copied === "code"
                                        ? <><Tick02Icon size={14} /> Copié</>
                                        : <><Copy01Icon size={14} /> Copier le code</>}
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => copy(url, "lien")}>
                                    {copied === "lien"
                                        ? <><Tick02Icon size={14} className="text-green-600" /> Copié</>
                                        : "Copier le lien seul"}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
