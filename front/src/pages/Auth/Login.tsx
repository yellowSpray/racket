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
import { useState } from "react";
import { supabase } from '@/lib/supabaseClient'
import { RedirectByRole } from "@/components/shared/RedirectByRole";
import { useAuth } from "@/contexts/AuthContext";

type RegisterProps = {
  className?: string;
  toggle: () => void; 
};

export default function Login({className, toggle, ...props}: RegisterProps) {
    
    const { isAuthenticated } = useAuth()
    const [loading, setLoading] = useState<boolean>(false)
    const [error, setError] = useState<string>("")
    const [email, setEmail] = useState<string>("")
    const [password, setPassword] = useState<string>("")

    // si connecté , redirection
    if ( isAuthenticated ) return <RedirectByRole />

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
            <Card className="w-1/2 h-full shadow-none gap-6 rounded-[0px] border-none bg(--background) justify-center">
                <CardHeader>
                    <CardTitle>Login to your account</CardTitle>
                    <CardDescription>
                        Enter your email below to login to your account
                    </CardDescription>
                    { error && (
                        <div className="text-red-600 px-4 py-3">
                            {error}
                        </div>
                    )}
                    
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit}>
                        <FieldGroup>
                            <Field>
                                <FieldLabel htmlFor="email">Email</FieldLabel>
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
                                    <FieldLabel htmlFor="password">Password</FieldLabel>
                                    <a 
                                        href="#"
                                        className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                                    >
                                        Forgot your password ?
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
                                    className="border-green-400 border-1"
                                >
                                    {loading ? 'Logging in...' : 'Login with Email'}
                                </Button>
                                <Button 
                                    variant="outline" 
                                    type="button" 
                                    className="border-1 border-border"
                                    disabled={loading}
                                >
                                    Login with Google
                                </Button>
                            </Field>
                            <Field>
                                <FieldDescription className="text-center">
                                    Don&apos;t have an account ? <Button onClick={toggle}>Sign up</Button>
                                </FieldDescription>
                            </Field>
                        </FieldGroup>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}