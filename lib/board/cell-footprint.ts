import { BOARD_SIZE, getGridCoord, getGridNumber } from "./grid";
import type { BasicOrientation, CornerRotation } from "./cell-shapes";
import {
  ALL_BASIC_CELLS,
  CORNER_CELLS,
  VICTORY_CELL_ANCHOR,
  basicCellSpan,
  cornerBlockSlots,
  coveredLogicalSlots,
} from "./cell-placements";

export type { CornerRotation } from "./cell-shapes";

export interface CellSpan {
  colSpan: number;
  rowSpan: number;
}

interface FootprintEntry {
  anchor: number;
  colSpan: number;
  rowSpan: number;
  basicOrientation?: BasicOrientation;
  cornerRotation?: CornerRotation;
  isVictory?: boolean;
}

const FOOTPRINT_BY_ANCHOR = new Map<number, FootprintEntry>();
const ANCHOR_BY_SLOT = new Map<string, number>();
const COVERED_SLOTS = new Set<number>();
const CORNER_ANCHORS = new Set<number>();

function registerFootprint(entry: FootprintEntry) {
  FOOTPRINT_BY_ANCHOR.set(entry.anchor, entry);
  const [r, c] = getGridCoord(entry.anchor)!;
  for (let dr = 0; dr < entry.rowSpan; dr++) {
    for (let dc = 0; dc < entry.colSpan; dc++) {
      const logical = getGridNumber(r + dr, c + dc);
      ANCHOR_BY_SLOT.set(`${r + dr},${c + dc}`, entry.anchor);
      if (dr !== 0 || dc !== 0) COVERED_SLOTS.add(logical);
    }
  }
}

for (const { anchor, orientation } of ALL_BASIC_CELLS) {
  registerFootprint({
    anchor,
    ...basicCellSpan(orientation),
    basicOrientation: orientation,
  });
}

for (const { anchor, rotation } of CORNER_CELLS) {
  CORNER_ANCHORS.add(anchor);
  registerFootprint({
    anchor,
    colSpan: 2,
    rowSpan: 2,
    cornerRotation: rotation,
  });
}

registerFootprint({
  anchor: VICTORY_CELL_ANCHOR,
  colSpan: 2,
  rowSpan: 2,
  isVictory: true,
});

function isVictoryCovered(logical: number): boolean {
  return (
    coveredLogicalSlots(VICTORY_CELL_ANCHOR, 2, 2).includes(logical) &&
    logical !== VICTORY_CELL_ANCHOR
  );
}

function isBasicOrVictoryCovered(logical: number): boolean {
  if (isVictoryCovered(logical)) return true;
  if (!COVERED_SLOTS.has(logical)) return false;
  for (const { anchor } of CORNER_CELLS) {
    if (cornerBlockSlots(anchor).includes(logical)) return false;
  }
  return true;
}

/** Numeración auxiliar para las etiquetas de los triángulos esquinales */
function buildPreCornerDisplayMap(): Map<string, number> {
  const map = new Map<string, number>();
  let display = 0;

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const logical = getGridNumber(r, c);
      if (isBasicOrVictoryCovered(logical)) continue;

      display++;
      map.set(`${r},${c}`, display);
    }
  }

  return map;
}

const PRE_CORNER_DISPLAY = buildPreCornerDisplayMap();

const CORNER_LABELS = new Map<string, readonly [number, number]>();

for (const { anchor } of CORNER_CELLS) {
  const labels = cornerBlockSlots(anchor)
    .map((logical) => {
      const [r, c] = getGridCoord(logical)!;
      return PRE_CORNER_DISPLAY.get(`${r},${c}`)!;
    })
    .sort((a, b) => a - b);
  const [r, c] = getGridCoord(anchor)!;
  CORNER_LABELS.set(`${r},${c}`, [labels[0], labels[1]]);
}

function buildDisplayNumberMap(): Map<string, number> {
  const map = new Map<string, number>();
  let display = 0;

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const logical = getGridNumber(r, c);
      if (COVERED_SLOTS.has(logical)) continue;

      if (CORNER_ANCHORS.has(logical)) {
        map.set(`${r},${c}`, CORNER_LABELS.get(`${r},${c}`)![0]);
        continue;
      }

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

export const DISPLAY_GRID_TOTAL = (() => {
  let count = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (isCellAnchor(r, c)) count++;
    }
  }
  return count;
})();

export function isCellAnchor(r: number, c: number): boolean {
  const logical = getGridNumber(r, c);
  if (COVERED_SLOTS.has(logical)) return false;
  return ANCHOR_BY_SLOT.get(`${r},${c}`) === logical || !ANCHOR_BY_SLOT.has(`${r},${c}`);
}

export function isCornerAnchor(r: number, c: number): boolean {
  return CORNER_ANCHORS.has(getGridNumber(r, c));
}

export function getCornerRotation(r: number, c: number): CornerRotation | undefined {
  return FOOTPRINT_BY_ANCHOR.get(getGridNumber(r, c))?.cornerRotation;
}

export function getCornerPartnerNumber(r: number, c: number): number | undefined {
  return CORNER_LABELS.get(`${r},${c}`)?.[1];
}

export function getBasicOrientation(
  r: number,
  c: number,
): BasicOrientation | undefined {
  return FOOTPRINT_BY_ANCHOR.get(getGridNumber(r, c))?.basicOrientation;
}

export function getCellSpan(r: number, c: number): CellSpan {
  const footprint = FOOTPRINT_BY_ANCHOR.get(getGridNumber(r, c));
  if (footprint) {
    return { colSpan: footprint.colSpan, rowSpan: footprint.rowSpan };
  }
  return { colSpan: 1, rowSpan: 1 };
}

export function isVictoryAnchor(r: number, c: number): boolean {
  return getGridNumber(r, c) === VICTORY_CELL_ANCHOR;
}

export function getDisplayGridNumber(r: number, c: number): number | undefined {
  return DISPLAY_NUMBER_MAP.get(`${r},${c}`);
}

export function displayToCoord(
  display: number,
): readonly [number, number] | undefined {
  return DISPLAY_TO_COORD.get(display);
}

export function logicalToDisplay(logical: number): number | undefined {
  const coord = getGridCoord(logical);
  if (!coord) return undefined;
  const anchor = ANCHOR_BY_SLOT.get(`${coord[0]},${coord[1]}`) ?? logical;
  const [ar, ac] = getGridCoord(anchor)!;
  return getDisplayGridNumber(ar, ac);
}

export { VICTORY_CELL_ANCHOR as VICTORY_ANCHOR };
