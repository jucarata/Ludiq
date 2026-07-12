import { PLAYER_ORDER, type PlayerColor } from "@/lib/board/types";
import type {
  OnlineGameAction,
  OnlineGameStateView,
} from "@/lib/game/online-types";
import type { PieceIndex, PieceState } from "@/lib/game/pieces";
import type { TurnPhase } from "@/lib/game/turns";

const PLAYER_COLORS = new Set<PlayerColor>(PLAYER_ORDER);
const TURN_PHASES = new Set<TurnPhase>([
  "playing",
  "rolling",
  "deciding",
  "ended",
]);
const GAME_ACTIONS = new Set<OnlineGameAction>([
  "roll",
  "move",
  "advance",
  "timeout",
]);

export type GameStateRowLike = {
  room_id: string;
  current_turn: string | null;
  turn_phase: string | null;
  pieces: unknown;
  remaining_dice: unknown;
  active_players: unknown;
  exit_roll_attempts?: number | null;
  last_roll: unknown;
  last_action?: string | null;
  action_id?: string | null;
  winner: string | null;
  turn_started_at: string;
  version: number;
  updated_at: string;
};

export function isPlayerColor(value: unknown): value is PlayerColor {
  return typeof value === "string" && PLAYER_COLORS.has(value as PlayerColor);
}

function isTurnPhase(value: unknown): value is TurnPhase {
  return typeof value === "string" && TURN_PHASES.has(value as TurnPhase);
}

function parseActivePlayers(value: unknown): PlayerColor[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isPlayerColor);
}

function parsePieces(value: unknown): PieceState[] {
  if (!Array.isArray(value)) return [];
  const pieces: PieceState[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    if (!isPlayerColor(row.player)) continue;
    if (typeof row.index !== "number" || row.index < 0 || row.index > 3) {
      continue;
    }
    const location = row.location;
    if (
      location !== "start" &&
      location !== "route" &&
      location !== "finished"
    ) {
      continue;
    }
    const piece: PieceState = {
      player: row.player,
      index: row.index as PieceIndex,
      location,
    };
    if (
      location === "route" &&
      typeof row.routeIndex === "number" &&
      Number.isFinite(row.routeIndex)
    ) {
      piece.routeIndex = row.routeIndex;
    }
    pieces.push(piece);
  }
  return pieces;
}

function parseDice(value: unknown): number[] | null {
  if (value == null) return null;
  if (!Array.isArray(value)) return null;
  const dice = value.filter(
    (n): n is number => typeof n === "number" && n >= 1 && n <= 6,
  );
  return dice.length > 0 ? dice : null;
}

export function parseLastRoll(value: unknown): [number, number] | null {
  if (!Array.isArray(value) || value.length !== 2) return null;
  const [a, b] = value;
  if (
    typeof a !== "number" ||
    typeof b !== "number" ||
    a < 1 ||
    a > 6 ||
    b < 1 ||
    b > 6
  ) {
    return null;
  }
  return [a, b];
}

export function isValidDiceRoll(
  value: unknown,
): value is [number, number] {
  return parseLastRoll(value) != null;
}

function parseLastAction(value: unknown): OnlineGameAction | null {
  if (typeof value !== "string") return null;
  return GAME_ACTIONS.has(value as OnlineGameAction)
    ? (value as OnlineGameAction)
    : null;
}

function parseActionId(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0) return null;
  return value.length <= 64 ? value : null;
}

export function toOnlineGameStateView(
  row: GameStateRowLike,
): OnlineGameStateView {
  const activePlayers = parseActivePlayers(row.active_players);
  const currentTurn =
    (row.current_turn && isPlayerColor(row.current_turn)
      ? row.current_turn
      : activePlayers[0]) ?? "red";
  const turnPhase = isTurnPhase(row.turn_phase) ? row.turn_phase : "playing";

  return {
    roomId: row.room_id,
    activePlayers,
    currentTurn,
    turnPhase,
    pieces: parsePieces(row.pieces),
    remainingDice: parseDice(row.remaining_dice),
    exitRollAttempts: row.exit_roll_attempts ?? 0,
    lastRoll: parseLastRoll(row.last_roll),
    lastAction: parseLastAction(row.last_action),
    actionId: parseActionId(row.action_id),
    winner: row.winner && isPlayerColor(row.winner) ? row.winner : null,
    version: row.version,
    turnStartedAt: row.turn_started_at,
    updatedAt: row.updated_at,
  };
}
