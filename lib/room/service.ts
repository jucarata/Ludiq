import type { PlayerColor } from "@/lib/board/types";
import { generateRoomCode } from "@/lib/room/code";
import { firstAvailableColor } from "@/lib/room/colors";
import type { RoomMode } from "@/lib/room/mode";
import { DEFAULT_ROOM_MODE } from "@/lib/room/mode";
import type { RoomPlayerView, RoomView } from "@/lib/room/types";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

type RoomRow = Database["public"]["Tables"]["game_rooms"]["Row"];
type PlayerRow = Database["public"]["Tables"]["game_room_players"]["Row"];
type PlayerInsert = Database["public"]["Tables"]["game_room_players"]["Insert"];

type PlayerWithUsername = PlayerRow & {
  username: string;
};

export type RoomIdentity =
  | { kind: "profile"; profileId: string; username: string }
  | { kind: "guest"; guestSessionId: string; guestName: string };

async function allocateUniqueRoomCode(mode: RoomMode): Promise<string> {
  const supabase = getSupabaseAdminClient();

  for (let attempt = 0; attempt < 12; attempt++) {
    const code = generateRoomCode();
    const { data } = await supabase
      .from("game_rooms")
      .select("id")
      .eq("code", code)
      .eq("mode", mode)
      .in("status", ["waiting", "playing"])
      .maybeSingle();

    if (!data) return code;
  }

  throw new Error("Could not allocate a unique room code");
}

/** Active room with this code+mode, if any (only one allowed at a time). */
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

/**
 * Prefer the active room for a code+mode; otherwise the most recently finished one
 * (so lobby realtime can detect close when status becomes finished).
 */
