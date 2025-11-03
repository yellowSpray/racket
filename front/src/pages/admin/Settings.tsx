import { SettingEvent } from "@/components/admin/SettingEvent"

export function SettingsAdmin () {
    return (
        <div className="grid grid-cols-10">
            <div className="flex flex-row items-center col-span-10 my-4">
                <h4 className="text-sm mr-4">Défault :</h4>
                <ul className="flex flex-row gap-8">
                    <li>Heure de début: ...</li>
                    <li>Heure de fin: ...</li>
                    <li>Nombre de terrain: ...</li>
                    <li>Durée d'une partie: ...</li>
                </ul>
            </div>
            <div className="col-span-10 grid grid-cols-10 gap-4">
                <SettingEvent />
                <SettingEvent />
                <SettingEvent />
            </div>
        </div>
    )
}