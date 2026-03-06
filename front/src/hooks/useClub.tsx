import { supabase } from "@/lib/supabaseClient"
import { useEffect, useState } from "react"
import { logger } from "@/lib/logger"

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
            const endLog = logger.start("useClubs.fetch")
            const { data , error } = await supabase
                .from("clubs")
                .select("id, club_name, club_address, club_email")
                .order("club_name", { ascending: true })

            if(error){
                endLog({ error: error.message })
                setErrorClubs(error.message)
            } else {
                setClubs(data || [])
                endLog()
            }
            setLoadingClubs(false)
        }
        fetchClubs()

    }, [])

    return { clubs, loadingClubs, errorClubs }
}