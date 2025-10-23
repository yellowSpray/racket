import { useSession } from "@/context/SessionContext"
import { supabase } from "@/lib/supabaseClient"
import Loading from "@/pages/Loading"
import { useEffect, useState } from "react"
import { Navigate } from "react-router"


export const RedirectByRole = () => {

    const { session } = useSession()
    const [role, setRole] = useState<string | null>(null)
    const [loading, setLoading] = useState<boolean>(true)


    useEffect(() => {
        const fetchRole = async () => {
            if (!session) {
                setLoading(false)
                return
            }
        
            const {data , error} = await supabase
                .from("profiles")
                .select("role")
                .eq("id", session?.user.id)
                .single()

            if(error) {
                console.error("Error role :", error)
            }    

            setRole(data?.role ?? null)
            setLoading(false)
        }

        fetchRole()
    }, [session])

    if(loading) return <Loading />
    if(!role) return <Navigate to="/" replace />

    switch (role) {
        case "admin":
            return <Navigate to="/admin" replace />
            break;
    
        default:
            return <Navigate to="/user" replace />
    }
}