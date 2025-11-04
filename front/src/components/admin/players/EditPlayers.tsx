import { useState } from "react";
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



export function EditPlayers () {
    
    const steps = [ 1, 2, 3 ]
    const [currentStep, setCurrentStep] = useState<number>(1)
    const [selected, setSelected] = useState<string[]>([])

    const isMemberActive = selected.includes("member")

    const fieldGroups: { [key: number]: JSX.Element } = {
        1: (
            <FieldGroup className="">
                <div className="grid grid-cols-2 gap-4">
                    <Field>
                        <FieldLabel htmlFor="firstname">Prénom</FieldLabel>
                        <Input id="firstname" type="text" name="firstname" placeholder="Jhon" />
                    </Field>
                    <Field>
                        <FieldLabel htmlFor="lastname">Nom</FieldLabel>
                        <Input id="lastname" type="text" name="lastname" placeholder="Doe" />
                    </Field>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <Field>
                        <FieldLabel htmlFor="phone">Téléphone</FieldLabel>
                        <Input id="phone" type="tel" name="phone" placeholder="+32454565465" />
                    </Field>
                    <Field>
                        <FieldLabel htmlFor="email">Email</FieldLabel>
                        <Input id="email" type="email" name="email" placeholder="Jhon@email.com" />
                    </Field>
                </div>
            </FieldGroup>
        ),
        2: (
            <FieldGroup className="">
                <div className="grid grid-cols-2 gap-4">
                    <Field>
                        <FieldLabel htmlFor="arrival">Heure d'arrivée</FieldLabel>
                        <Input id="arrival" type="time" name="arrival" defaultValue="18:30" />
                    </Field>
                    <Field>
                        <FieldLabel htmlFor="departure">Heure de départ</FieldLabel>
                        <Input id="departure" type="time" name="departure" defaultValue="none" />
                    </Field>
                </div>
                <div className="grid grid-cols-1 gap-4">
                    <Field>
                        <FieldLabel htmlFor="available">Absence</FieldLabel>
                        <p>TO ADD later</p>
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
                        <FieldLabel htmlFor="force_ranking">Power ranking</FieldLabel>
                        <Input id="force_ranking" type="number" name="force_ranking" placeholder="1235" />
                    </Field>
                </div>
            </FieldGroup>
        )
    }

    return (
        <Dialog>
            <form>
                <DialogTrigger asChild>
                    <Button variant="ghost">
                        <Ellipsis />
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <Stepper value={currentStep} onValueChange={setCurrentStep} className="space-y-6">

                        <DialogHeader>
                            <DialogTitle className="mb-2">Modification du joueur</DialogTitle>
                            <DialogDescription>
                                Faites toutes les modification du joueur et appuyé sur sauvegarder.
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
                                <Button
                                    type="submit"
                                >
                                    Sauvegarder
                                </Button>
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
                </DialogContent>
            </form>
        </Dialog>
    )
}