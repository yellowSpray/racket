import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react"

export default function Auth() {

    const [signIn, setSignIn] = useState(false)
    const switchOn = () => setSignIn(!signIn)

    return (
        <section className="w-full flex-1 flex flex-col items-center justify-center">
            <AnimatePresence mode="wait">
                <div className="w-full flex-1 flex flex-row justify-between items-center relative rounded-3xl overflow-hidden">
                    <Login
                        toggle={switchOn}
                        className="w-1/2"
                    />
                    <Register
                        toggle={switchOn}
                        className="w-1/2"
                    />
                    <motion.div
                        className="w-1/2 h-full rounded-3xl bg-muted absolute top-0 right-0"
                        layout
                        animate={{ left: signIn ? "0%" : "50%" }}
                        transition={{
                            type: "spring",
                            visualDuration: 0.3,
                            bounce: 0.2
                        }}
                    />
                </div>
            </AnimatePresence>
        </section>
    )
}
