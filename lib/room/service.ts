import { formatUnits, parseUnits } from "viem";
import type { PlayerColor } from "@/lib/board/types";
import { COMPETITIVE_TOKEN, isPotOpenStatus } from "@/lib/celo/constants";
import { generateRoomCode } from "@/lib/room/code";
import { firstAvailableColor } from "@/lib/room/colors";
import type { RoomMode } from "@/lib/room/mode";
import {
  DEFAULT_ROOM_MODE,
  isPartyMode,
  parseRoomMode,
} from "@/lib/room/mode";
import type { RoomPlayerView, RoomView } from "@/lib/room/types";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

type RoomRow = Database["public"]["Tables"]["game_rooms"]["Row"];
type PlayerRow = Database["public"]["Tables"]["game_room_players"]["Row"];
type PlayerInsert = Database["public"]["Tables"]["game_room_players"]["Insert"];

type PlayerWithUsername = PlayerRow & {
  username: string;
  walletAddress: string | null;
};

export type RoomIdentity =
  | { kind: "profile"; profileId: string; username: string }
  | { kind: "guest"; guestSessionId: string; guestName: string };

function toViewMode(mode: RoomRow["mode"] | string): RoomMode {
  return parseRoomMode(mode);
}

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

/** Active room with this code+mode, if any; otherwise any active room with the code. */
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
  if (data) return data;

  const { data: fallback, error: fallbackError } = await supabase
    .from("game_rooms")
    .select("*")
    .eq("code", normalized)
    .in("status", ["waiting", "playing"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fallbackError) throw new Error(fallbackError.message);
  return fallback;
}

/**
 * Prefer the active room for a code+mode (with any-mode fallback);
 * otherwise the most recently finished one for that mode, then any finished.
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
  if (data) return data;

  const { data: fallback, error: fallbackError } = await supabase
    .from("game_rooms")
    .select("*")
    .eq("code", normalized)
    .eq("status", "finished")
    .order("finished_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fallbackError) throw new Error(fallbackError.message);
  return fallback;
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

  const playerViews: RoomPlayerView[] = ordered.map((player) => {
    const contributedPoolUsdt = Number(player.contributed_pool_usdt ?? 0);
    return {
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
      entryPaid: contributedPoolUsdt > 0 || player.entry_paid === true,
      contributedPoolUsdt,
      walletAddress: player.walletAddress,
    };
  });

  return {
    id: room.id,
    code: room.code,
    mode: toViewMode(room.mode),
    status: room.status,
    hostId: room.host_id,
    players: playerViews,
    potAmountUsdt: Number(room.pot_amount_usdt ?? 0),
    potStatus: room.pot_status ?? "none",
    escrowRoomKey: room.escrow_room_key ?? null,
    trophiesAwarded:
      typeof room.trophies_awarded === "number" ? room.trophies_awarded : null,
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
  const walletByUserId = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id, username, display_name, wallet_address")
      .in("id", userIds);

    if (profileError) throw new Error(profileError.message);

    for (const profile of profiles ?? []) {
      usernameByUserId.set(
        profile.id,
        profile.username ?? profile.display_name ?? "PLAYER",
      );
      if (profile.wallet_address) {
        walletByUserId.set(profile.id, profile.wallet_address.toLowerCase());
      }
    }
  }

  return rows.map((player) => ({
    ...player,
    username:
      player.guest_name ??
      (player.user_id ? usernameByUserId.get(player.user_id) : null) ??
      "PLAYER",
    walletAddress: player.user_id
      ? (walletByUserId.get(player.user_id) ?? null)
      : null,
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

/**
 * Always creates a free-mode lobby. Party escrow is enabled later via enablePartyMode.
 * Optional third arg kept for call-site compatibility (ignored).
 */
