/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, type ReactNode } from 'react';
import { useAdminPlayers } from '@/hooks/useAdminPlayers';
import type { PlayerType } from '@/types/player';

interface PlayersContextType {
    players: PlayerType[];
    loading: boolean;
    error: string | null;
    addPlayer: (player: Partial<PlayerType>) => Promise<void>;
    updatePlayer: (id: string, updates: Partial<PlayerType>) => Promise<void>;
    fetchPlayer: () => Promise<void>;
}

const PlayersContext = createContext<PlayersContextType | undefined>(undefined);

export function PlayersProvider({ children }: { children: ReactNode }) {
    const playersData = useAdminPlayers();
    
    return (
        <PlayersContext.Provider value={playersData}>
            {children}
        </PlayersContext.Provider>
    );
}

export function usePlayers(): PlayersContextType {
    const context = useContext(PlayersContext);
    if (context === undefined) {
        throw new Error('usePlayers must be used within a PlayersProvider');
    }
    return context;
}