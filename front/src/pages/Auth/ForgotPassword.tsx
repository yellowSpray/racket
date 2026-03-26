import { cn } from "@/lib/utils"
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

type ForgotPasswordProps = {
    className?: string
    onBack: () => void
}

export default function ForgotPassword({ className, onBack, ...props }: ForgotPasswordProps) {
    const [loading, setLoading] = useState(false)
    const { errorMessage, handleError, clearError } = useErrorHandler()
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
            setSent(true)
        }

        setLoading(false)
    }

    return (
        <div className={cn("flex flex-col items-center h-full", className)} {...props}>
            <Card className="w-1/2 h-full shadow-none gap-6 justify-center border-none">
                <CardHeader>
                    <h3 className="leading-none font-semibold text-lg">Mot de passe oublié</h3>
                    <CardDescription>
                        Entrez votre adresse email pour recevoir un lien de réinitialisation
                    </CardDescription>
                    {errorMessage && (
                        <div className="text-destructive px-4 py-3">
                            {errorMessage}
                        </div>
                    )}
                </CardHeader>
                <CardContent>
                    {sent ? (
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Un email de réinitialisation a été envoyé à <strong>{email}</strong>. Vérifiez votre boîte de réception.
                            </p>
                            <Button variant="link" onClick={onBack}>
                                Retour à la connexion
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            <FieldGroup>
                                <Field>
                                    <FieldLabel htmlFor="email_forgot">Email</FieldLabel>
                                    <Input
                                        id="email_forgot"
                                        type="email"
                                        placeholder="email@example.com"
                                        autoComplete="off"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        disabled={loading}
                                        required
                                    />
                                </Field>
                                <Field>
                                    <Button type="submit" disabled={loading}>
                                        {loading ? "Envoi en cours..." : "Envoyer le lien"}
                                    </Button>
                                </Field>
                                <Field>
                                    <Button variant="link" type="button" onClick={onBack}>
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
