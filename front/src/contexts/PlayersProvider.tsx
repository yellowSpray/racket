import type { ReactNode } from 'react';
import type { PlayerType } from '@/types/player';
import { useAdminPlayers } from '@/hooks/useAdminPlayers';
import { PlayersContext } from './PlayersContext';

export interface PlayersContextType {
    players: PlayerType[];
    loading: boolean;
    error: string | null;
    addPlayer: (player: Partial<PlayerType>) => Promise<void>;
    updatePlayer: (id: string, updates: Partial<PlayerType>) => Promise<void>;
    fetchPlayer: () => Promise<void>;
}


export function PlayersProvider({ children }: { children: ReactNode }) {
    const playersData = useAdminPlayers();
    
    return (
        <PlayersContext.Provider value={playersData}>
            {children}
        </PlayersContext.Provider>
    );
}