import type {
  CellData,
  CellRole,
  ExitCellData,
  MovementCellData,
  PlayerColor,
  SafeCellData,
} from "./types";

export function buildMovementData(trackNumber?: number): MovementCellData {
  return trackNumber !== undefined ? { trackNumber } : {};
}

/** Celda de movimiento — base de basic, corner, safe y exit */
export function movementCell(
  cell: Omit<CellData, "role" | "movement" | "trackNumber"> & {
    trackNumber?: number;
  },
): CellData {
  const { trackNumber, ...rest } = cell;
  return {
    ...rest,
    role: "movement",
    movement: buildMovementData(trackNumber),
  };
}

/** Celda de victoria — hereda de movimiento (centro, corona, café) */
export function victoryCell(
  cell: Omit<CellData, "role" | "kind" | "movement" | "trackNumber"> & {
    trackNumber?: number;
  },
): CellData {
  const { trackNumber, ...rest } = cell;
  return {
    ...rest,
    role: "victory",
    kind: "victory",
    movement: buildMovementData(trackNumber),
  };
}

export function isMovementCell(
  cell: CellData,
): cell is CellData & { role: "movement"; movement: MovementCellData } {
  return cell.role === "movement";
}

export function isVictoryCell(
  cell: CellData,
): cell is CellData & { role: "victory"; movement: MovementCellData } {
  return cell.role === "victory";
}

/** SAFE — hereda de basic o corner */
export function isSafeCell(
  cell: CellData,
): cell is CellData & { role: "movement"; safe: SafeCellData } {
  return cell.role === "movement" && cell.safe !== undefined;
}

/** Casilla de inicio — ficha en el bloque 2×2 de cada jugador */
export function isStartCell(
  cell: CellData,
): cell is CellData & { role: "movement"; exit: ExitCellData; owner: PlayerColor } {
  return (
    cell.role === "movement" &&
    cell.exit?.role === "start" &&
    cell.owner !== undefined
  );
}

/** Casilla de salida al camino — hereda de basic */
export function isPathExitCell(
  cell: CellData,
): cell is CellData & { role: "movement"; exit: ExitCellData; owner: PlayerColor } {
  return (
    cell.role === "movement" &&
    cell.exit?.role === "path" &&
    cell.owner !== undefined
  );
}

/** Salida — inicio o camino */
export function isExitCell(
  cell: CellData,
): cell is CellData & { role: "movement"; exit: ExitCellData; owner: CellData["owner"] } {
  return cell.role === "movement" && cell.exit !== undefined;
}

export function roleForKind(kind: CellData["kind"]): CellRole {
  if (kind === "decoration") return "decoration";
  if (kind === "victory") return "victory";
  return "movement";
}
