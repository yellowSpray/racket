import { cn } from "@/lib/utils"
import { BOUTON_ACCES, CARTE_ACCES, CHAMP_ACCES, LIEN_ACCES, RETRAIT_ACCES, TITRE_ACCES } from "@/pages/auth/gabarit"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
} from "@/components/ui/card"
import {
    Field,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useErrorHandler } from "@/hooks/useErrorHandler"
import { toast } from "sonner"

type ForgotPasswordProps = {
    className?: string
    onBack: () => void
}

export default function ForgotPassword({ className, onBack, ...props }: ForgotPasswordProps) {
    const [loading, setLoading] = useState(false)
    const { handleError, clearError } = useErrorHandler()
    const [email, setEmail] = useState("")
    const [sent, setSent] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        clearError()

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/auth/reset-password`,
        })

        if (error) {
            handleError(error)
        } else {
            toast.success("Email de réinitialisation envoyé")
            setSent(true)
        }

        setLoading(false)
    }

    return (
        <div className={cn("flex flex-col items-center h-full", className)} {...props}>
            <Card className={CARTE_ACCES}>
                <CardHeader className={RETRAIT_ACCES}>
                    <h1 className={TITRE_ACCES}>Mot de passe oublié</h1>
                    <CardDescription>
                        Entrez votre adresse email pour recevoir un lien de réinitialisation
                    </CardDescription>
                </CardHeader>
                <CardContent className={RETRAIT_ACCES}>
                    {sent ? (
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Un email de réinitialisation a été envoyé à <strong>{email}</strong>. Vérifiez votre boîte de réception.
                            </p>
                            <Button variant="link" className={LIEN_ACCES} onClick={onBack}>
                                Retour à la connexion
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            <FieldGroup>
                                <Field>
                                    <FieldLabel htmlFor="email_forgot">Email</FieldLabel>
                                    <Input
                                        className={CHAMP_ACCES}
                                        id="email_forgot"
                                        type="email"
                                        placeholder="email@example.com"
                                        autoComplete="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        disabled={loading}
                                        required
                                    />
                                </Field>
                                <Field>
                                    <Button type="submit" size="lg" className={BOUTON_ACCES} disabled={loading}>
                                        {loading ? "Envoi en cours..." : "Envoyer le lien"}
                                    </Button>
                                </Field>
                                <Field>
                                    <Button variant="link" className={LIEN_ACCES} type="button" onClick={onBack}>
                                        Retour à la connexion
                                    </Button>
                                </Field>
                            </FieldGroup>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
