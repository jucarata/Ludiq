import { BOARD_SIZE, getGridNumber, getGridCoord } from "./grid";

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

/**
 * Bloques 2×2 — primer número es la esquina superior izquierda (primaria).
 * Casillas de victoria del centro: 91, 92, 105, 106.
 */
export const MERGED_BLOCKS: readonly (readonly [number, number, number, number])[] = [
  [91, 92, 105, 106],
] as const;

export type MergeOrientation = "horizontal" | "vertical" | "block";
export type MergeRole = "primary" | "secondary" | null;

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

const MERGE_SECONDARY = new Set<number>();
const MERGE_PRIMARY = new Set<number>();
const MERGE_ORIENTATION = new Map<number, MergeOrientation>();

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

const ABSORBED_CELLS = MERGED_PAIRS.length + MERGED_BLOCKS.length * 3;

function buildDisplayNumberMap(): Map<string, number> {
  const map = new Map<string, number>();
  let display = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const logical = getGridNumber(r, c);
      if (MERGE_SECONDARY.has(logical)) continue;
      display++;
      map.set(`${r},${c}`, display);
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

export function getMergeOrientation(r: number, c: number): MergeOrientation | null {
  const logical = getGridNumber(r, c);
  return MERGE_ORIENTATION.get(logical) ?? null;
}

export function getMergeSpan(r: number, c: number): MergeSpan {
  const orientation = getMergeOrientation(r, c);
  if (orientation === "horizontal") return { colSpan: 2 };
  if (orientation === "vertical") return { rowSpan: 2 };
  if (orientation === "block") return { colSpan: 2, rowSpan: 2 };
  return {};
}

export function getDisplayGridNumber(r: number, c: number): number | undefined {
  return DISPLAY_NUMBER_MAP.get(`${r},${c}`);
}

/** Convierte número lógico (pre-unión, 1–196) a número visible del tablero */
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

/** Números lógicos que forman el bloque de victoria 2×2 */
export const VICTORY_BLOCK = MERGED_BLOCKS[0];

export function isVictoryLogical(logical: number): boolean {
  return (VICTORY_BLOCK as readonly number[]).includes(logical);
}
