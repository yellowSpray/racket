import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { 
    Card, 
    CardContent, 
    CardDescription,  
    CardHeader,
    CardTitle,
} from "@/components/ui/Card";
import { 
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/Field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select"
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabaseClient";
import { useClubs } from "@/hooks/useClub";

type RegisterProps = {
  className?: string;
  toggle: () => void; 
};

export default function Register({
    className,
    toggle,
    ...props
}: RegisterProps) {

    const { clubs , loadingClubs } = useClubs()

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [firstName, setFirstName] = useState("")
    const [lastName, setLastName] = useState("")
    const [phoneNumber, setPhoneNumber] = useState("")
    const [selectedClub, setSelectedClub] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")

    const handleSubmitRegister = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault()
        setLoading(true)
        setError("")

        console.log(firstName, lastName, phoneNumber, selectedClub, email, password)

        if(password !== confirmPassword) {
            setError("Password is not matching")
            setLoading(false)
            return
        }

        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        first_name: firstName,
                        last_name: lastName,
                        phone: phoneNumber,
                        club_id: selectedClub
                    }
                }
            });

            console.log("User registered :", data.user)

            if(error){
                console.log("error sign up user :", error)
                setError(error.message)
                setLoading(false)
                return
            }
            
        } catch (err) {
            console.error(err)
            setError("Unexpected error during registration")
        } finally {
            setLoading(false)
        }
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
                    <form onSubmit={handleSubmitRegister}>
                        <FieldGroup>
                            <div className="grid grid-cols-2 gap-4">
                                <Field>
                                    <FieldLabel htmlFor="first_name">First Name</FieldLabel>
                                    <Input 
                                        id="first_name"
                                        type="text"
                                        placeholder="Jhon"
                                        autoComplete="off"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        disabled={loading}
                                        required
                                    />
                                </Field>
                                <Field>
                                    <FieldLabel htmlFor="last_name">Last Name</FieldLabel>
                                    <Input 
                                        id="last_name"
                                        type="text"
                                        placeholder="Doe"
                                        autoComplete="off"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        disabled={loading}
                                        required
                                    />
                                </Field>
                            </div>
                            <Field>
                                <FieldLabel htmlFor="last_name">Phone Number</FieldLabel>
                                <Input 
                                    id="phone_number"
                                    type="tel"
                                    placeholder="+3249XXXXXXX"
                                    autoComplete="off"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    disabled={loading}
                                    required
                                />
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="club">
                                    Which club do you play ?
                                </FieldLabel>
                                <Select 
                                    value={selectedClub}
                                    onValueChange={setSelectedClub}
                                    disabled={loadingClubs}
                                >
                                    <SelectTrigger id="club-select">
                                        <SelectValue placeholder="Select your club" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        { clubs.length > 0 ? (
                                            clubs.map((club) => (
                                                <SelectItem key={club.id} value={club.id}>
                                                    {club.club_name}
                                                </SelectItem>
                                            ))
                                        ) : (
                                            <SelectItem value="none" disabled>No clubs available</SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="email">Email</FieldLabel>
                                <Input 
                                    id="email"
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
                                <FieldLabel htmlFor="password">Password</FieldLabel>
                                <Input 
                                    id="password" 
                                    type="password"
                                    autoComplete="off"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={loading}
                                    required
                                />
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="password">Confim Password</FieldLabel>
                                <Input 
                                    id="passwordConfirm" 
                                    type="password"
                                    autoComplete="off"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
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
                                    {loading ? 'Register in...' : 'Register'}
                                </Button>
                            </Field>
                            <Field>
                                <FieldDescription className="text-center">
                                    Already have an account ? <Button onClick={toggle}>Sign in</Button>
                                </FieldDescription>
                            </Field>
                        </FieldGroup>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}