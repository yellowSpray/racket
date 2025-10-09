import { cn } from "@/lib/utils"
import { Button } from "@/shared/components/ui/Button";
import { 
    Card, 
    CardContent, 
    CardDescription,  
    CardHeader,
    CardTitle,
} from "@/shared/components/ui/Card";
import { 
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
} from "@/shared/components/ui/Field";
import { Input } from "@/shared/components/ui/Input";

export default function Login({
    className,
    ...props
}: React.ComponentProps<"div">) {
    return (
        <div className={cn("flex flex-col w-2/9", className)} {...props}>
            <Card className="shadow-none gap-6">
                <CardHeader>
                    <CardTitle>Login to your account</CardTitle>
                    <CardDescription>
                        Enter your email below to login to your account
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form>
                        <FieldGroup>
                            <Field>
                                <FieldLabel htmlFor="email">Email</FieldLabel>
                                <Input 
                                    id="email"
                                    type="email"
                                    placeholder="email@example.com"
                                    required
                                />
                            </Field>
                            <Field>
                                <div className="flex items-center">
                                    <FieldLabel htmlFor="password">Password</FieldLabel>
                                    <a 
                                        href="#"
                                        className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                                    >
                                        Forgot your password ?
                                    </a>
                                </div>
                                <Input id="password" type="password" required />
                            </Field>
                            <Field>
                                <Button type="submit">Login</Button>
                                <Button variant="outline" type="button" className="border-1 border-gray-200">
                                    Login with Google
                                </Button>
                            </Field>
                            <Field>
                                <FieldDescription className="text-center">
                                    Don&apos;t have an account ? <a href="#">Sign up</a>
                                </FieldDescription>
                            </Field>
                        </FieldGroup>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}