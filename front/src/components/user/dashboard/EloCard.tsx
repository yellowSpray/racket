import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TennisBallIcon, BarChartIcon } from "hugeicons-react"

const TIERS = [
    { name: "Gris",  min: 0,    color: "text-muted-foreground" },
    { name: "Bleu",  min: 400,  color: "text-blue-500"         },
    { name: "Vert",  min: 800,  color: "text-primary"          },
    { name: "Ambre", min: 1200, color: "text-amber-500"        },
    { name: "Rouge", min: 1600, color: "text-red-500"          },
]

function getEloInfo(elo?: number): { rankLabel: string; color: string } {
    if (elo === undefined) return { rankLabel: "—", color: "text-muted-foreground" }

    let tier = TIERS[0]
    for (const t of TIERS) {
        if (elo >= t.min) tier = t
    }

    const withinTier = elo - tier.min
    const rank = Math.min(3, Math.floor(withinTier / (400 / 3)) + 1)
    const roman = ["I", "II", "III"][rank - 1]

    return { rankLabel: `${tier.name} ${roman}`, color: tier.color }
}

interface EloCardProps {
    elo?: number
    className?: string
}

export function EloCard({ elo, className }: EloCardProps) {
    const { rankLabel, color } = getEloInfo(elo)

    return (
        <Card className={`${className} flex flex-col`}>
            <CardHeader>
                <CardTitle className="flex items-center justify-center gap-2 text-sm">
                    <BarChartIcon size={16} className="text-foreground" />
                    Elo
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col items-center justify-center gap-1.5">
                <TennisBallIcon size={20} className={color} />
                <span className={`text-sm uppercase font-semibold ${color}`}>{rankLabel}</span>
                <span className={`text-[10px] font-bold text-foreground`}>
                    {elo ?? "—"}
                </span>
            </CardContent>
        </Card>
    )
}
