import Login from "@/pages/Auth/Login";
import Register from "@/pages/Auth/Register";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react"

export default function Auth() {

    const [signIn, setSignIn] = useState(false)
    const switchOn = () => setSignIn(!signIn)
    console.log(signIn)

    return (
        <section className="col-span-12 flex flex-row items-center justify-center p-4 md:p-6">
            <AnimatePresence mode="wait">
                <div className="w-full h-full flex flex-row justify-between items-center relative">
                    <Login 
                        toggle={switchOn} 
                        className="w-1/2"
                    />
                    <Register 
                        toggle={switchOn} 
                        className="w-1/2"
                    />
                    <motion.div
                        className="w-1/2 h-full rounded-2xl bg-red-400 absolute top-0 right-0"
                        layout
                        animate={{ left: signIn ? "0%" : "50%" }}
                        transition={{ 
                            type: "spring",
                            visualDuration: 0.3,
                            bounce: 0.2 
                        }} 
                    >
                        <h1>text</h1>
                    </motion.div>
                </div>
            </AnimatePresence>
        </section>
    )
}
