import type { CellShape, CornerRotation, BasicOrientation, MovementLabelOrientation } from "./cell-shapes";

export type {
  CellShape,
  CornerRotation,
  TriangleCorner,
  BasicOrientation,
  MovementLabelOrientation,
  SafeLabelOrientation,
} from "./cell-shapes";
export {
  CORNER_ROTATION_LAYOUT,
  getCornerRotationLayout,
  getBasicSpan,
  getMovementLabelRotation,
  getSafeLabelRotation,
} from "./cell-shapes";

export type PlayerColor = "red" | "green" | "yellow" | "blue";

export type CellKind =
  | "void"
  | "base"
  | "path"
  | "home"
  | "center"
  | "victory"
  | "decoration"
  | "exit";

/** Estado de una celda de salida (ficha en base) */
export type ExitCellState = "empty" | "occupied";

export interface ExitCellData {
  state: ExitCellState;
  /** Índice de la ficha dentro de la base (0–3) */
  slot: number;
  /** Rotación del texto EXIT (solo casillas de salida al camino) */
  labelOrientation?: MovementLabelOrientation;
}

/** Modo SAFE — hereda de basic o corner */
export interface SafeCellData {
  owner: PlayerColor;
  /** Rotación del texto SAFE: down · right · up · left */
  labelOrientation: MovementLabelOrientation;
}

/** Rol funcional de la celda en el tablero */
export type CellRole = "movement" | "decoration" | "victory";

/** Datos compartidos por celdas que heredan MovementCell */
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
  /** Rol: movement · decoration · victory */
  role: CellRole;
  /** Forma física: basic · corner · decoration */
  shape: CellShape;
  kind: CellKind;
  owner?: PlayerColor;
  /** Datos de movimiento — presente en role "movement" y "victory" */
  movement?: MovementCellData;
  /** Modo SAFE (solo basic o corner) */
  safe?: SafeCellData;
  /** Celda de salida — solo basic */
  exit?: ExitCellData;
  /** Número visible del tablero (solo celdas de movimiento) */
  gridNumber: number;
  colSpan?: number;
  rowSpan?: number;
  corner?: CornerCellData;
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

/** Orden de equipos en el tablero (↺ desde rojo) */
export const PLAYER_ORDER: PlayerColor[] = ["red", "green", "yellow", "blue"];

export const VICTORY_COLOR = {
  fill: "#8d6e4a",
  dark: "#6b4f35",
  label: "Victoria",
};
