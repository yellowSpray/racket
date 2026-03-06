import { PageSkeleton } from "@/components/shared/skeletons/PageSkeleton"

/**
 * Composant de chargement plein écran (auth, routes, suspense).
 * Pour les skeletons spécifiques aux pages, utiliser les composants dans skeletons/.
 */
const Loading = () => {
    return <PageSkeleton />
}

export default Loading
