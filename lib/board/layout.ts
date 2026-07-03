import type { CellData, PlayerColor } from "./types";
import { BOARD_SIZE, getGridNumber, getGridCoord } from "./grid";
import { getTrackCoord, getTrackNumber } from "./track";

const SIZE = BOARD_SIZE;

/** Casilla de salida — donde cada color entra al camino (lado opuesto a su base) */
const EXIT_CELLS: Record<string, PlayerColor> = {
  "2,6": "red",
  "6,12": "green",
  "12,8": "blue",
  "8,2": "yellow",
};

/** SAFE — por número del recorrido ↺ (como antes) */
const SAFE_BY_TRACK: Record<number, PlayerColor> = {
  41: "green",
  3: "red",
  15: "yellow",
  28: "blue",
};

/** Solo color de zona (camino de llegada), sin etiqueta SAFE */
const COLORED_HOME_BY_GRID: Record<number, PlayerColor> = {
  111: "yellow",
  115: "green",
  143: "blue",
};

function buildSafeCells(): Record<string, PlayerColor> {
  const cells: Record<string, PlayerColor> = {};
  for (const [num, color] of Object.entries(SAFE_BY_TRACK)) {
    const coord = getTrackCoord(Number(num));
    if (coord) cells[`${coord[0]},${coord[1]}`] = color;
  }
  return cells;
}

function buildColoredHomeCells(): Record<string, PlayerColor> {
  const cells: Record<string, PlayerColor> = {};
  for (const [num, color] of Object.entries(COLORED_HOME_BY_GRID)) {
    const coord = getGridCoord(Number(num));
    if (coord) cells[`${coord[0]},${coord[1]}`] = color;
  }
  return cells;
}

const WHITE_ABOVE_SAFE_TRACK = new Set([42, 14]);
const WHITE_PATH_CELLS = new Set(["4,6"]);
/** Casillas forzadas a camino blanco por número del tablero */
const WHITE_PATH_BY_GRID = new Set([97, 99, 127, 129]);

function isForcedWhitePath(key: string, gridNumber: number): boolean {
  return WHITE_PATH_CELLS.has(key) || WHITE_PATH_BY_GRID.has(gridNumber);
}

function buildHomeAboveSafe(): Record<string, PlayerColor> {
  const cells: Record<string, PlayerColor> = {};
  for (const [num, color] of Object.entries(SAFE_BY_TRACK)) {
    const coord = getTrackCoord(Number(num));
    if (!coord) continue;
    const aboveR = coord[0] - 1;
    const aboveC = coord[1];
    const aboveKey = `${aboveR},${aboveC}`;
    const aboveTrack = getTrackNumber(aboveR, aboveC);
    if (aboveTrack !== undefined && WHITE_ABOVE_SAFE_TRACK.has(aboveTrack)) {
      continue;
    }
    if (WHITE_PATH_CELLS.has(aboveKey)) continue;
    cells[aboveKey] = color;
  }
  return cells;
}

const SAFE_CELLS = buildSafeCells();
const COLORED_HOME_CELLS = buildColoredHomeCells();
const HOME_ABOVE_SAFE = buildHomeAboveSafe();

function isBase(r: number, c: number): PlayerColor | null {
  if (r < 6 && c < 6) return "red";
  if (r < 6 && c > 8) return "green";
  if (r > 8 && c < 6) return "yellow";
  if (r > 8 && c > 8) return "blue";
  return null;
}

function isCenter(r: number, c: number): boolean {
  return r >= 6 && r <= 8 && c >= 6 && c <= 8;
}

function centerTriangle(r: number, c: number): PlayerColor | null {
  if (!isCenter(r, c)) return null;
  if (r === 6 && c === 6) return "red";
  if (r === 6 && c === 8) return "green";
  if (r === 8 && c === 6) return "yellow";
  if (r === 8 && c === 8) return "blue";
  if (r === 7 && c === 7) return null; // centro neutro
  // Triángulos intermedios
  if (r === 6 && c === 7) return "red";
  if (r === 7 && c === 8) return "green";
  if (r === 7 && c === 6) return "yellow";
  if (r === 8 && c === 7) return "blue";
  return null;
}

