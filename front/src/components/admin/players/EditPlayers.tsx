import { Button } from "@/components/ui/Button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/Dialog"
import { Field, FieldLabel, FieldGroup } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input"
import { Ellipsis } from 'lucide-react';


export function EditPlayers () {
    return (
        <Dialog>
            <form>
                <DialogTrigger asChild>
                    <Button variant="ghost">
                        <Ellipsis />
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Modification du joueur</DialogTitle>
                        <DialogDescription>
                            Faites toutes les modification du joueur et puis appuyer sur sauvegarder.
                        </DialogDescription>
                    </DialogHeader>
                    <FieldGroup className="my-5">
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
                                <FieldLabel htmlFor="email">Email</FieldLabel>
                                <Input id="email" type="email" name="email" placeholder="Jhon@email.com" />
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="phone">Téléphone</FieldLabel>
                                <Input id="phone" type="tel" name="phone" placeholder="+32454565465" />
                            </Field>
                        </div>
                    </FieldGroup>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Fermer</Button>
                        </DialogClose>
                        <Button>Sauvegarder</Button>
                    </DialogFooter>
                </DialogContent>
            </form>
        </Dialog>
    )
}