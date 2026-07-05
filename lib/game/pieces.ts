import { PLAYER_ORDER, type PlayerColor } from "@/lib/board/types";
import {
  getRouteCell,
  routeCellEquals,
  type RouteCell,
} from "@/lib/board/player-path";

export type PieceIndex = 0 | 1 | 2 | 3;

export type PieceLocation = "start" | "route" | "finished";

/** Máximo de fichas por casilla (salida, básicas y triángulos esquinales) */
export const MAX_PIECES_PER_CELL = 2;

export interface PieceState {
  player: PlayerColor;
  index: PieceIndex;
  location: PieceLocation;
  /** Posición dentro del recorrido del jugador (0 = casilla de salida) */
  routeIndex?: number;
}

export function createInitialPieces(
  players: PlayerColor[] = PLAYER_ORDER,
): PieceState[] {
  return players.flatMap((player) =>
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

/** ¿Tiene el jugador al menos una ficha en el recorrido (movible)? */
export function hasAnyPieceOnRoute(
  pieces: PieceState[],
  player: PlayerColor,
): boolean {
  return pieces.some(
    (piece) => piece.player === player && piece.location === "route",
  );
}

/** Fichas del jugador que ya llegaron a la casilla café (fuera del juego) */
export function getFinishedPieces(
  pieces: PieceState[],
  player: PlayerColor,
): PieceState[] {
  return pieces.filter(
    (piece) => piece.player === player && piece.location === "finished",
  );
}

/** Gana quien mete sus 4 fichas en la casilla café central */
export function hasPlayerWon(
  pieces: PieceState[],
  player: PlayerColor,
): boolean {
  return getFinishedPieces(pieces, player).length === 4;
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

/**
 * Saca fichas de inicio a la casilla de salida (máx. 2).
 * - Si hay fichas PROPIAS en la salida, la zona está obstruida: no sale
 *   ninguna y el par se usa para mover normalmente.
 * - Si hay fichas ENEMIGAS en la salida, mueren y vuelven a su inicio.
 */
export function exitPiecesFromStartOnDoubles(
  pieces: PieceState[],
  player: PlayerColor,
): PieceState[] {
  const exitCell = getRouteCell(player, 0)!;
  const occupants = getPiecesAtRouteCell(pieces, exitCell);

  const exitBlockedByOwn = occupants.some(
    (piece) => piece.player === player,
  );
  if (exitBlockedByOwn) return pieces;

  const startPieces = getPiecesAtStart(pieces, player).sort(
    (a, b) => a.index - b.index,
  );
  if (startPieces.length === 0) return pieces;

  const exitingIndices = new Set(
    startPieces.slice(0, MAX_PIECES_PER_CELL).map((piece) => piece.index),
  );
  const enemyKeys = new Set(
    occupants
      .filter((piece) => piece.player !== player)
      .map((piece) => `${piece.player}-${piece.index}`),
  );

  return pieces.map((piece) => {
    if (
      piece.player === player &&
      piece.location === "start" &&
      exitingIndices.has(piece.index)
    ) {
      return { ...piece, location: "route" as const, routeIndex: 0 };
    }
    if (enemyKeys.has(`${piece.player}-${piece.index}`)) {
      return { ...piece, location: "start" as const, routeIndex: undefined };
    }
    return piece;
  });
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
