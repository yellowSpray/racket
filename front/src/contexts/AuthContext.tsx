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

        console.log("🔵 [AuthContext] useEffect mount")
        let mounted = true
        let isInitializing = true  // ✅ Flag pour éviter le double fetch

        // Récupère la session initiale
        const initializeAuth = async () => {
            console.log("🟢 [AuthContext] initializeAuth START")
            try {
                const { data: { session }, error } = await supabase.auth.getSession()

                if (error) {
                    console.error("🔴 [AuthContext] Erreur getSession:", error)
                    setIsLoading(false)
                    return;
                }
                
                console.log("🟡 [AuthContext] Session récupérée:", session ? "OUI" : "NON")
                
                if(!mounted) {
                    console.log("⚪ [AuthContext] Component unmounted, arrêt")
                    return
                }
                
                setSession(session)

                if (session) {
                    console.log("🟢 [AuthContext] Session présente, fetch profile...")
                    await fetchProfile(session.user.id)
                } else {
                    console.log("🟡 [AuthContext] Pas de session, isLoading = false")
                    setIsLoading(false)
                }
                
                console.log("✅ [AuthContext] initializeAuth DONE")
                isInitializing = false  // ✅ Init terminée
            } catch (error) {
                console.error("🔴 [AuthContext] Erreur session initiale:", error)
                if (mounted) setIsLoading(false)
                isInitializing = false  // ✅ Init terminée même en cas d'erreur
            }
        };

        initializeAuth();
        
        // Écoute les changements d'authentification
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {

                console.log(`🔔 [AuthContext] onAuthStateChange: ${event}, isInitializing: ${isInitializing}`)

                // Ignore TOKEN_REFRESHED
                if (event === 'TOKEN_REFRESHED') {
                    console.log("⏭️ [AuthContext] TOKEN_REFRESHED ignoré")
                    if (mounted) setSession(session)
                    return;
                }
                
                // Ignore INITIAL_SESSION
                if (event === 'INITIAL_SESSION') {
                    console.log("⏭️ [AuthContext] INITIAL_SESSION ignoré")
                    return;
                }

                // ✅ Ignore SIGNED_IN pendant l'initialisation (évite double fetch)
                if (event === 'SIGNED_IN' && isInitializing) {
                    console.log("⏭️ [AuthContext] SIGNED_IN ignoré (init en cours)")
                    return;
                }

                // Pour SIGNED_IN et SIGNED_OUT
                if(!mounted) {
                    console.log("⚪ [AuthContext] Component unmounted, arrêt onAuthStateChange")
                    return 
                }
                
                setSession(session)

                if (session && event === 'SIGNED_IN') {
                    // Connexion : charge le profil (seulement après init)
                    console.log("🟢 [AuthContext] SIGNED_IN détecté (après init), chargement du profil...")
                    isFetchingProfile.current = false
                    await fetchProfile(session.user.id)
                } else if (!session && event === 'SIGNED_OUT') {
                    // Déconnexion : nettoie le profil
                    console.log("🔴 [AuthContext] SIGNED_OUT détecté")
                    setProfile(null)
                    isFetchingProfile.current = false
                    setIsLoading(false)
                }
            }
        );
        
        // cleanup
        return () => {
            console.log("🔵 [AuthContext] useEffect cleanup")
            mounted = false
            subscription.unsubscribe()
        }

    },[])

    // Fonction pour récupérer le profil
    const fetchProfile = async (userId: string) => {
        
        console.log("📝 [fetchProfile] START - userId:", userId)
        console.log("📝 [fetchProfile] isFetchingProfile.current:", isFetchingProfile.current)

        if(isFetchingProfile.current) {
            console.log("⏭️ [fetchProfile] déjà en cours, ignoré")
            return
        }

        isFetchingProfile.current = true
        console.log("🟢 [fetchProfile] isFetchingProfile = true")

        try {
            console.log("🔍 [fetchProfile] Query Supabase...")

            const { data, error } = await supabase
                .from("profiles")
                .select('*')
                .eq('id', userId)
                .single();

            console.log("📊 [fetchProfile] Résultat - error:", error, "data:", data ? "OUI" : "NON")

            if (error) {
                console.error("🔴 [fetchProfile] Erreur:", error.message);
                setProfile(null);
            } else if (!data) {
                console.warn("⚠️ [fetchProfile] Aucun profil trouvé");
                setProfile(null);
            } else {
                console.log("✅ [fetchProfile] Profil trouvé, setProfile...")
                setProfile(data);
            }

        } catch (error) {
            console.error("🔴 [fetchProfile] Erreur catch:", error);
            setProfile(null);
        } finally {
            console.log("🏁 [fetchProfile] Finally - isFetchingProfile = false, isLoading = false")
            isFetchingProfile.current = false
            setIsLoading(false);
        }
    };

    // fonction de deconnexion
    const signOut = async () => {
        console.log("🚪 [signOut] Déconnexion...")
        try {
            await supabase.auth.signOut();
        } catch (error) {
            console.error("🔴 [signOut] Erreur:", error);
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

    console.log("🎨 [AuthContext] Render - isLoading:", isLoading, "session:", session ? "OUI" : "NON", "profile:", profile ? "OUI" : "NON")

    // affiche le loader
    if (isLoading) {
        console.log("⏳ [AuthContext] Affichage Loading...")
        return <Loading />;
    }

    console.log("✅ [AuthContext] Render children")
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