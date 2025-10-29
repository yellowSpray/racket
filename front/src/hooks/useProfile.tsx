import { useSession } from "@/context/SessionContext"
import { supabase } from "@/lib/supabaseClient"
import { useEffect, useState } from "react"
import type { User } from "@/types/auth"

export const useProfile = () => {
    const { session } = useSession()
    const [profile, setProfile] = useState<User | null>(null)
    const [loading, setLoading] = useState<boolean>(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if(!session) {
            setProfile(null)
            setLoading(false)
            return 
        }

        const fetchProfile = async () => {
            setLoading(true)

            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single()

            if(error) {
                console.error("Error when loading profile :", error)
                setError(error.message)
            } else {
                setProfile(data)
            }

            setLoading(false)
        }

        fetchProfile()
    }, [session])

    return { profile, loading, error }
}