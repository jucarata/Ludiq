import {
  exitPiecesFromStartOnDoubles,
  hasAnyPieceOnRoute,
  hasPiecesInStart,
  isDiceDoubles,
  type PieceState,
} from "./pieces";
import { hasAnyValidMove } from "./movement";
import type { PlayerColor } from "@/lib/board/types";

/** Intentos de tirada para sacar ficha cuando no hay ninguna en el recorrido */
export const MAX_EXIT_ROLL_ATTEMPTS = 3;

export type PostRollAction = "skip_turn" | "decision_phase" | "retry_roll";

export interface RollResolution {
  nextPieces: PieceState[];
  action: PostRollAction;
}

/**
 * Resuelve el resultado de un lanzamiento:
 * - Par (dobles): mismo valor en ambos dados (1+1, 2+2…), NO números pares.
 * - Sin fichas afuera y sin par → hasta 3 intentos (`retry_roll`); al agotarlos, pierde el turno.
 * - Con fichas afuera pero ningún movimiento válido → pierde el turno.
 * - Con al menos un movimiento posible → fase de decisión para mover.
 *
 * @param exitAttemptsUsed Tiradas fallidas de salida ya hechas en este turno (0–2).
 */
export function resolveRoll(
  pieces: PieceState[],
  player: PlayerColor,
  roll: [number, number],
  exitAttemptsUsed = 0,
): RollResolution {
  let nextPieces = pieces;

  if (isDiceDoubles(roll) && hasPiecesInStart(pieces, player)) {
    nextPieces = exitPiecesFromStartOnDoubles(pieces, player);
  }

  /* Sin fichas en el recorrido: reintentar hasta agotar los 3 intentos */
  if (!hasAnyPieceOnRoute(nextPieces, player)) {
    if (exitAttemptsUsed + 1 < MAX_EXIT_ROLL_ATTEMPTS) {
      return { nextPieces, action: "retry_roll" };
    }
    return { nextPieces, action: "skip_turn" };
  }

  /* Ninguna ficha puede mover ninguno de los valores → pierde el turno */
  if (!hasAnyValidMove(nextPieces, player, [...roll])) {
    return { nextPieces, action: "skip_turn" };
  }

  return { nextPieces, action: "decision_phase" };
}
