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
import { ZapIcon, UserGroupIcon, EuroIcon, Add01Icon } from 'hugeicons-react';
import type { PlayerType } from "@/types/player";

interface EditPlayersProps {
    mode?: "edit" | "create"
    playerData?: PlayerType
    onSave?: (data: Partial<PlayerType>) => Promise<void>
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


export function EditPlayers ({ mode = "edit", playerData, onSave, open: controlledOpen, onOpenChange }: EditPlayersProps) {

    const steps = [ 1, 2, 3 ]
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
                setCurrentStep(1)
            } else {
                setFormData(initialFormData)
                setSelected(["inactive", "visitor"])
                setPaymentStatus("unpaid")
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
        if (currentStep !== steps.length) return

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
            payment_status: isVisitor ? paymentStatus : undefined,
        }

        try {
            await onSave?.(finalData)
            setOpen(false)
        } catch {
            // erreur gérée par le parent
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleNext = () => {
        if(currentStep < steps.length) {
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
                        <FieldLabel htmlFor="available">Absence</FieldLabel>
                        <p className="text-sm text-gray-500">( Bientôt ! )</p>
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
                                className="data-[state=off]:bg-gray-100 data-[state=on]:bg-transparent data-[state=on]:*:[svg]:stroke-green-500 col-span-1"
                            >
                                <ZapIcon /> Actif
                            </ToggleGroupItem>
                            <ToggleGroupItem
                                value="member"
                                aria-label="Toggle member"
                                className="data-[state=off]:bg-gray-100 data-[state=on]:bg-transparent data-[state=on]:*:[svg]:stroke-green-500 col-span-1"
                            >
                                <UserGroupIcon /> Membre
                            </ToggleGroupItem>
                        </ToggleGroup>
                    </Field>
                    {isVisitor && (
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
                                    className="data-[state=off]:bg-gray-100 data-[state=on]:bg-transparent data-[state=on]:*:[svg]:stroke-green-500 col-span-1"
                                >
                                    <EuroIcon /> Payé
                                </ToggleGroupItem>
                            </ToggleGroup>
                        </Field>
                    )}
                    <Field>
                        <FieldLabel htmlFor="power_ranking">Power ranking</FieldLabel>
                        <Input 
                            id="power_ranking" 
                            type="number"
                            value={formData.power_ranking || ""}
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
                        <Add01Icon stroke="2"/>
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
                                        {steps.map((step) => (
                                            <StepperItem key={step} step={step}>
                                                {/* TODO bug to fix , je crois que quand on clique dans le formulaire */}
                                                {/* le trigger s'active et submit le formulaire automatiquement ...   */}
                                                <StepperTrigger disabled> 
                                                    <StepperIndicator>{step}</StepperIndicator>
                                                </StepperTrigger>
                                                {steps.length > step && 
                                                    <StepperSeparator className="group-data-[state=completed]/step:bg-primary"/>
                                                }
                                            </StepperItem>
                                        ))}
                                    </StepperNav>
                                </div>
                            </DialogHeader>
                            
                            <StepperPanel>
                                {steps.map((step) => (
                                    <StepperContent key={step} value={step}>
                                        {fieldGroups[step]}
                                    </StepperContent>
                                ))}
                            </StepperPanel>

                            <DialogFooter>
                                <Button 
                                    type="button"
                                    variant="outline" 
                                    disabled={currentStep === 1}
                                    onClick={() => {
                                        handlePrevious();
                                    }}
                                >
                                    Précédent
                                </Button>
                                {currentStep === steps.length ? (
                                    <Button
                                        type="button"
                                        disabled={isSubmitting}
                                        onClick={handleSave}
                                    >
                                        {isSubmitting ? "En cours..." : mode === "edit" ? "Sauvegarder" : "Créer le joueur"}
                                    </Button>                                
                                ) : (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            handleNext();
                                        }}
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