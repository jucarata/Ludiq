import type { PlayerColor } from "@/lib/board/types";
import {
  hasAnyPieceOnRoute,
  hasPiecesInStart,
  isDiceDoubles,
  type PieceState,
} from "@/lib/game/pieces";
import type { TurnPhase } from "@/lib/game/turns";

/**
 * Reroll is only for movement turns after pieces already left home earlier.
 * Never on the throw that exits pieces (first leave, or doubles that exit more).
 */
export function computeRerollEligible(
  piecesBeforeRoll: PieceState[],
  player: PlayerColor,
  roll: [number, number],
): boolean {
  if (!hasAnyPieceOnRoute(piecesBeforeRoll, player)) return false;
  /* This throw would (or did) move pieces out of start — no reroll. */
  if (isDiceDoubles(roll) && hasPiecesInStart(piecesBeforeRoll, player)) {
    return false;
  }
  return true;
}

/** Whether a paid dice reroll is allowed in the current decision window. */
export function canPaidDiceReroll(params: {
  turnPhase: TurnPhase;
  remainingDice: number[] | null | undefined;
  rerollEligible: boolean;
  tutorialActive?: boolean;
}): boolean {
  if (params.tutorialActive) return false;
  if (params.turnPhase !== "deciding") return false;
  if (!params.remainingDice || params.remainingDice.length !== 2) return false;
  return params.rerollEligible;
}
