import { PLAYER_ORDER, type PlayerColor } from "@/lib/board/types";
import { createActionId, isValidActionId } from "@/lib/game/action-id";
import { ParquesBot } from "@/lib/game/bot";
import {
  canMovePiece,
  consumeDice,
  hasAnyValidMove,
  resolveLanding,
} from "@/lib/game/movement";
import {
  isValidDiceRoll,
  toOnlineGameStateView,
} from "@/lib/game/online-parse";
import type {
  OnlineGameAction,
  OnlineGameStateView,
} from "@/lib/game/online-types";
import {
  createInitialPieces,
  hasPlayerWon,
  type PieceIndex,
  type PieceState,
} from "@/lib/game/pieces";
import { resolveRoll } from "@/lib/game/roll-resolution";
import {
  nextPlayerIndex,
  TURN_DECISION_SECONDS,
  TURN_DURATION_SECONDS,
} from "@/lib/game/turns";
import type { RoomIdentity } from "@/lib/room/service";
import { getRoomByCode } from "@/lib/room/service";
import type { RoomMode } from "@/lib/room/mode";
import { DEFAULT_ROOM_MODE } from "@/lib/room/mode";
import type { RoomView } from "@/lib/room/types";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database, Json } from "@/lib/supabase/database.types";

export { toOnlineGameStateView } from "@/lib/game/online-parse";

type RoomRow = Database["public"]["Tables"]["game_rooms"]["Row"];
type PlayerRow = Database["public"]["Tables"]["game_room_players"]["Row"];
type GameStateRow = Database["public"]["Tables"]["game_states"]["Row"];

function piecesToJson(pieces: PieceState[]): Json {
  return pieces as unknown as Json;
}

function resolveActionId(clientId: string | undefined): string {
  return isValidActionId(clientId) ? clientId : createActionId();
}

function actionMeta(
  lastAction: OnlineGameAction,
  actionId: string,
): Pick<
  Database["public"]["Tables"]["game_states"]["Update"],
  "last_action" | "action_id"
> {
  return { last_action: lastAction, action_id: actionId };
}

function isSelfPlayer(
  player: PlayerRow,
  identity: RoomIdentity | null,
): boolean {
  if (!identity) return false;
  if (identity.kind === "profile") {
    return player.user_id === identity.profileId;
  }
  return player.guest_session_id === identity.guestSessionId;
}

function isRoomHost(
  room: RoomRow,
  players: PlayerRow[],
  identity: RoomIdentity,
): boolean {
  if (room.host_id != null) {
    return (
      identity.kind === "profile" && identity.profileId === room.host_id
    );
  }
  const ordered = [...players].sort(
    (a, b) =>
      new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime(),
  );
  const first = ordered[0];
  return first != null && isSelfPlayer(first, identity);
}

