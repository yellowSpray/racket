import React, { useState } from "react";
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

//TODO problème lorsque l'on ajoute un joueur => au premier step le formulaire s'envoie et les valeurs ne prenne pas

export function EditPlayers ({ mode = "edit", playerData, onSave }: EditPlayersProps) {
    
    const steps = [ 1, 2, 3 ]
    const [currentStep, setCurrentStep] = useState<number>(1)
    const [selected, setSelected] = useState<string[]>(playerData?.status || [])
    const [open, setOpen] = useState(false)
    const isMemberActive = selected.includes("member")

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()

        const formData = new FormData(e.currentTarget)
        const data: Partial<PlayerType> = {
            first_name: formData.get("first_name") as string,
            last_name: formData.get("last_name") as string,
            phone: formData.get("phone") as string,
            email: formData.get("email") as string,
            arrival: formData.get("arrival") as string,
            departure: formData.get("departure") as string,
            power_ranking: formData.get("power_ranking") as string,
            status: selected as ("active" | "inactive" | "member" | "visitor" | "paid" | "unpaid")[],
            unavailable: [] //TODO Pour l'instant vide , à changer
        }

        console.log("Données à sauvegarder:", data)
        onSave?.(data)
        setOpen(false) // Fermer le dialog après sauvegarde
        
        // Reset form si création
        if (mode === "create") {
            setCurrentStep(1)
            setSelected([])
        }
    }

    const fieldGroups: { [key: number]: JSX.Element } = {
        1: (
            <FieldGroup className="">
                <div className="grid grid-cols-2 gap-4">
                    <Field>
                        <FieldLabel htmlFor="firstname">Prénom</FieldLabel>
                        <Input id="firstname" type="text" name="first_name" placeholder="Jhon" defaultValue={playerData?.first_name || ""} required />
                    </Field>
                    <Field>
                        <FieldLabel htmlFor="lastname">Nom</FieldLabel>
                        <Input id="lastname" type="text" name="last_name" placeholder="Doe" defaultValue={playerData?.last_name || ""} required />
                    </Field>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <Field>
                        <FieldLabel htmlFor="phone">Téléphone</FieldLabel>
                        <Input id="phone" type="tel" name="phone" placeholder="+32454565465" defaultValue={playerData?.phone || ""} required />
                    </Field>
                    <Field>
                        <FieldLabel htmlFor="email">Email</FieldLabel>
                        <Input id="email" type="email" name="email" placeholder="Jhon@email.com" defaultValue={playerData?.email || ""} required />
                    </Field>
                </div>
            </FieldGroup>
        ),
        2: (
            <FieldGroup className="">
                <div className="grid grid-cols-2 gap-4">
                    <Field>
                        <FieldLabel htmlFor="arrival">Heure d'arrivée</FieldLabel>
                        <Input id="arrival" type="time" name="arrival" defaultValue={playerData?.arrival || ""} />
                    </Field>
                    <Field>
                        <FieldLabel htmlFor="departure">Heure de départ</FieldLabel>
                        <Input id="departure" type="time" name="departure" defaultValue={playerData?.departure || ""} />
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
                            value={selected}
                            onValueChange={setSelected}
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
                                disabled={isMemberActive}
                            >
                                <Euro /> Payé
                            </ToggleGroupItem>
                        </ToggleGroup>
                    </Field>
                    <Field>
                        <FieldLabel htmlFor="power_ranking">Power ranking</FieldLabel>
                        <Input id="power_ranking" type="number" name="power_ranking" defaultValue={playerData?.power_ranking || ""} />
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
                    <form onSubmit={handleSubmit}>
                        <Stepper value={currentStep} onValueChange={setCurrentStep} className="space-y-6">

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
                                                <StepperTrigger>
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
                                <Button variant="outline" onClick={() => setCurrentStep((prev) => prev - 1)} disabled={currentStep === 1}>
                                    Précédent
                                </Button>
                                {currentStep === steps.length ? (
                                    <Button type="submit">{mode === "edit" ? "Sauvegarder" : "Créer le joueur"}</Button>                                
                                ) : (
                                    <Button
                                        variant="outline"
                                        onClick={() => setCurrentStep((prev) => prev + 1)}
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