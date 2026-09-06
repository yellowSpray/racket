import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react"
import { supabase } from "@/lib/supabaseClient"
import type { Session } from "@supabase/supabase-js"
import type { UserProfile, AuthContextType } from "@/types/auth"
import Loading from "@/components/shared/Loading"
import { logger } from "@/lib/logger"
import { syncProfileEmail } from "@/lib/syncProfileEmail"
import { withTimeout } from "@/lib/handleHookError"

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// provider
export function AuthProvider({ children }: { children: ReactNode}) {

    const [session, setSession] = useState<Session | null>(null)
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [isLoading, setIsLoading] = useState<boolean>(true)
    const isFetchingProfile = useRef(false)
    const profileRef = useRef<UserProfile | null>(null)

    // Wrapper pour garder le ref synchronisé avec le state
    const updateProfile = (p: UserProfile | null) => {
        profileRef.current = p
        setProfile(p)
    }

    useEffect(() => {

        let mounted = true
        let isInitializing = true

        // Récupère la session initiale
        const initializeAuth = async () => {
            const endLog = logger.start("AuthContext.initializeAuth")
            try {
                const { data: { session }, error } = await withTimeout(
                    supabase.auth.getSession(),
                    "AuthContext.getSession"
                )

                if (error) {
                    endLog({ error: error.message })
                    setIsLoading(false)
                    return;
                }

                if(!mounted) return

                setSession(session)

                if (session) {
                    logger.info("AuthContext", `Session trouvée, fetch profil pour ${session.user.id.slice(0, 8)}...`)
                    await fetchProfile(session.user.id, session.user.email)
                } else {
                    logger.info("AuthContext", "Pas de session active")
                    setIsLoading(false)
                }

                endLog()
                isInitializing = false
            } catch (err) {
                endLog({ error: err instanceof Error ? err.message : "Erreur inconnue" })
                if (mounted) setIsLoading(false)
                isInitializing = false
            }
        };

        initializeAuth();

        // --- DEBUG : tracer les événements réseau et visibilité ---                                                                                           
            const onOnline = () => logger.info("AuthContext.debug", "🟢 navigator: + online")        
            const onOffline = () => logger.info("AuthContext.debug", "🔴 +navigator: offline")                  
            const onVisibility = () => logger.info("AuthContext.debug", `👁 +visibilitychange: ${document.visibilityState}`)
            window.addEventListener("online", onOnline)                
            window.addEventListener("offline", onOffline)                                                                                                           
            document.addEventListener("visibilitychange", onVisibility)                                                                                             
        // --- FIN DEBUG --- 

        // Écoute les changements d'authentification
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {

                logger.info("AuthContext.debug", `onAuthStateChange: event="${event}", session=${session ? "valide" : "null"}, -online=${navigator.onLine}, visibility=${document.visibilityState}`)                                 
          

                // PASSWORD_RECOVERY : laisser la page ResetPassword gérer
                if (event === 'PASSWORD_RECOVERY') {
                    logger.info("AuthContext", "PASSWORD_RECOVERY — session prête pour reset")
                    if (mounted) setSession(session)
                    setIsLoading(false)
                    return
                }

                // Ignore TOKEN_REFRESHED
                if (event === 'TOKEN_REFRESHED') {
                    logger.info("AuthContext", `TOKEN_REFRESHED — session ${session ? "valide" : "null"}, token expire à ${session?.expires_at ? new Date(session.expires_at * 1000).toLocaleTimeString() : "??"}`)
                    if (mounted) setSession(session)
                    return;
                }

                // Ignore INITIAL_SESSION
                if (event === 'INITIAL_SESSION') {
                    return;
                }

                // Ignore SIGNED_IN pendant l'initialisation (évite double fetch)
                if (event === 'SIGNED_IN' && isInitializing) {
                    return;
                }

                if(!mounted) return

                setSession(session)

                if (session && event === 'SIGNED_IN') {
                    // Skip si c'est le même user (re-validation au retour sur l'onglet)
                    if (profileRef.current?.id === session.user.id) return
                    isFetchingProfile.current = false
                    await fetchProfile(session.user.id, session.user.email)
                } else if (!session && event === 'SIGNED_OUT') {
                    updateProfile(null)
                    isFetchingProfile.current = false
                    setIsLoading(false)
                }
            }
        );

        // cleanup
        return () => {
            mounted = false
            subscription.unsubscribe()
        }

    },[])

    // Fonction pour récupérer le profil avec retry sur timeout/erreur réseau
    const fetchProfile = async (userId: string, authEmail: string | null | undefined, retries = 2) => {

        if(isFetchingProfile.current) return

        isFetchingProfile.current = true
        const endLog = logger.start("AuthContext.fetchProfile")

        try {
            const { data, error } = await withTimeout(
                supabase
                    .from("profiles")
                    .select('*')
                    .eq('id', userId)
                    .single(),
                "AuthContext.fetchProfile"
            );

            if (error) {
                endLog({ error: error.message })
                // Ne pas effacer un profil existant sur une erreur transitoire
                if (!profileRef.current) updateProfile(null);
            } else if (!data) {
                endLog({ error: "Profil non trouvé" })
                updateProfile(null);
            } else {
                endLog()
                /*
                 * `auth.users.email` fait foi pour un compte lie : c'est avec
                 * elle qu'on se connecte. Un changement d'adresse ne prend
                 * effet qu'apres confirmation par email, moment ou `profiles`
                 * reste sur l'ancienne. On les realigne ici, ce qui repare
                 * aussi les divergences deja en base.
                 */
                const { synced } = await syncProfileEmail(userId, authEmail, data.email)
                updateProfile(synced ? { ...data, email: authEmail } : data);
            }

        } catch (err) {
            endLog({ error: err instanceof Error ? err.message : "Erreur inconnue" })
            // Timeout ou erreur réseau : retry avant d'abandonner
            if (retries > 0) {
                logger.info("AuthContext", `Retry fetchProfile (${retries} restant(s))...`)
                isFetchingProfile.current = false
                return fetchProfile(userId, authEmail, retries - 1)
            }
            // Plus de retries : garder le profil existant s'il y en a un
            if (!profileRef.current) updateProfile(null);
        } finally {
            isFetchingProfile.current = false
            setIsLoading(false);
        }
    };

    // fonction de deconnexion
    const signOut = async () => {
        try {
            await supabase.auth.signOut();
        } catch {
            // Sign out error handled silently
        }
    };

    // Rafraîchit le profil depuis la base (utile après une mise à jour)
    const refreshProfile = async () => {
        const { data: { session: currentSession } } = await supabase.auth.getSession()
        if (currentSession?.user.id) await fetchProfile(currentSession.user.id, currentSession.user.email)
    }

    const value: AuthContextType = {
        session,
        user: session?.user ?? null,
        profile,
        isLoading,
        isAuthenticated: !!session,
        signOut,
        refreshProfile
    }

    // affiche le loader
    if (isLoading) {
        return <Loading />;
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}

// hook pour utiliser le contexte
/* eslint-disable react-refresh/only-export-components */
export function useAuth() {
    const context = useContext(AuthContext)
    if(!context) {
        throw new Error("useAuth doit être utilisé dans le AuthProvider")
    }
    return context
}
