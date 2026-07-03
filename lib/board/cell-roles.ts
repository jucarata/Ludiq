import type { CellData, CellRole, MovementCellData } from "./types";

export function buildMovementData(trackNumber?: number): MovementCellData {
  return trackNumber !== undefined ? { trackNumber } : {};
}

/** Celda de movimiento — heredada por shape `basic` y `corner` */
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

export function roleForKind(kind: CellData["kind"]): CellRole {
  if (kind === "decoration") return "decoration";
  if (kind === "start") return "start";
  if (kind === "victory") return "victory";
  return "movement";
}
