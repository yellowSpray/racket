import { cn } from "@/lib/utils"
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
            <Card className="w-1/2 h-full shadow-none gap-6 justify-center border-none bg-transparent">
                <CardHeader>
                    <h3 className="leading-none font-semibold text-lg">Connectez-vous</h3>
                    <CardDescription>
                        Entrez vos identifiants pour accéder à votre compte
                    </CardDescription>

                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit}>
                        <FieldGroup>
                            <Field>
                                <FieldLabel htmlFor="email_login">Email</FieldLabel>
                                <Input
                                    id="email_login"
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
                                <div className="flex items-center">
                                    <FieldLabel htmlFor="password_login">Mot de passe</FieldLabel>
                                    <Button
                                        variant="link"
                                        type="button"
                                        className="ml-auto"
                                        onClick={onForgotPassword}
                                    >
                                        Mot de passe oublié ?
                                    </Button>
                                </div>
                                <Input
                                    id="password_login"
                                    type="password"
                                    autoComplete="off"
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
                                    disabled={loading}
                                >
                                    {loading ? 'Connexion...' : 'Se connecter'}
                                </Button>
                                <Button
                                    variant="outline"
                                    type="button"
                                    size="lg"
                                    className="border-1 border-border"
                                    disabled={loading}
                                >
                                    Continuer avec Google
                                </Button>
                            </Field>
                            <Field>
                                <FieldDescription className="text-center">
                                    Pas encore de compte ? <Button variant="link" onClick={toggle}>S&apos;inscrire</Button>
                                </FieldDescription>
                            </Field>
                        </FieldGroup>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