async function findActiveRoomByCode(
  code: string,
  mode: RoomMode,
): Promise<RoomRow | null> {
  const supabase = getSupabaseAdminClient();
  const normalized = code.trim().toUpperCase();
  const { data, error } = await supabase
    .from("game_rooms")
    .select("*")
    .eq("code", normalized)
    .eq("mode", mode)
    .in("status", ["waiting", "playing"])
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

async function fetchRoomPlayers(roomId: string): Promise<PlayerRow[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("game_room_players")
    .select("*")
    .eq("room_id", roomId)
    .order("joined_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function loadGameStateRow(roomId: string): Promise<GameStateRow> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("game_states")
    .select("*")
    .eq("room_id", roomId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) {
    throw new Response(JSON.stringify({ error: "Game not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
  return data;
}

async function writeGameState(
  roomId: string,
  expectedVersion: number,
  patch: Database["public"]["Tables"]["game_states"]["Update"],
): Promise<GameStateRow> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("game_states")
    .update({
      ...patch,
      version: expectedVersion + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("room_id", roomId)
    .eq("version", expectedVersion)
    .select("*")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) {
    throw new Response(JSON.stringify({ error: "Game state conflict" }), {
      status: 409,
      headers: { "Content-Type": "application/json" },
    });
  }
  return data;
}

function advanceToNextTurn(
  state: OnlineGameStateView,
): Pick<
  Database["public"]["Tables"]["game_states"]["Update"],
  | "current_turn"
  | "turn_phase"
  | "remaining_dice"
  | "exit_roll_attempts"
  | "last_roll"
  | "turn_started_at"
  | "afk_takeover"
> {
  const index = state.activePlayers.indexOf(state.currentTurn);
  const nextIndex = nextPlayerIndex(
    index >= 0 ? index : 0,
    state.activePlayers,
  );
  return {
    current_turn: state.activePlayers[nextIndex],
    turn_phase: "playing",
    remaining_dice: null,
    exit_roll_attempts: 0,
    last_roll: null,
    turn_started_at: new Date().toISOString(),
    afk_takeover: false,
  };
}

/**
 * Background job after competitive start: lock pot on-chain.
 * If lock fails, the game is cancelled — without lock the host could refund mid-game.
 */
export async function lockCompetitivePotInBackground(params: {
  roomId: string;
  escrowRoomKey: string;
}): Promise<void> {
  const supabase = getSupabaseAdminClient();
  try {
    const { lockEscrowRoom } = await import("@/lib/celo/competitive");
    await lockEscrowRoom(params.escrowRoomKey);

    const { error } = await supabase
      .from("game_rooms")
      .update({ pot_status: "locked" })
      .eq("id", params.roomId)
      .eq("status", "playing")
      .eq("pot_status", "funded");

    if (error) throw new Error(error.message);
  } catch (error) {
    console.error("Competitive lock failed; cancelling game:", error);
    await cancelGameForEscrowLockFailure(params.roomId);
  }
}

async function cancelGameForEscrowLockFailure(roomId: string): Promise<void> {
  const supabase = getSupabaseAdminClient();
  const now = new Date().toISOString();

  const { error: roomError } = await supabase
    .from("game_rooms")
    .update({
      status: "finished",
      finished_at: now,
      winner: null,
    })
    .eq("id", roomId)
    .eq("status", "playing")
    .eq("pot_status", "funded");

  if (roomError) throw new Error(roomError.message);

  const { error: gameError } = await supabase
    .from("game_states")
    .update({
      turn_phase: "ended",
      winner: null,
      remaining_dice: null,
      afk_takeover: false,
      updated_at: now,
    })
    .eq("room_id", roomId)
    .neq("turn_phase", "ended");

  if (gameError) throw new Error(gameError.message);
}

async function settleCompetitivePotIfNeeded(
  roomId: string,
  winner: PlayerColor,
): Promise<{ payout_tx_hash?: string; pot_status?: "settled" }> {
  const supabase = getSupabaseAdminClient();
  const { data: room, error: roomError } = await supabase
    .from("game_rooms")
    .select(
      "mode, pot_status, escrow_room_key, payout_tx_hash",
    )
    .eq("id", roomId)
    .maybeSingle();

  if (roomError) throw new Error(roomError.message);
  if (!room || room.mode !== "competitive") return {};
  if (room.pot_status === "settled" && room.payout_tx_hash) {
    return {
      payout_tx_hash: room.payout_tx_hash,
      pot_status: "settled",
    };
  }
  if (!room.escrow_room_key) return {};

  // Start may still be locking in the background — lock now if needed.
  if (room.pot_status === "funded") {
    const { lockEscrowRoom } = await import("@/lib/celo/competitive");
    await lockEscrowRoom(room.escrow_room_key);
    const { error: lockUpdateError } = await supabase
      .from("game_rooms")
      .update({ pot_status: "locked" })
      .eq("id", roomId)
      .eq("pot_status", "funded");
    if (lockUpdateError) throw new Error(lockUpdateError.message);
  } else if (room.pot_status !== "locked") {
    return {};
  }

  const { data: winnerPlayer, error: playerError } = await supabase
    .from("game_room_players")
    .select("user_id")
    .eq("room_id", roomId)
    .eq("color", winner)
    .maybeSingle();

  if (playerError) throw new Error(playerError.message);
  if (!winnerPlayer?.user_id) {
    throw new Error("Winner profile not found for payout");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("wallet_address")
    .eq("id", winnerPlayer.user_id)
    .maybeSingle();

  if (profileError) throw new Error(profileError.message);
  if (!profile?.wallet_address) {
    throw new Error("Winner wallet not found for payout");
  }

  const { settleEscrowRoom } = await import("@/lib/celo/competitive");
  const payoutTxHash = await settleEscrowRoom({
    roomKey: room.escrow_room_key,
    winner: profile.wallet_address,
  });

  return {
    payout_tx_hash: payoutTxHash.toLowerCase(),
    pot_status: "settled",
  };
}

/**
 * Competitive: winner earns 1 trophy × number of paid participants.
 * Idempotent via game_rooms.trophies_awarded (claim room row before profile bump).
 */
async function awardCompetitiveTrophiesIfNeeded(
  roomId: string,
  winner: PlayerColor,
): Promise<{ trophies_awarded?: number }> {
  const supabase = getSupabaseAdminClient();
  const { data: room, error: roomError } = await supabase
    .from("game_rooms")
    .select("mode, trophies_awarded")
    .eq("id", roomId)
    .maybeSingle();

  if (roomError) throw new Error(roomError.message);
  if (!room || room.mode !== "competitive") return {};
  if (typeof room.trophies_awarded === "number") {
    return { trophies_awarded: room.trophies_awarded };
  }

  const { data: players, error: playersError } = await supabase
    .from("game_room_players")
    .select("user_id, color, entry_paid")
    .eq("room_id", roomId);

  if (playersError) throw new Error(playersError.message);

  const participants = (players ?? []).filter((p) => p.entry_paid === true);
  const trophies = Math.max(1, participants.length);
  const winnerPlayer = participants.find((p) => p.color === winner);
  if (!winnerPlayer?.user_id) {
    throw new Error("Winner profile not found for trophies");
  }

  const { data: claimed, error: claimError } = await supabase
    .from("game_rooms")
    .update({ trophies_awarded: trophies })
    .eq("id", roomId)
    .is("trophies_awarded", null)
    .select("trophies_awarded")
    .maybeSingle();

  if (claimError) throw new Error(claimError.message);
  if (!claimed) {
    const { data: existing } = await supabase
      .from("game_rooms")
      .select("trophies_awarded")
      .eq("id", roomId)
      .maybeSingle();
    if (typeof existing?.trophies_awarded === "number") {
      return { trophies_awarded: existing.trophies_awarded };
    }
    return {};
  }

  const { error: awardError } = await supabase.rpc("award_profile_trophies", {
    p_profile_id: winnerPlayer.user_id,
    p_amount: trophies,
  });
  if (awardError) throw new Error(awardError.message);

  return { trophies_awarded: trophies };
}

async function finishGame(
  roomId: string,
  winner: PlayerColor,
  expectedVersion: number,
  pieces: PieceState[],
  actionId: string = createActionId(),
): Promise<GameStateRow> {
  const supabase = getSupabaseAdminClient();
  const now = new Date().toISOString();

  let settleFields: {
    payout_tx_hash?: string;
    pot_status?: "settled";
  } = {};
  try {
    settleFields = await settleCompetitivePotIfNeeded(roomId, winner);
  } catch (error) {
    console.error("Competitive settle failed:", error);
    // Still finish the game; payout can be retried manually if needed.
  }

  let trophyFields: { trophies_awarded?: number } = {};
  try {
    trophyFields = await awardCompetitiveTrophiesIfNeeded(roomId, winner);
  } catch (error) {
    console.error("Competitive trophy award failed:", error);
  }

  const { error: roomError } = await supabase
    .from("game_rooms")
    .update({
      status: "finished",
      winner,
      finished_at: now,
      ...settleFields,
      ...trophyFields,
    })
    .eq("id", roomId);

  if (roomError) throw new Error(roomError.message);

  return writeGameState(roomId, expectedVersion, {
    pieces: piecesToJson(pieces),
    remaining_dice: null,
    turn_phase: "ended",
    winner,
    current_turn: winner,
    exit_roll_attempts: 0,
    afk_takeover: false,
    ...actionMeta("move", actionId),
  });
}

export async function startRoomGame(params: {
  code: string;
  identity: RoomIdentity;
  mode?: RoomMode;
}): Promise<{
  room: RoomView;
  game: OnlineGameStateView;
  /** Competitive: lock on-chain after the response (do not block players). */
  pendingLock?: { roomId: string; escrowRoomKey: string };
}> {
  const mode = params.mode ?? DEFAULT_ROOM_MODE;
  const supabase = getSupabaseAdminClient();
  const roomRow = await findActiveRoomByCode(params.code, mode);

  if (!roomRow) {
    throw new Response(JSON.stringify({ error: "Room not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (roomRow.status !== "waiting") {
    throw new Response(JSON.stringify({ error: "Room is not waiting" }), {
      status: 409,
      headers: { "Content-Type": "application/json" },
    });
  }

  const players = await fetchRoomPlayers(roomRow.id);
  if (!isRoomHost(roomRow, players, params.identity)) {
    throw new Response(
      JSON.stringify({ error: "Only the host can start the game" }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  if (players.length < 2 || players.length > roomRow.max_players) {
    throw new Response(
      JSON.stringify({
        error: "Need between 2 and 4 players to start",
      }),
      {
        status: 409,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  if (roomRow.mode === "competitive") {
    const unpaid = players.filter((player) => !player.entry_paid);
    if (unpaid.length > 0) {
      throw new Response(
        JSON.stringify({
          error: "All players must confirm payment before starting",
        }),
        {
          status: 409,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  }

  let pendingLock:
    | { roomId: string; escrowRoomKey: string }
    | undefined;

  if (roomRow.mode === "competitive") {
    if (roomRow.pot_status !== "funded" || !roomRow.escrow_room_key) {
      throw new Response(
        JSON.stringify({ error: "Competitive room pot is not funded" }),
        {
          status: 409,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
    pendingLock = {
      roomId: roomRow.id,
      escrowRoomKey: roomRow.escrow_room_key,
    };
  }

  const taken = new Set(players.map((player) => player.color));
  const activePlayers = PLAYER_ORDER.filter((color) => taken.has(color));
  const pieces = createInitialPieces(activePlayers);
  const now = new Date().toISOString();

  const { error: roomError } = await supabase
    .from("game_rooms")
    .update({
      status: "playing",
      started_at: now,
    })
    .eq("id", roomRow.id)
    .eq("status", "waiting");

  if (roomError) throw new Error(roomError.message);

  const { data: gameRow, error: gameError } = await supabase
    .from("game_states")
    .upsert(
      {
        room_id: roomRow.id,
        current_turn: activePlayers[0],
        turn_phase: "playing",
        pieces: piecesToJson(pieces),
        remaining_dice: null,
        active_players: activePlayers as unknown as Json,
        exit_roll_attempts: 0,
        last_roll: null,
        winner: null,
        turn_started_at: now,
        afk_takeover: false,
        version: 1,
        updated_at: now,
        last_action: null,
        action_id: null,
      },
      { onConflict: "room_id" },
    )
    .select("*")
    .single();

  if (gameError || !gameRow) {
    throw new Error(gameError?.message ?? "Failed to create game state");
  }

  const room = await getRoomByCode(params.code, params.identity, mode);
  if (!room) {
    throw new Error("Room disappeared after start");
  }

  return {
    room,
    game: toOnlineGameStateView(gameRow),
    pendingLock,
  };
}

export async function getOnlineGame(params: {
  code: string;
  identity: RoomIdentity;
  mode?: RoomMode;
}): Promise<{ room: RoomView; game: OnlineGameStateView }> {
  const mode = params.mode ?? DEFAULT_ROOM_MODE;
  const room = await getRoomByCode(params.code, params.identity, mode);
  if (!room) {
    throw new Response(JSON.stringify({ error: "Room not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const self = room.players.find((player) => player.isSelf);
  if (!self) {
    throw new Response(JSON.stringify({ error: "You are not in this room" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (room.status === "waiting") {
    throw new Response(JSON.stringify({ error: "Game has not started" }), {
      status: 409,
      headers: { "Content-Type": "application/json" },
    });
  }

  const row = await loadGameStateRow(room.id);
  return { room, game: toOnlineGameStateView(row) };
}

async function requirePlayingMember(params: {
  code: string;
  identity: RoomIdentity;
  mode?: RoomMode;
}): Promise<{ room: RoomView; row: GameStateRow; selfColor: PlayerColor }> {
  const mode = params.mode ?? DEFAULT_ROOM_MODE;
  const room = await getRoomByCode(params.code, params.identity, mode);
  if (!room) {
    throw new Response(JSON.stringify({ error: "Room not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const self = room.players.find((player) => player.isSelf);
  if (!self) {
    throw new Response(JSON.stringify({ error: "You are not in this room" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (room.status !== "playing") {
    throw new Response(JSON.stringify({ error: "Room is not playing" }), {
      status: 409,
      headers: { "Content-Type": "application/json" },
    });
  }

  const row = await loadGameStateRow(room.id);
  return { room, row, selfColor: self.color };
}

export async function rollOnlineDice(params: {
  code: string;
  identity: RoomIdentity;
  mode?: RoomMode;
  /** Client-generated roll for optimistic UI; server validates range only. */
  roll?: [number, number];
  /** Shared with live broadcast so peers can dedupe. */
  actionId?: string;
}): Promise<{
  room: RoomView;
  game: OnlineGameStateView;
  roll: [number, number];
}> {
  const { room, row, selfColor } = await requirePlayingMember(params);
  const state = toOnlineGameStateView(row);

  if (state.winner || state.turnPhase === "ended") {
    throw new Response(JSON.stringify({ error: "Game is over" }), {
      status: 409,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (state.currentTurn !== selfColor) {
    throw new Response(JSON.stringify({ error: "Not your turn" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (state.turnPhase !== "playing") {
    throw new Response(JSON.stringify({ error: "Cannot roll now" }), {
      status: 409,
      headers: { "Content-Type": "application/json" },
    });
  }

  const actionId = resolveActionId(params.actionId);
  if (!isValidDiceRoll(params.roll)) {
    throw new Response(JSON.stringify({ error: "Dice roll is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  const roll = params.roll;
  const resolution = resolveRoll(
    state.pieces,
    selfColor,
    roll,
    state.exitRollAttempts,
  );
  const meta = actionMeta("roll", actionId);

  let nextRow: GameStateRow;

  if (resolution.action === "retry_roll") {
    nextRow = await writeGameState(room.id, state.version, {
      pieces: piecesToJson(resolution.nextPieces),
      turn_phase: "playing",
      remaining_dice: null,
      exit_roll_attempts: state.exitRollAttempts + 1,
      last_roll: roll as unknown as Json,
      turn_started_at: new Date().toISOString(),
      afk_takeover: false,
      ...meta,
    });
  } else if (resolution.action === "skip_turn") {
    const advanced = advanceToNextTurn({
      ...state,
      pieces: resolution.nextPieces,
    });
    nextRow = await writeGameState(room.id, state.version, {
      pieces: piecesToJson(resolution.nextPieces),
      ...advanced,
      ...meta,
    });
  } else {
    nextRow = await writeGameState(room.id, state.version, {
      pieces: piecesToJson(resolution.nextPieces),
      turn_phase: "deciding",
      remaining_dice: [...roll] as unknown as Json,
      exit_roll_attempts: state.exitRollAttempts,
      last_roll: roll as unknown as Json,
      turn_started_at: new Date().toISOString(),
      afk_takeover: false,
      ...meta,
    });
  }

  return {
    room,
    game: toOnlineGameStateView(nextRow),
    roll,
  };
}

export async function moveOnlinePiece(params: {
  code: string;
  identity: RoomIdentity;
  mode?: RoomMode;
  pieceIndex: PieceIndex;
  dieValue: number;
  actionId?: string;
}): Promise<{ room: RoomView; game: OnlineGameStateView }> {
  const { room, row, selfColor } = await requirePlayingMember(params);
  const state = toOnlineGameStateView(row);

  if (state.winner || state.turnPhase === "ended") {
    throw new Response(JSON.stringify({ error: "Game is over" }), {
      status: 409,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (state.currentTurn !== selfColor) {
    throw new Response(JSON.stringify({ error: "Not your turn" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (state.turnPhase !== "deciding" || !state.remainingDice?.length) {
    throw new Response(JSON.stringify({ error: "Cannot move now" }), {
      status: 409,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!state.remainingDice.includes(params.dieValue)) {
    throw new Response(JSON.stringify({ error: "Invalid die value" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const piece = state.pieces.find(
    (p) => p.player === selfColor && p.index === params.pieceIndex,
  );
  if (!piece || piece.location !== "route" || piece.routeIndex === undefined) {
    throw new Response(JSON.stringify({ error: "Invalid piece" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!canMovePiece(state.pieces, piece, params.dieValue)) {
    throw new Response(JSON.stringify({ error: "Illegal move" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  return commitOnlineMove({
    room,
    state,
    selfColor,
    pieceIndex: params.pieceIndex,
    dieValue: params.dieValue,
    actionId: params.actionId,
    code: params.code,
    identity: params.identity,
  });
}

async function commitOnlineMove(params: {
  room: RoomView;
  state: OnlineGameStateView;
  selfColor: PlayerColor;
  pieceIndex: PieceIndex;
  dieValue: number;
  actionId?: string;
  code: string;
  identity: RoomIdentity;
}): Promise<{ room: RoomView; game: OnlineGameStateView }> {
  const { room, state, selfColor } = params;
  const piece = state.pieces.find(
    (p) => p.player === selfColor && p.index === params.pieceIndex,
  );
  if (!piece || piece.location !== "route" || piece.routeIndex === undefined) {
    throw new Response(JSON.stringify({ error: "Invalid piece" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const actionId = resolveActionId(params.actionId);
  const meta = actionMeta("move", actionId);
  const destination = piece.routeIndex + params.dieValue;
  let nextPieces = state.pieces.map((p) =>
    p.player === selfColor && p.index === params.pieceIndex
      ? { ...p, routeIndex: destination }
      : p,
  );
  nextPieces = resolveLanding(nextPieces, selfColor, params.pieceIndex);

  if (hasPlayerWon(nextPieces, selfColor)) {
    const finished = await finishGame(
      room.id,
      selfColor,
      state.version,
      nextPieces,
      actionId,
    );
    const updatedRoom = await getRoomByCode(params.code, params.identity);
    return {
      room: updatedRoom ?? { ...room, status: "finished" },
      game: toOnlineGameStateView(finished),
    };
  }

  const nextRemaining = consumeDice(state.remainingDice ?? [], {
    value: params.dieValue,
  });

  let nextRow: GameStateRow;

  if (nextRemaining.length === 0) {
    nextRow = await writeGameState(room.id, state.version, {
      pieces: piecesToJson(nextPieces),
      ...advanceToNextTurn(state),
      ...meta,
    });
  } else if (!hasAnyValidMove(nextPieces, selfColor, nextRemaining)) {
    nextRow = await writeGameState(room.id, state.version, {
      pieces: piecesToJson(nextPieces),
      ...advanceToNextTurn(state),
      ...meta,
    });
  } else if (state.afkTakeover) {
    nextRow = await writeGameState(room.id, state.version, {
      pieces: piecesToJson(nextPieces),
      remaining_dice: nextRemaining as unknown as Json,
      turn_phase: "deciding",
      afk_takeover: true,
      ...meta,
    });
  } else {
    nextRow = await writeGameState(room.id, state.version, {
      pieces: piecesToJson(nextPieces),
      remaining_dice: nextRemaining as unknown as Json,
      turn_phase: "deciding",
      turn_started_at: new Date().toISOString(),
      afk_takeover: false,
      ...meta,
    });
  }

  return { room, game: toOnlineGameStateView(nextRow) };
}

export async function advanceOnlineTurn(params: {
  code: string;
  identity: RoomIdentity;
  mode?: RoomMode;
  /** Client hint — used if DB auto_enabled has not synced yet. */
  autoEnabled?: boolean;
}): Promise<{ room: RoomView; game: OnlineGameStateView }> {
  const { room, row, selfColor } = await requirePlayingMember(params);
  const state = toOnlineGameStateView(row);

  if (state.winner || state.turnPhase === "ended") {
    return { room, game: state };
  }

  if (state.currentTurn !== selfColor) {
    throw new Response(JSON.stringify({ error: "Not your turn" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (state.turnPhase === "rolling") {
    throw new Response(JSON.stringify({ error: "Cannot skip while rolling" }), {
      status: 409,
      headers: { "Content-Type": "application/json" },
    });
  }

  const playAfkBotMove = async () => {
    if (
      state.turnPhase !== "deciding" ||
      !state.remainingDice?.length ||
      !hasAnyValidMove(state.pieces, selfColor, state.remainingDice)
    ) {
      const cleared = await writeGameState(room.id, state.version, {
        pieces: piecesToJson(state.pieces),
        ...advanceToNextTurn(state),
        ...actionMeta("advance", createActionId()),
      });
      return { room, game: toOnlineGameStateView(cleared) };
    }

    const decision = new ParquesBot().chooseMove(
      state.pieces,
      selfColor,
      state.remainingDice,
    );
    if (!decision) {
      const cleared = await writeGameState(room.id, state.version, {
        pieces: piecesToJson(state.pieces),
        ...advanceToNextTurn(state),
        ...actionMeta("advance", createActionId()),
      });
      return { room, game: toOnlineGameStateView(cleared) };
    }

    return commitOnlineMove({
      room,
      state: { ...state, afkTakeover: true },
      selfColor,
      pieceIndex: decision.index,
      dieValue: decision.choice.value,
      code: params.code,
      identity: params.identity,
    });
  };

  /* Already in AFK — keep playing bot moves until the turn ends. */
  if (state.afkTakeover) {
    return playAfkBotMove();
  }

  const startedAt = new Date(state.turnStartedAt).getTime();
  const limitMs =
    (state.turnPhase === "deciding"
      ? TURN_DECISION_SECONDS
      : TURN_DURATION_SECONDS) * 1000;
  const elapsed = Date.now() - startedAt;

  if (elapsed < limitMs - 1500) {
    throw new Response(JSON.stringify({ error: "Turn timer still running" }), {
      status: 409,
      headers: { "Content-Type": "application/json" },
    });
  }

  const autoEnabled =
    params.autoEnabled === true ||
    (await loadPlayerAutoEnabled(room.id, selfColor));

  /*
   * Auto expired: execute the bot move immediately (do not only set a flag
   * and wait — that left clients frozen when the follow-up never ran).
   */
  if (
    autoEnabled &&
    state.turnPhase === "deciding" &&
    state.remainingDice &&
    state.remainingDice.length > 0 &&
    hasAnyValidMove(state.pieces, selfColor, state.remainingDice)
  ) {
    return playAfkBotMove();
  }

  const nextRow = await writeGameState(room.id, state.version, {
    pieces: piecesToJson(state.pieces),
    ...advanceToNextTurn(state),
    ...actionMeta("timeout", createActionId()),
  });

  return { room, game: toOnlineGameStateView(nextRow) };
}

async function loadPlayerAutoEnabled(
  roomId: string,
  color: PlayerColor,
): Promise<boolean> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("game_room_players")
    .select("auto_enabled")
    .eq("room_id", roomId)
    .eq("color", color)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data?.auto_enabled === true;
}
