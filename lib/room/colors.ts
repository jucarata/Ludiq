import { PLAYER_ORDER, type PlayerColor } from "@/lib/board/types";

export function firstAvailableColor(
  taken: Iterable<PlayerColor>,
): PlayerColor | null {
  const takenSet = new Set(taken);
  return PLAYER_ORDER.find((color) => !takenSet.has(color)) ?? null;
}

export function availableColors(
  taken: Iterable<PlayerColor>,
): PlayerColor[] {
  const takenSet = new Set(taken);
  return PLAYER_ORDER.filter((color) => !takenSet.has(color));
}
