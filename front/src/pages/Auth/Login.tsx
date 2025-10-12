import { cn } from "@/lib/utils"
import { Button } from "@/shared/components/ui/Button";
import { 
    Card, 
    CardContent, 
    CardDescription,  
    CardHeader,
    CardTitle,
} from "@/shared/components/ui/Card";
import { 
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
} from "@/shared/components/ui/Field";
import { Input } from "@/shared/components/ui/Input";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { User } from '@/types/auth'

export default function Login({
    className,
    ...props
}: React.ComponentProps<"div">) {

    const [ email, setEmail ] = useState<string>('')
    const [ password, setPassword ] = useState<string>('')
    const [ loading, setLoading ] = useState<boolean>(false)
    const [ error, setError ] = useState<string>('')
    const { login } = useAuth()

    const handleSubmit = async (e: React.FormEvent): Promise<void> => {

        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            // fetch des données via json-server pour test
            const response = await fetch(`http://localhost:3001/users?email=${encodeURIComponent(email)}`)

            // verif si la reponse est envoyé de json-server
            if(!response.ok) {
                throw new Error(`Server error: ${response.status}`)
            }

            // recupere les données users
            const users: User[] = await response.json()

            // compare email et mdp du user
            if (users.length === 0 || users[0].password !== password) {
                setError('Email or password are not correct!')
                setLoading(false)
                return
            }

            // simulation d'un token
            const token = btoa(Math.random().toString())
            login(users[0], token)

        } catch (error) {
            if (error instanceof Error) {
                setError(error.message)
            } else {
                setError("Unexpected error")
            }
        } finally {
            setLoading(false)
        }

    }

    return (
        <div className={cn("flex flex-col w-2/9", className)} {...props}>
            <Card className="shadow-none gap-6">
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
                                    id="email"
                                    type="email"
                                    placeholder="email@example.com"
                                    autoComplete="off"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
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
                                    id="password" 
                                    type="password"
                                    autoComplete="off"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)} 
                                    required 
                                />
                            </Field>
                            <Field>
                                <Button 
                                    type="submit"
                                    disabled={loading}
                                >
                                    Login with Email
                                </Button>
                                <Button variant="outline" type="button" className="border-1 border-gray-200">
                                    Login with Google
                                </Button>
                            </Field>
                            <Field>
                                <FieldDescription className="text-center">
                                    Don&apos;t have an account ? <a href="#">Sign up</a>
                                </FieldDescription>
                            </Field>
                        </FieldGroup>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}