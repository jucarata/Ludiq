import type { CellData, PlayerColor } from "./types";
import { BOARD_SIZE, getGridCoord, getGridNumber } from "./grid";
import { BASE_SIZE, OPP_BASE_START } from "./geometry";
import { getTrackNumber } from "./track";
import {
  getMergeRole,
  getMergeSpan,
  getDisplayGridNumber,
  isDiagonalSplitAnchor,
  getDiagonalLowerRightDisplay,
  getDiagonalSplitDirection,
  VICTORY_BLOCK,
} from "./merges";

const SIZE = BOARD_SIZE;

/** Caminos de llegada al centro — por número del tablero */
const COLORED_HOME_NUMBERS: Record<PlayerColor, readonly number[]> = {
  red: [7, 8, 21, 22, 35, 36, 49, 50, 63, 64, 77, 78],
  green: [93, 94, 95, 96, 97, 98, 107, 108, 109, 110, 111, 112],
  blue: [119, 120, 133, 134, 147, 148, 161, 162, 175, 176, 189, 190],
  yellow: [85, 86, 87, 88, 89, 90, 99, 100, 101, 102, 103, 104],
};

const COLORED_HOME_BY_GRID: Record<number, PlayerColor> = Object.fromEntries(
  Object.entries(COLORED_HOME_NUMBERS).flatMap(([color, numbers]) =>
    numbers.map((n) => [n, color as PlayerColor]),
  ),
);

function buildColoredHomeCells(): Record<string, PlayerColor> {
  const cells: Record<string, PlayerColor> = {};
  for (const [num, color] of Object.entries(COLORED_HOME_BY_GRID)) {
    const coord = getGridCoord(Number(num));
    if (coord) cells[`${coord[0]},${coord[1]}`] = color;
  }
  return cells;
}

const COLORED_HOME_CELLS = buildColoredHomeCells();

/** Casillas SAFE — por número lógico del tablero (estable ante renumeración) */
const SAFE_BY_LOGICAL: Record<number, PlayerColor> = {
  7: "red",
  85: "yellow",
  98: "green",
  189: "blue",
};

function buildSafeCells(): Record<string, PlayerColor> {
  const cells: Record<string, PlayerColor> = {};
  for (const [logical, color] of Object.entries(SAFE_BY_LOGICAL)) {
    const coord = getGridCoord(Number(logical));
    if (coord) cells[`${coord[0]},${coord[1]}`] = color;
  }
  return cells;
}

const SAFE_CELLS = buildSafeCells();

const VICTORY_ANCHOR = Math.min(...VICTORY_BLOCK);

function isBase(r: number, c: number): PlayerColor | null {
  if (r < BASE_SIZE && c < BASE_SIZE) return "red";
  if (r < BASE_SIZE && c >= OPP_BASE_START) return "green";
  if (r >= OPP_BASE_START && c < BASE_SIZE) return "yellow";
  if (r >= OPP_BASE_START && c >= OPP_BASE_START) return "blue";
  return null;
}

/** Slots de fichas en cada base (coordenadas dentro del 5×5) */
const BASE_PIECE_SLOTS: Record<PlayerColor, [number, number][]> = {
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

const NEIGHBOR_OFFSETS: readonly [number, number][] = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];

function getPieceSlot(r: number, c: number): number | undefined {
  for (const [, slots] of Object.entries(BASE_PIECE_SLOTS) as [
    PlayerColor,
    [number, number][],
  ][]) {
    const idx = slots.findIndex(([sr, sc]) => sr === r && sc === c);
    if (idx !== -1) return idx;
  }
  return undefined;
}

/** Casillas de color en la base: las que rodean el bloque 2×2 de fichas */
function buildBaseColoredAround(): Set<string> {
  const colored = new Set<string>();
  for (const [color, slots] of Object.entries(BASE_PIECE_SLOTS) as [
    PlayerColor,
    [number, number][],
  ][]) {
    for (const [sr, sc] of slots) {
      for (const [dr, dc] of NEIGHBOR_OFFSETS) {
        const r = sr + dr;
        const c = sc + dc;
        if (isBase(r, c) !== color || getPieceSlot(r, c) !== undefined) continue;
        colored.add(`${r},${c}`);
      }
    }
  }
  return colored;
}

const BASE_COLORED_AROUND = buildBaseColoredAround();

function buildCell(r: number, c: number): CellData {
  const key = `${r},${c}`;
  const trackNumber = getTrackNumber(r, c);

  if (getMergeRole(r, c) === "secondary") {
    return { shape: "basic", kind: "void", gridNumber: 0, hidden: true };
  }

  const gridNumber = getDisplayGridNumber(r, c)!;
  const span = getMergeSpan(r, c);

  const cornerRotation = isDiagonalSplitAnchor(r, c)
    ? getDiagonalSplitDirection(r, c)
    : undefined;

  const base = isBase(r, c);
  if (base && BASE_COLORED_AROUND.has(key)) {
    return {
      shape: "decoration",
      kind: "decoration",
      owner: base,
      gridNumber,
    };
  }

  const shape = cornerRotation ? "corner" : "basic";
  const corner =
    cornerRotation !== undefined
      ? {
          partnerNumber: getDiagonalLowerRightDisplay(r, c)!,
          rotation: cornerRotation,
        }
      : undefined;

  if (base) {
    const pieceSlot = getPieceSlot(r, c);
    if (pieceSlot !== undefined) {
      return {
        shape: "start",
        kind: "start",
        owner: base,
        start: { state: "occupied", slot: pieceSlot },
        gridNumber,
      };
    }
    return { shape, kind: "path", gridNumber, trackNumber, corner, ...span };
  }

  if (getGridNumber(r, c) === VICTORY_ANCHOR) {
    return { shape, kind: "victory", gridNumber, corner, ...span };
  }

  const safeOwner = SAFE_CELLS[key];
  if (safeOwner) {
    return {
      shape,
      kind: "safe",
      owner: safeOwner,
      gridNumber,
      trackNumber,
      corner,
      ...span,
    };
  }

  const coloredHome = COLORED_HOME_CELLS[key];
  if (coloredHome) {
    return { shape, kind: "home", owner: coloredHome, gridNumber, corner, ...span };
  }

  return { shape, kind: "path", gridNumber, trackNumber, corner, ...span };
}

export function buildBoardLayout(): CellData[][] {
  return Array.from({ length: SIZE }, (_, r) =>
    Array.from({ length: SIZE }, (_, c) => buildCell(r, c)),
  );
}

export { BOARD_SIZE } from "./grid";
export { DISPLAY_GRID_TOTAL } from "./merges";
