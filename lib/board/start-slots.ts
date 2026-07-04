import type { PlayerColor } from "./types";

/** Coordenadas del tablero para cada casilla de inicio (bloque 2×2 por jugador) */
export const START_PIECE_SLOTS: Record<PlayerColor, [number, number][]> = {
  red: [
    [1, 1],
    [1, 2],
    [2, 1],
    [2, 2],
  ],
  green: [
    [1, 11],
    [1, 12],
    [2, 11],
    [2, 12],
  ],
  yellow: [
    [11, 1],
    [11, 2],
    [12, 1],
    [12, 2],
  ],
  blue: [
    [11, 11],
    [11, 12],
    [12, 11],
    [12, 12],
  ],
};

/** Ancla lógica de la casilla de salida al camino por jugador */
export const PATH_EXIT_ANCHORS: Record<PlayerColor, number> = {
  red: 33,
  green: 68,
  yellow: 115,
  blue: 163,
};

export function getStartSlotIndex(
  player: PlayerColor,
  row: number,
  col: number,
): number | undefined {
  const index = START_PIECE_SLOTS[player].findIndex(
    ([r, c]) => r === row && c === col,
  );
  return index === -1 ? undefined : index;
}
