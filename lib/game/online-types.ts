import type { PlayerColor } from "@/lib/board/types";
import type { PieceState } from "@/lib/game/pieces";
import type { TurnPhase } from "@/lib/game/turns";
import {
  TURN_DECISION_SECONDS,
  TURN_DURATION_SECONDS,
} from "@/lib/game/turns";
import type { RoomView } from "@/lib/room/types";

export type OnlineGameAction =
  | "roll"
  | "move"
  | "advance"
  | "timeout"
  | "afk"
  | "reroll";

export type OnlineGameStateView = {
  roomId: string;
  activePlayers: PlayerColor[];
  currentTurn: PlayerColor;
  turnPhase: TurnPhase;
  pieces: PieceState[];
  remainingDice: number[] | null;
  /** True when a paid reroll is allowed for this decision window. */
  rerollEligible: boolean;
  exitRollAttempts: number;
  lastRoll: [number, number] | null;
  lastAction: OnlineGameAction | null;
  actionId: string | null;
  winner: PlayerColor | null;
  version: number;
  turnStartedAt: string;
  /** Timer expired — bot is finishing this turn; human input stays locked. */
  afkTakeover: boolean;
  updatedAt: string;
};

export type OnlineGamePayload = {
  room: RoomView;
  game: OnlineGameStateView;
};

export function secondsLeftForTurn(game: OnlineGameStateView): number {
  if (game.turnPhase === "ended" || game.turnPhase === "rolling") {
    return game.turnPhase === "ended" ? 0 : TURN_DURATION_SECONDS;
  }
  const limit =
    game.turnPhase === "deciding"
      ? TURN_DECISION_SECONDS
      : TURN_DURATION_SECONDS;
  const elapsed = Math.floor(
    (Date.now() - new Date(game.turnStartedAt).getTime()) / 1000,
  );
  return Math.max(0, limit - elapsed);
}
