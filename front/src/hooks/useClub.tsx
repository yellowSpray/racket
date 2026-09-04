import { supabase } from "@/lib/supabaseClient"
import { useEffect, useState } from "react"
import { logger } from "@/lib/logger"

/**
 * Vue publique d'un club : ce qu'un visiteur non connecte a le droit de lire.
 * L'adresse et l'email sont reserves aux utilisateurs connectes, et n'etaient
 * de toute facon affiches nulle part.
 */
type Club = {
    id: string,
    club_name: string,
}

/**
 * Récupère la liste de tous les clubs au montage.
 * Retourne les clubs triés par nom avec l'état de chargement et les erreurs.
 */
export const useClubs = () => {

    const [clubs, setClubs] = useState<Club[]>([])
    const [loadingClubs, setLoadingClubs] = useState<boolean>(true)
    const [errorClubs, setErrorClubs] = useState<string | null>(null)

    // charger les clubs au montage
    useEffect(() => {
        const fetchClubs = async () => {
            setLoadingClubs(true)
            const endLog = logger.start("useClubs.fetch")

            // récupérer les clubs triés par nom
            const { data , error } = await supabase
                .from("clubs")
                .select("id, club_name")
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