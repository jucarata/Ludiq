import type { PlayerColor } from "@/lib/board/types";

export interface GameSetup {
  activePlayers: PlayerColor[];
  botPlayers: PlayerColor[];
}

export const MIN_PLAYERS = 2;
export const MAX_BOTS = 3;
export const MIN_HUMANS = 1;

export function isBotPlayer(
  botPlayers: PlayerColor[],
  color: PlayerColor,
): boolean {
  return botPlayers.includes(color);
}
