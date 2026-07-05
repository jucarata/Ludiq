import {
  exitPiecesFromStartOnDoubles,
  hasAnyPieceOnRoute,
  hasPiecesInStart,
  isDiceDoubles,
  type PieceState,
} from "./pieces";
import type { PlayerColor } from "@/lib/board/types";

export type PostRollAction = "skip_turn" | "decision_phase";

export interface RollResolution {
  nextPieces: PieceState[];
  action: PostRollAction;
}

/**
 * Resuelve el resultado de un lanzamiento:
 * - Par (dobles): mismo valor en ambos dados (1+1, 2+2…), NO números pares.
 * - Sin fichas afuera y sin par → pierde el turno al instante.
 * - Con al menos una ficha afuera (tras aplicar par) → 10 s para mover.
 */
export function resolveRoll(
  pieces: PieceState[],
  player: PlayerColor,
  roll: [number, number],
): RollResolution {
  let nextPieces = pieces;

  if (isDiceDoubles(roll) && hasPiecesInStart(pieces, player)) {
    nextPieces = exitPiecesFromStartOnDoubles(pieces, player);
  }

  /* Sin fichas en el recorrido (en base o ya terminadas) → pierde el turno */
  if (!hasAnyPieceOnRoute(nextPieces, player)) {
    return { nextPieces, action: "skip_turn" };
  }

  return { nextPieces, action: "decision_phase" };
}
