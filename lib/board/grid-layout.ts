import { BOARD_SIZE, CENTER_MID } from "./geometry";

/** Casillas de la cruz central de colores (tamaño normal) */
export const CROSS_GRID_CELLS = new Set([
  7, 21, 35, 49, 63, 77, 91, 106, 107, 108, 109, 110, 111, 112, 119, 133,
  147, 161, 175, 189, 98, 99, 100, 101, 102, 103, 104, 105,
]);

export function isCrossCell(gridNumber: number): boolean {
  return CROSS_GRID_CELLS.has(gridNumber);
}

/** Columnas visuales: 5×2 + 1 + 5×2 = 21 (bases) + brazos */
export const VISUAL_COLUMNS = CENTER_MID * 2 + 1 + (BOARD_SIZE - CENTER_MID - 1) * 2;

/** Posición en el grid visual para la columna lógica */
export function getVisualColumnPlacement(col: number): {
  start: number;
  span: number;
} {
  if (col === CENTER_MID) return { start: CENTER_MID * 2 + 1, span: 1 };
  if (col < CENTER_MID) return { start: col * 2 + 1, span: 2 };
  return { start: (col - CENTER_MID - 1) * 2 + CENTER_MID * 2 + 2, span: 2 };
}

export const BOARD_ASPECT_RATIO = `${VISUAL_COLUMNS} / ${BOARD_SIZE}`;
