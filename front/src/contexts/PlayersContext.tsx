import { createContext, useContext, type ReactNode } from "react";
import { useAdminPlayers } from "@/hooks/useAdminPlayers";
import type { PlayersContextType } from "@/types/player";

const PlayersContext = createContext<PlayersContextType | undefined>(undefined);

export function PlayersProvider({ children }: { children: ReactNode }) {
    const playersData = useAdminPlayers();
    
    return (
        <PlayersContext.Provider value={playersData}>
            {children}
        </PlayersContext.Provider>
    );
}

// Hook
/* eslint-disable react-refresh/only-export-components */
export function usePlayers(): PlayersContextType {
    const context = useContext(PlayersContext);
    if (context === undefined) {
        throw new Error('usePlayers must be used within a PlayersProvider');
    }
    return context;
}