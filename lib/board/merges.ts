import { BOARD_SIZE, getGridNumber, getGridCoord } from "./grid";
import type { CornerRotation } from "./cell-shapes";

/** Pares [menor, mayor] — la casilla menor es la primaria y absorbe a la otra */
export const MERGED_PAIRS: readonly (readonly [number, number])[] = [
  [7, 8],
  [21, 22],
  [35, 36],
  [49, 50],
  [63, 64],
  [77, 78],
  [119, 120],
  [133, 134],
  [147, 148],
  [161, 162],
  [175, 176],
  [189, 190],
  [93, 107],
  [94, 108],
  [95, 109],
  [96, 110],
  [97, 111],
  [98, 112],
  [85, 99],
  [86, 100],
  [87, 101],
  [88, 102],
  [89, 103],
  [90, 104],
] as const;

/** Bloques 2×2 — esquina superior izquierda (número lógico) */
export const MERGED_BLOCKS: readonly (readonly [number, number, number, number])[] = [
  [91, 92, 105, 106],
] as const;

/**
 * Cuadrados 2×2 partidos en dos triángulos.
 * Esquina superior izquierda de cada cuadrado (número lógico).
 * 117 y 65 = amarillo/verde (diagonal ↙); 61 y 121 = rojo/azul (diagonal ↘).
 */
export const DIAGONAL_SPLIT_BLOCKS: readonly number[] = [61, 117, 65, 121] as const;

export type DiagonalSplitDirection = CornerRotation;
export type { CornerRotation } from "./cell-shapes";

export type MergeOrientation = "horizontal" | "vertical" | "block" | "diagonal";
export type MergeRole = "primary" | "secondary" | null;
export type TriangleHalf = "upper-left" | "lower-right";

export interface MergeSpan {
  colSpan?: number;
  rowSpan?: number;
}

function blockPrimary(numbers: readonly number[]): number {
  return numbers.reduce((best, n) => {
    const [br, bc] = getGridCoord(best)!;
    const [r, c] = getGridCoord(n)!;
    if (r < br || (r === br && c < bc)) return n;
    return best;
  });
}

function diagonalCorners(tlLogical: number): readonly [number, number, number, number] {
  const [r, c] = getGridCoord(tlLogical)!;
  return [getGridNumber(r, c), getGridNumber(r, c + 1), getGridNumber(r + 1, c), getGridNumber(r + 1, c + 1)];
}

const MERGE_SECONDARY = new Set<number>();
const MERGE_PRIMARY = new Set<number>();
const MERGE_ORIENTATION = new Map<number, MergeOrientation>();
const DIAGONAL_ANCHORS = new Set<number>();

for (const [a, b] of MERGED_PAIRS) {
  const primary = Math.min(a, b);
  const secondary = Math.max(a, b);
  const [r1, c1] = getGridCoord(primary)!;
  const [r2, c2] = getGridCoord(secondary)!;
  if (r1 !== r2 && c1 !== c2) {
    throw new Error(`Par inválido para unión: ${a} y ${b}`);
  }
  MERGE_PRIMARY.add(primary);
  MERGE_SECONDARY.add(secondary);
  MERGE_ORIENTATION.set(primary, r1 === r2 ? "horizontal" : "vertical");
}

for (const block of MERGED_BLOCKS) {
  const primary = blockPrimary(block);
  MERGE_PRIMARY.add(primary);
  MERGE_ORIENTATION.set(primary, "block");
  for (const n of block) {
    if (n !== primary) MERGE_SECONDARY.add(n);
  }
}

/** Mapa de numeración antes de absorber las esquinas diagonales */
function buildPreDiagonalDisplayMap(
  secondary: ReadonlySet<number>,
): Map<string, number> {
  const map = new Map<string, number>();
  let display = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const logical = getGridNumber(r, c);
      if (secondary.has(logical)) continue;
      display++;
      map.set(`${r},${c}`, display);
    }
  }
  return map;
}

const PRE_DIAGONAL_DISPLAY = buildPreDiagonalDisplayMap(MERGE_SECONDARY);

const DIAGONAL_UL_DISPLAY = new Map<string, number>();
const DIAGONAL_LR_DISPLAY = new Map<string, number>();
const DIAGONAL_DIRECTION = new Map<string, CornerRotation>();

const DIAGONAL_DIRECTION_BY_ANCHOR: Record<number, CornerRotation> = {
  61: "down-right",
  117: "down-left",
  65: "down-left",
  121: "down-right",
};

