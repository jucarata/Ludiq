"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { PlayerColor } from "@/lib/board/types";

interface PlayersContextValue {
  activePlayers: PlayerColor[];
}

const PlayersContext = createContext<PlayersContextValue | null>(null);

export function PlayersProvider({
  activePlayers,
  children,
}: {
  activePlayers: PlayerColor[];
  children: ReactNode;
}) {
  return (
    <PlayersContext.Provider value={{ activePlayers }}>
      {children}
    </PlayersContext.Provider>
  );
}

export function useActivePlayers(): PlayerColor[] {
  const value = useContext(PlayersContext);
  if (!value) {
    throw new Error("useActivePlayers debe usarse dentro de PlayersProvider");
  }
  return value.activePlayers;
}
