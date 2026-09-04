import type { PlayerPayment } from "@/types/player"

/**
 * Libellé court d'un paiement : la série concernée.
 *
 * Une série n'a pas de nom propre, seulement un numéro. C'est ce numéro qui
 * intéresse l'admin, puisqu'un joueur paie série par série.
 */
export function paymentSeriesLabel(payment: PlayerPayment): string {
    return `Série ${payment.round_number}`
}

/**
 * Libellé complet, porté par l'infobulle et par les lecteurs d'écran.
 *
 * Deux événements peuvent avoir chacun une série 4 : le badge reste court,
 * l'infobulle dit de laquelle il s'agit et si elle est réglée.
 */
export function paymentFullLabel(payment: PlayerPayment): string {
    const state = payment.status === "paid" ? "payé" : "non payé"
    const series = `série ${payment.round_number}`
    return payment.event_name
        ? `${payment.event_name}, ${series} : ${state}`
        : `Série ${payment.round_number} : ${state}`
}
