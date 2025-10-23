import { useSession } from "@/context/SessionContext"
import { supabase } from "@/lib/supabaseClient"
import Loading from "@/pages/Loading"
import { useEffect, useState } from "react"
import { Navigate, Outlet } from "react-router"

type ProtectedRouteProps = {
    allowedRoles?: string[]
}

const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {

    const { session } = useSession()
    const [userRole, setUserRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRole = async () => {
            if(!session) return setLoading(false)

            const { data, error } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', session.user.id)
                .single()

            if (error) {
                console.error('Error fecthing role : ', error)
            }

            setUserRole(data?.role || null)
            setLoading(false)
        }

        fetchRole()
    }, [session])

    if(loading) return <Loading />   
    if(!session) return <Navigate to="/auth" replace />
    if(!userRole) return <Navigate to="/" replace />

    if(allowedRoles && !allowedRoles.includes(userRole)) return <Navigate to="/" replace />
    
    return <Outlet />
}

export default ProtectedRoute