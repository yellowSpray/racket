import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { UserGroupIcon, ChartIncreaseIcon, BarChartIcon, Radio01Icon, TaskEdit01Icon } from "hugeicons-react"

export function UserDashboard() {
    const { profile } = useAuth()

    return (
        <div className="flex flex-col h-full min-h-0 gap-6">
            <h3 className="text-lg font-semibold">Salut {profile?.first_name}</h3>

            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-fr">
                {/* Présence sociale */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-sm">
                            <UserGroupIcon size={16} className="text-gray-500" />
                            Présence sociale
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                            <UserGroupIcon size={32} className="mb-3" />
                            <p className="text-sm text-center">Qui joue en même temps que vous ce soir</p>
                            <p className="text-xs mt-1">À venir</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Évolution dans les tableaux */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-sm">
                            <ChartIncreaseIcon size={16} className="text-gray-500" />
                            Évolution
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                            <ChartIncreaseIcon size={32} className="mb-3" />
                            <p className="text-sm text-center">Votre progression dans les tableaux au fil des séries</p>
                            <p className="text-xs mt-1">À venir</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Statistiques matchs */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-sm">
                            <BarChartIcon size={16} className="text-gray-500" />
                            Statistiques
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                            <BarChartIcon size={32} className="mb-3" />
                            <p className="text-sm text-center">Victoires, défaites, ratio, séries en cours</p>
                            <p className="text-xs mt-1">À venir</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Feed matchs en cours */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-sm">
                            <Radio01Icon size={16} className="text-gray-500" />
                            Matchs en cours
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                            <Radio01Icon size={32} className="mb-3" />
                            <p className="text-sm text-center">Matchs en direct avec terrains et horaires</p>
                            <p className="text-xs mt-1">À venir</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Mes matchs — saisie scores */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-sm">
                            <TaskEdit01Icon size={16} className="text-gray-500" />
                            Mes matchs — Saisie des scores
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                            <TaskEdit01Icon size={32} className="mb-3" />
                            <p className="text-sm text-center">Liste de vos matchs sur l'événement en cours pour saisir les résultats</p>
                            <p className="text-xs mt-1">À venir</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
