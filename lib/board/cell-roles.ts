import type { CellData, CellRole, MovementCellData, PlayerColor } from "./types";

export function buildMovementData(
  trackNumber?: number,
  safeOwner?: PlayerColor,
): MovementCellData {
  return {
    ...(trackNumber !== undefined && { trackNumber }),
    ...(safeOwner !== undefined && { safeOwner }),
  };
}

/** Celda de movimiento — heredada por shape `basic` y `corner` */
export function movementCell(
  cell: Omit<CellData, "role" | "movement" | "trackNumber" | "safeOwner"> & {
    trackNumber?: number;
    safeOwner?: PlayerColor;
  },
): CellData {
  const { trackNumber, safeOwner, ...rest } = cell;
  return {
    ...rest,
    role: "movement",
    movement: buildMovementData(trackNumber, safeOwner),
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

/** Celda de movimiento en modo SAFE (basic o corner) */
export function isSafeMovementCell(
  cell: CellData,
): cell is CellData & { role: "movement"; movement: { safeOwner: PlayerColor } } {
  return cell.role === "movement" && cell.movement?.safeOwner !== undefined;
}

export function roleForKind(kind: CellData["kind"]): CellRole {
  if (kind === "decoration") return "decoration";
  if (kind === "start") return "start";
  if (kind === "victory") return "victory";
  return "movement";
}
