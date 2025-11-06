import React, { useEffect, useState } from "react";
import type { JSX } from "react"
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
import { Ellipsis, Zap, UsersRound, Euro } from 'lucide-react';
import type { PlayerType } from "@/types/player";

interface EditPlayersProps {
    mode?: "edit" | "create"
    playerData?: PlayerType
    onSave?: (data: Partial<PlayerType>) => Promise<void>
}

const initialFormData: Partial<PlayerType> = {
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    arrival: "",
    departure: "",
    power_ranking: "",
    status: [],
    unavailable: []
}


export function EditPlayers ({ mode = "edit", playerData, onSave }: EditPlayersProps) {
    
    const steps = [ 1, 2, 3 ]
    const [currentStep, setCurrentStep] = useState<number>(1)
    const [open, setOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // etat controlé du formulaire
    const [formData, setFormData] = useState<Partial<PlayerType>>(initialFormData)

    // etat séparé pour les status
    const [selected, setSelected] = useState<string[]>([])

    // voir si le membre est actif dans l'event
    const isVisitor = selected.includes("visitor")

    // reset du formulaire quand il  s'ouvre
    useEffect(() => {
        if(open) {
            setIsSubmitting(false) // reset
            if(mode === "edit" && playerData) {
                // mode edition donc on charge les données
                console.log("mode edition on charge les données du joueur:", playerData)

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
                setCurrentStep(1)
            } else {
                console.log("mode création , reset du formulaire")
                setFormData(initialFormData)
                setSelected(["inactive", "visitor", "unpaid"])
                setCurrentStep(1)
            }
        }
    },[open, mode, playerData])

    // handler pour les changements d'inputs
    const handleChangeInput = (field: keyof PlayerType, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }))
    }

    // handler pour les status 
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
            // Si member est activé, on retire paid/unpaid
            newSelected = newSelected.filter(v => v !== "paid" && v !== "unpaid")
        } else {
            newSelected = newSelected.filter(v => v !== "member")
            if (!newSelected.includes("visitor")) {
                newSelected.push("visitor")
            }
        }

        // gestion status paid/unpaid
        if (newSelected.includes("visitor")) {
            if (values.includes("paid")) {
                newSelected = newSelected.filter(v => v !== "unpaid")
                if (!newSelected.includes("paid")) {
                    newSelected.push("paid")
                }
            } else {
                newSelected = newSelected.filter(v => v !== "paid")
                if (!newSelected.includes("unpaid")) {
                    newSelected.push("unpaid")
                }
            }
        }

        setSelected(newSelected)
    }

    // handler pour le submit du formulaire
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()

        console.log("=== HANDLE SUBMIT APPELÉ ===");
        console.trace("Stack trace de l'appel :"); // debug handleSubmit
        console.log("Mode:", mode);
        console.log("Current step:", currentStep);
        console.log("Steps length:", steps.length);
        console.log("Is submitting flag:", isSubmitting);
        console.log("Form data:", formData);
        console.log("Selected status:", selected);

        if (currentStep !== steps.length || !isSubmitting) {
            console.log("Pas au dernier step, on ne soumet pas");
            setIsSubmitting(false) // reset si on arrive pas à la fin des steps ...
            return 
        }

        console.log("✅ Au dernier step ET flag isSubmitting activé, on soumet");

        // construction des données finales
        const finalData: Partial<PlayerType> = {
            ...formData,
            status: selected as ("active" | "inactive" | "member" | "visitor" | "paid" | "unpaid")[]
        }

        console.log("Données finales à sauvegarder:", finalData);

        try {
            await onSave?.(finalData)
            setOpen(false)
            setIsSubmitting(false) // reset
        } catch (error) {
            console.error("erreur sauvegarde formulaire:", error)
            setIsSubmitting(false) // reset en cas d'erreur
        }
    }

    const handleNext = () => {
        console.log("=== HANDLE NEXT APPELÉ ===");
        console.log("Current step avant:", currentStep);
        if(currentStep < steps.length) {
            setCurrentStep(prev => {
                console.log("Changement de step:", prev, "→", prev + 1);
                return prev + 1
            })
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
                            placeholder="Jhon" 
                            value={formData.first_name || ""} 
                            onChange={(e) => handleChangeInput("first_name", e.target.value)} 
                            required 
                        />
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
                            required 
                        />
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
                            required 
                        />
                    </Field>
                    <Field>
                        <FieldLabel htmlFor="email">Email</FieldLabel>
                        <Input 
                            id="email" 
                            type="email" 
                            name="email" 
                            placeholder="Jhon@email.com" 
                            value={formData.email || ""} 
                            onChange={(e) => handleChangeInput("email", e.target.value)}  
                            required 
                        />
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
                            className="grid grid-cols-3" 
                            spacing={4}
                            value={selected.filter(s => ["active", "member", "paid"].includes(s))}
                            onValueChange={handleStatusChange}
                        >
                            <ToggleGroupItem
                                value="active"
                                aria-label="Toggle active"
                                className="data-[state=off]:bg-gray-100 data-[state=on]:bg-transparent data-[state=on]:*:[svg]:stroke-green-500 col-span-1"
                            >
                                <Zap /> Actif
                            </ToggleGroupItem>
                            <ToggleGroupItem 
                                value="member"
                                aria-label="Toggle member"
                                className="data-[state=off]:bg-gray-100 data-[state=on]:bg-transparent data-[state=on]:*:[svg]:stroke-green-500 col-span-1"
                            >
                                <UsersRound /> Membre
                            </ToggleGroupItem>
                            <ToggleGroupItem 
                                value="paid"
                                aria-label="Toggle paid"
                                className="data-[state=off]:bg-gray-100 data-[state=on]:bg-transparent data-[state=on]:*:[svg]:stroke-green-500 col-span-1"
                                disabled={!isVisitor}
                            >
                                <Euro /> Payé
                            </ToggleGroupItem>
                        </ToggleGroup>
                    </Field>
                    <Field>
                        <FieldLabel htmlFor="power_ranking">Power ranking</FieldLabel>
                        <Input 
                            id="power_ranking" 
                            type="number"
                            value={formData.power_ranking || ""}
                            onChange={(e) => handleChangeInput('power_ranking', e.target.value)}
                        />
                    </Field>
                </div>
            </FieldGroup>
        )
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            
                <DialogTrigger asChild>
                    { mode === "edit" ? (
                        <Button variant="ghost"><Ellipsis /></Button>
                    ) : (
                        <Button variant="default">Ajouter un joueur</Button>
                    )}
                </DialogTrigger>
                <DialogContent>
                    <form 
                        onSubmit={handleSubmit}
                        onKeyDown={(e) => {
                            if(e.key === "Enter") {
                                console.log("=== TOUCHE ENTER DÉTECTÉE ===");
                                console.log("isSubmitting:", isSubmitting);
                                if(!isSubmitting) {
                                    e.preventDefault()
                                    console.log("❌ Enter bloquée car isSubmitting = false");
                                }
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
                                        type="submit"
                                        onClick={() => {
                                            setIsSubmitting(true)
                                        }}
                                    >
                                        {mode === "edit" ? "Sauvegarder" : "Créer le joueur"}
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
                    </form>
                </DialogContent>
        </Dialog>
    )
}