export const BOARD_SIZE = 14;

/** Esquina de base (5×5 en cada rincón) */
export const BASE_SIZE = 5;

/** Primera fila/columna de la base opuesta (14 − 5) */
export const OPP_BASE_START = BOARD_SIZE - BASE_SIZE;

/** Centro 3×3 del tablero */
export const CENTER_START = BASE_SIZE;
export const CENTER_END = BASE_SIZE + 2;
export const CENTER_MID = BASE_SIZE + 1;

/** Centro de la celda de victoria (2×2) en coordenadas locales del tablero. */
export function getVictoryCellCenter(boardSize: {
  width: number;
  height: number;
}): { x: number; y: number } {
  return { x: boardSize.width / 2, y: boardSize.height / 2 };
}
