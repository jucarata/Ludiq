import type { CellData, PlayerColor } from "./types";
import { BOARD_SIZE, getGridCoord, getGridNumber } from "./grid";
import { BASE_SIZE, OPP_BASE_START } from "./geometry";
import { getTrackNumber } from "./track";
import { movementCell, victoryCell } from "./cell-roles";
import {
  getCellSpan,
  getDisplayGridNumber,
  getBasicOrientation,
  isCornerAnchor,
  getCornerPartnerNumber,
  getCornerRotation,
  isVictoryAnchor,
  isCellAnchor,
  DISPLAY_GRID_TOTAL,
} from "./cell-footprint";
import { SAFE_MOVEMENT_CELLS } from "./cell-placements";

const SIZE = BOARD_SIZE;

/** Anclas lógicas de caminos de llegada coloreados (celdas básicas tamaño 2) */
const COLORED_HOME_ANCHORS: Record<number, PlayerColor> = {
  7: "red",
  21: "red",
  35: "red",
  49: "red",
  63: "red",
  77: "red",
  119: "blue",
  133: "blue",
  147: "blue",
  161: "blue",
  175: "blue",
  189: "blue",
  93: "green",
  94: "green",
  95: "green",
  96: "green",
  97: "green",
  98: "green",
  85: "yellow",
  86: "yellow",
  87: "yellow",
  88: "yellow",
  89: "yellow",
  90: "yellow",
};

function buildColoredHomeCells(): Record<string, PlayerColor> {
  const cells: Record<string, PlayerColor> = {};
  for (const [logical, color] of Object.entries(COLORED_HOME_ANCHORS)) {
    const coord = getGridCoord(Number(logical));
    if (coord) cells[`${coord[0]},${coord[1]}`] = color;
  }
  return cells;
}

const COLORED_HOME_CELLS = buildColoredHomeCells();

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
  const gridNumber = getDisplayGridNumber(r, c)!;
  const span = getCellSpan(r, c);

  const cornerRotation = isCornerAnchor(r, c)
    ? getCornerRotation(r, c)
    : undefined;

  const base = isBase(r, c);
  if (base && BASE_COLORED_AROUND.has(key)) {
    return {
      role: "decoration",
      shape: "decoration",
      kind: "decoration",
      owner: base,
      gridNumber,
    };
  }

  const shape = cornerRotation ? "corner" : "basic";
  const basicOrientation =
    shape === "basic" ? getBasicOrientation(r, c) : undefined;
  const basic = basicOrientation
    ? { orientation: basicOrientation }
    : undefined;
  const corner =
    cornerRotation !== undefined
      ? {
          partnerNumber: getCornerPartnerNumber(r, c)!,
          rotation: cornerRotation,
        }
      : undefined;

  if (base) {
    const pieceSlot = getPieceSlot(r, c);
    if (pieceSlot !== undefined) {
      return {
        role: "start",
        shape: "start",
        kind: "start",
        owner: base,
        start: { state: "occupied", slot: pieceSlot },
        gridNumber,
      };
    }
    return movementCell({
      shape,
      kind: "path",
      gridNumber,
      trackNumber,
      basic,
      corner,
      ...span,
    });
  }

  if (isVictoryAnchor(r, c)) {
    return victoryCell({
      shape: "basic",
      gridNumber,
      ...span,
    });
  }

  const logical = getGridNumber(r, c);
  const safeOwner = SAFE_MOVEMENT_CELLS[logical];
  const coloredHome = COLORED_HOME_CELLS[key];
  const owner = coloredHome ?? safeOwner;

  return movementCell({
    shape,
    kind: coloredHome ? "home" : "path",
    owner,
    gridNumber,
    trackNumber,
    safeOwner,
    basic,
    corner,
    ...span,
  });
}

export interface PlacedCell {
  row: number;
  col: number;
  cell: CellData;
}

/** Celdas visibles del tablero — cada una con tamaño fijo y posición de ancla */
export function buildBoardLayout(): PlacedCell[] {
  const placed: PlacedCell[] = [];

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (!isCellAnchor(r, c)) continue;
      placed.push({ row: r, col: c, cell: buildCell(r, c) });
    }
  }

  return placed;
}

export { BOARD_SIZE } from "./grid";
export { DISPLAY_GRID_TOTAL };
