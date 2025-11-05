import { createContext } from "react";
import type { PlayersContextType } from "./PlayersProvider";

export const PlayersContext = createContext<PlayersContextType | undefined>(undefined);
