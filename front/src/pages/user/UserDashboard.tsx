import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Users, TrendingUp, BarChart3, Radio, ClipboardEdit } from "lucide-react"

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
                            <Users size={16} className="text-gray-500" />
                            Présence sociale
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                            <Users size={32} className="mb-3" />
                            <p className="text-sm text-center">Qui joue en même temps que vous ce soir</p>
                            <p className="text-xs mt-1">À venir</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Évolution dans les tableaux */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-sm">
                            <TrendingUp size={16} className="text-gray-500" />
                            Évolution
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                            <TrendingUp size={32} className="mb-3" />
                            <p className="text-sm text-center">Votre progression dans les tableaux au fil des séries</p>
                            <p className="text-xs mt-1">À venir</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Statistiques matchs */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-sm">
                            <BarChart3 size={16} className="text-gray-500" />
                            Statistiques
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                            <BarChart3 size={32} className="mb-3" />
                            <p className="text-sm text-center">Victoires, défaites, ratio, séries en cours</p>
                            <p className="text-xs mt-1">À venir</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Feed matchs en cours */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-sm">
                            <Radio size={16} className="text-gray-500" />
                            Matchs en cours
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                            <Radio size={32} className="mb-3" />
                            <p className="text-sm text-center">Matchs en direct avec terrains et horaires</p>
                            <p className="text-xs mt-1">À venir</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Mes matchs — saisie scores */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-sm">
                            <ClipboardEdit size={16} className="text-gray-500" />
                            Mes matchs — Saisie des scores
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                            <ClipboardEdit size={32} className="mb-3" />
                            <p className="text-sm text-center">Liste de vos matchs sur l'événement en cours pour saisir les résultats</p>
                            <p className="text-xs mt-1">À venir</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
