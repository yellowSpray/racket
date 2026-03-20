import { useEffect, useState } from "react";
import type { JSX } from "react"
import { playerSchema } from "@/lib/schemas"
import { validateFormData } from "@/lib/validation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
    Stepper,
    StepperContent,
    StepperIndicator,
    StepperItem,
    StepperNav,
    StepperPanel,
    StepperSeparator,
    StepperTrigger,
} from "@/components/ui/stepper"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input"
import { MultiDateCalendar } from "@/components/ui/multi-date-calendar"
import { ZapIcon, UserGroupIcon, EuroIcon, Add01Icon } from 'hugeicons-react';
import type { PlayerType, PaymentStatus } from "@/types/player";

interface EditPlayersProps {
    mode?: "edit" | "create"
    playerData?: PlayerType
    onSave?: (data: Partial<PlayerType>) => Promise<void>
    onPaymentChange?: (playerId: string, eventId: string, status: PaymentStatus) => Promise<void>
    onAbsencesChange?: (playerId: string, dates: string[]) => Promise<void>
    open?: boolean
    onOpenChange?: (open: boolean) => void
}

const initialFormData: Partial<PlayerType> = {
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    arrival: "",
    departure: "",
    power_ranking: 0,
    status: [],
    unavailable: []
}

const STEPS = [1, 2, 3]

