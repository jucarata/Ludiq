import { PLAYER_ORDER, type PlayerColor } from "@/lib/board/types";

export const TURN_DURATION_SECONDS = 30;
export const TURN_ANNOUNCEMENT_MS = 1500;

export function nextPlayerIndex(index: number): number {
  return (index + 1) % PLAYER_ORDER.length;
}

export function getPlayerAt(index: number): PlayerColor {
  return PLAYER_ORDER[index];
}
