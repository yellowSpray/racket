import { cn } from "@/lib/utils"
import { BOUTON_ACCES, CARTE_ACCES, CHAMP_ACCES, LIEN_ACCES, RETRAIT_ACCES, TITRE_ACCES } from "@/pages/auth/gabarit"
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
} from "@/components/ui/card";
import {
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { supabase } from '@/lib/supabaseClient'
import { useErrorHandler } from "@/hooks/useErrorHandler"
import { toast } from "sonner"
import { useNavigate } from "react-router";
import { useAuth } from "@/contexts/AuthContext";

type LoginProps = {
  className?: string;
  toggle: () => void;
  onForgotPassword: () => void;
};

export default function Login({className, toggle, onForgotPassword, ...props}: LoginProps) {

    const navigate = useNavigate()
    const { profile, isAuthenticated, isLoading } = useAuth()

    const [loading, setLoading] = useState<boolean>(false)
    const { handleError, clearError } = useErrorHandler()
    const [email, setEmail] = useState<string>("")
    const [password, setPassword] = useState<string>("")

    useEffect(() => {
        if (!isLoading && isAuthenticated && profile) {
            navigate(profile.role === 'admin' || profile.role === 'superadmin' ? '/admin' : '/user', { replace: true })
        }
    }, [isAuthenticated, profile, isLoading, navigate])


    const handleSubmit = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault()
        setLoading(true)
        clearError()

        const { error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        })

        if(error) {
            handleError(error)
        } else {
            toast.success("Bienvenue !")
        }

        setLoading(false)
    }

    return (
        <div className={cn("flex flex-col items-center h-full", className)} {...props}>
            <Card className={CARTE_ACCES}>
                <CardHeader className={RETRAIT_ACCES}>
                    <h1 className={TITRE_ACCES}>Connectez-vous</h1>
                    <CardDescription>
                        Entrez vos identifiants pour accéder à votre compte
                    </CardDescription>

                </CardHeader>
                <CardContent className={RETRAIT_ACCES}>
                    <form onSubmit={handleSubmit}>
                        <FieldGroup>
                            <Field>
                                <FieldLabel htmlFor="email_login">Email</FieldLabel>
                                <Input
                                    className={CHAMP_ACCES}
                                    id="email_login"
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
                                <div className="flex items-center">
                                    <FieldLabel htmlFor="password_login">Mot de passe</FieldLabel>
                                    <Button
                                        variant="link"
                                        type="button"
                                        className={`${LIEN_ACCES} ml-auto`}
                                        onClick={onForgotPassword}
                                    >
                                        Mot de passe oublié ?
                                    </Button>
                                </div>
                                <Input
                                    className={CHAMP_ACCES}
                                    id="password_login"
                                    type="password"
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={loading}
                                    required
                                />
                            </Field>
                            <Field>
                                <Button
                                    type="submit"
                                    size="lg"
                                    className={BOUTON_ACCES}
                                    disabled={loading}
                                >
                                    {loading ? 'Connexion...' : 'Se connecter'}
                                </Button>
                                <Button
                                    variant="outline"
                                    type="button"
                                    size="lg"
                                    className={`${BOUTON_ACCES} border-1 border-border`}
                                    disabled={loading}
                                >
                                    Continuer avec Google
                                </Button>
                            </Field>
                            <Field>
                                <FieldDescription className="text-center">
                                    Pas encore de compte ? <Button type="button" variant="link" className={LIEN_ACCES} onClick={toggle}>S&apos;inscrire</Button>
                                </FieldDescription>
                            </Field>
                        </FieldGroup>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
