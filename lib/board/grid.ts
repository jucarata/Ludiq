export const BOARD_SIZE = 15;

/** Número único 1–225: fila por fila, izquierda → derecha, arriba → abajo */
export function getGridNumber(row: number, col: number): number {
  return row * BOARD_SIZE + col + 1;
}

export function getGridCoord(
  gridNumber: number,
): readonly [number, number] | undefined {
  if (gridNumber < 1 || gridNumber > BOARD_SIZE * BOARD_SIZE) return undefined;
  const index = gridNumber - 1;
  return [Math.floor(index / BOARD_SIZE), index % BOARD_SIZE];
}

export const GRID_CELL_TOTAL = BOARD_SIZE * BOARD_SIZE;
