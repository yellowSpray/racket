import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
} from "@/components/ui/card"
import {
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { useNavigate } from "react-router"
import { supabase } from "@/lib/supabaseClient"
import { validateFormData } from "@/lib/validation"
import { resetPasswordSchema } from "@/lib/schemas"

export default function ResetPassword() {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setFieldErrors({})

        const validation = validateFormData(resetPasswordSchema, { password, confirmPassword })
        if (!validation.success) {
            setFieldErrors(validation.fieldErrors)
            return
        }

        setLoading(true)

        const { error } = await supabase.auth.updateUser({ password })

        if (error) {
            setError(error.message)
            setLoading(false)
            return
        }

        navigate('/auth', { replace: true })
    }

    return (
        <section className="w-full flex-1 flex flex-col items-center justify-center">
            <Card className="w-full max-w-md shadow-sm gap-6">
                <CardHeader>
                    <h3 className="leading-none font-semibold text-lg">Nouveau mot de passe</h3>
                    <CardDescription>
                        Choisissez votre nouveau mot de passe
                    </CardDescription>
                    {error && (
                        <div className="text-destructive px-4 py-3">
                            {error}
                        </div>
                    )}
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit}>
                        <FieldGroup>
                            <Field>
                                <FieldLabel htmlFor="new_password">Nouveau mot de passe</FieldLabel>
                                <Input
                                    id="new_password"
                                    type="password"
                                    autoComplete="new-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={loading}
                                    required
                                />
                                {fieldErrors.password && (
                                    <FieldDescription className="text-destructive">
                                        {fieldErrors.password[0]}
                                    </FieldDescription>
                                )}
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="confirm_new_password">Confirmer le mot de passe</FieldLabel>
                                <Input
                                    id="confirm_new_password"
                                    type="password"
                                    autoComplete="new-password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    disabled={loading}
                                    required
                                />
                                {fieldErrors.confirmPassword && (
                                    <FieldDescription className="text-destructive">
                                        {fieldErrors.confirmPassword[0]}
                                    </FieldDescription>
                                )}
                            </Field>
                            <Field>
                                <Button type="submit" disabled={loading}>
                                    {loading ? "Réinitialisation..." : "Réinitialiser le mot de passe"}
                                </Button>
                            </Field>
                        </FieldGroup>
                    </form>
                </CardContent>
            </Card>
        </section>
    )
}
