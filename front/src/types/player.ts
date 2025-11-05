export type PlayerType = {
    id: string
    first_name: string
    last_name: string
    email: string
    phone: string
    arrival: string
    departure: string
    unavailable: string[]
    status: ("active" | "inactive" | "member" | "visitor" | "paid" | "unpaid" )[]
    power_ranking: string
}