import { useState } from "react"
import { registerSchema } from "@/lib/schemas"
import { validateFormData } from "@/lib/validation"
import { Button } from "@/components/ui/button"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input";
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
    const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
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
        setFieldErrors({})

        const validation = validateFormData(registerSchema, {
            firstName, lastName, phoneNumber, selectedClub, email, password, confirmPassword
        })

        if (!validation.success) {
            setFieldErrors(validation.fieldErrors)
            setLoading(false)
            return
        }

        try {
            const { error } = await supabase.auth.signUp({
                email: validation.data.email,
                password: validation.data.password,
                options: {
                    data: {
                        first_name: validation.data.firstName,
                        last_name: validation.data.lastName,
                        phone: validation.data.phoneNumber,
                        club_id: validation.data.selectedClub
                    }
                }
            });

            if(error){
                setError(error.message)
                setLoading(false)
                return
            }

        } catch {
            setError("Unexpected error during registration")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className={cn("flex flex-col items-center h-full", className)} {...props}>
            <Card className="w-1/2 h-full shadow-none gap-6 rounded-[0px] border-none bg(--background) justify-center">
                <CardHeader>
                    <CardTitle>Create your account</CardTitle>
                    <CardDescription>
                        Fill in the details below to create your account
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
                                        placeholder="John"
                                        autoComplete="off"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        disabled={loading}
                                    />
                                    {fieldErrors.firstName && <p className="text-sm text-red-600">{fieldErrors.firstName[0]}</p>}
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
                                    />
                                    {fieldErrors.lastName && <p className="text-sm text-red-600">{fieldErrors.lastName[0]}</p>}
                                </Field>
                            </div>
                            <Field>
                                <FieldLabel htmlFor="phone_number">Phone Number</FieldLabel>
                                <Input
                                    id="phone_number"
                                    type="tel"
                                    placeholder="+3249XXXXXXX"
                                    autoComplete="off"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    disabled={loading}
                                />
                                {fieldErrors.phoneNumber && <p className="text-sm text-red-600">{fieldErrors.phoneNumber[0]}</p>}
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
                                {fieldErrors.selectedClub && <p className="text-sm text-red-600">{fieldErrors.selectedClub[0]}</p>}
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
                                />
                                {fieldErrors.email && <p className="text-sm text-red-600">{fieldErrors.email[0]}</p>}
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
                                />
                                {fieldErrors.password && <p className="text-sm text-red-600">{fieldErrors.password[0]}</p>}
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="passwordConfirm">Confirm Password</FieldLabel>
                                <Input
                                    id="passwordConfirm"
                                    type="password"
                                    autoComplete="off"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    disabled={loading}
                                />
                                {fieldErrors.confirmPassword && <p className="text-sm text-red-600">{fieldErrors.confirmPassword[0]}</p>}
                            </Field>
                            <Field>
                                <Button 
                                    type="submit"
                                    disabled={loading}
                                    className="border-green-400 border-1"
                                >
                                    {loading ? 'Registering...' : 'Register'}
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