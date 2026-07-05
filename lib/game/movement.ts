import {
  getRouteCell,
  getRouteLength,
  getVictoryRouteIndex,
} from "@/lib/board/player-path";
import { isProtectedAnchor } from "@/lib/board/cell-placements";
import type { PlayerColor } from "@/lib/board/types";
import {
  getPieceRouteCell,
  getPiecesAtRouteCell,
  MAX_PIECES_PER_CELL,
  type PieceIndex,
  type PieceState,
} from "./pieces";

export type DieMoveChoice = { value: number };

export interface MoveOption {
  id: string;
  label: string;
  choice: DieMoveChoice;
}

/** Milisegundos entre cada paso de la animación de movimiento */
export const MOVE_STEP_MS = 180;

export function getMoveOptions(remainingDice: number[]): MoveOption[] {
  return remainingDice.map((value, index) => ({
    id: `die-${index}`,
    label: String(value),
    choice: { value },
  }));
}

export function consumeDice(
  remaining: number[],
  choice: DieMoveChoice,
): number[] {
  const index = remaining.indexOf(choice.value);
  if (index === -1) return remaining;
  return [...remaining.slice(0, index), ...remaining.slice(index + 1)];
}

/**
 * Índice de destino en el recorrido, o null si se pasa del final.
 * El último paso es la casilla café central: solo se llega con caída exacta.
 */
export function getDestinationRouteIndex(
  piece: PieceState,
  steps: number,
): number | null {
  if (piece.location !== "route" || piece.routeIndex === undefined) return null;
  if (steps <= 0) return null;

  const destination = piece.routeIndex + steps;
  if (destination >= getRouteLength(piece.player)) return null;
  return destination;
}

export function canMovePiece(
  pieces: PieceState[],
  piece: PieceState,
  steps: number,
): boolean {
  const destination = getDestinationRouteIndex(piece, steps);
  if (destination === null) return false;

  /* Casilla café (victoria): siempre disponible — la ficha sale del juego */
  if (destination === getVictoryRouteIndex(piece.player)) return true;

  const destinationCell = getRouteCell(piece.player, destination)!;
  const occupants = getPiecesAtRouteCell(pieces, destinationCell).filter(
    (other) =>
      !(other.player === piece.player && other.index === piece.index),
  );

  /* SAFE / EXIT: sin capturas — colores distintos coexisten, máx. 2 en total */
  if (isProtectedAnchor(destinationCell.anchor)) {
    return occupants.length < MAX_PIECES_PER_CELL;
  }

  /* Casilla normal: las enemigas mueren al aterrizar; solo bloquean las propias */
  const ownOccupants = occupants.filter(
    (other) => other.player === piece.player,
  );
  return ownOccupants.length < MAX_PIECES_PER_CELL;
}

/** ¿Alguna ficha del jugador puede mover alguno de los valores restantes? */
export function hasAnyValidMove(
  pieces: PieceState[],
  player: PlayerColor,
  remainingDice: number[],
): boolean {
  const values = [...new Set(remainingDice)];
  return pieces.some(
    (piece) =>
      piece.player === player &&
      piece.location === "route" &&
      values.some((value) => canMovePiece(pieces, piece, value)),
  );
}

/**
 * ¿La ficha puede mover estos valores en secuencia (uno tras otro)?
 * Simula cada paso con su resolución de caída (capturas / llegada exacta).
 */
export function canMovePieceSequence(
  pieces: PieceState[],
  piece: PieceState,
  steps: number[],
): boolean {
  let boardPieces = pieces;
  let mover = piece;

  for (const step of steps) {
    if (!canMovePiece(boardPieces, mover, step)) return false;

    const destination = mover.routeIndex! + step;
    boardPieces = boardPieces.map((p) =>
      p.player === mover.player && p.index === mover.index
        ? { ...p, routeIndex: destination }
        : p,
    );
    boardPieces = resolveLanding(boardPieces, mover.player, mover.index);
    mover = boardPieces.find(
      (p) => p.player === mover.player && p.index === mover.index,
    )!;
  }

  return true;
}

/**
 * Valor a mover automáticamente cuando el jugador tiene una sola ficha en
 * juego:
 * - Puede consumir todos los dados en secuencia → el primero del orden que
 *   funcione (el resto se encadena solo).
 * - Solo un valor es jugable → ese valor (no hay nada que elegir).
 * - Hay elección real (cada valor es jugable por separado pero no ambos)
 *   → null: decide el usuario.
 */
export function getAutoMoveValue(
  pieces: PieceState[],
  piece: PieceState,
  remainingDice: number[],
): number | null {
  if (remainingDice.length === 1) {
    return canMovePiece(pieces, piece, remainingDice[0])
      ? remainingDice[0]
      : null;
  }

  const [a, b] = remainingDice;
  if (canMovePieceSequence(pieces, piece, [a, b])) return a;
  if (canMovePieceSequence(pieces, piece, [b, a])) return b;

  const movableValues = [...new Set(remainingDice)].filter((value) =>
    canMovePiece(pieces, piece, value),
  );
  return movableValues.length === 1 ? movableValues[0] : null;
}

/**
 * Capturas al terminar el movimiento: si la casilla final no es SAFE/EXIT,
 * las fichas enemigas que estaban ahí vuelven a su casilla de inicio.
 * Si la ficha cae exacto en la casilla café central, gana y sale del juego.
 */
export function resolveLanding(
  pieces: PieceState[],
  player: PlayerColor,
  index: PieceIndex,
): PieceState[] {
  const mover = pieces.find((p) => p.player === player && p.index === index);
  if (!mover) return pieces;

  if (
    mover.location === "route" &&
    mover.routeIndex === getVictoryRouteIndex(player)
  ) {
    return pieces.map((p) =>
      p.player === player && p.index === index
        ? { ...p, location: "finished" as const, routeIndex: undefined }
        : p,
    );
  }

  const cell = getPieceRouteCell(mover);
  if (!cell || isProtectedAnchor(cell.anchor)) return pieces;

  const victims = getPiecesAtRouteCell(pieces, cell).filter(
    (other) => other.player !== player,
  );
  if (victims.length === 0) return pieces;

  const victimKeys = new Set(victims.map((v) => `${v.player}-${v.index}`));
  return pieces.map((p) =>
    victimKeys.has(`${p.player}-${p.index}`)
      ? { ...p, location: "start" as const, routeIndex: undefined }
      : p,
  );
}
