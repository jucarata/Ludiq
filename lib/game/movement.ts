import { getRouteCell, getRouteLength } from "@/lib/board/player-path";
import {
  getPiecesAtRouteCell,
  MAX_PIECES_PER_CELL,
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

/** Índice de destino en el recorrido, o null si se sale del camino */
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

  const destinationCell = getRouteCell(piece.player, destination)!;
  const occupants = getPiecesAtRouteCell(pieces, destinationCell).filter(
    (other) =>
      !(other.player === piece.player && other.index === piece.index),
  );
  return occupants.length < MAX_PIECES_PER_CELL;
}
