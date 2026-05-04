import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";
import ForgotPassword from "@/pages/auth/ForgotPassword";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react"

type AuthView = 'login' | 'register' | 'forgot-password'

export default function Auth() {

    const [view, setView] = useState<AuthView>('login')

    const toggleRegister = () => setView(view === 'register' ? 'login' : 'register')

    return (
        <section className="w-full flex-1 flex flex-col items-center justify-center">
            <AnimatePresence mode="wait">
                <div className="w-full flex-1 flex flex-row justify-between items-center relative rounded-3xl overflow-hidden">
                    {view === 'forgot-password' ? (
                        <ForgotPassword
                            onBack={() => setView('login')}
                            className="w-1/2"
                        />
                    ) : (
                        <Login
                            toggle={toggleRegister}
                            onForgotPassword={() => setView('forgot-password')}
                            className="w-1/2"
                        />
                    )}
                    <Register
                        toggle={toggleRegister}
                        className="w-1/2"
                    />
                    <motion.div
                        className="w-1/2 h-full rounded-3xl overflow-hidden absolute top-0 right-0"
                        layout
                        animate={{ left: view === 'register' ? "0%" : "50%" }}
                        transition={{
                            type: "spring",
                            visualDuration: 0.3,
                            bounce: 0.2
                        }}
                    >
                        <img
                            src="/stade1.png"
                            alt=""
                            className="w-full h-full object-cover"
                        />
                    </motion.div>
                </div>
            </AnimatePresence>
        </section>
    )
}
