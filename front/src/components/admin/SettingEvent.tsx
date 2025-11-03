import { 
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
} from "@/components/ui/Card";
import { Separator } from "@/components/ui/Separator";

export function SettingEvent () {
    return (
        <Card className="text-center col-span-2">
            <CardHeader>
                <CardTitle>Titre</CardTitle>
                <CardDescription>
                    <p>Paramètres de la série.</p>
                </CardDescription>
            </CardHeader>
            <CardContent  className="space-y-4">
                <div>
                    <p>Dates : de ... à ...</p>
                    <p>Dates exceptions: ...</p>
                    <p>Heures : de ... à ...</p>
                    <p>Nombre de terrain :</p>
                    <p>Durée d'un match :</p>
                </div>
                <Separator />
                <div>
                    <p>Nombre de joueurs inscrits : ...</p>
                    <p>Nombre de tableaux : ...</p>
                </div>
            </CardContent>
        </Card>
    )
}