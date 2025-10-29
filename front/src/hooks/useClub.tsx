import { supabase } from "@/lib/supabaseClient"
import { useEffect, useState } from "react"

type Club = {
    id: string,
    club_name: string,
    club_adress?: string,
    club_email?: string
}

export const useClubs = () => {

    const [clubs, setClubs] = useState<Club[]>([])
    const [loadingClubs, setLoadingClubs] = useState<boolean>(true)
    const [errorClubs, setErrorClubs] = useState<string | null>(null)

    useEffect(() => {
        const fetchClubs = async () => {
            setLoadingClubs(true)
            const { data , error } = await supabase
                .from("clubs")
                .select("id, club_name, club_address, club_email")
                .order("club_name", { ascending: true })
            
            if(error){
                setErrorClubs(error.message)
            } else {
                setClubs(data || [])
            }
            setLoadingClubs(false)
        }
        fetchClubs()

    }, [])

    return { clubs, loadingClubs, errorClubs }
}