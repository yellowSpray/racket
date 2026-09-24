import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";
import ForgotPassword from "@/pages/auth/ForgotPassword";
import { ImageStade } from "@/pages/auth/ImageStade";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react"

type AuthView = 'login' | 'register' | 'forgot-password'

export default function Auth() {

    const [view, setView] = useState<AuthView>('login')

    const toggleRegister = () => setView(view === 'register' ? 'login' : 'register')

    /*
     * SOUS 1024 PX, UN SEUL FORMULAIRE A LA FOIS.
     *
     * Au-dessus, connexion et inscription restent cote a cote et l'image
     * glisse pour cacher celui qu'on n'a pas choisi. En dessous, chacun
     * n'avait plus que la moitie d'un ecran deja etroit, 80 px de champs a
     * 320. Celui qu'on n'a pas choisi sort de la page, et l'image devient un
     * bandeau au-dessus du formulaire.
     */
    const panneau = (actif: boolean) => `w-full lg:w-1/2 ${actif ? "" : "max-lg:hidden"}`

    return (
        <section className="w-full flex-1 flex flex-col lg:items-center lg:justify-center">
            {/*
              * Cadre sur les terrains plutot que sur le ciel : a 128 px de
              * haut, c'est ce qui dit « sport de raquette ».
              */}
            <div data-bandeau-acces className="relative h-32 shrink-0 overflow-hidden rounded-2xl sm:h-44 lg:hidden">
                <ImageStade
                    sizes="(min-width: 1024px) 1px, (min-width: 640px) calc(100vw - 64px), calc(100vw - 32px)"
                    className="size-full object-cover object-[50%_62%]"
                />
            </div>
            <AnimatePresence mode="wait">
                <div className="w-full flex-1 flex flex-col relative lg:flex-row lg:justify-between lg:items-center lg:rounded-3xl lg:overflow-hidden">
                    {view === 'forgot-password' ? (
                        <ForgotPassword
                            onBack={() => setView('login')}
                            className={panneau(true)}
                        />
                    ) : (
                        <Login
                            toggle={toggleRegister}
                            onForgotPassword={() => setView('forgot-password')}
                            className={panneau(view === 'login')}
                        />
                    )}
                    <Register
                        toggle={toggleRegister}
                        className={panneau(view === 'register')}
                    />
                    <motion.div
                        data-image-glissante
                        className="hidden lg:block w-1/2 h-full rounded-3xl overflow-hidden absolute top-0 right-0"
                        layout
                        animate={{ left: view === 'register' ? "0%" : "50%" }}
                        transition={{
                            type: "spring",
                            visualDuration: 0.3,
                            bounce: 0.2
                        }}
                    >
                        <ImageStade
                            sizes="(min-width: 1024px) 178vh, 1px"
                            className="w-full h-full object-cover"
                        />
                    </motion.div>
                </div>
            </AnimatePresence>
        </section>
    )
}
