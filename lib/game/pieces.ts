import { PLAYER_ORDER, type PlayerColor } from "@/lib/board/types";
import {
  getRouteCell,
  routeCellEquals,
  type RouteCell,
} from "@/lib/board/player-path";

export type PieceIndex = 0 | 1 | 2 | 3;

export type PieceLocation = "start" | "route";

/** Máximo de fichas por casilla (salida, básicas y triángulos esquinales) */
export const MAX_PIECES_PER_CELL = 2;

export interface PieceState {
  player: PlayerColor;
  index: PieceIndex;
  location: PieceLocation;
  /** Posición dentro del recorrido del jugador (0 = casilla de salida) */
  routeIndex?: number;
}

export function createInitialPieces(): PieceState[] {
  return PLAYER_ORDER.flatMap((player) =>
    ([0, 1, 2, 3] as PieceIndex[]).map((index) => ({
      player,
      index,
      location: "start" as const,
    })),
  );
}

export function isDiceDoubles(roll: [number, number]): boolean {
  /** Par = mismo valor en ambos dados (3+3), no números pares (2+4). */
  return roll[0] === roll[1];
}

export function hasAllPiecesInStart(
  pieces: PieceState[],
  player: PlayerColor,
): boolean {
  const playerPieces = pieces.filter((piece) => piece.player === player);
  return (
    playerPieces.length === 4 &&
    playerPieces.every((piece) => piece.location === "start")
  );
}

export function hasPiecesInStart(
  pieces: PieceState[],
  player: PlayerColor,
): boolean {
  return pieces.some(
    (piece) => piece.player === player && piece.location === "start",
  );
}

export function hasAnyPieceOutsideStart(
  pieces: PieceState[],
  player: PlayerColor,
): boolean {
  return pieces.some(
    (piece) => piece.player === player && piece.location !== "start",
  );
}

/** Casilla del recorrido donde está la ficha (solo fichas en recorrido) */
export function getPieceRouteCell(piece: PieceState): RouteCell | undefined {
  if (piece.location !== "route" || piece.routeIndex === undefined) {
    return undefined;
  }
  return getRouteCell(piece.player, piece.routeIndex);
}

/** Fichas en una celda por ancla; con `half` filtra el triángulo esquinal */
export function getPiecesAtAnchor(
  pieces: PieceState[],
  anchor: number,
  half?: 0 | 1,
): PieceState[] {
  return pieces.filter((piece) => {
    const cell = getPieceRouteCell(piece);
    if (!cell || cell.anchor !== anchor) return false;
    return half === undefined || cell.half === half;
  });
}

export function getPiecesAtRouteCell(
  pieces: PieceState[],
  cell: RouteCell,
): PieceState[] {
  return pieces.filter((piece) =>
    routeCellEquals(getPieceRouteCell(piece), cell),
  );
}

/** Saca fichas de inicio a la casilla de salida (máx. 2 por casilla) */
export function exitPiecesFromStartOnDoubles(
  pieces: PieceState[],
  player: PlayerColor,
): PieceState[] {
  const exitCell = getRouteCell(player, 0)!;
  const occupied = getPiecesAtRouteCell(pieces, exitCell).length;
  const slotsAvailable = MAX_PIECES_PER_CELL - occupied;
  if (slotsAvailable <= 0) return pieces;

  const startPieces = getPiecesAtStart(pieces, player).sort(
    (a, b) => a.index - b.index,
  );
  const exitingIndices = new Set(
    startPieces.slice(0, slotsAvailable).map((piece) => piece.index),
  );

  return pieces.map((piece) =>
    piece.player === player &&
    piece.location === "start" &&
    exitingIndices.has(piece.index)
      ? { ...piece, location: "route" as const, routeIndex: 0 }
      : piece,
  );
}

export function getPiecesAtStart(
  pieces: PieceState[],
  player: PlayerColor,
): PieceState[] {
  return pieces.filter(
    (piece) => piece.player === player && piece.location === "start",
  );
}

export function isPieceAtStartSlot(
  pieces: PieceState[],
  player: PlayerColor,
  slot: number,
): boolean {
  return pieces.some(
    (piece) =>
      piece.player === player &&
      piece.location === "start" &&
      piece.index === slot,
  );
}
