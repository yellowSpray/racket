import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChartIcon, ChampionIcon, Cancel01Icon, PercentIcon, VolleyballIcon } from "hugeicons-react"

export interface UserStats {
    total: number
    wins: number
    losses: number
    ratio: number
}

interface UserStatsCardProps {
    stats: UserStats
    className?: string
}

export function UserStatsCard({ stats, className }: UserStatsCardProps) {
    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                    <BarChartIcon size={16} className="text-foreground" />
                    Statistiques
                </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-4 gap-3 my-auto">
                <StatBlock
                    icon={<ChampionIcon size={16} className="text-green-500" />}
                    label="Victoires"
                    value={stats.wins}
                    color="text-green-600"
                />
                <StatBlock
                    icon={<Cancel01Icon size={16} className="text-red-400" />}
                    label="Défaites"
                    value={stats.losses}
                    color="text-red-500"
                />
                <StatBlock
                    icon={<PercentIcon size={16} className="text-blue-500" />}
                    label="Ratio"
                    value={`${stats.ratio}`}
                    color="text-blue-600"
                />
                <StatBlock
                    icon={<VolleyballIcon size={16} className="text-gray-400" />}
                    label="Total"
                    value={stats.total}
                    color="text-foreground"
                />
            </CardContent>
        </Card>
    )
}

function StatBlock({ icon, label, value, color }: {
    icon: React.ReactNode
    label: string
    value: number | string
    color: string
}) {
    return (
        <div className="flex flex-col items-center gap-1 py-1">
            {icon}
            <span className={`text-lg font-bold ${color}`}>{value}</span>
            <span className="text-[11px] text-muted-foreground">{label}</span>
        </div>
    )
}
