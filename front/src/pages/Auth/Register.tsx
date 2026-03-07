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
import {
    Stepper,
    StepperItem,
    StepperTrigger,
    StepperIndicator,
    StepperSeparator,
    StepperNav,
    StepperContent,
} from "@/components/ui/stepper"
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
    const [step, setStep] = useState(1)
    const [stepErrors, setStepErrors] = useState<string[]>([])

    const validateStep1 = (): boolean => {
        const errors: string[] = []
        if (!firstName.trim()) errors.push("Le prénom est requis")
        if (!lastName.trim()) errors.push("Le nom est requis")
        if (!phoneNumber.trim()) errors.push("Le téléphone est requis")
        if (!selectedClub) errors.push("Le club est requis")
        setStepErrors(errors)
        return errors.length === 0
    }

    const handleNext = () => {
        if (validateStep1()) {
            setStepErrors([])
            setStep(2)
        }
    }

    const handleBack = () => {
        setStepErrors([])
        setStep(1)
    }

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
            setError("Une erreur inattendue est survenue")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className={cn("flex flex-col items-center h-full", className)} {...props}>
            <Card className="w-1/2 h-full shadow-none gap-6 justify-center border-none">
                <CardHeader>
                    <h3 className="leading-none font-semibold text-lg">Créer un compte</h3>
                    <CardDescription>
                        Remplissez les informations ci-dessous pour créer votre compte
                    </CardDescription>
                    { error && (
                        <div className="text-destructive px-4 py-3">
                            {error}
                        </div>
                    )}
                    { stepErrors.length > 0 && (
                        <div className="text-destructive px-4 py-3">
                            {stepErrors.map((err, i) => (
                                <p key={i} className="text-sm">{err}</p>
                            ))}
                        </div>
                    )}
                </CardHeader>
                <CardContent>
                    <Stepper value={step} onValueChange={setStep}>
                        <StepperNav className="mb-4">
                            <StepperItem step={1}>
                                <StepperTrigger>
                                    <StepperIndicator>1</StepperIndicator>
                                    <span className="text-sm">Informations</span>
                                </StepperTrigger>
                                <StepperSeparator />
                            </StepperItem>
                            <StepperItem step={2}>
                                <StepperTrigger>
                                    <StepperIndicator>2</StepperIndicator>
                                    <span className="text-sm">Compte</span>
                                </StepperTrigger>
                            </StepperItem>
                        </StepperNav>

                        <form onSubmit={handleSubmitRegister}>
                            <StepperContent value={1}>
                                <FieldGroup>
                                    <div className="grid grid-cols-2 gap-4">
                                        <Field>
                                            <FieldLabel htmlFor="first_name">Prénom</FieldLabel>
                                            <Input
                                                id="first_name"
                                                type="text"
                                                placeholder="Jean"
                                                autoComplete="off"
                                                value={firstName}
                                                onChange={(e) => setFirstName(e.target.value)}
                                                disabled={loading}
                                            />
                                            {fieldErrors.firstName && <p className="text-sm text-destructive">{fieldErrors.firstName[0]}</p>}
                                        </Field>
                                        <Field>
                                            <FieldLabel htmlFor="last_name">Nom</FieldLabel>
                                            <Input
                                                id="last_name"
                                                type="text"
                                                placeholder="Dupont"
                                                autoComplete="off"
                                                value={lastName}
                                                onChange={(e) => setLastName(e.target.value)}
                                                disabled={loading}
                                            />
                                            {fieldErrors.lastName && <p className="text-sm text-destructive">{fieldErrors.lastName[0]}</p>}
                                        </Field>
                                    </div>
                                    <Field>
                                        <FieldLabel htmlFor="phone_number">Téléphone</FieldLabel>
                                        <Input
                                            id="phone_number"
                                            type="tel"
                                            placeholder="+3249XXXXXXX"
                                            autoComplete="off"
                                            value={phoneNumber}
                                            onChange={(e) => setPhoneNumber(e.target.value)}
                                            disabled={loading}
                                        />
                                        {fieldErrors.phoneNumber && <p className="text-sm text-destructive">{fieldErrors.phoneNumber[0]}</p>}
                                    </Field>
                                    <Field>
                                        <FieldLabel htmlFor="club">
                                            Dans quel club jouez-vous ?
                                        </FieldLabel>
                                        <Select
                                            value={selectedClub}
                                            onValueChange={setSelectedClub}
                                            disabled={loadingClubs}
                                        >
                                            <SelectTrigger id="club-select">
                                                <SelectValue placeholder="Sélectionnez votre club" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                { clubs.length > 0 ? (
                                                    clubs.map((club) => (
                                                        <SelectItem key={club.id} value={club.id}>
                                                            {club.club_name}
                                                        </SelectItem>
                                                    ))
                                                ) : (
                                                    <SelectItem value="none" disabled>Aucun club disponible</SelectItem>
                                                )}
                                            </SelectContent>
                                        </Select>
                                        {fieldErrors.selectedClub && <p className="text-sm text-destructive">{fieldErrors.selectedClub[0]}</p>}
                                    </Field>
                                    <Field>
                                        <Button
                                            type="button"
                                            onClick={handleNext}
                                            disabled={loading}
                                        >
                                            Suivant
                                        </Button>
                                    </Field>
                                </FieldGroup>
                            </StepperContent>

                            <StepperContent value={2}>
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
                                            disabled={loading}
                                        />
                                        {fieldErrors.email && <p className="text-sm text-destructive">{fieldErrors.email[0]}</p>}
                                    </Field>
                                    <Field>
                                        <FieldLabel htmlFor="password">Mot de passe</FieldLabel>
                                        <Input
                                            id="password"
                                            type="password"
                                            autoComplete="off"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            disabled={loading}
                                        />
                                        {fieldErrors.password && <p className="text-sm text-destructive">{fieldErrors.password[0]}</p>}
                                    </Field>
                                    <Field>
                                        <FieldLabel htmlFor="passwordConfirm">Confirmer le mot de passe</FieldLabel>
                                        <Input
                                            id="passwordConfirm"
                                            type="password"
                                            autoComplete="off"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            disabled={loading}
                                        />
                                        {fieldErrors.confirmPassword && <p className="text-sm text-destructive">{fieldErrors.confirmPassword[0]}</p>}
                                    </Field>
                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={handleBack}
                                            disabled={loading}
                                        >
                                            Retour
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={loading}
                                            className="flex-1"
                                        >
                                            {loading ? 'Inscription...' : "S'inscrire"}
                                        </Button>
                                    </div>
                                </FieldGroup>
                            </StepperContent>
                        </form>
                    </Stepper>

                    <FieldDescription className="text-center mt-4">
                        Déjà un compte ? <Button variant="link" onClick={toggle}>Se connecter</Button>
                    </FieldDescription>
                </CardContent>
            </Card>
        </div>
    )
}