async function findRoomRowByCode(
  code: string,
  mode: RoomMode,
): Promise<RoomRow | null> {
  const active = await findActiveRoomByCode(code, mode);
  if (active) return active;

  const supabase = getSupabaseAdminClient();
  const normalized = code.trim().toUpperCase();

  const { data, error } = await supabase
    .from("game_rooms")
    .select("*")
    .eq("code", normalized)
    .eq("mode", mode)
    .eq("status", "finished")
    .order("finished_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
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

export function toRoomView(
  room: RoomRow,
  players: PlayerWithUsername[],
  identity: RoomIdentity | null,
): RoomView {
  const ordered = [...players].sort(
    (a, b) =>
      new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime(),
  );

  const playerViews: RoomPlayerView[] = ordered.map((player) => ({
    id: player.id,
    color: player.color,
    username: player.username,
    isHost:
      room.host_id != null
        ? player.user_id === room.host_id
        : ordered[0]?.id === player.id,
    isSelf: isSelfPlayer(player, identity),
    isGuest: player.user_id == null,
    autoEnabled: player.auto_enabled === true,
    entryPaid: player.entry_paid === true,
  }));

  return {
    id: room.id,
    code: room.code,
    mode: room.mode,
    status: room.status,
    hostId: room.host_id,
    players: playerViews,
    potAmountUsdt: Number(room.pot_amount_usdt ?? 0),
    potStatus: room.pot_status ?? "none",
    escrowRoomKey: room.escrow_room_key ?? null,
  };
}

async function fetchRoomPlayers(
  roomId: string,
): Promise<PlayerWithUsername[]> {
  const supabase = getSupabaseAdminClient();
  const { data: players, error } = await supabase
    .from("game_room_players")
    .select("*")
    .eq("room_id", roomId)
    .order("joined_at", { ascending: true });

  if (error) throw new Error(error.message);

  const rows = players ?? [];
  const userIds = [
    ...new Set(
      rows
        .map((player) => player.user_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const usernameByUserId = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id, username, display_name")
      .in("id", userIds);

    if (profileError) throw new Error(profileError.message);

    for (const profile of profiles ?? []) {
      usernameByUserId.set(
        profile.id,
        profile.username ?? profile.display_name ?? "PLAYER",
      );
    }
  }

  return rows.map((player) => ({
    ...player,
    username:
      player.guest_name ??
      (player.user_id ? usernameByUserId.get(player.user_id) : null) ??
      "PLAYER",
  }));
}

export async function getRoomByCode(
  code: string,
  identity: RoomIdentity | null,
  mode: RoomMode = DEFAULT_ROOM_MODE,
): Promise<RoomView | null> {
  const room = await findRoomRowByCode(code, mode);
  if (!room) return null;

  const players = await fetchRoomPlayers(room.id);
  return toRoomView(room, players, identity);
}

export async function createRoomWithHost(
  identity: RoomIdentity,
  mode: RoomMode = DEFAULT_ROOM_MODE,
  competitiveDeposit?: {
    escrowRoomKey: string;
    depositTxHash: string;
  },
): Promise<RoomView> {
  if (mode === "competitive" && identity.kind !== "profile") {
    throw new Response(
      JSON.stringify({ error: "Competitive mode requires authentication" }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const supabase = getSupabaseAdminClient();
  const code = await allocateUniqueRoomCode(mode);
  const color = firstAvailableColor([]) ?? "red";

  const hostId = identity.kind === "profile" ? identity.profileId : null;

  let competitiveInsert: {
    escrow_room_key: string;
    pot_amount_usdt: number;
    pot_status: "funded";
    deposit_tx_hash: string;
  } | null = null;

  if (mode === "competitive") {
    if (identity.kind !== "profile") {
      throw new Response(
        JSON.stringify({ error: "Competitive mode requires authentication" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
    if (
      !competitiveDeposit?.escrowRoomKey ||
      !competitiveDeposit.depositTxHash
    ) {
      throw new Response(
        JSON.stringify({
          error: "Competitive rooms require an on-chain deposit",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("wallet_address")
      .eq("id", identity.profileId)
      .maybeSingle();

    if (profileError) throw new Error(profileError.message);
    if (!profile?.wallet_address) {
      throw new Response(
        JSON.stringify({ error: "Profile wallet is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const { verifyDepositTransaction } = await import("@/lib/celo/competitive");
    try {
      await verifyDepositTransaction({
        txHash: competitiveDeposit.depositTxHash,
        roomKey: competitiveDeposit.escrowRoomKey,
        expectedPlayer: profile.wallet_address,
        requireHost: true,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Invalid deposit transaction";
      throw new Response(JSON.stringify({ error: message }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    competitiveInsert = {
      escrow_room_key: competitiveDeposit.escrowRoomKey.toLowerCase(),
      pot_amount_usdt: 0.15,
      pot_status: "funded",
      deposit_tx_hash: competitiveDeposit.depositTxHash.toLowerCase(),
    };
  }

  const { data: room, error: roomError } = await supabase
    .from("game_rooms")
    .insert({
      code,
      mode,
      host_id: hostId,
      status: "waiting",
      ...(competitiveInsert ?? {}),
    })
    .select("*")
    .single();

  if (roomError || !room) {
    throw new Error(roomError?.message ?? "Failed to create room");
  }

  const playerInsert: PlayerInsert =
    identity.kind === "profile"
      ? {
          room_id: room.id,
          user_id: identity.profileId,
          color,
          is_ready: false,
          is_bot: false,
          ...(mode === "competitive" && competitiveInsert
            ? {
                entry_paid: true,
                entry_tx_hash: competitiveInsert.deposit_tx_hash,
              }
            : {}),
        }
      : {
          room_id: room.id,
          user_id: null,
          guest_name: identity.guestName,
          guest_session_id: identity.guestSessionId,
          color,
          is_ready: false,
          is_bot: false,
        };

  const { error: playerError } = await supabase
    .from("game_room_players")
    .insert(playerInsert);

  if (playerError) {
    await supabase.from("game_rooms").delete().eq("id", room.id);
    throw new Error(playerError.message);
  }

  const players = await fetchRoomPlayers(room.id);
  return toRoomView(room, players, identity);
}

export async function joinRoom(params: {
  code: string;
  identity: RoomIdentity;
  mode?: RoomMode;
}): Promise<RoomView> {
  const mode = params.mode ?? DEFAULT_ROOM_MODE;

  if (mode === "competitive" && params.identity.kind !== "profile") {
    throw new Response(
      JSON.stringify({ error: "Competitive mode requires authentication" }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const supabase = getSupabaseAdminClient();
  const normalized = params.code.trim().toUpperCase();

  const { data: roomRow, error: roomError } = await supabase
    .from("game_rooms")
    .select("*")
    .eq("code", normalized)
    .eq("mode", mode)
    .eq("status", "waiting")
    .maybeSingle();

  if (roomError) throw new Error(roomError.message);
  if (!roomRow) {
    const active = await findActiveRoomByCode(normalized, mode);
    if (active) {
      throw new Response(JSON.stringify({ error: "Room is not waiting" }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      });
    }
    throw new Response(JSON.stringify({ error: "Room not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (await isIdentityBannedFromRoom(roomRow.id, params.identity)) {
    throw new Response(
      JSON.stringify({ error: "You were removed from this room" }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const players = await fetchRoomPlayers(roomRow.id);
  const alreadyIn = players.find((player) =>
    isSelfPlayer(player, params.identity),
  );
  if (alreadyIn) {
    return toRoomView(roomRow, players, params.identity);
  }

  if (players.length >= roomRow.max_players) {
    throw new Response(JSON.stringify({ error: "Room is full" }), {
      status: 409,
      headers: { "Content-Type": "application/json" },
    });
  }

  const color = firstAvailableColor(players.map((player) => player.color));
  if (!color) {
    throw new Response(JSON.stringify({ error: "Room is full" }), {
      status: 409,
      headers: { "Content-Type": "application/json" },
    });
  }

  const playerInsert: PlayerInsert =
    params.identity.kind === "profile"
      ? {
          room_id: roomRow.id,
          user_id: params.identity.profileId,
          color,
          is_ready: false,
          is_bot: false,
        }
      : {
          room_id: roomRow.id,
          user_id: null,
          guest_name: params.identity.guestName,
          guest_session_id: params.identity.guestSessionId,
          color,
          is_ready: false,
          is_bot: false,
        };

  const { error: playerError } = await supabase
    .from("game_room_players")
    .insert(playerInsert);

  if (playerError) {
    if (playerError.code === "23505") {
      const refreshed = await fetchRoomPlayers(roomRow.id);
      const self = refreshed.find((player) =>
        isSelfPlayer(player, params.identity),
      );
      if (self) return toRoomView(roomRow, refreshed, params.identity);

      throw new Response(JSON.stringify({ error: "Color already taken" }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      });
    }
    throw new Error(playerError.message);
  }

  const updatedPlayers = await fetchRoomPlayers(roomRow.id);
  return toRoomView(roomRow, updatedPlayers, params.identity);
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

function isPlayerHost(
  room: RoomRow,
  players: PlayerRow[],
  player: PlayerRow,
): boolean {
  if (room.host_id != null) {
    return player.user_id === room.host_id;
  }

  const ordered = [...players].sort(
    (a, b) =>
      new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime(),
  );
  return ordered[0]?.id === player.id;
}

async function isIdentityBannedFromRoom(
  roomId: string,
  identity: RoomIdentity,
): Promise<boolean> {
  const supabase = getSupabaseAdminClient();
  let query = supabase
    .from("game_room_bans")
    .select("id")
    .eq("room_id", roomId);

  query =
    identity.kind === "profile"
      ? query.eq("user_id", identity.profileId)
      : query.eq("guest_session_id", identity.guestSessionId);

  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(error.message);
  return Boolean(data);
}

/** Host removes a player from the waiting lobby; they cannot rejoin this room instance. */
export async function kickPlayer(params: {
  code: string;
  targetPlayerId: string;
  identity: RoomIdentity;
  mode?: RoomMode;
}): Promise<RoomView> {
  const mode = params.mode ?? DEFAULT_ROOM_MODE;
  const supabase = getSupabaseAdminClient();
  const roomRow = await findActiveRoomByCode(params.code, mode);

  if (!roomRow || roomRow.status !== "waiting") {
    throw new Response(
      JSON.stringify({
        error: roomRow ? "Room is not waiting" : "Room not found",
      }),
      {
        status: roomRow ? 409 : 404,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const players = await fetchRoomPlayers(roomRow.id);
  if (!isRoomHost(roomRow, players, params.identity)) {
    throw new Response(
      JSON.stringify({ error: "Only the host can remove players" }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const target = players.find((player) => player.id === params.targetPlayerId);
  if (!target) {
    throw new Response(JSON.stringify({ error: "Player not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (isSelfPlayer(target, params.identity) || isPlayerHost(roomRow, players, target)) {
    throw new Response(JSON.stringify({ error: "Cannot remove the host" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (roomRow.mode === "competitive" && target.entry_paid) {
    throw new Response(
      JSON.stringify({
        error: "Cannot remove a player who already confirmed payment",
      }),
      {
        status: 409,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  if (target.user_id == null && !target.guest_session_id) {
    throw new Response(JSON.stringify({ error: "Player not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const banInsert =
    target.user_id != null
      ? {
          room_id: roomRow.id,
          user_id: target.user_id,
          guest_session_id: null as string | null,
          banned_by:
            params.identity.kind === "profile"
              ? params.identity.profileId
              : null,
        }
      : {
          room_id: roomRow.id,
          user_id: null as string | null,
          guest_session_id: target.guest_session_id,
          banned_by:
            params.identity.kind === "profile"
              ? params.identity.profileId
              : null,
        };

  const { error: banError } = await supabase
    .from("game_room_bans")
    .insert(banInsert);

  if (banError && banError.code !== "23505") {
    throw new Error(banError.message);
  }

  const { error: deleteError } = await supabase
    .from("game_room_players")
    .delete()
    .eq("id", target.id);

  if (deleteError) throw new Error(deleteError.message);

  const updatedPlayers = await fetchRoomPlayers(roomRow.id);
  return toRoomView(roomRow, updatedPlayers, params.identity);
}

async function applyCompetitiveRefundIfNeeded(params: {
  room: RoomRow;
  identity: RoomIdentity;
  refundTxHash?: string | null;
}): Promise<{ pot_status?: "refunded"; refund_tx_hash?: string }> {
  if (params.room.mode !== "competitive") return {};
  if (params.room.pot_status !== "funded") return {};
  if (!params.room.escrow_room_key) {
    throw new Response(
      JSON.stringify({ error: "Competitive room is missing escrow key" }),
      {
        status: 409,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
  if (!params.refundTxHash) {
    throw new Response(
      JSON.stringify({
        error: "Refund transaction is required to close a funded competitive room",
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  if (params.identity.kind !== "profile") {
    throw new Response(
      JSON.stringify({ error: "Competitive mode requires authentication" }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const supabase = getSupabaseAdminClient();
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("wallet_address")
    .eq("id", params.identity.profileId)
    .maybeSingle();

  if (profileError) throw new Error(profileError.message);
  if (!profile?.wallet_address) {
    throw new Response(
      JSON.stringify({ error: "Profile wallet is required" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const { verifyRefundTransaction } = await import("@/lib/celo/competitive");
  try {
    await verifyRefundTransaction({
      txHash: params.refundTxHash,
      roomKey: params.room.escrow_room_key,
      expectedHost: profile.wallet_address,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid refund transaction";
    throw new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  return {
    pot_status: "refunded",
    refund_tx_hash: params.refundTxHash.toLowerCase(),
  };
}

export async function closeRoom(params: {
  code: string;
  identity: RoomIdentity;
  mode?: RoomMode;
  refundTxHash?: string | null;
}): Promise<void> {
  const mode = params.mode ?? DEFAULT_ROOM_MODE;
  const supabase = getSupabaseAdminClient();
  const roomRow = await findActiveRoomByCode(params.code, mode);

  if (!roomRow) {
    const finished = await findRoomRowByCode(params.code, mode);
    if (finished?.status === "finished") return;
    throw new Response(JSON.stringify({ error: "Room not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const players = await fetchRoomPlayers(roomRow.id);
  if (!isRoomHost(roomRow, players, params.identity)) {
    throw new Response(JSON.stringify({ error: "Only the host can close the room" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const refundFields = await applyCompetitiveRefundIfNeeded({
    room: roomRow,
    identity: params.identity,
    refundTxHash: params.refundTxHash,
  });

  const { error: updateError } = await supabase
    .from("game_rooms")
    .update({
      status: "finished",
      finished_at: new Date().toISOString(),
      ...refundFields,
    })
    .eq("id", roomRow.id);

  if (updateError) throw new Error(updateError.message);
}

/** Leave the lobby. Host leave closes the room for everyone. */
export async function leaveRoom(params: {
  code: string;
  identity: RoomIdentity;
  mode?: RoomMode;
  refundTxHash?: string | null;
}): Promise<{ closed: boolean }> {
  const mode = params.mode ?? DEFAULT_ROOM_MODE;
  const supabase = getSupabaseAdminClient();
  const roomRow = await findActiveRoomByCode(params.code, mode);

  if (!roomRow) {
    const finished = await findRoomRowByCode(params.code, mode);
    if (finished?.status === "finished") {
      // Competitive cancel (lock failed): host can still refund a funded pot.
      if (
        finished.mode === "competitive" &&
        finished.pot_status === "funded" &&
        params.refundTxHash &&
        isRoomHost(
          finished,
          await fetchRoomPlayers(finished.id),
          params.identity,
        )
      ) {
        const refundFields = await applyCompetitiveRefundIfNeeded({
          room: finished,
          identity: params.identity,
          refundTxHash: params.refundTxHash,
        });
        if (refundFields.pot_status) {
          const { error: refundError } = await supabase
            .from("game_rooms")
            .update(refundFields)
            .eq("id", finished.id);
          if (refundError) throw new Error(refundError.message);
        }
      }
      return { closed: true };
    }
    throw new Response(JSON.stringify({ error: "Room not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const players = await fetchRoomPlayers(roomRow.id);
  const self = players.find((player) =>
    isSelfPlayer(player, params.identity),
  );

  if (!self) {
    return { closed: roomRow.status !== "waiting" };
  }

  if (isRoomHost(roomRow, players, params.identity)) {
    await closeRoom({ ...params, mode });
    return { closed: true };
  }

  const { error: deleteError } = await supabase
    .from("game_room_players")
    .delete()
    .eq("id", self.id);

  if (deleteError) throw new Error(deleteError.message);
  return { closed: false };
}

export async function changePlayerColor(params: {
  code: string;
  color: PlayerColor;
  identity: RoomIdentity;
  mode?: RoomMode;
}): Promise<RoomView> {
  const mode = params.mode ?? DEFAULT_ROOM_MODE;
  const supabase = getSupabaseAdminClient();
  const roomRow = await findActiveRoomByCode(params.code, mode);
  if (!roomRow || roomRow.status !== "waiting") {
    throw new Response(
      JSON.stringify({
        error: roomRow ? "Room is not waiting" : "Room not found",
      }),
      {
        status: roomRow ? 409 : 404,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const players = await fetchRoomPlayers(roomRow.id);
  const self = players.find((player) =>
    isSelfPlayer(player, params.identity),
  );

  if (!self) {
    throw new Response(JSON.stringify({ error: "You are not in this room" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (self.color === params.color) {
    return toRoomView(roomRow, players, params.identity);
  }

  const takenByOther = players.some(
    (player) => player.id !== self.id && player.color === params.color,
  );
  if (takenByOther) {
    throw new Response(JSON.stringify({ error: "Color already taken" }), {
      status: 409,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { error: updateError } = await supabase
    .from("game_room_players")
    .update({ color: params.color })
    .eq("id", self.id);

  if (updateError) {
    if (updateError.code === "23505") {
      throw new Response(JSON.stringify({ error: "Color already taken" }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      });
    }
    throw new Error(updateError.message);
  }

  const updatedPlayers = await fetchRoomPlayers(roomRow.id);
  return toRoomView(roomRow, updatedPlayers, params.identity);
}

export async function resolveRoomIdentity(params: {
  privyUserId: string | null;
  guestSessionId?: string | null;
  guestName?: string | null;
}): Promise<RoomIdentity | null> {
  if (params.privyUserId) {
    const supabase = getSupabaseAdminClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, username, display_name")
      .eq("privy_user_id", params.privyUserId)
      .maybeSingle();

    if (profile?.username) {
      return {
        kind: "profile",
        profileId: profile.id,
        username: profile.username,
      };
    }
  }

  const guestSessionId = params.guestSessionId?.trim();
  if (!guestSessionId) return null;

  const guestName = (params.guestName ?? "").trim().toUpperCase();
  if (!/^USER\d{5}$/.test(guestName) && !/^[A-Z0-9_]{3,20}$/.test(guestName)) {
    return null;
  }

  return {
    kind: "guest",
    guestSessionId,
    guestName,
  };
}

export async function setPlayerAutoEnabled(params: {
  code: string;
  identity: RoomIdentity;
  mode?: RoomMode;
  enabled: boolean;
}): Promise<RoomView> {
  const mode = params.mode ?? DEFAULT_ROOM_MODE;
  const supabase = getSupabaseAdminClient();
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

  const { error } = await supabase
    .from("game_room_players")
    .update({ auto_enabled: params.enabled })
    .eq("id", self.id);

  if (error) throw new Error(error.message);

  const roomRow = await findActiveRoomByCode(params.code, mode);
  if (!roomRow) {
    throw new Response(JSON.stringify({ error: "Room not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const players = await fetchRoomPlayers(roomRow.id);
  return toRoomView(roomRow, players, params.identity);
}

/** Joiner confirms on-chain entry fee for a competitive lobby. */
export async function confirmCompetitiveEntry(params: {
  code: string;
  identity: RoomIdentity;
  mode?: RoomMode;
  entryTxHash: string;
}): Promise<RoomView> {
  const mode = params.mode ?? DEFAULT_ROOM_MODE;
  if (mode !== "competitive") {
    throw new Response(
      JSON.stringify({ error: "Only competitive rooms require entry payment" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
  if (params.identity.kind !== "profile") {
    throw new Response(
      JSON.stringify({ error: "Competitive mode requires authentication" }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const supabase = getSupabaseAdminClient();
  const roomRow = await findActiveRoomByCode(params.code, mode);
  if (!roomRow || roomRow.status !== "waiting") {
    throw new Response(
      JSON.stringify({
        error: roomRow ? "Room is not waiting" : "Room not found",
      }),
      {
        status: roomRow ? 409 : 404,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
  if (roomRow.pot_status !== "funded" || !roomRow.escrow_room_key) {
    throw new Response(
      JSON.stringify({ error: "Competitive room pot is not open" }),
      {
        status: 409,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const players = await fetchRoomPlayers(roomRow.id);
  const self = players.find((player) =>
    isSelfPlayer(player, params.identity),
  );
  if (!self) {
    throw new Response(JSON.stringify({ error: "You are not in this room" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (self.entry_paid) {
    return toRoomView(roomRow, players, params.identity);
  }
  if (isRoomHost(roomRow, players, params.identity)) {
    throw new Response(
      JSON.stringify({ error: "Host already paid when creating the room" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("wallet_address")
    .eq("id", params.identity.profileId)
    .maybeSingle();

  if (profileError) throw new Error(profileError.message);
  if (!profile?.wallet_address) {
    throw new Response(
      JSON.stringify({ error: "Profile wallet is required" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const { verifyDepositTransaction } = await import("@/lib/celo/competitive");
  try {
    await verifyDepositTransaction({
      txHash: params.entryTxHash,
      roomKey: roomRow.escrow_room_key,
      expectedPlayer: profile.wallet_address,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid deposit transaction";
    throw new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { error: playerError } = await supabase
    .from("game_room_players")
    .update({
      entry_paid: true,
      entry_tx_hash: params.entryTxHash.toLowerCase(),
    })
    .eq("id", self.id)
    .eq("entry_paid", false);

  if (playerError) throw new Error(playerError.message);

  const { error: potError } = await supabase
    .from("game_rooms")
    .update({
      pot_amount_usdt: Number(roomRow.pot_amount_usdt ?? 0) + 0.15,
    })
    .eq("id", roomRow.id);

  if (potError) throw new Error(potError.message);

  const updatedRoom = await findActiveRoomByCode(params.code, mode);
  if (!updatedRoom) {
    throw new Response(JSON.stringify({ error: "Room not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
  const updatedPlayers = await fetchRoomPlayers(updatedRoom.id);
  return toRoomView(updatedRoom, updatedPlayers, params.identity);
}