for (const tlLogical of DIAGONAL_SPLIT_BLOCKS) {
  const [, tr, bl, br] = diagonalCorners(tlLogical);
  MERGE_PRIMARY.add(tlLogical);
  MERGE_ORIENTATION.set(tlLogical, "diagonal");
  DIAGONAL_ANCHORS.add(tlLogical);
  MERGE_SECONDARY.add(tr);
  MERGE_SECONDARY.add(bl);
  MERGE_SECONDARY.add(br);

  const [r, c] = getGridCoord(tlLogical)!;
  const sorted = diagonalCorners(tlLogical)
    .map((logical) => {
      const [cr, cc] = getGridCoord(logical)!;
      return PRE_DIAGONAL_DISPLAY.get(`${cr},${cc}`)!;
    })
    .sort((a, b) => a - b);
  DIAGONAL_UL_DISPLAY.set(`${r},${c}`, sorted[0]);
  DIAGONAL_LR_DISPLAY.set(`${r},${c}`, sorted[1]);
  DIAGONAL_DIRECTION.set(`${r},${c}`, DIAGONAL_DIRECTION_BY_ANCHOR[tlLogical]);
}

const ABSORBED_CELLS =
  MERGED_PAIRS.length + MERGED_BLOCKS.length * 3 + DIAGONAL_SPLIT_BLOCKS.length * 2;

function buildDisplayNumberMap(): Map<string, number> {
  const map = new Map<string, number>();

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const logical = getGridNumber(r, c);
      if (MERGE_SECONDARY.has(logical)) continue;

      if (DIAGONAL_ANCHORS.has(logical)) {
        map.set(`${r},${c}`, DIAGONAL_UL_DISPLAY.get(`${r},${c}`)!);
        continue;
      }

      map.set(`${r},${c}`, PRE_DIAGONAL_DISPLAY.get(`${r},${c}`)!);
    }
  }

  return map;
}

const DISPLAY_NUMBER_MAP = buildDisplayNumberMap();

const DISPLAY_TO_COORD = new Map<number, readonly [number, number]>(
  [...DISPLAY_NUMBER_MAP.entries()].map(([key, display]) => {
    const [r, c] = key.split(",").map(Number) as [number, number];
    return [display, [r, c] as const];
  }),
);

export const DISPLAY_GRID_TOTAL = BOARD_SIZE * BOARD_SIZE - ABSORBED_CELLS;

export function displayToCoord(
  display: number,
): readonly [number, number] | undefined {
  return DISPLAY_TO_COORD.get(display);
}

export function getMergeRole(r: number, c: number): MergeRole {
  const logical = getGridNumber(r, c);
  if (MERGE_SECONDARY.has(logical)) return "secondary";
  if (MERGE_PRIMARY.has(logical)) return "primary";
  return null;
}

export function isDiagonalSplitAnchor(r: number, c: number): boolean {
  return DIAGONAL_ANCHORS.has(getGridNumber(r, c));
}

export function getDiagonalLowerRightDisplay(r: number, c: number): number | undefined {
  return DIAGONAL_LR_DISPLAY.get(`${r},${c}`);
}

export function getDiagonalSplitDirection(
  r: number,
  c: number,
): CornerRotation | undefined {
  return DIAGONAL_DIRECTION.get(`${r},${c}`);
}

export function getMergeOrientation(r: number, c: number): MergeOrientation | null {
  const logical = getGridNumber(r, c);
  return MERGE_ORIENTATION.get(logical) ?? null;
}

export function getMergeSpan(r: number, c: number): MergeSpan {
  const orientation = getMergeOrientation(r, c);
  if (orientation === "horizontal") return { colSpan: 2 };
  if (orientation === "vertical") return { rowSpan: 2 };
  if (orientation === "block" || orientation === "diagonal") {
    return { colSpan: 2, rowSpan: 2 };
  }
  return {};
}

export function getDisplayGridNumber(r: number, c: number): number | undefined {
  return DISPLAY_NUMBER_MAP.get(`${r},${c}`);
}

export function logicalToDisplay(logical: number): number | undefined {
  const coord = getGridCoord(logical);
  if (!coord) return undefined;
  if (MERGE_SECONDARY.has(logical)) {
    for (const block of MERGED_BLOCKS) {
      if (block.includes(logical as (typeof block)[number])) {
        const primary = blockPrimary(block);
        const [pr, pc] = getGridCoord(primary)!;
        return getDisplayGridNumber(pr, pc);
      }
    }
    for (const tlLogical of DIAGONAL_SPLIT_BLOCKS) {
      const [, tr, bl, br] = diagonalCorners(tlLogical);
      if ([tr, bl, br].includes(logical)) {
        const [pr, pc] = getGridCoord(tlLogical)!;
        return getDisplayGridNumber(pr, pc);
      }
    }
    const pair = MERGED_PAIRS.find(([a, b]) => a === logical || b === logical);
    if (!pair) return undefined;
    const primary = Math.min(pair[0], pair[1]);
    const primaryCoord = getGridCoord(primary);
    if (!primaryCoord) return undefined;
    return getDisplayGridNumber(primaryCoord[0], primaryCoord[1]);
  }
  return getDisplayGridNumber(coord[0], coord[1]);
}

export function isMergeSecondary(logical: number): boolean {
  return MERGE_SECONDARY.has(logical);
}

export const VICTORY_BLOCK = MERGED_BLOCKS[0];

export function isVictoryLogical(logical: number): boolean {
  return (VICTORY_BLOCK as readonly number[]).includes(logical);
}
