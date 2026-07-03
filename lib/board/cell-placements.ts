import { getGridCoord, getGridNumber } from "./grid";
import type { BasicOrientation } from "./cell-shapes";
import type { CornerRotation, MovementLabelOrientation } from "./cell-shapes";
import type { PlayerColor } from "./types";

/** Celda de movimiento en modo SAFE */
export interface SafeMovementSpec {
  owner: PlayerColor;
  label: MovementLabelOrientation;
}

/** Celdas de movimiento en modo SAFE — ancla lógica → jugador + rotación del texto */
export const SAFE_MOVEMENT_CELLS: Record<number, SafeMovementSpec> = {
  7: { owner: "red", label: "up" },
  85: { owner: "yellow", label: "right" },
  98: { owner: "green", label: "left" },
  189: { owner: "blue", label: "down" },
};

/**
 * Casillas de salida al camino — ancla lógica → jugador + rotación EXIT.
 * Display: 27 rojo · 51 verde · 70 amarillo · 95 azul
 */
export interface ExitMovementSpec {
  owner: PlayerColor;
  label: MovementLabelOrientation;
}

export const EXIT_MOVEMENT_CELLS: Record<number, ExitMovementSpec> = {
  33: { owner: "red", label: "up" },
  68: { owner: "green", label: "left" },
  115: { owner: "yellow", label: "right" },
  163: { owner: "blue", label: "down" },
};

/** Celda básica de movimiento — rectángulo 2×1 con orientación fija */
export interface BasicCellSpec {
  anchor: number;
  orientation: BasicOrientation;
}

/** Caminos de llegada coloreados */
export const COLORED_HOME_BASIC_CELLS: readonly BasicCellSpec[] = [
  { anchor: 7, orientation: "horizontal" },
  { anchor: 21, orientation: "horizontal" },
  { anchor: 35, orientation: "horizontal" },
  { anchor: 49, orientation: "horizontal" },
  { anchor: 63, orientation: "horizontal" },
  { anchor: 77, orientation: "horizontal" },
  { anchor: 119, orientation: "horizontal" },
  { anchor: 133, orientation: "horizontal" },
  { anchor: 147, orientation: "horizontal" },
  { anchor: 161, orientation: "horizontal" },
  { anchor: 175, orientation: "horizontal" },
  { anchor: 189, orientation: "horizontal" },
  { anchor: 93, orientation: "vertical" },
  { anchor: 94, orientation: "vertical" },
  { anchor: 95, orientation: "vertical" },
  { anchor: 96, orientation: "vertical" },
  { anchor: 97, orientation: "vertical" },
  { anchor: 98, orientation: "vertical" },
  { anchor: 85, orientation: "vertical" },
  { anchor: 86, orientation: "vertical" },
  { anchor: 87, orientation: "vertical" },
  { anchor: 88, orientation: "vertical" },
  { anchor: 89, orientation: "vertical" },
  { anchor: 90, orientation: "vertical" },
] as const;

/** Bloques de camino blanco — cambiar `orientation` rota todas las celdas del bloque */
const PATH_BASIC_CELL_BLOCKS: readonly {
  orientation: BasicOrientation;
  rows: readonly number[];
  cols: readonly number[];
}[] = [
  { orientation: "vertical", rows: [4, 5], cols: [0, 1, 2, 3] },
  { orientation: "vertical", rows: [4, 5], cols: [10, 11, 12, 13] },
  { orientation: "vertical", rows: [8, 9], cols: [0, 1, 2, 3] },
  { orientation: "vertical", rows: [8, 9], cols: [10, 11, 12, 13] },
  { orientation: "horizontal", rows: [0, 1, 2, 3], cols: [4, 5] },
  { orientation: "horizontal", rows: [0, 1, 2, 3], cols: [8, 9] },
  { orientation: "horizontal", rows: [10, 11, 12, 13], cols: [4, 5] },
  { orientation: "horizontal", rows: [10, 11, 12, 13], cols: [8, 9] },
] as const;

function pathBasicCellSpecs(): BasicCellSpec[] {
  const specs: BasicCellSpec[] = [];

  for (const block of PATH_BASIC_CELL_BLOCKS) {
    if (block.orientation === "vertical") {
      const [rTop] = block.rows;
      for (const c of block.cols) {
        specs.push({ anchor: getGridNumber(rTop, c), orientation: "vertical" });
      }
      continue;
    }

    const [cLeft] = block.cols;
    for (const r of block.rows) {
      specs.push({ anchor: getGridNumber(r, cLeft), orientation: "horizontal" });
    }
  }

  return specs;
}

export const PATH_BASIC_CELLS: readonly BasicCellSpec[] = pathBasicCellSpecs();

export const ALL_BASIC_CELLS: readonly BasicCellSpec[] = [
  ...COLORED_HOME_BASIC_CELLS,
  ...PATH_BASIC_CELLS,
];

/** Celda esquinal — cuadrado 2×2 con corte diagonal */
export interface CornerCellSpec {
  anchor: number;
  rotation: CornerRotation;
}

export const CORNER_CELLS: readonly CornerCellSpec[] = [
  { anchor: 61, rotation: "down-right" },
  { anchor: 117, rotation: "down-left" },
  { anchor: 65, rotation: "down-left" },
  { anchor: 121, rotation: "down-right" },
] as const;

/** Celda de victoria — cuadrado 2×2 (tamaño 4) */
export const VICTORY_CELL_ANCHOR = 91;

export function basicCellSpan(orientation: BasicOrientation): {
  colSpan: number;
  rowSpan: number;
} {
  return orientation === "horizontal"
    ? { colSpan: 2, rowSpan: 1 }
    : { colSpan: 1, rowSpan: 2 };
}

export function coveredLogicalSlots(
  anchor: number,
  colSpan: number,
  rowSpan: number,
): number[] {
  const [r, c] = getGridCoord(anchor)!;
  const slots: number[] = [];
  for (let dr = 0; dr < rowSpan; dr++) {
    for (let dc = 0; dc < colSpan; dc++) {
      slots.push(getGridNumber(r + dr, c + dc));
    }
  }
  return slots;
}

export function cornerBlockSlots(anchor: number): number[] {
  return coveredLogicalSlots(anchor, 2, 2);
}