function isHomeStretch(r: number, c: number): PlayerColor | null {
  // Camino de llegada al centro — en el brazo de su color, antes de su EXIT
  if (c === 7 && r >= 1 && r <= 5) return "red";    // brazo superior
  if (r === 7 && c >= 9 && c <= 13) return "green"; // brazo derecho
  if (r === 7 && c >= 1 && c <= 5) return "yellow"; // brazo izquierdo (antes de EXIT 8,2)
  if (c === 7 && r >= 9 && r <= 13) return "blue";  // brazo inferior (antes de EXIT 12,8)
  return null;
}

function isPath(r: number, c: number): boolean {
  // Brazo vertical central
  if (c >= 6 && c <= 8 && (r < 6 || r > 8)) return true;
  // Brazo horizontal central
  if (r >= 6 && r <= 8 && (c < 6 || c > 8)) return true;
  return false;
}

/** Slots de fichas en cada base (posiciones 2x2 dentro del 6×6) */
const BASE_PIECE_SLOTS: Record<PlayerColor, [number, number][]> = {
  red: [
    [1, 1],
    [1, 4],
    [4, 1],
    [4, 4],
  ],
  green: [
    [1, 10],
    [1, 13],
    [4, 10],
    [4, 13],
  ],
  yellow: [
    [10, 1],
    [10, 4],
    [13, 1],
    [13, 4],
  ],
  blue: [
    [10, 10],
    [10, 13],
    [13, 10],
    [13, 13],
  ],
};

function getPieceSlot(r: number, c: number): number | undefined {
  for (const [color, slots] of Object.entries(BASE_PIECE_SLOTS) as [
    PlayerColor,
    [number, number][],
  ][]) {
    const idx = slots.findIndex(([sr, sc]) => sr === r && sc === c);
    if (idx !== -1) return idx;
  }
  return undefined;
}

function buildCell(r: number, c: number): CellData {
  const key = `${r},${c}`;
  const gridNumber = getGridNumber(r, c);

  const base = isBase(r, c);
  if (base) {
    const pieceSlot = getPieceSlot(r, c);
    if (pieceSlot !== undefined) {
      return { kind: "base", owner: base, pieceSlot, gridNumber };
    }
    return { kind: "void", owner: base, gridNumber };
  }

  if (isForcedWhitePath(key, gridNumber)) {
    return { kind: "path", gridNumber, trackNumber: getTrackNumber(r, c) };
  }

  const triangle = centerTriangle(r, c);
  if (triangle !== null) {
    return triangle
      ? { kind: "center", owner: triangle, gridNumber }
      : { kind: "center", gridNumber };
  }

  const safeOwner = SAFE_CELLS[key];
  if (safeOwner) {
    return {
      kind: "safe",
      owner: safeOwner,
      gridNumber,
      trackNumber: getTrackNumber(r, c),
    };
  }

  const coloredHome = COLORED_HOME_CELLS[key];
  if (coloredHome) {
    return { kind: "home", owner: coloredHome, gridNumber };
  }

  if (isForcedWhitePath(key, gridNumber)) {
    return { kind: "path", gridNumber, trackNumber: getTrackNumber(r, c) };
  }

  const homeAbove = HOME_ABOVE_SAFE[key];
  if (homeAbove) return { kind: "home", owner: homeAbove, gridNumber };

  const home = isHomeStretch(r, c);
  if (home) return { kind: "home", owner: home, gridNumber };

  if (isPath(r, c)) {
    const exitOwner = EXIT_CELLS[key];
    const trackNumber = getTrackNumber(r, c);
    if (exitOwner) {
      return { kind: "exit", owner: exitOwner, gridNumber, trackNumber };
    }
    return { kind: "path", gridNumber, trackNumber };
  }

  return { kind: "void", gridNumber };
}

export function buildBoardLayout(): CellData[][] {
  return Array.from({ length: SIZE }, (_, r) =>
    Array.from({ length: SIZE }, (_, c) => buildCell(r, c)),
  );
}

export { BOARD_SIZE } from "./grid";
