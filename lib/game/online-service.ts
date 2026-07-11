import { PLAYER_ORDER, type PlayerColor } from "@/lib/board/types";
import { rollDicePair } from "@/lib/game/dice";
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
import type { OnlineGameStateView } from "@/lib/game/online-types";
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

async function findActiveRoomByCode(code: string): Promise<RoomRow | null> {
  const supabase = getSupabaseAdminClient();
  const normalized = code.trim().toUpperCase();
  const { data, error } = await supabase
    .from("game_rooms")
    .select("*")
    .eq("code", normalized)
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
  };
}

async function finishGame(
  roomId: string,
  winner: PlayerColor,
  expectedVersion: number,
  pieces: PieceState[],
): Promise<GameStateRow> {
  const supabase = getSupabaseAdminClient();
  const now = new Date().toISOString();

  const { error: roomError } = await supabase
    .from("game_rooms")
    .update({
      status: "finished",
      winner,
      finished_at: now,
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
  });
}

export async function startRoomGame(params: {
  code: string;
  identity: RoomIdentity;
}): Promise<{ room: RoomView; game: OnlineGameStateView }> {
  const supabase = getSupabaseAdminClient();
  const roomRow = await findActiveRoomByCode(params.code);

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
        version: 1,
        updated_at: now,
      },
      { onConflict: "room_id" },
    )
    .select("*")
    .single();

  if (gameError || !gameRow) {
    throw new Error(gameError?.message ?? "Failed to create game state");
  }

  const room = await getRoomByCode(params.code, params.identity);
  if (!room) {
    throw new Error("Room disappeared after start");
  }

  return { room, game: toOnlineGameStateView(gameRow) };
}

export async function getOnlineGame(params: {
  code: string;
  identity: RoomIdentity;
}): Promise<{ room: RoomView; game: OnlineGameStateView }> {
  const room = await getRoomByCode(params.code, params.identity);
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
}): Promise<{ room: RoomView; row: GameStateRow; selfColor: PlayerColor }> {
  const room = await getRoomByCode(params.code, params.identity);
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
  /** Client-generated roll for optimistic UI; server validates range only. */
  roll?: [number, number];
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

  const roll = isValidDiceRoll(params.roll) ? params.roll : rollDicePair();
  const resolution = resolveRoll(
    state.pieces,
    selfColor,
    roll,
    state.exitRollAttempts,
  );

  let nextRow: GameStateRow;

  if (resolution.action === "retry_roll") {
    nextRow = await writeGameState(room.id, state.version, {
      pieces: piecesToJson(resolution.nextPieces),
      turn_phase: "playing",
      remaining_dice: null,
      exit_roll_attempts: state.exitRollAttempts + 1,
      last_roll: roll as unknown as Json,
      turn_started_at: new Date().toISOString(),
    });
  } else if (resolution.action === "skip_turn") {
    const advanced = advanceToNextTurn({
      ...state,
      pieces: resolution.nextPieces,
    });
    nextRow = await writeGameState(room.id, state.version, {
      pieces: piecesToJson(resolution.nextPieces),
      ...advanced,
      last_roll: roll as unknown as Json,
    });
  } else {
    nextRow = await writeGameState(room.id, state.version, {
      pieces: piecesToJson(resolution.nextPieces),
      turn_phase: "deciding",
      remaining_dice: [...roll] as unknown as Json,
      exit_roll_attempts: state.exitRollAttempts,
      last_roll: roll as unknown as Json,
      turn_started_at: new Date().toISOString(),
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
  pieceIndex: PieceIndex;
  dieValue: number;
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
    );
    const updatedRoom = await getRoomByCode(params.code, params.identity);
    return {
      room: updatedRoom ?? { ...room, status: "finished" },
      game: toOnlineGameStateView(finished),
    };
  }

  const nextRemaining = consumeDice(state.remainingDice, {
    value: params.dieValue,
  });

  let nextRow: GameStateRow;

  if (nextRemaining.length === 0) {
    nextRow = await writeGameState(room.id, state.version, {
      pieces: piecesToJson(nextPieces),
      ...advanceToNextTurn(state),
    });
  } else if (!hasAnyValidMove(nextPieces, selfColor, nextRemaining)) {
    nextRow = await writeGameState(room.id, state.version, {
      pieces: piecesToJson(nextPieces),
      ...advanceToNextTurn(state),
    });
  } else {
    nextRow = await writeGameState(room.id, state.version, {
      pieces: piecesToJson(nextPieces),
      remaining_dice: nextRemaining as unknown as Json,
      turn_phase: "deciding",
      turn_started_at: new Date().toISOString(),
    });
  }

  return { room, game: toOnlineGameStateView(nextRow) };
}

export async function advanceOnlineTurn(params: {
  code: string;
  identity: RoomIdentity;
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

  const startedAt = new Date(state.turnStartedAt).getTime();
  const limitMs =
    (state.turnPhase === "deciding"
      ? TURN_DECISION_SECONDS
      : TURN_DURATION_SECONDS) * 1000;
  const elapsed = Date.now() - startedAt;

  // Allow a small grace window; reject early skips.
  if (elapsed < limitMs - 1500) {
    throw new Response(JSON.stringify({ error: "Turn timer still running" }), {
      status: 409,
      headers: { "Content-Type": "application/json" },
    });
  }

  const nextRow = await writeGameState(room.id, state.version, {
    pieces: piecesToJson(state.pieces),
    ...advanceToNextTurn(state),
  });

  return { room, game: toOnlineGameStateView(nextRow) };
}
