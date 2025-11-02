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
                        <DialogTitle>Edit Players</DialogTitle>
                        <DialogDescription>
                            Make some changes on the player and click on save when its done.
                        </DialogDescription>
                    </DialogHeader>
                    <FieldGroup className="my-5">
                        <div className="grid grid-cols-2 gap-4">
                            <Field>
                                <FieldLabel htmlFor="firstname">First name</FieldLabel>
                                <Input id="firstname" type="text" name="firstname" placeholder="Jhon" />
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="lastname">Last name</FieldLabel>
                                <Input id="lastname" type="text" name="lastname" placeholder="Doe" />
                            </Field>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Field>
                                <FieldLabel htmlFor="email">Email</FieldLabel>
                                <Input id="email" type="email" name="email" placeholder="Jhon@email.com" />
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="phone">Phone</FieldLabel>
                                <Input id="phone" type="tel" name="phone" placeholder="+32454565465" />
                            </Field>
                        </div>
                    </FieldGroup>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Close</Button>
                        </DialogClose>
                        <Button>Save changes</Button>
                    </DialogFooter>
                </DialogContent>
            </form>
        </Dialog>
    )
}