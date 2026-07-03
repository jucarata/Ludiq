import type { CellShape, CornerRotation, BasicOrientation } from "./cell-shapes";

export type { CellShape, CornerRotation, TriangleCorner, BasicOrientation } from "./cell-shapes";
export { CORNER_ROTATION_LAYOUT, getCornerRotationLayout, getBasicSpan } from "./cell-shapes";

export type PlayerColor = "red" | "green" | "yellow" | "blue";

export type CellKind =
  | "void"
  | "base"
  | "path"
  | "safe"
  | "home"
  | "center"
  | "victory"
  | "decoration"
  | "start";

/** Estado de una celda de inicio */
export type StartCellState = "empty" | "occupied";

export interface StartCellData {
  state: StartCellState;
  /** Índice de la ficha dentro de la base (0–3) */
  slot: number;
}

/** Rol funcional de la celda en el tablero */
export type CellRole = "movement" | "decoration" | "start" | "victory";

/** Datos compartidos por celdas que heredan MovementCell (basic, corner, victory) */
export interface MovementCellData {
  /** Posición en el camino ↺ — reservado para reglas futuras */
  trackNumber?: number;
}

export interface CornerCellData {
  /** Número visible del segundo triángulo */
  partnerNumber: number;
  /** Rotación del corte diagonal */
  rotation: CornerRotation;
}

/** Configuración de celda básica de movimiento (rectángulo 2×1) */
export interface BasicCellData {
  /** horizontal ↔ vertical — igual que rotar la celda */
  orientation: BasicOrientation;
}

export interface CellData {
  /** Rol: movement · decoration · start · victory */
  role: CellRole;
  /** Forma física: basic · corner · decoration · start */
  shape: CellShape;
  kind: CellKind;
  owner?: PlayerColor;
  /** Datos de movimiento — presente en role "movement" y "victory" */
  movement?: MovementCellData;
  /** Configuración solo para shape "start" */
  start?: StartCellData;
  /** Número visible del tablero */
  gridNumber: number;
  /** Ocupa dos columnas del grid lógico */
  colSpan?: number;
  /** Ocupa dos filas del grid lógico */
  rowSpan?: number;
  /** Configuración solo para shape "corner" */
  corner?: CornerCellData;
  /** Configuración solo para shape "basic" (rectángulos de movimiento) */
  basic?: BasicCellData;
}

export const PLAYER_COLORS: Record<
  PlayerColor,
  { fill: string; dark: string; label: string }
> = {
  red: { fill: "#e63946", dark: "#c1121f", label: "Rojo" },
  green: { fill: "#2a9d8f", dark: "#264653", label: "Verde" },
  yellow: { fill: "#f4a261", dark: "#e76f51", label: "Amarillo" },
  blue: { fill: "#457b9d", dark: "#1d3557", label: "Azul" },
};

export const VICTORY_COLOR = {
  fill: "#8d6e4a",
  dark: "#6b4f35",
  label: "Victoria",
};
