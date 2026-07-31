import { PLAYER_ORDER, type PlayerColor } from "@/lib/board/types";

export const TURN_DURATION_SECONDS = 30;
export const TURN_DECISION_SECONDS = 15;
/** Short window when AFK bot takes over after a human already rolled. */
export const AFK_TAKEOVER_SECONDS = 5;
export const TURN_ANNOUNCEMENT_MS = 1500;

export type TurnPhase = "playing" | "rolling" | "deciding" | "ended";

export function nextPlayerIndex(
  index: number,
  players: PlayerColor[] = PLAYER_ORDER,
): number {
  return (index + 1) % players.length;
}

export function getPlayerAt(
  index: number,
  players: PlayerColor[] = PLAYER_ORDER,
): PlayerColor {
  return players[index];
}
