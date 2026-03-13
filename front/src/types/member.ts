export interface ClubMember {
    id: string
    first_name: string
    last_name: string
    email: string
    phone: string
    role: 'user' | 'admin' | 'superadmin'
    is_linked: boolean | null
    created_at: string
}