export async function createRoomWithHost(
  identity: RoomIdentity,
  _mode: RoomMode = DEFAULT_ROOM_MODE,
  _competitiveDeposit?: {
    escrowRoomKey: string;
    depositTxHash: string;
  },
): Promise<RoomView> {
  const supabase = getSupabaseAdminClient();
  const mode: RoomMode = "free";
  const code = await allocateUniqueRoomCode(mode);
  const color = firstAvailableColor([]) ?? "red";

  const hostId = identity.kind === "profile" ? identity.profileId : null;

  const { data: room, error: roomError } = await supabase
    .from("game_rooms")
    .insert({
      code,
      mode,
      host_id: hostId,
      status: "waiting",
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
  const supabase = getSupabaseAdminClient();
  const normalized = params.code.trim().toUpperCase();

  const roomRow = await findActiveRoomByCode(normalized, mode);

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
  kickRefundTxHash?: string | null;
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

  if (target.user_id == null && !target.guest_session_id) {
    throw new Response(JSON.stringify({ error: "Player not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const contributedPoolUsdt = Number(target.contributed_pool_usdt ?? 0);
  let potAmountUsdt = Number(roomRow.pot_amount_usdt ?? 0);

  if (
    isPartyMode(roomRow.mode) &&
    isPotOpenStatus(roomRow.pot_status) &&
    roomRow.escrow_room_key &&
    contributedPoolUsdt > 0
  ) {
    if (!params.kickRefundTxHash) {
      throw new Response(
        JSON.stringify({
          error: "Kick refund transaction is required for contributors",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
    if (!target.walletAddress) {
      throw new Response(
        JSON.stringify({ error: "Contributor wallet is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const { verifyKickRefundTransaction } = await import(
      "@/lib/celo/competitive"
    );
    try {
      const kicked = await verifyKickRefundTransaction({
        txHash: params.kickRefundTxHash,
        roomKey: roomRow.escrow_room_key,
        expectedPlayer: target.walletAddress,
      });
      const refundedPool = Number(
        formatUnits(kicked.poolAmount, COMPETITIVE_TOKEN.decimals),
      );
      potAmountUsdt = Math.max(0, potAmountUsdt - refundedPool);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Invalid kick refund transaction";
      throw new Response(JSON.stringify({ error: message }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
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

  if (potAmountUsdt !== Number(roomRow.pot_amount_usdt ?? 0)) {
    const { error: potError } = await supabase
      .from("game_rooms")
      .update({ pot_amount_usdt: potAmountUsdt })
      .eq("id", roomRow.id);
    if (potError) throw new Error(potError.message);
    roomRow.pot_amount_usdt = potAmountUsdt;
  }

  const updatedPlayers = await fetchRoomPlayers(roomRow.id);
  return toRoomView(roomRow, updatedPlayers, params.identity);
}

async function applyPartyRefundIfNeeded(params: {
  room: RoomRow;
  identity: RoomIdentity;
  refundTxHash?: string | null;
}): Promise<{ pot_status?: "refunded"; refund_tx_hash?: string }> {
  if (!isPartyMode(params.room.mode)) return {};
  if (!isPotOpenStatus(params.room.pot_status)) return {};
  if (!params.room.escrow_room_key) return {};

  if (!params.refundTxHash) {
    throw new Response(
      JSON.stringify({
        error: "Refund transaction is required to close an open party room",
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  if (params.identity.kind !== "profile") {
    throw new Response(
      JSON.stringify({ error: "Party mode requires authentication" }),
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

  const refundFields = await applyPartyRefundIfNeeded({
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
  withdrawTxHash?: string | null;
}): Promise<{ closed: boolean }> {
  const mode = params.mode ?? DEFAULT_ROOM_MODE;
  const supabase = getSupabaseAdminClient();
  const roomRow = await findActiveRoomByCode(params.code, mode);

  if (!roomRow) {
    const finished = await findRoomRowByCode(params.code, mode);
    if (finished?.status === "finished") {
      // Party cancel (lock failed): host can still refund an open pot.
      if (
        isPartyMode(finished.mode) &&
        isPotOpenStatus(finished.pot_status) &&
        params.refundTxHash &&
        isRoomHost(
          finished,
          await fetchRoomPlayers(finished.id),
          params.identity,
        )
      ) {
        const refundFields = await applyPartyRefundIfNeeded({
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

  const contributedPoolUsdt = Number(self.contributed_pool_usdt ?? 0);
  if (
    isPartyMode(roomRow.mode) &&
    isPotOpenStatus(roomRow.pot_status) &&
    roomRow.escrow_room_key &&
    contributedPoolUsdt > 0
  ) {
    if (!params.withdrawTxHash) {
      throw new Response(
        JSON.stringify({
          error: "Withdraw transaction is required to leave after contributing",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
    if (params.identity.kind !== "profile" || !self.walletAddress) {
      throw new Response(
        JSON.stringify({ error: "Profile wallet is required to withdraw" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const { verifyWithdrawTransaction } = await import(
      "@/lib/celo/competitive"
    );
    let withdrawnPool: number;
    try {
      const withdrawn = await verifyWithdrawTransaction({
        txHash: params.withdrawTxHash,
        roomKey: roomRow.escrow_room_key,
        expectedPlayer: self.walletAddress,
      });
      withdrawnPool = Number(
        formatUnits(withdrawn.poolAmount, COMPETITIVE_TOKEN.decimals),
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Invalid withdraw transaction";
      throw new Response(JSON.stringify({ error: message }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const nextPot = Math.max(
      0,
      Number(roomRow.pot_amount_usdt ?? 0) - withdrawnPool,
    );
    const { error: potError } = await supabase
      .from("game_rooms")
      .update({ pot_amount_usdt: nextPot })
      .eq("id", roomRow.id);
    if (potError) throw new Error(potError.message);
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
      .select("id, username, display_name, wallet_address")
      .eq("privy_user_id", params.privyUserId)
      .maybeSingle();

    // Friends / party rooms need a wallet so pot payouts can always settle.
    if (profile?.username && profile.wallet_address) {
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

/** Host opens on-chain escrow and upgrades a free lobby to party mode. */
export async function enablePartyMode(params: {
  code: string;
  identity: RoomIdentity;
  mode?: RoomMode;
  escrowRoomKey: string;
  openTxHash: string;
}): Promise<RoomView> {
  const lookupMode = params.mode ?? DEFAULT_ROOM_MODE;

  if (params.identity.kind !== "profile") {
    throw new Response(
      JSON.stringify({ error: "Party mode requires authentication" }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const supabase = getSupabaseAdminClient();
  const roomRow = await findActiveRoomByCode(params.code, lookupMode);

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

  if (isPartyMode(roomRow.mode)) {
    throw new Response(
      JSON.stringify({ error: "Room is already in party mode" }),
      {
        status: 409,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const players = await fetchRoomPlayers(roomRow.id);
  if (!isRoomHost(roomRow, players, params.identity)) {
    throw new Response(
      JSON.stringify({ error: "Only the host can enable party mode" }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  // Guests cannot receive pot payouts — block Party until everyone has a profile.
  if (players.some((player) => !player.user_id)) {
    throw new Response(
      JSON.stringify({
        error:
          "All players need a connected wallet profile before enabling Party mode",
      }),
      {
        status: 409,
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

  const { verifyOpenTransaction } = await import("@/lib/celo/competitive");
  try {
    await verifyOpenTransaction({
      txHash: params.openTxHash,
      roomKey: params.escrowRoomKey,
      expectedHost: profile.wallet_address,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid open transaction";
    throw new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: updatedRoom, error: updateError } = await supabase
    .from("game_rooms")
    .update({
      mode: "party",
      escrow_room_key: params.escrowRoomKey.toLowerCase(),
      open_tx_hash: params.openTxHash.toLowerCase(),
      pot_status: "open",
      pot_amount_usdt: 0,
    })
    .eq("id", roomRow.id)
    .select("*")
    .single();

  if (updateError || !updatedRoom) {
    throw new Error(updateError?.message ?? "Failed to enable party mode");
  }

  return toRoomView(updatedRoom, players, params.identity);
}

/** Player records an on-chain party contribution against an open pot. */
export async function recordPartyContribution(params: {
  code: string;
  identity: RoomIdentity;
  mode?: RoomMode;
  contributeTxHash: string;
  poolAmountUsdt?: string;
}): Promise<RoomView> {
  const mode = params.mode ?? "party";

  if (params.identity.kind !== "profile") {
    throw new Response(
      JSON.stringify({ error: "Party mode requires authentication" }),
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

  if (!isPartyMode(roomRow.mode)) {
    throw new Response(
      JSON.stringify({ error: "Room is not in party mode" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  if (!isPotOpenStatus(roomRow.pot_status) || !roomRow.escrow_room_key) {
    throw new Response(
      JSON.stringify({ error: "Party pot is not open" }),
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

  let expectedPoolAmount: bigint | undefined;
  if (params.poolAmountUsdt != null && params.poolAmountUsdt.trim() !== "") {
    try {
      expectedPoolAmount = parseUnits(
        params.poolAmountUsdt.trim(),
        COMPETITIVE_TOKEN.decimals,
      );
    } catch {
      throw new Response(
        JSON.stringify({ error: "Invalid pool amount" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  }

  const { verifyContributeTransaction } = await import("@/lib/celo/competitive");
  let contributed: Awaited<ReturnType<typeof verifyContributeTransaction>>;
  try {
    contributed = await verifyContributeTransaction({
      txHash: params.contributeTxHash,
      roomKey: roomRow.escrow_room_key,
      expectedPlayer: profile.wallet_address,
      expectedPoolAmount,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Invalid contribute transaction";
    throw new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const poolAmountUsdt = Number(
    formatUnits(contributed.poolAmount, COMPETITIVE_TOKEN.decimals),
  );
  const feeAmountUsdt = Number(
    formatUnits(contributed.feeAmount, COMPETITIVE_TOKEN.decimals),
  );
  const txHash = params.contributeTxHash.toLowerCase();

  const { error: contributionError } = await supabase
    .from("game_room_contributions")
    .insert({
      room_id: roomRow.id,
      player_id: self.id,
      wallet_address: profile.wallet_address.toLowerCase(),
      pool_amount_usdt: poolAmountUsdt,
      fee_amount_usdt: feeAmountUsdt,
      tx_hash: txHash,
    });

  if (contributionError) {
    if (contributionError.code === "23505") {
      // Idempotent retry: contribution already recorded
      const existingRoom = await findActiveRoomByCode(params.code, mode);
      if (existingRoom) {
        const existingPlayers = await fetchRoomPlayers(existingRoom.id);
        return toRoomView(existingRoom, existingPlayers, params.identity);
      }
    }
    throw new Error(contributionError.message);
  }

  const { error: playerError } = await supabase
    .from("game_room_players")
    .update({
      contributed_pool_usdt:
        Number(self.contributed_pool_usdt ?? 0) + poolAmountUsdt,
      entry_paid: true,
      entry_tx_hash: txHash,
    })
    .eq("id", self.id);

  if (playerError) throw new Error(playerError.message);

  const { error: potError } = await supabase
    .from("game_rooms")
    .update({
      pot_amount_usdt: Number(roomRow.pot_amount_usdt ?? 0) + poolAmountUsdt,
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
