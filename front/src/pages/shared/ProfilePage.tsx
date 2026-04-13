import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { MultiDateCalendar } from "@/components/ui/multi-date-calendar"
import { UserAccountIcon, Mail01Icon, SmartPhone01Icon, Calendar03Icon, Notification03Icon, PencilEdit01Icon, Location01Icon, FloppyDiskIcon } from "hugeicons-react"
import { useClubs } from "@/hooks/useClub"
import { supabase } from "@/lib/supabaseClient"
import { useCallback, useEffect, useMemo, useState } from "react"

const roleLabels: Record<string, string> = {
    user: "Joueur",
    admin: "Administrateur",
    superadmin: "Super Admin",
}

const NOTIFICATION_ITEMS = [
    { key: "results",   label: "Résultats de match",  description: "Email à la confirmation d'un score" },
    { key: "reminder",  label: "Rappel de match",      description: "Rappel avant votre prochain match" },
    { key: "news",      label: "Actualités du club",   description: "Annonces et informations du club" },
]

interface EditForm {
    first_name: string
    last_name: string
    email: string
    phone: string
    address: string
    newPassword: string
    confirmPassword: string
}

export function ProfilePage() {
    const { profile, refreshProfile } = useAuth()
    const { clubs } = useClubs()

    const [sports, setSports] = useState<string[]>([])
    const [arrival, setArrival] = useState("")
    const [departure, setDeparture] = useState("")
    const [absences, setAbsences] = useState<string[]>([])
    const [isEditingAvailability, setIsEditingAvailability] = useState(false)
    const [savingAvailability, setSavingAvailability] = useState(false)

    const [editOpen, setEditOpen] = useState(false)
    const [editForm, setEditForm] = useState<EditForm>({ first_name: "", last_name: "", email: "", phone: "", address: "", newPassword: "", confirmPassword: "" })
    const [savingProfile, setSavingProfile] = useState(false)
    const [editError, setEditError] = useState<string | null>(null)
    const [availabilityError, setAvailabilityError] = useState<string | null>(null)

    const club = useMemo(() => {
        if (!profile?.club_id || !clubs.length) return null
        return clubs.find(c => c.id === profile.club_id) ?? null
    }, [clubs, profile?.club_id])

    const fetchSports = useCallback(async () => {
        if (!profile?.id) return
        const { data } = await supabase
            .from("profile_sports")
            .select("sports(sport_name)")
            .eq("profile_id", profile.id)
        if (data) {
            setSports((data as unknown as { sports: { sport_name: string } }[]).map(d => d.sports.sport_name))
        }
    }, [profile?.id])

    const fetchAvailability = useCallback(async () => {
        if (!profile?.id) return
        setAvailabilityError(null)

        const { data: schedRows, error: schedError } = await supabase
            .from("schedule")
            .select("arrival, departure")
            .eq("profile_id", profile.id)
            .limit(1)

        if (schedError) {
            setAvailabilityError(`Erreur horaires : ${schedError.message}`)
        } else {
            const sched = schedRows?.[0]
            setArrival(sched?.arrival ? new Date(sched.arrival).toISOString().slice(11, 16) : "")
            setDeparture(sched?.departure ? new Date(sched.departure).toISOString().slice(11, 16) : "")
        }

        const { data: absData, error: absError } = await supabase
            .from("absences")
            .select("absent_date")
            .eq("profile_id", profile.id)

        if (absError) {
            setAvailabilityError(`Erreur absences : ${absError.message}`)
        } else if (absData) {
            setAbsences(absData.map((d: { absent_date: string }) => d.absent_date))
        }
    }, [profile?.id])

    const saveAvailability = async () => {
        if (!profile?.id) return
        setSavingAvailability(true)
        setAvailabilityError(null)
        try {
            // Sauvegarde schedule (par profile uniquement, sans event)
            const { error: schedDelError } = await supabase.from("schedule").delete().eq("profile_id", profile.id)
            if (schedDelError) { setAvailabilityError(`Erreur suppression horaires : ${schedDelError.message}`); return }

            if (arrival || departure) {
                const { error: schedInsError } = await supabase.from("schedule").insert({
                    profile_id: profile.id,
                    arrival: arrival ? `1970-01-01T${arrival}:00Z` : null,
                    departure: departure ? `1970-01-01T${departure}:00Z` : null,
                })
                if (schedInsError) { setAvailabilityError(`Erreur sauvegarde horaires : ${schedInsError.message}`); return }
            }

            // Sauvegarde absences
            const { error: absDelError } = await supabase.from("absences").delete().eq("profile_id", profile.id)
            if (absDelError) { setAvailabilityError(`Erreur suppression absences : ${absDelError.message}`); return }

            if (absences.length > 0) {
                const { error: absInsError } = await supabase.from("absences").insert(
                    absences.map(date => ({ profile_id: profile.id, absent_date: date }))
                )
                if (absInsError) { setAvailabilityError(`Erreur sauvegarde absences : ${absInsError.message}`); return }
            }

            setIsEditingAvailability(false)
        } finally {
            setSavingAvailability(false)
        }
    }

    const openEdit = () => {
        setEditError(null)
        setEditForm({
            first_name: profile?.first_name ?? "",
            last_name: profile?.last_name ?? "",
            email: profile?.email ?? "",
            phone: profile?.phone ?? "",
            address: profile?.address ?? "",
            newPassword: "",
            confirmPassword: "",
        })
        setEditOpen(true)
    }

    const saveProfile = async () => {
        if (!profile?.id) return
        if (editForm.newPassword && editForm.newPassword !== editForm.confirmPassword) {
            setEditError("Les mots de passe ne correspondent pas.")
            return
        }
        setEditError(null)
        setSavingProfile(true)
        try {
            await supabase.from("profiles").update({
                first_name: editForm.first_name,
                last_name: editForm.last_name,
                email: editForm.email,
                phone: editForm.phone,
                address: editForm.address,
            }).eq("id", profile.id)

            if (editForm.newPassword) {
                await supabase.auth.updateUser({ password: editForm.newPassword })
            }

            await refreshProfile()
            setEditOpen(false)
        } finally {
            setSavingProfile(false)
        }
    }

    useEffect(() => { fetchSports() }, [fetchSports])
    useEffect(() => { fetchAvailability() }, [fetchAvailability])

    if (!profile) return null

    return (
        <div className="flex flex-col h-full min-h-0 gap-5">
            <h3 className="text-lg font-semibold">Mon profil</h3>

            <div className="flex-1 min-h-0 grid grid-cols-12 grid-rows-16 gap-5">

                {/* Informations personnelles */}
                <Card className="col-start-1 col-span-4 row-start-1 row-span-16 flex flex-col">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-sm">
                            <UserAccountIcon size={16} className="text-foreground" />
                            Informations personnelles
                            <Button variant="icon" size="icon" className="ml-auto" onClick={openEdit}>
                                <PencilEdit01Icon size={15} strokeWidth={2} />
                            </Button>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center gap-5">
                        <Avatar className="w-20 h-20">
                            <AvatarImage
                                src={profile.avatar_url || "https://github.com/shadcn.png"}
                                alt={`${profile.first_name} ${profile.last_name}`}
                            />
                        </Avatar>
                        <div className="w-full space-y-4">
                            <div>
                                <p className="text-base font-bold text-center">
                                    {profile.first_name} {profile.last_name}
                                </p>
                                <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
                                    <Badge variant="member">
                                        {roleLabels[profile.role] ?? profile.role}
                                    </Badge>
                                    {club && (
                                        <Badge variant="default">{club.club_name}</Badge>
                                    )}
                                    {sports.map(sport => (
                                        <Badge key={sport} variant="visitor">{sport}</Badge>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-2.5 pt-2 border-t">
                                <div className="flex items-center gap-2 text-sm">
                                    <Mail01Icon size={14} className="text-muted-foreground shrink-0" />
                                    <span className="truncate">{profile.email}</span>
                                </div>
                                {profile.phone && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <SmartPhone01Icon size={14} className="text-muted-foreground shrink-0" />
                                        <span>{profile.phone}</span>
                                    </div>
                                )}
                                {profile.address && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <Location01Icon size={14} className="text-muted-foreground shrink-0" />
                                        <span>{profile.address}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Disponibilités */}
                <Card className="col-start-5 col-span-8 row-start-1 row-span-10 flex flex-col">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-sm">
                            <Calendar03Icon size={16} className="text-foreground" />
                            Disponibilités
                            <Button
                                variant="icon"
                                size="icon"
                                className="ml-auto"
                                onClick={isEditingAvailability ? saveAvailability : () => setIsEditingAvailability(true)}
                                disabled={savingAvailability}
                            >
                                {isEditingAvailability
                                    ? <FloppyDiskIcon size={15} strokeWidth={2} />
                                    : <PencilEdit01Icon size={15} strokeWidth={2} />
                                }
                            </Button>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 min-h-0 grid grid-cols-8 gap-5">
                        {/* Horaires — 3 colonnes */}
                        <div className="col-span-3 flex flex-col gap-4">
                            <p className="text-xs text-muted-foreground">Horaires habituels</p>
                            <div className="flex items-center justify-between border rounded-md px-3 py-1.5 bg-background">
                                <span className="text-sm text-muted-foreground shrink-0">Arrivée</span>
                                {isEditingAvailability
                                    ? <input type="time" value={arrival} onChange={e => setArrival(e.target.value)} className="text-sm bg-transparent text-right outline-none" />
                                    : <span className="text-sm">{arrival || "-- : --"}</span>
                                }
                            </div>
                            <div className="flex items-center justify-between border rounded-md px-3 py-1.5 bg-background">
                                <span className="text-sm text-muted-foreground shrink-0">Départ</span>
                                {isEditingAvailability
                                    ? <input type="time" value={departure} onChange={e => setDeparture(e.target.value)} className="text-sm bg-transparent text-right outline-none" />
                                    : <span className="text-sm">{departure || "-- : --"}</span>
                                }
                            </div>
                        </div>

                        {/* Calendrier absences — colonnes restantes */}
                        <div className="col-span-5 flex flex-col gap-4 min-h-0">
                            <p className="text-xs text-muted-foreground">Calendrier d'absences</p>
                            <MultiDateCalendar selectedDates={absences} onChange={setAbsences} disabled={!isEditingAvailability} className="flex-1 !w-auto overflow-auto" />
                        </div>

                        {availabilityError && (
                            <p className="col-span-8 text-sm text-red-500">{availabilityError}</p>
                        )}
                    </CardContent>
                </Card>

                {/* Notifications */}
                <Card className="col-start-5 col-span-8 row-start-11 row-span-6 flex flex-col">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-sm">
                            <Notification03Icon size={16} className="text-foreground" />
                            Notifications
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col gap-5">
                        {NOTIFICATION_ITEMS.map(({ key, label, description }) => (
                            <div key={key} className="flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-sm font-medium">{label}</p>
                                    <p className="text-xs text-muted-foreground">{description}</p>
                                </div>
                                <Switch disabled />
                            </div>
                        ))}
                        <p className="text-xs text-muted-foreground mt-auto">
                            Prochainement disponible
                        </p>
                    </CardContent>
                </Card>

            </div>

            {/* Dialog édition du profil */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Modifier le profil</DialogTitle>
                    </DialogHeader>

                    <div className="flex flex-col gap-4 py-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="first_name">Prénom</Label>
                                <Input id="first_name" value={editForm.first_name} onChange={e => setEditForm(f => ({ ...f, first_name: e.target.value }))} />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="last_name">Nom</Label>
                                <Input id="last_name" value={editForm.last_name} onChange={e => setEditForm(f => ({ ...f, last_name: e.target.value }))} />
                            </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="phone">Téléphone</Label>
                            <Input id="phone" type="tel" value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="address">Adresse</Label>
                            <Input id="address" value={editForm.address} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))} />
                        </div>

                        <div className="border-t pt-4 flex flex-col gap-3">
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Changer le mot de passe</p>
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                                <Input id="newPassword" type="password" value={editForm.newPassword} onChange={e => setEditForm(f => ({ ...f, newPassword: e.target.value }))} placeholder="Laisser vide pour ne pas changer" />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="confirmPassword">Confirmer</Label>
                                <Input id="confirmPassword" type="password" value={editForm.confirmPassword} onChange={e => setEditForm(f => ({ ...f, confirmPassword: e.target.value }))} />
                            </div>
                        </div>

                        {editError && (
                            <p className="text-sm text-red-500">{editError}</p>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditOpen(false)} disabled={savingProfile}>
                            Annuler
                        </Button>
                        <Button onClick={saveProfile} disabled={savingProfile}>
                            {savingProfile ? "Enregistrement..." : "Enregistrer"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
