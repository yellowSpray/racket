import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react"
import { supabase } from "@/lib/supabaseClient"
import type { Session } from "@supabase/supabase-js"
import type { UserProfile, AuthContextType } from "@/types/auth"
import Loading from "@/components/shared/Loading"

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// provider
export function AuthProvider({ children }: { children: ReactNode}) {

    const [session, setSession] = useState<Session | null>(null)
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [isLoading, setIsLoading] = useState<boolean>(true)
    const isFetchingProfile = useRef(false)

    useEffect(() => {

        let mounted = true

        // Récupère la session initiale
        const initializeAuth = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession()

                if (error) {
                    console.error("Erreur getSession:", error)
                    setIsLoading(false)
                    return;
                }
                
                if(!mounted) return
                setSession(session)

                if (session) {
                    await fetchProfile(session.user.id)
                } else {
                    setIsLoading(false)
                }
            } catch (error) {
                console.error("Erreur session initiale:", error)
                if (mounted) setIsLoading(false)
            }
        };

        initializeAuth();
        
        // Écoute les changements d'authentification
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {

                // Ignore TOKEN_REFRESHED
                if (event === 'TOKEN_REFRESHED') {
                    if (mounted) setSession(session)
                    return;
                }
                // Ignore INITIAL_SESSION (ne charge pas deux fois le profil)
                if (event === 'INITIAL_SESSION') {
                    return;
                }

                // Pour SIGNED_IN et SIGNED_OUT
                if(!mounted) return 
                setSession(session)

                if (session && event === 'SIGNED_IN') {
                    // Connexion : charge le profil
                    console.log("SIGNED_IN détecté, chargement du profil...")
                    isFetchingProfile.current = false
                    await fetchProfile(session.user.id)
                } else if (!session && event === 'SIGNED_OUT') {
                    // Déconnexion : nettoie le profil
                    console.log("SIGNED_OUT détecté")
                    setProfile(null)
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

    // Fonction pour récupérer le profil
    const fetchProfile = async (userId: string) => {
        
        console.log("Etape Fetch profile", userId)
        console.log("isFetchingProfile current true or false ?", isFetchingProfile.current)

        if(isFetchingProfile.current) {
            console.log("fetch profile déjà en cours, ignoré")
            return
        }

        isFetchingProfile.current = true

        try {
            console.log("etape try catch debug")

            const { data, error } = await supabase
                .from("profiles")
                .select('*')
                .eq('id', userId)
                .single();

            console.log("Fetch profile data:", error, data)

            if (error) {
                console.error("Erreur profil:", error.message);
                setProfile(null);
            } else if (!data) {
                console.warn("Aucun profil trouvé");
                setProfile(null);
            } else {
                console.log("etape try catch debug 2")
                setProfile(data);
            }

        } catch (error) {
            console.error("Erreur fetchProfile:", error);
            setProfile(null);
        } finally {
            isFetchingProfile.current = false
            setIsLoading(false);
        }
    };

    // fonction de deconnexion
    const signOut = async () => {
        try {
            await supabase.auth.signOut();
        } catch (error) {
            console.error("Erreur déconnexion:", error);
        }
    };

    const value: AuthContextType = {
        session,
        user: session?.user ?? null,
        profile,
        isLoading,
        isAuthenticated: !!session,
        signOut
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

