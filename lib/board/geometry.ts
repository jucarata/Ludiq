export const BOARD_SIZE = 14;

/** Esquina de base (5×5 en cada rincón) */
export const BASE_SIZE = 5;

/** Primera fila/columna de la base opuesta (14 − 5) */
export const OPP_BASE_START = BOARD_SIZE - BASE_SIZE;

/** Centro 3×3 del tablero */
export const CENTER_START = BASE_SIZE;
export const CENTER_END = BASE_SIZE + 2;
export const CENTER_MID = BASE_SIZE + 1;
