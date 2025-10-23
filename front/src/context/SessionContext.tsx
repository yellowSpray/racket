import { supabase } from "@/lib/supabaseClient";
import type { Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState } from "react";
import Loading from "@/pages/Loading";

const SessionContext = createContext<{session: Session | null}>({
    session: null
})

export const useSession = () => {
    const context = useContext(SessionContext)
    if(!context) {
        throw new Error("useSession must be used within a SessionProvider")
    }
    return context
}

export const SessionProvider = ({ children }: { children: React.ReactNode }) => {

    const [session, setSession] = useState<Session | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
                setSession(session)
                setIsLoading(false)
            }
        )

        return () => {
            subscription.unsubscribe()
        }
    }, [supabase])

    return (
        <SessionContext.Provider value={{ session }}>
            {isLoading ? <Loading /> : children}
        </SessionContext.Provider>
    )

}