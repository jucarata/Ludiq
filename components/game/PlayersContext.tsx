"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { PlayerColor } from "@/lib/board/types";
import { isBotPlayer } from "@/lib/game/player-config";

interface PlayersContextValue {
  activePlayers: PlayerColor[];
  botPlayers: PlayerColor[];
  isBot: (color: PlayerColor) => boolean;
}

const PlayersContext = createContext<PlayersContextValue | null>(null);

export function PlayersProvider({
  activePlayers,
  botPlayers,
  children,
}: {
  activePlayers: PlayerColor[];
  botPlayers: PlayerColor[];
  children: ReactNode;
}) {
  const value = useMemo(
    () => ({
      activePlayers,
      botPlayers,
      isBot: (color: PlayerColor) => isBotPlayer(botPlayers, color),
    }),
    [activePlayers, botPlayers],
  );

  return (
    <PlayersContext.Provider value={value}>{children}</PlayersContext.Provider>
  );
}

function usePlayersContext(): PlayersContextValue {
  const value = useContext(PlayersContext);
  if (!value) {
    throw new Error("usePlayersContext must be used within PlayersProvider");
  }
  return value;
}

export function useActivePlayers(): PlayerColor[] {
  return usePlayersContext().activePlayers;
}

export function useBotPlayers(): PlayerColor[] {
  return usePlayersContext().botPlayers;
}

export function useIsBot(): (color: PlayerColor) => boolean {
  return usePlayersContext().isBot;
}
