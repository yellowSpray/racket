import { useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Image01Icon, Upload04Icon } from "hugeicons-react"
import { supabase } from "@/lib/supabaseClient"

interface ClubLogoCardProps {
    clubId: string
    logoUrl?: string
    clubName: string
    onSaved: (url: string) => void
    className?: string
}

function getClubInitials(name: string): string {
    return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
}

export function ClubLogoCard({ clubId, logoUrl, clubName, onSaved, className }: ClubLogoCardProps) {
    const inputRef = useRef<HTMLInputElement>(null)
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleFile = async (file: File) => {
        if (!file.type.startsWith("image/")) {
            setError("Fichier non supporté. Utilisez une image (JPG, PNG, WEBP).")
            return
        }
        if (file.size > 2 * 1024 * 1024) {
            setError("Image trop lourde. Maximum 2 Mo.")
            return
        }

        setError(null)
        setUploading(true)

        const ext = file.name.split(".").pop()
        const path = `${clubId}/logo.${ext}`

        const { error: uploadError } = await supabase.storage
            .from("club-logos")
            .upload(path, file, { upsert: true })

        if (uploadError) {
            setError("Erreur lors de l'upload.")
            setUploading(false)
            return
        }

        const { data: urlData } = supabase.storage.from("club-logos").getPublicUrl(path)
        const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`

        const { error: updateError } = await supabase
            .from("clubs")
            .update({ logo_url: publicUrl })
            .eq("id", clubId)

        if (updateError) {
            setError("Erreur lors de la sauvegarde.")
        } else {
            onSaved(publicUrl)
        }

        setUploading(false)
    }

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                    <Image01Icon size={16} className="text-foreground" />
                    Logo du club
                </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
                {/* Preview */}
                <div className="size-24 rounded-xl overflow-hidden bg-primary/10 flex items-center justify-center shrink-0">
                    {logoUrl ? (
                        <img
                            src={logoUrl}
                            alt={clubName}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <span className="text-2xl font-bold text-primary">
                            {getClubInitials(clubName)}
                        </span>
                    )}
                </div>

                {error && <p className="text-xs text-red-500 text-center">{error}</p>}

                <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => {
                        const file = e.target.files?.[0]
                        if (file) handleFile(file)
                        e.target.value = ""
                    }}
                />

                <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => inputRef.current?.click()}
                    disabled={uploading}
                >
                    <Upload04Icon size={14} />
                    {uploading ? "Upload en cours…" : "Changer le logo"}
                </Button>

                <p className="text-[11px] text-muted-foreground text-center">
                    JPG, PNG ou WEBP · max 2 Mo
                </p>
            </CardContent>
        </Card>
    )
}
