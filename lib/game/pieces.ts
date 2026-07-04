import { PLAYER_ORDER, type PlayerColor } from "@/lib/board/types";

export type PieceIndex = 0 | 1 | 2 | 3;

export type PieceLocation = "start" | "path-exit";

export interface PieceState {
  player: PlayerColor;
  index: PieceIndex;
  location: PieceLocation;
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

/** Saca todas las fichas de inicio a la casilla de salida del jugador */
export function exitAllPiecesFromStart(
  pieces: PieceState[],
  player: PlayerColor,
): PieceState[] {
  return pieces.map((piece) =>
    piece.player === player && piece.location === "start"
      ? { ...piece, location: "path-exit" }
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

export function getPiecesAtPathExit(
  pieces: PieceState[],
  player: PlayerColor,
): PieceState[] {
  return pieces.filter(
    (piece) => piece.player === player && piece.location === "path-exit",
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
