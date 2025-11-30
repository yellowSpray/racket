import type { User } from "@supabase/supabase-js";
import type { SessionData } from "react-router";

export interface UserProfile {
    id: string,
    last_name: string,
    first_name: string,
    email: string,
    phone: string,
    role: 'user' | 'admin' | 'superadmin';
    club: string,
    avatar_url?: string;
}

export interface AuthContextType {
    session: SessionData | null;
    user: User | null;
    profile: UserProfile | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    signOut: () => Promise<void>;
}
