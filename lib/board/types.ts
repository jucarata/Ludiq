export type PlayerColor = "red" | "green" | "yellow" | "blue";

export type CellKind =
  | "void"
  | "base"
  | "path"
  | "safe"
  | "home"
  | "center"
  | "victory";

export interface CellData {
  kind: CellKind;
  owner?: PlayerColor;
  /** Posición de ficha dentro de la base (0–3) */
  pieceSlot?: number;
  /** Número visible del tablero (decrementa con celdas unidas) */
  gridNumber: number;
  /** Ocupa dos columnas del grid lógico */
  colSpan?: number;
  /** Ocupa dos filas del grid lógico */
  rowSpan?: number;
  /** No se renderiza (absorbida por unión) */
  hidden?: boolean;
  /** Número en el camino blanco (↺ antihorario, solo path) */
  trackNumber?: number;
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