export function EditPlayers ({ mode = "edit", playerData, onSave, onPaymentChange, onAbsencesChange, open: controlledOpen, onOpenChange }: EditPlayersProps) {
    const [currentStep, setCurrentStep] = useState<number>(1)
    const [internalOpen, setInternalOpen] = useState(false)

    const isControlled = controlledOpen !== undefined
    const open = isControlled ? controlledOpen : internalOpen
    const setOpen = isControlled ? (v: boolean) => onOpenChange?.(v) : setInternalOpen
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

    // etat controlé du formulaire
    const [formData, setFormData] = useState<Partial<PlayerType>>(initialFormData)

    // etat séparé pour les status joueur et paiement
    const [selected, setSelected] = useState<string[]>([])
    const [paymentStatus, setPaymentStatus] = useState<"paid" | "unpaid">("unpaid")
    const [localPayments, setLocalPayments] = useState<Record<string, PaymentStatus>>({})
    const [localAbsences, setLocalAbsences] = useState<string[]>([])

    // voir si le membre est actif dans l'event
    const isVisitor = selected.includes("visitor")

    // reset du formulaire quand il  s'ouvre
    useEffect(() => {
        if(open) {
            setIsSubmitting(false) // reset
            if(mode === "edit" && playerData) {
                setFormData({
                    first_name: playerData.first_name,
                    last_name: playerData.last_name,
                    phone: playerData.phone,
                    email: playerData.email,
                    arrival: playerData.arrival,
                    departure: playerData.departure,
                    power_ranking: playerData.power_ranking,
                    unavailable: playerData.unavailable || []
                })
                setSelected(playerData.status || [])
                setPaymentStatus(playerData.payment_status || "unpaid")
                setLocalPayments(
                    Object.fromEntries((playerData.payments || []).map(p => [p.event_id, p.status]))
                )
                setLocalAbsences(playerData.unavailable || [])
                setCurrentStep(1)
            } else {
                setFormData(initialFormData)
                setSelected(["inactive", "visitor"])
                setPaymentStatus("unpaid")
                setLocalPayments({})
                setLocalAbsences([])
                setCurrentStep(1)
            }
        }
    },[open, mode, playerData])

    // handler pour les changements d'inputs
    const handleChangeInput = (field: keyof PlayerType, value: string | number) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }))
    }

    // handler pour les status joueur
    const handleStatusChange = (values: string[]) => {
        let newSelected = [...selected]

        // gestion status active/inactive
        if(values.includes("active")) {
            newSelected = newSelected.filter(v => v !== "inactive")
            if(!newSelected.includes("active")) {
                newSelected.push("active")
            }
        } else {
            newSelected = newSelected.filter(v => v !== "active")
            if (!newSelected.includes("inactive")) {
                newSelected.push("inactive")
            }
        }

        // gestion status membre/visitor
        if (values.includes("member")) {
            newSelected = newSelected.filter(v => v !== "visitor")
            if (!newSelected.includes("member")) {
                newSelected.push("member")
            }
        } else {
            newSelected = newSelected.filter(v => v !== "member")
            if (!newSelected.includes("visitor")) {
                newSelected.push("visitor")
            }
        }

        setSelected(newSelected)
    }

    // handler pour le toggle paid/unpaid
    const handlePaymentToggle = (values: string[]) => {
        setPaymentStatus(values.includes("paid") ? "paid" : "unpaid")
    }

    // handler pour le submit du formulaire
    const handleSave = async () => {
        if (currentStep !== STEPS.length) return

        setIsSubmitting(true)
        setFieldErrors({})

        const validation = validateFormData(playerSchema, {
            ...formData,
            status: selected,
        })

        if (!validation.success) {
            setFieldErrors(validation.fieldErrors)
            // retour au step 1 si erreur sur les champs d'identité
            if (validation.fieldErrors.first_name || validation.fieldErrors.last_name || validation.fieldErrors.phone || validation.fieldErrors.email) {
                setCurrentStep(1)
            }
            setIsSubmitting(false)
            return
        }

        const finalData: Partial<PlayerType> = {
            ...formData,
            status: selected as PlayerType["status"],
            payment_status: mode === "create" && isVisitor ? paymentStatus : undefined,
        }

        try {
            await onSave?.(finalData)

            // Persister les changements de paiement per-event
            if (mode === "edit" && playerData && onPaymentChange) {
                const originalPayments = Object.fromEntries(
                    (playerData.payments || []).map(p => [p.event_id, p.status])
                )
                const paymentUpdates = Object.entries(localPayments)
                    .filter(([eventId, newStatus]) => originalPayments[eventId] !== newStatus)

                await Promise.all(
                    paymentUpdates.map(([eventId, newStatus]) =>
                        onPaymentChange(playerData.id, eventId, newStatus)
                    )
                )
            }

            // Persister les changements d'absences
            if (mode === "edit" && playerData && onAbsencesChange) {
                const original = (playerData.unavailable || []).slice().sort().join(",")
                const current = localAbsences.slice().sort().join(",")
                if (original !== current) {
                    await onAbsencesChange(playerData.id, localAbsences)
                }
            }

            setOpen(false)
        } catch {
            // erreur gérée par le parent
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleNext = () => {
        if(currentStep < STEPS.length) {
            setCurrentStep(prev => prev + 1)
        }
    }

    const handlePrevious = () => {
        if(currentStep > 1) {
            setCurrentStep(prev => prev - 1)
        }
    }

    const fieldGroups: {[key: number]: JSX.Element } = {
        1: (
            <FieldGroup>
                <div className="grid grid-cols-2 gap-4">
                    <Field>
                        <FieldLabel htmlFor="firstname">Prénom</FieldLabel>
                        <Input
                            id="firstname"
                            type="text"
                            name="first_name"
                            placeholder="John"
                            value={formData.first_name || ""}
                            onChange={(e) => handleChangeInput("first_name", e.target.value)}
                        />
                        {fieldErrors.first_name && <p className="text-sm text-red-600">{fieldErrors.first_name[0]}</p>}
                    </Field>
                    <Field>
                        <FieldLabel htmlFor="lastname">Nom</FieldLabel>
                        <Input
                            id="lastname"
                            type="text"
                            name="last_name"
                            placeholder="Doe"
                            value={formData.last_name || ""}
                            onChange={(e) => handleChangeInput("last_name", e.target.value)}
                        />
                        {fieldErrors.last_name && <p className="text-sm text-red-600">{fieldErrors.last_name[0]}</p>}
                    </Field>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <Field>
                        <FieldLabel htmlFor="phone">Téléphone</FieldLabel>
                        <Input
                            id="phone"
                            type="tel"
                            name="phone"
                            placeholder="+32454565465"
                            value={formData.phone || ""}
                            onChange={(e) => handleChangeInput("phone", e.target.value)}
                        />
                        {fieldErrors.phone && <p className="text-sm text-red-600">{fieldErrors.phone[0]}</p>}
                    </Field>
                    <Field>
                        <FieldLabel htmlFor="email">Email</FieldLabel>
                        <Input
                            id="email"
                            type="email"
                            name="email"
                            placeholder="john@email.com"
                            value={formData.email || ""}
                            onChange={(e) => handleChangeInput("email", e.target.value)}
                        />
                        {fieldErrors.email && <p className="text-sm text-red-600">{fieldErrors.email[0]}</p>}
                    </Field>
                </div>
            </FieldGroup>
        ),
        2: (
            <FieldGroup>
                <div className="grid grid-cols-2 gap-4">
                    <Field>
                        <FieldLabel htmlFor="arrival">Heure d'arrivée</FieldLabel>
                        <Input 
                            id="arrival" 
                            type="time" 
                            name="arrival" 
                            value={formData.arrival || ""}
                            onChange={(e) => handleChangeInput('arrival', e.target.value)}
                        />
                    </Field>
                    <Field>
                        <FieldLabel htmlFor="departure">Heure de départ</FieldLabel>
                        <Input 
                            id="departure" 
                            type="time"
                            value={formData.departure || ""}
                            onChange={(e) => handleChangeInput('departure', e.target.value)}
                        />
                    </Field>
                </div>
                <div className="grid grid-cols-1 gap-4">
                    <Field>
                        <FieldLabel>Absence</FieldLabel>
                        <MultiDateCalendar
                            selectedDates={localAbsences}
                            onChange={setLocalAbsences}
                        />
                    </Field>
                </div>
            </FieldGroup>
        ),
        3: (
            <FieldGroup>
                <div className="grid grid-cols-1 gap-4">
                    <Field>
                        <FieldLabel htmlFor="status">Status</FieldLabel>
                        <ToggleGroup
                            type="multiple"
                            variant="outline"
                            size="sm"
                            className="grid grid-cols-2"
                            spacing={4}
                            value={selected.filter(s => ["active", "member"].includes(s))}
                            onValueChange={handleStatusChange}
                        >
                            <ToggleGroupItem
                                value="active"
                                aria-label="Toggle active"
                                className="data-[state=off]:bg-gray-100 data-[state=off]:text-muted-foreground data-[state=on]:bg-transparent data-[state=on]:*:[svg]:text-green-500 col-span-1"
                            >
                                <ZapIcon /> {selected.includes("active") ? "Actif" : "Inactif"}
                            </ToggleGroupItem>
                            <ToggleGroupItem
                                value="member"
                                aria-label="Toggle member"
                                className="data-[state=off]:bg-gray-100 data-[state=off]:text-muted-foreground data-[state=on]:bg-transparent data-[state=on]:*:[svg]:text-green-500 col-span-1"
                            >
                                <UserGroupIcon /> {selected.includes("member") ? "Membre" : "Non-membre"}
                            </ToggleGroupItem>
                        </ToggleGroup>
                    </Field>
                    {isVisitor && mode === "edit" && playerData?.payments && playerData.payments.length > 0 && (
                        <Field>
                            <FieldLabel>Paiement par série</FieldLabel>
                            <div className="space-y-2">
                                {playerData.payments.map((payment) => {
                                    const currentStatus = localPayments[payment.event_id] ?? payment.status
                                    return (
                                        <div key={payment.event_id} className="flex items-center justify-between gap-4">
                                            <span className="text-sm truncate">{payment.event_name}</span>
                                            <ToggleGroup
                                                type="multiple"
                                                variant="outline"
                                                size="sm"
                                                value={currentStatus === "paid" ? ["paid"] : []}
                                                onValueChange={(values) => {
                                                    const newStatus = values.includes("paid") ? "paid" : "unpaid"
                                                    setLocalPayments(prev => ({ ...prev, [payment.event_id]: newStatus as PaymentStatus }))
                                                }}
                                            >
                                                <ToggleGroupItem
                                                    value="paid"
                                                    aria-label={`Toggle paid ${payment.event_name}`}
                                                    className="data-[state=off]:bg-gray-100 data-[state=off]:text-muted-foreground data-[state=on]:bg-transparent data-[state=on]:*:[svg]:text-green-500"
                                                >
                                                    <EuroIcon /> {currentStatus === "paid" ? "Payé" : "Non payé"}
                                                </ToggleGroupItem>
                                            </ToggleGroup>
                                        </div>
                                    )
                                })}
                            </div>
                        </Field>
                    )}
                    {isVisitor && mode === "create" && (
                        <Field>
                            <FieldLabel htmlFor="payment">Paiement</FieldLabel>
                            <ToggleGroup
                                type="multiple"
                                variant="outline"
                                size="sm"
                                className="grid grid-cols-2"
                                spacing={4}
                                value={paymentStatus === "paid" ? ["paid"] : []}
                                onValueChange={handlePaymentToggle}
                            >
                                <ToggleGroupItem
                                    value="paid"
                                    aria-label="Toggle paid"
                                    className="data-[state=off]:bg-gray-100 data-[state=off]:text-muted-foreground data-[state=on]:bg-transparent data-[state=on]:*:[svg]:text-green-500 col-span-1"
                                >
                                    <EuroIcon /> {paymentStatus === "paid" ? "Payé" : "Non payé"}
                                </ToggleGroupItem>
                            </ToggleGroup>
                        </Field>
                    )}
                    <Field>
                        <FieldLabel htmlFor="power_ranking">Power ranking</FieldLabel>
                        <Input 
                            id="power_ranking" 
                            type="number"
                            value={formData.power_ranking ?? ""}
                            onChange={(e) => handleChangeInput('power_ranking', Number(e.target.value) || 0)}
                        />
                    </Field>
                </div>
            </FieldGroup>
        )
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {!isControlled && (
                <DialogTrigger asChild>
                    <Button variant="default" size="lg">
                        <Add01Icon size="20" strokeWidth={2}/>
                        Ajouter
                    </Button>
                </DialogTrigger>
            )}
                <DialogContent>
                    <div
                        onKeyDown={(e) => {
                            if(e.key === "Enter") {
                                e.preventDefault()
                            }
                        }}
                    >
                        <Stepper value={currentStep} className="space-y-6">

                            <DialogHeader>
                                <DialogTitle className="mb-2">
                                    { mode === "edit" ? "Modification du joueur" : "Ajouter un joueur" }
                                </DialogTitle>
                                <DialogDescription>
                                    { mode === "edit"
                                        ? "Faites toutes les modifications du joueur et appuyez sur Sauvegarder."
                                        : "Remplissez les informations pour ajouter un nouveau joueur."
                                    }
                                </DialogDescription>
                                <div className="w-1/2 mx-auto flex flex-col items-center mt-6">
                                    <StepperNav>
                                        {STEPS.map((step) => (
                                            <StepperItem key={step} step={step}>
                                                <StepperTrigger asChild>
                                                    <StepperIndicator>{step}</StepperIndicator>
                                                </StepperTrigger>
                                                {STEPS.length > step && 
                                                    <StepperSeparator className="group-data-[state=completed]/step:bg-primary"/>
                                                }
                                            </StepperItem>
                                        ))}
                                    </StepperNav>
                                </div>
                            </DialogHeader>
                            
                            <StepperPanel>
                                {STEPS.map((step) => (
                                    <StepperContent key={step} value={step}>
                                        {fieldGroups[step]}
                                    </StepperContent>
                                ))}
                            </StepperPanel>

                            <DialogFooter>
                                {currentStep > 1 && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="lg"
                                        onClick={handlePrevious}
                                    >
                                        Précédent
                                    </Button>
                                )}
                                {currentStep === STEPS.length ? (
                                    <Button
                                        type="button"
                                        size="lg"
                                        disabled={isSubmitting}
                                        onClick={handleSave}
                                    >
                                        {isSubmitting ? "Sauvegarde..." : mode === "edit" ? "Sauvegarder" : "Créer le joueur"}
                                    </Button>                                
                                ) : (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="lg"
                                        onClick={handleNext}
                                    >
                                        Suivant
                                    </Button>
                                )}
                            </DialogFooter>

                        </Stepper>
                    </div>
                </DialogContent>
        </Dialog>
    )
}