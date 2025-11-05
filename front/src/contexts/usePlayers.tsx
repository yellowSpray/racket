import type { PlayersContextType } from "./PlayersProvider";
import { PlayersContext } from "./PlayersContext";
import { useContext } from "react";

export function usePlayers(): PlayersContextType {
    const context = useContext(PlayersContext);
    if (context === undefined) {
        throw new Error('usePlayers must be used within a PlayersProvider');
    }
    return context;
}