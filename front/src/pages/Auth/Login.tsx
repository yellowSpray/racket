import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
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
import { useNavigate } from "react-router";
import { useAuth } from "@/contexts/AuthContext";

type RegisterProps = {
  className?: string;
  toggle: () => void;
};

export default function Login({className, toggle, ...props}: RegisterProps) {

    const navigate = useNavigate()
    const { profile, isAuthenticated, isLoading } = useAuth()

    const [loading, setLoading] = useState<boolean>(false)
    const [error, setError] = useState<string>("")
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
        setError("")

        const { error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        })

        if(error) {
            setError(error.message)
        }

        setLoading(false)
    }

    return (
        <div className={cn("flex flex-col items-center h-full", className)} {...props}>
            <Card className="w-1/2 h-full shadow-none gap-6 justify-center border-none">
                <CardHeader>
                    <CardTitle>Connectez-vous</CardTitle>
                    <CardDescription>
                        Entrez vos identifiants pour accéder à votre compte
                    </CardDescription>
                    { error && (
                        <div className="text-destructive px-4 py-3">
                            {error}
                        </div>
                    )}

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
                                    <a
                                        href="#"
                                        className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                                    >
                                        Mot de passe oublié ?
                                    </a>
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
                                    disabled={loading}
                                >
                                    {loading ? 'Connexion...' : 'Se connecter'}
                                </Button>
                                <Button
                                    variant="outline"
                                    type="button"
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
